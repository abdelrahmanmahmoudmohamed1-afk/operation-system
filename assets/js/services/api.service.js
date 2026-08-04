/** Central API client for the Google Apps Script backend. */
import API_CONFIG from "../../config/api.config.js";

class ApiService {
    constructor() {
        this.name = "ApiService";
        this.baseURL = API_CONFIG.baseURL || "";
        this.timeout = API_CONFIG.timeout || 30000;
        this.headers = API_CONFIG.headers || { "Content-Type": "text/plain;charset=utf-8" };
        this.retry = API_CONFIG.retry || { enabled: false, maxAttempts: 1, delay: 0 };
    }

    post(action, payload = {}) {
        return this.request({ method: "POST", body: { action, ...payload } });
    }

    get(action, params = {}) {
        return this.request({ method: "GET", params: { action, ...params } });
    }

    async request(options = {}) {
        if (!this.baseURL) return this.failure(0, "API baseURL is not configured");
        if (!navigator.onLine) return this.failure(0, "No internet connection");

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
                    window.dispatchEvent(new CustomEvent("toledo:session-expired", { detail: data }));
                }
                return this.failure(semanticStatus, this.getStatusMessage(semanticStatus, data), data);
            }

            return {
                ok: true,
                status: semanticStatus,
                message: data?.message || "Request completed successfully",
                data
            };
        } catch (error) {
            if (error.name === "AbortError") return this.failure(0, "API request timeout");
            return this.failure(0, error.message || "Network error");
        } finally {
            clearTimeout(timeoutId);
        }
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
        Object.entries(params).forEach(([key, value]) => {
            query.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
        });
        return `${this.baseURL}?${query.toString()}`;
    }

    shouldRetry(result, attempt, attempts) {
        if (attempt >= attempts) return false;
        return result.status === 0 || result.status === 429 || result.status >= 500;
    }

    failure(status, message, data = null) { return { ok: false, status, message, data }; }
    sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

    getStatusMessage(status, data = null) {
        if (data?.message) return data.message;
        return ({ 400: "Bad request", 401: "Session expired", 403: "Forbidden", 404: "API endpoint not found", 429: "Too many requests", 500: "Internal server error" })[status] || "API request failed";
    }
}

export default new ApiService();
