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

        const allowedRoutes = PERMISSIONS[role] || [];

        return allowedRoutes.includes(route);
    }

    getAllowedRoutes(role) {
        return PERMISSIONS[role] || [];
    }

    canAny(role, routes = []) {
        return routes.some((route) => this.can(role, route));
    }
}

export default new PermissionManager();