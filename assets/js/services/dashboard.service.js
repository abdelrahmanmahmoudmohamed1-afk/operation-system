/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: dashboard.service.js
 * Layer: Services
 * Responsibility:
 * - Fetch dashboard filters + KPI data from the backend
 * ---------------------------------------------------------
 * Version: 0.1.0
 * ---------------------------------------------------------
 */

import Container from "../core/container.js";
import ENDPOINTS from "../constants/endpoints.js";

class DashboardService {
    constructor() {
        this.cache = new Map();
        this.cacheMs = 60000;
    }
    api() {
        return Container.get("api");
    }

    token() {
        return Container.get("authManager").getToken();
    }

    async getFilters() {
        const res = await this.api().post(ENDPOINTS.DASHBOARD_FILTERS, { token: this.token() });
        return this.unwrap(res);
    }

    async getData(filters, options = {}) {
        const key = JSON.stringify(filters || {});
        const cached = this.cache.get(key);
        if (!options.force && cached && Date.now() - cached.time < this.cacheMs) return cached.data;
        const res = await this.api().post(ENDPOINTS.DASHBOARD_DATA, { token: this.token(), filters });
        const data = this.unwrap(res);
        this.cache.set(key, { time: Date.now(), data });
        return data;
    }

    clearCache() { this.cache.clear(); }

    unwrap(res) {
        if (!res.ok || !res.data || !res.data.ok) {
            throw new Error((res.data && res.data.message) || res.message || "Request failed");
        }
        return res.data.data;
    }
}

export default new DashboardService();
