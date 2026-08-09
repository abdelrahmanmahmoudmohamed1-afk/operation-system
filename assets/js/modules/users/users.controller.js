import Module from "../../core/module.js";
import UsersService from "./users.service.js";
import { renderLayout, renderUsers, renderAudit } from "./users.view.js";

class UsersController extends Module {
    constructor() {
        super();
        this.users = [];
        this.history = [];
        this.selectedUser = "";
    }

    async render() {
        this.container.innerHTML = renderLayout();
        await this.loadAll();
    }

    async loadAll(force = false) {
        try {
            const [userData, history] = await Promise.all([
                UsersService.loadUsers(force),
                UsersService.loadHistory({ limit: 1000 }, force)
            ]);
            this.users = userData.users || [];
            this.history = history || [];
            this.updateSummary(userData.summary || {});
            this.drawUsers();
            this.drawHistory();
        } catch (error) {
            this.logger().error("Users module failed", error);
            this.notify().error(error.message);
        }
    }

    updateSummary(s) {
        [["users-total",s.total],["users-active",s.active],["users-inactive",s.inactive],["users-roles",s.roles]].forEach(([id,v]) => {
            const el = document.getElementById(id); if (el) el.textContent = Number(v || 0).toLocaleString();
        });
    }

    drawUsers() {
        const q = (document.getElementById("users-search")?.value || "").toLowerCase();
        const rows = this.users.filter(u => [u.name,u.username,u.role,u.manager,u.director].join(" ").toLowerCase().includes(q));
        document.getElementById("users-list").innerHTML = renderUsers(rows, this.selectedUser);
        document.querySelectorAll(".user-list-card").forEach(btn => btn.addEventListener("click", () => {
            this.selectedUser = btn.dataset.username || "";
            document.getElementById("history-title").textContent = `${btn.querySelector("strong")?.textContent || this.selectedUser} History`;
            this.drawUsers();
            this.loadHistory();
        }));
    }

    async loadHistory(force = false) {
        try {
            const search = document.getElementById("audit-search")?.value || "";
            const module = document.getElementById("audit-module")?.value || "";
            this.history = await UsersService.loadHistory({ username: this.selectedUser, search, module, limit: 1500 }, force);
            this.drawHistory();
        } catch (error) { this.notify().error(error.message); }
    }

    drawHistory() {
        const result = document.getElementById("audit-result")?.value || "";
        const body = document.getElementById("users-audit-body");
        if (body) body.innerHTML = renderAudit(this.history, result);
    }

    bindEvents() {
        document.getElementById("users-search")?.addEventListener("input", () => this.drawUsers());
        document.getElementById("users-add-btn")?.addEventListener("click", () => this.toggleCreateModal(true));
        ["user-create-close","user-create-cancel"].forEach(id => document.getElementById(id)?.addEventListener("click", () => this.toggleCreateModal(false)));
        document.getElementById("user-create-save")?.addEventListener("click", () => this.createUser());
        document.getElementById("users-refresh-btn")?.addEventListener("click", () => this.loadAll(true));
        document.getElementById("audit-apply")?.addEventListener("click", () => this.loadHistory(true));
        document.getElementById("audit-result")?.addEventListener("change", () => this.drawHistory());
        document.getElementById("users-clear-filter")?.addEventListener("click", () => {
            this.selectedUser = "";
            document.getElementById("history-title").textContent = "All User Activity";
            this.drawUsers();
            this.loadHistory(true);
        });
        document.getElementById("users-export-btn")?.addEventListener("click", () => this.exportCsv());
    }

    toggleCreateModal(show) {
        document.getElementById("user-create-modal")?.classList.toggle("hidden", !show);
    }

    async createUser() {
        const button = document.getElementById("user-create-save");
        const data = {
            name: document.getElementById("new-user-name")?.value.trim(),
            username: document.getElementById("new-user-username")?.value.trim(),
            password: document.getElementById("new-user-password")?.value,
            role: document.getElementById("new-user-role")?.value,
            manager: document.getElementById("new-user-manager")?.value.trim(),
            director: document.getElementById("new-user-director")?.value.trim(),
            email: document.getElementById("new-user-email")?.value.trim(),
            mobile: document.getElementById("new-user-mobile")?.value.trim(),
            active: Boolean(document.getElementById("new-user-active")?.checked)
        };
        if (!data.name || !data.username || !data.email || !data.password) return this.notify().warning("Name, username, email and password are required.");
        if (data.password.length < 10) return this.notify().warning("Password must be at least 10 characters.");
        try {
            window.dispatchEvent(new CustomEvent("operation:busy", { detail: { active: true, kind: "user", message: "Creating secure user account…" } }));
            if (button) { button.disabled = true; button.textContent = "Creating..."; }
            await UsersService.createUser(data);
            this.notify().success("User created successfully");
            this.toggleCreateModal(false);
            await this.loadAll(true);
        } catch (error) { this.notify().error(error.message); }
        finally { window.dispatchEvent(new CustomEvent("operation:busy", { detail: { active: false } })); if (button) { button.disabled = false; button.textContent = "Create User"; } }
    }

    exportCsv() {
        const rows = [["Date & Time","User","Username","Role","Action","Module","Success","Duration Ms","Details"], ...this.history.map(x => [x.timestamp,x.userName,x.username,x.role,x.action,x.module,x.success,x.durationMs,x.details])];
        const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
        a.download = `user-history-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        this.notify().success("User history exported");
    }
}

export default new UsersController();
