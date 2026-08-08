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
        this.cachePrefix = "operation_api_v10:";
        this.readPolicies = new Map([
            ["getDashboardFilters", 5 * 60 * 1000],
            ["getDashboardData", 90 * 1000],
            ["getInventoryData", 2 * 60 * 1000],
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
            ["getLeadsData", 60 * 1000]
        ]);
        this.mutations = new Set(["login", "logout", "changeOwnPassword", "saveClientRegistration", "uploadClientContract", "saveEOI", "refreshAvailableLayanaUnits", "bulkUpdateLeadStatus", "importLeads"]);
    }

    post(action, payload = {}, options = {}) {
        const scoped = new Set(["getDashboardData","getInventoryData","getClients","getClientDocuments","getEOIData","getLeadsData"]);
        const project = sessionStorage.getItem("operation_selected_project") || "ALL";
        let bodyPayload = { ...payload };
        if (scoped.has(action) && project !== "ALL") {
            bodyPayload.filters = { ...(bodyPayload.filters || {}), project };
        }
        return this.request({ method: "POST", body: { action, ...bodyPayload }, action, ...options });
    }

    get(action, params = {}, options = {}) {
        return this.request({ method: "GET", params: { action, ...params }, action, ...options });
    }

    async request(options = {}) {
        if (!this.baseURL) return this.failure(0, "API baseURL is not configured");
        if (!navigator.onLine) {
            const offline = this.readCache(this.makeKey(options));
            return offline || this.failure(0, "No internet connection");
        }

        const action = options.action || options.body?.action || options.params?.action || "request";
        const cacheTTL = options.cacheTTL ?? this.readPolicies.get(action) ?? 0;
        const key = this.makeKey(options);

        if (!options.forceRefresh && cacheTTL > 0) {
            const cached = this.readCache(key);
            if (cached) return cached;
        }

        if (this.inFlight.has(key)) return this.inFlight.get(key);

        const promise = this.execute(options).then((result) => {
            if (result.ok && cacheTTL > 0) this.writeCache(key, result, cacheTTL);
            if (result.ok && this.mutations.has(action)) this.clearReadCache();
            return result;
        }).finally(() => this.inFlight.delete(key));

        this.inFlight.set(key, promise);
        return promise;
    }

    async execute(options) {
        const attempts = this.retry.enabled ? Math.max(1, Number(this.retry.maxAttempts) || 1) : 1;
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
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
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
                if (semanticStatus === 401 || data?.message === "AUTH_REQUIRED" || data?.message === "SESSION_EXPIRED") {
                    window.dispatchEvent(new CustomEvent("operation:session-expired", { detail: data }));
                }
                return this.failure(semanticStatus, this.getStatusMessage(semanticStatus, data), data);
            }
            return { ok: true, status: semanticStatus, message: data?.message || "Request completed successfully", data };
        } catch (error) {
            if (error.name === "AbortError") return this.failure(0, "API request timeout");
            return this.failure(0, error.message || "Network error");
        } finally { clearTimeout(timeoutId); }
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
        if (data?.message) {
            if (/^Unknown action:/i.test(data.message)) return "This feature needs the latest backend deployment.";
            return data.message;
        }
        return ({ 400: "Bad request", 401: "Session expired", 403: "Forbidden", 404: "API endpoint not found", 429: "Too many requests", 500: "Internal server error" })[status] || "API request failed";
    }
}

export default new ApiService();
