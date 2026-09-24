/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: eoi.service.js
 * Layer: Services
 * Responsibility:
 * - EOI bootstrap data, save, and analytics
 * ---------------------------------------------------------
 * Version: 0.1.0
 * ---------------------------------------------------------
 */

import Container from "../core/container.js";
import ENDPOINTS from "../constants/endpoints.js";

class EOIService {
    api() {
        return Container.get("api");
    }

    token() {
        return Container.get("authManager").getToken();
    }

    async getBootstrap() {
        const res = await this.api().post(ENDPOINTS.EOI_FORM_BOOTSTRAP, {});
        return this.unwrap(res);
    }

    async save(data) {
        const res = await this.api().post(ENDPOINTS.SAVE_EOI, { token: this.token(), data });
        return this.unwrap(res);
    }

    async getData(filters = {}) {
        const res = await this.api().post(ENDPOINTS.EOI_DATA, { token: this.token(), filters });
        return this.unwrap(res);
    }

    unwrap(res) {
        if (!res.ok || !res.data || !res.data.ok) {
            throw new Error((res.data && res.data.message) || res.message || "Request failed");
        }
        return res.data.data;
    }
}

export default new EOIService();
