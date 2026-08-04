/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: inventory.service.js
 * Layer: Services
 * Responsibility:
 * - Inventory units, available projects/units, Layana units
 * ---------------------------------------------------------
 * Version: 0.1.0
 * ---------------------------------------------------------
 */

import Container from "../core/container.js";
import ENDPOINTS from "../constants/endpoints.js";

class InventoryService {
    api() {
        return Container.get("api");
    }

    token() {
        return Container.get("authManager").getToken();
    }

    async getData(filters = {}) {
        const res = await this.api().post(ENDPOINTS.INVENTORY_DATA, { token: this.token(), filters });
        return this.unwrap(res);
    }

    async getProjects() {
        const res = await this.api().post(ENDPOINTS.INVENTORY_PROJECTS, {});
        return this.unwrap(res);
    }

    async getAvailableUnitsByProject(project) {
        const res = await this.api().post(ENDPOINTS.AVAILABLE_UNITS_BY_PROJECT, { project });
        return this.unwrap(res);
    }

    async getLayanaUnits() {
        const res = await this.api().post(ENDPOINTS.AVAILABLE_LAYANA_UNITS, { token: this.token() });
        return this.unwrap(res);
    }

    async refreshLayanaUnits() {
        const res = await this.api().post(ENDPOINTS.REFRESH_LAYANA_UNITS, { token: this.token() });
        return this.unwrap(res);
    }

    unwrap(res) {
        if (!res.ok || !res.data || !res.data.ok) {
            throw new Error((res.data && res.data.message) || res.message || "Request failed");
        }
        return res.data.data;
    }
}

export default new InventoryService();
