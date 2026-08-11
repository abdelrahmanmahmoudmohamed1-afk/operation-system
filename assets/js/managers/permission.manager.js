/**
 * Per-user module authorization.
 * Admin always retains full access. User accounts may carry an explicit
 * permissions array from Supabase; null/undefined falls back to role defaults.
 */
import PERMISSIONS from "../../config/permissions.config.js";

class PermissionManager {
    normalizeSubject(subject) {
        if (subject && typeof subject === "object") return subject;
        return { role: String(subject || "user") };
    }

    getAllowedRoutes(subject) {
        const user = this.normalizeSubject(subject);
        const role = String(user.role || "user").trim().toLowerCase();
        if (role === "admin") return [...(PERMISSIONS.admin || [])];
        if (Array.isArray(user.permissions)) {
            return [...new Set(user.permissions.map(x => String(x || "").trim().toLowerCase()).filter(Boolean))];
        }
        return [...(PERMISSIONS[role] || [])];
    }

    can(subject, route) {
        if (!subject || !route) return false;
        const routeKey = String(route).trim().toLowerCase();
        return this.getAllowedRoutes(subject).includes(routeKey);
    }

    canAny(subject, routes = []) {
        return routes.some(route => this.can(subject, route));
    }

    getDefaultRoute(subject) {
        const allowed = this.getAllowedRoutes(subject);
        return allowed.includes("overview") ? "overview" : (allowed[0] || "settings");
    }
}

export default new PermissionManager();
