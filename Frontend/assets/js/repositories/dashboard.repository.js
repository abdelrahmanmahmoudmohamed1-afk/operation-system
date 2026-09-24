/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: dashboard.repository.js
 * Layer: Repositories
 * Responsibility:
 * - Dashboard data access
 * ---------------------------------------------------------
 * Version: 0.2.1
 * ---------------------------------------------------------
 */

import Repository from "../core/repository.js";

class DashboardRepository extends Repository {
    constructor() {
        super("dashboard");
    }

    async getSummary() {
        return this.get("dashboard.getSummary");
    }
}

export default DashboardRepository;