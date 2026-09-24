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
        document.querySelectorAll(".user-list-card").forEach(card => card.addEventListener("click", (e) => {
            if (e.target.closest(".user-manage-btn")) return;
            this.selectedUser = card.dataset.username || "";
            document.getElementById("history-title").textContent = `${card.querySelector("strong")?.textContent || this.selectedUser} History`;
            this.drawUsers();
            this.loadHistory();
        }));
        document.querySelectorAll(".user-manage-btn").forEach(btn => btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const user = this.users.find(x => String(x.id) === String(btn.dataset.userId)) || this.users.find(x => x.username === btn.dataset.username);
            if (user) this.openManageUser(user);
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
        ["user-manage-close","user-manage-cancel"].forEach(id => document.getElementById(id)?.addEventListener("click", () => this.toggleManageModal(false)));
        document.getElementById("user-manage-save")?.addEventListener("click", () => this.updateUser());
        document.getElementById("user-password-generate")?.addEventListener("click", () => this.resetPassword(true));
        document.getElementById("user-password-reset")?.addEventListener("click", () => this.resetPassword(false));
        document.getElementById("manage-user-role")?.addEventListener("change", () => this.syncPermissionMatrixRole("manage"));
        document.getElementById("new-user-role")?.addEventListener("change", () => this.syncPermissionMatrixRole("create"));
        document.querySelectorAll(".permission-preset").forEach(btn => btn.addEventListener("click", () => this.applyPermissionPreset(btn.dataset.prefix, btn.dataset.preset)));
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
        if (show) this.syncPermissionMatrixRole("create");
    }

    openManageUser(user) {
        document.getElementById("manage-user-id").value = user.id || "";
        document.getElementById("manage-user-role").value = String(user.role || "user").toLowerCase();
        document.getElementById("manage-user-active").value = user.active === false ? "false" : "true";
        document.getElementById("manage-user-caption").textContent = `${user.name || user.username} (@${user.username || ""})`;
        const explicit = Array.isArray(user.permissions) ? user.permissions : null;
        document.querySelectorAll('.permission-checkbox[data-prefix="manage"]').forEach(cb => {
            cb.checked = explicit === null ? true : explicit.includes(cb.value);
        });
        this.syncPermissionMatrixRole("manage");
        const pw=document.getElementById("manage-user-new-password"); if(pw) pw.value="";
        document.getElementById("developer-password-result")?.classList.add("hidden");
        this.toggleManageModal(true);
    }

    getPermissionValues(prefix) {
        return Array.from(document.querySelectorAll(`.permission-checkbox[data-prefix="${prefix}"]:checked`)).map(x => x.value);
    }

    syncPermissionMatrixRole(prefix) {
        const roleId = prefix === "manage" ? "manage-user-role" : "new-user-role";
        const role = String(document.getElementById(roleId)?.value || "user").toLowerCase();
        const isAdmin = role === "admin";
        document.querySelectorAll(`.permission-checkbox[data-prefix="${prefix}"]`).forEach(cb => cb.disabled = isAdmin);
        document.querySelectorAll(`.permission-preset[data-prefix="${prefix}"]`).forEach(btn => btn.disabled = isAdmin);
        document.getElementById(`${prefix}-permission-admin-note`)?.classList.toggle("hidden", !isAdmin);
    }

    applyPermissionPreset(prefix, preset) {
        const presets = {
            all: ["commandcenter","overview","dashboard","inventory","digitaltwin","payment","crm","salesoperations","leads","orientation","eoi","achievement","reports","tasks","analytics","quality","contracts","documents","settings"],
            ops: ["commandcenter","overview","dashboard","inventory","digitaltwin","payment","crm","salesoperations","leads","orientation","eoi","achievement","reports","analytics","quality","contracts","documents","settings"],
            sales: ["overview","dashboard","crm","leads","orientation","eoi","achievement","reports","tasks","analytics"],
            viewer: ["overview","dashboard","inventory","achievement","reports","analytics"],
            none: []
        };
        const selected = new Set(presets[preset] || []);
        document.querySelectorAll(`.permission-checkbox[data-prefix="${prefix}"]`).forEach(cb => cb.checked = selected.has(cb.value));
    }

    toggleManageModal(show) {
        document.getElementById("user-manage-modal")?.classList.toggle("hidden", !show);
    }

    async updateUser() {
        const id = document.getElementById("manage-user-id")?.value || "";
        const role = document.getElementById("manage-user-role")?.value || "user";
        const active = document.getElementById("manage-user-active")?.value !== "false";
        const permissions = this.getPermissionValues("manage");
        if (!id) return this.notify().warning("User ID is missing.");
        if (role === "user" && permissions.length === 0) return this.notify().warning("Select at least one module for this User, or set the account Inactive.");
        const button = document.getElementById("user-manage-save");
        try {
            if (button) { button.disabled = true; button.textContent = "Saving..."; }
            await UsersService.updateUser({ id, role, active, permissions });
            this.notify().success("User permissions updated");
            this.toggleManageModal(false);
            await this.loadAll(true);
        } catch (error) { this.notify().error(error.message); }
        finally { if (button) { button.disabled = false; button.textContent = "Save Changes"; } }
    }

    async resetPassword(generate = false) {
        const id=document.getElementById("manage-user-id")?.value||"";
        const input=document.getElementById("manage-user-new-password");
        const forceChange=Boolean(document.getElementById("manage-user-force-password")?.checked);
        const password=String(input?.value||"");
        if(!generate && password.length<10) return this.notify().warning("Enter a password of at least 10 characters, or use Generate Temporary Password.");
        try {
            const result=await UsersService.resetPassword({id,password,generate,forceChange});
            if(result?.temporaryPassword){ if(input) input.value=result.temporaryPassword; const value=document.getElementById("developer-password-value"); if(value)value.textContent=result.temporaryPassword; document.getElementById("developer-password-result")?.classList.remove("hidden"); }
            else { document.getElementById("developer-password-result")?.classList.add("hidden"); }
            this.notify().success(result?.message||"Password reset successfully");
        } catch(error){ this.notify().error(error.message); }
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
            active: Boolean(document.getElementById("new-user-active")?.checked),
            permissions: this.getPermissionValues("create")
        };
        if (!data.name || !data.username || !data.email || !data.password) return this.notify().warning("Name, username, email and password are required.");
        if (String(data.role || "user").toLowerCase() === "user" && data.permissions.length === 0) return this.notify().warning("Select at least one module for this User.");
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
