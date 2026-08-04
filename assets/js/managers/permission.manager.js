/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: permission.manager.js
 * Layer: Managers
 * Responsibility:
 * - Manage route permissions
 * ---------------------------------------------------------
 * Version: 0.3.0
 * ---------------------------------------------------------
 */

import PERMISSIONS from "../../config/permissions.config.js";

class PermissionManager {
    can(role, route) {
        if (!role || !route) {
            return false;
        }

        const roleKey = String(role).trim().toLowerCase();
        const routeKey = String(route).trim().toLowerCase();
        const allowedRoutes = PERMISSIONS[roleKey] || [];

        return allowedRoutes.includes(routeKey);
    }

    getAllowedRoutes(role) {
        return PERMISSIONS[String(role || "").trim().toLowerCase()] || [];
    }

    canAny(role, routes = []) {
        return routes.some((route) => this.can(role, route));
    }
}

export default new PermissionManager();