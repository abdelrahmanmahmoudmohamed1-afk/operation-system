class AuditService {
    constructor() {
        this.key = "toledo_audit_history_v1";
        this.max = 500;
    }

    getCurrentUser() {
        try {
            const raw = localStorage.getItem("toledo_user") || sessionStorage.getItem("toledo_user") || localStorage.getItem("user") || "{}";
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
        window.dispatchEvent(new CustomEvent("toledo:audit", { detail: item }));
        return item;
    }

    clear() {
        localStorage.removeItem(this.key);
        window.dispatchEvent(new CustomEvent("toledo:audit-cleared"));
    }
}

export { AuditService };
export default new AuditService();
