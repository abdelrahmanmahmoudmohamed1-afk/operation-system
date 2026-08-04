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

    async getData(filters) {
        const res = await this.api().post(ENDPOINTS.DASHBOARD_DATA, { token: this.token(), filters });
        return this.unwrap(res);
    }

    unwrap(res) {
        if (!res.ok || !res.data || !res.data.ok) {
            throw new Error((res.data && res.data.message) || res.message || "Request failed");
        }
        return res.data.data;
    }
}

export default new DashboardService();
