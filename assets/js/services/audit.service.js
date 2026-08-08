import Container from "../core/container.js";

class AuditService {
    constructor() {
        this.key = "operation_audit_history_v1";
        this.max = 500;
    }

    getCurrentUser() {
        try {
            const raw = localStorage.getItem("operation_user") || sessionStorage.getItem("operation_user") || localStorage.getItem("user") || "{}";
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }

    list(limit = 100) {
        try {
            return JSON.parse(localStorage.getItem(this.key) || "[]").slice(0, limit);
        } catch {
            return [];
        }
    }

    record(action, module = "System", details = {}) {
        const user = this.getCurrentUser();
        const item = {
            id: `AUD-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
            action: String(action || "Action"),
            module: String(module || "System"),
            user: user?.name || user?.username || user?.user || "Current User",
            role: user?.role || "User",
            details,
            url: location.hash || location.pathname,
            createdAt: new Date().toISOString()
        };
        const list = [item, ...this.list(this.max - 1)];
        localStorage.setItem(this.key, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent("operation:audit", { detail: item }));
        this.syncImportantActivity(item);
        return item;
    }

    syncImportantActivity(item) {
        const shouldSync = /^(Open module|Report .*exported|Frontend error|Unhandled error)$/i.test(item.action || "");
        if (!shouldSync) return;
        try {
            const api = Container.get("api");
            const auth = Container.get("authManager");
            const token = auth?.getToken?.();
            if (!api || !token) return;
            // Fire-and-forget: audit must never slow navigation or exports.
            Promise.resolve().then(() => api.post("recordUserActivity", {
                token,
                data: { action: item.action, module: item.module, details: item.details, route: item.url }
            }, { cacheTTL: 0 })).catch(() => {});
        } catch (_) {}
    }

    clear() {
        localStorage.removeItem(this.key);
        window.dispatchEvent(new CustomEvent("operation:audit-cleared"));
    }
}

export { AuditService };
export default new AuditService();
