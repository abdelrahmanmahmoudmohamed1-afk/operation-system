/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: api.service.js
 * Layer: Services
 * Responsibility:
 * - Handle all API requests
 * - Communicate with backend
 * - Standardize request/response handling
 * ---------------------------------------------------------
 * Version: 0.2.1
 * ---------------------------------------------------------
 */

import API_CONFIG from "../../config/api.config.js";

class ApiService {
    constructor() {
        this.name = "ApiService";
        this.baseURL = API_CONFIG.baseURL || "";
        this.timeout = API_CONFIG.timeout || 30000;
        this.headers = API_CONFIG.headers || {
            "Content-Type": "application/json"
        };
    }

    async post(action, payload = {}) {
        return this.request({
            method: "POST",
            body: {
                action,
                ...payload
            }
        });
    }

    async get(action, params = {}) {
        return this.request({
            method: "GET",
            params: {
                action,
                ...params
            }
        });
    }

    async request(options = {}) {
        if (!this.baseURL) {
            console.warn("API baseURL is not configured");

            return {
                ok: false,
                status: 0,
                message: "API baseURL is not configured",
                data: null
            };
        }

        if (!navigator.onLine) {
            return {
                ok: false,
                status: 0,
                message: "No internet connection",
                data: null
            };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, this.timeout);

        try {
            const url = this.buildURL(options.params);

            const fetchOptions = {
                method: options.method || "GET",
                headers: this.headers,
                signal: controller.signal
            };

            if (options.body) {
                fetchOptions.body = JSON.stringify(options.body);
            }

            const response = await fetch(url, fetchOptions);

            clearTimeout(timeoutId);

            const data = await this.parseResponse(response);

            if (!response.ok) {
                return {
                    ok: false,
                    status: response.status,
                    message: this.getStatusMessage(response.status, data),
                    data
                };
            }

            return {
                ok: true,
                status: response.status,
                message: data?.message || "Request completed successfully",
                data
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === "AbortError") {
                return {
                    ok: false,
                    status: 0,
                    message: "API request timeout",
                    data: null
                };
            }

            return {
                ok: false,
                status: 0,
                message: error.message || "Network error",
                data: null
            };
        }
    }

    async parseResponse(response) {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }

    buildURL(params = null) {
        if (!params) {
            return this.baseURL;
        }

        const query = new URLSearchParams(params).toString();

        return `${this.baseURL}?${query}`;
    }

    getStatusMessage(status, data = null) {
        if (data?.message) {
            return data.message;
        }

        switch (status) {
            case 400:
                return "Bad request";
            case 401:
                return "Unauthorized";
            case 403:
                return "Forbidden";
            case 404:
                return "API endpoint not found";
            case 500:
                return "Internal server error";
            default:
                return "API request failed";
        }
    }
}

export default new ApiService();