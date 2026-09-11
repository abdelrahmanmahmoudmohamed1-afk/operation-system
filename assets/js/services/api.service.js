/** Central API client with request coalescing, short-lived response cache and safe retries. */
import API_CONFIG from "../../config/api.config.js";

class ApiService {
    constructor() {
        this.name = "ApiService";
        this.baseURL = API_CONFIG.baseURL || "";
        this.timeout = API_CONFIG.timeout || 20000;
        this.headers = API_CONFIG.headers || { "Content-Type": "text/plain;charset=utf-8" };
        this.retry = API_CONFIG.retry || { enabled: false, maxAttempts: 1, delay: 0 };
        this.inFlight = new Map();
        this.memory = new Map();
        this.refreshPromise = null;
        this.cachePrefix = "operation_api_enterprise_x16:";
        this.backendInfo = null;
        this.backendActions = null;
        this.readPolicies = new Map([
            ["getSystemInfo", 10 * 60 * 1000],
            ["getDashboardFilters", 5 * 60 * 1000],
            ["getDashboardData", 90 * 1000],
            ["getAchievementData", 90 * 1000],
            ["getInventoryData", 90 * 1000],
            ["getInventoryProjects", 10 * 60 * 1000],
            ["getAvailableUnitsByProject", 2 * 60 * 1000],
            ["getAvailableLayanaUnits", 2 * 60 * 1000],
            ["getClientFormBootstrap", 5 * 60 * 1000],
            ["getClients", 90 * 1000],
            ["getCompanies", 10 * 60 * 1000],
            ["getManagerDirector", 10 * 60 * 1000],
            ["getEOIFormBootstrap", 5 * 60 * 1000],
            ["getEOIData", 90 * 1000],
            ["getUsersData", 60 * 1000],
            ["getAuditHistory", 30 * 1000],
            ["getLeadsData", 60 * 1000],
            ["getDocumentCoverage", 90 * 1000],
            ["getUnitFloorPlan", 5 * 60 * 1000],
            ["getUnitFloorPlanCoverage", 2 * 60 * 1000]
        ]);
        this.mutations = new Set(["bootstrapAdmin", "login", "logout", "changeOwnPassword", "saveClientRegistration", "uploadClientContract", "saveEOI", "refreshAvailableLayanaUnits", "bulkUpdateLeadStatus", "importLeads", "createSystemUser", "updateSystemUser", "resetUserPassword", "uploadUnitFloorPlan", "sendGmail", "completeReminder", "sendChatMessage", "sendChatAnnouncement", "createChatConversation", "markChatRead", "prepareChatAttachmentUpload"]);
        ["saveSalesPerson", "saveSalesTarget", "deleteDocument", "recordUserActivity", "operationAiChat", "initializeDatabase", "getGmailConnectUrl", "runDiagnostics"].forEach(action => this.mutations.add(action));
    }

    setBackendInfo(info = null) {
        this.backendInfo = info || null;
        this.backendActions = Array.isArray(info?.actions) ? new Set(info.actions) : null;
    }

    supports(action) {
        return !this.backendActions || this.backendActions.has(action);
    }

    capabilityError(action) {
        const current = this.backendInfo?.backendBuild || this.backendInfo?.version || "unknown";
        return this.failure(409, `Backend ${current} does not support ${action}. Deploy the matching Vercel backend and Supabase schema for this frontend build.`, { code: "BACKEND_VERSION_MISMATCH", action, backend: this.backendInfo });
    }

    post(action, payload = {}, options = {}) {
        return this.request({ method: "POST", body: { action, ...payload }, action, ...options });
    }

    get(action, params = {}, options = {}) {
        return this.request({ method: "GET", params: { action, ...params }, action, ...options });
    }

    async request(options = {}) {
        if (!this.baseURL) return this.failure(0, "API baseURL is not configured");
        const action = options.action || options.body?.action || options.params?.action || "request";
        if (!["getSystemInfo","bootstrapStatus","bootstrapAdmin","login","refreshSession"].includes(action) && !this.supports(action)) return this.capabilityError(action);
        this.applyGlobalProject(options, action);
        const cacheTTL = options.cacheTTL ?? this.readPolicies.get(action) ?? 0;
        const key = this.makeKey(options);
        if (navigator.onLine === false) {
            const offline = cacheTTL > 0 ? this.readCache(key) : null;
            return offline || this.failure(0, "No internet connection");
        }

        if (!options.forceRefresh && cacheTTL > 0) {
            const cached = this.readCache(key);
            if (cached) return cached;
        }

        const coalesce = !this.mutations.has(action);
        if (coalesce && this.inFlight.has(key)) return this.inFlight.get(key);

        const promise = this.execute(options).then(async (result) => {
            if (!result.ok && result.status === 401 && action !== "login" && action !== "refreshSession" && !options.__refreshed) {
                const refreshed = await this.refreshAuthToken();
                if (refreshed) {
                    const retryOptions = { ...options, __refreshed: true };
                    if (retryOptions.body?.token) retryOptions.body = { ...retryOptions.body, token: refreshed };
                    if (retryOptions.params?.token) retryOptions.params = { ...retryOptions.params, token: refreshed };
                    result = await this.execute(retryOptions);
                }
            }
            if (!result.ok && result.status === 401 && action !== "login" && action !== "refreshSession") {
                window.dispatchEvent(new CustomEvent("operation:session-expired", { detail: result.data }));
            }
            if (result.ok && cacheTTL > 0) this.writeCache(key, result, cacheTTL);
            if (result.ok && this.mutations.has(action)) this.clearReadCache();
            return result;
        }).finally(() => { if (coalesce) this.inFlight.delete(key); });

        if (coalesce) this.inFlight.set(key, promise);
        return promise;
    }

    async execute(options) {
        const action = options.action || options.body?.action || options.params?.action || 'request';
        const noRetry = this.mutations.has(action) || ['bootstrapStatus','bootstrapAdmin','login','refreshSession','initializeDatabase'].includes(action);
        const attempts = (this.retry.enabled && !noRetry) ? Math.max(1, Number(this.retry.maxAttempts) || 1) : 1;
        let lastResult = null;
        for (let attempt = 1; attempt <= attempts; attempt += 1) {
            lastResult = await this.requestOnce(options);
            if (lastResult.ok || !this.shouldRetry(lastResult, attempt, attempts)) return lastResult;
            await this.sleep((Number(this.retry.delay) || 500) * attempt);
        }
        return lastResult || this.failure(0, "Request failed");
    }

    async requestOnce(options) {
        const controller = new AbortController();
        const effectiveTimeout = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : this.timeout;
        const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);
        try {
            const response = await fetch(this.buildURL(options.params), {
                method: options.method || "GET",
                headers: this.headers,
                body: options.body ? JSON.stringify(options.body) : undefined,
                signal: controller.signal,
                cache: "no-store",
                redirect: "follow"
            });
            const data = await this.parseResponse(response);
            const semanticStatus = Number(data?.status) || response.status;
            const semanticOk = response.ok && data?.ok !== false;
            if (!semanticOk) {
                if (/Unsupported action:/i.test(String(data?.message || ""))) {
                    const requestedAction = options?.body?.action || options?.params?.action || 'requested operation';
                    const missing = String(data.message).split(":").slice(1).join(":").trim() || requestedAction;
                    return this.failure(409, `Backend version mismatch: ${missing} is not available in the deployed API. Redeploy the matching Enterprise X backend.`, { ...data, code: "BACKEND_VERSION_MISMATCH", action: missing });
                }
                return this.failure(semanticStatus, this.getStatusMessage(semanticStatus, data), data);
            }
            return { ok: true, status: semanticStatus, message: data?.message || "Request completed successfully", data };
        } catch (error) {
            if (error.name === "AbortError") return this.failure(0, "API request timeout");
            return this.failure(0, error.message || "Network error");
        } finally { clearTimeout(timeoutId); }
    }


    applyGlobalProject(options, action) {
        const projectAware = new Set(["getDashboardData", "getAchievementData", "getInventoryData", "getClients", "getEOIData", "getClientDocuments", "getLeadsData"]);
        if (!projectAware.has(action)) return;
        const selected = sessionStorage.getItem("operation_global_project") || "ALL";
        if (!selected || selected === "ALL") return;
        if (options.body) {
            const filters = (options.body.filters && typeof options.body.filters === "object") ? { ...options.body.filters } : {};
            if (!filters.project || filters.project === "ALL") filters.project = selected;
            options.body = { ...options.body, filters };
        }
        if (options.params) {
            const filters = (options.params.filters && typeof options.params.filters === "object") ? { ...options.params.filters } : {};
            if (!filters.project || filters.project === "ALL") filters.project = selected;
            options.params = { ...options.params, filters };
        }
    }

    makeKey(options) {
        const action = options.action || options.body?.action || options.params?.action || "request";
        const source = options.body || options.params || {};
        const safe = { ...source };
        delete safe.password;
        delete safe.oldPassword;
        delete safe.newPassword;
        return action + ":" + this.stableStringify(safe);
    }

    stableStringify(value) {
        if (!value || typeof value !== "object") return JSON.stringify(value);
        if (Array.isArray(value)) return "[" + value.map(v => this.stableStringify(v)).join(",") + "]";
        return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + this.stableStringify(value[k])).join(",") + "}";
    }

    writeCache(key, value, ttl) {
        const item = { value, expiresAt: Date.now() + ttl };
        this.memory.set(key, item);
        try { sessionStorage.setItem(this.cachePrefix + key, JSON.stringify(item)); } catch (_) {}
    }

    readCache(key) {
        let item = this.memory.get(key);
        if (!item) {
            try {
                const raw = sessionStorage.getItem(this.cachePrefix + key);
                if (raw) item = JSON.parse(raw);
            } catch (_) {}
        }
        if (!item) return null;
        if (Date.now() > Number(item.expiresAt || 0)) {
            this.memory.delete(key);
            try { sessionStorage.removeItem(this.cachePrefix + key); } catch (_) {}
            return null;
        }
        this.memory.set(key, item);
        return item.value;
    }

    clearReadCache() {
        this.memory.clear();
        try {
            Object.keys(sessionStorage).filter(k => k.startsWith(this.cachePrefix)).forEach(k => sessionStorage.removeItem(k));
        } catch (_) {}
    }


    async refreshAuthToken() {
        if (this.refreshPromise) return this.refreshPromise;
        this.refreshPromise = this.performTokenRefresh().finally(() => { this.refreshPromise = null; });
        return this.refreshPromise;
    }

    async performTokenRefresh() {
        const refreshToken = sessionStorage.getItem("auth_refresh_token");
        if (!refreshToken || !this.baseURL) return null;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(this.baseURL, {
                method: "POST",
                headers: this.headers,
                signal: controller.signal,
                body: JSON.stringify({ action: "refreshSession", refreshToken }),
                cache: "no-store"
            });
            const data = await this.parseResponse(response);
            const session = data?.data;
            if (!response.ok || data?.ok === false || !session?.token) return null;
            if (sessionStorage.getItem("auth_refresh_token") !== refreshToken) return null;
            sessionStorage.setItem("auth_token", session.token);
            if (session.refreshToken) sessionStorage.setItem("auth_refresh_token", session.refreshToken);
            if (session.user) sessionStorage.setItem("auth_user", JSON.stringify(session.user));
            return session.token;
        } catch (_) { return null; }
        finally { clearTimeout(timeoutId); }
    }

    async parseResponse(response) {
        const text = await response.text();
        if (!text) return null;
        try { return JSON.parse(text); }
        catch { return { ok: false, message: "Invalid response from server", raw: text.slice(0, 300) }; }
    }

    buildURL(params = null) {
        if (!params || !Object.keys(params).length) return this.baseURL;
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => query.set(key, typeof value === "object" ? JSON.stringify(value) : String(value)));
        return `${this.baseURL}?${query.toString()}`;
    }

    shouldRetry(result, attempt, attempts) { return attempt < attempts && (result.status === 0 || result.status === 429 || result.status >= 500); }
    failure(status, message, data = null) { return { ok: false, status, message, data }; }
    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    getStatusMessage(status, data = null) {
        if (data?.message) return data.message;
        return ({ 400: "Bad request", 401: "Session expired", 403: "Forbidden", 404: "API endpoint not found", 429: "Too many requests", 500: "Internal server error" })[status] || "API request failed";
    }
}

export default new ApiService();
