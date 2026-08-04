import { escapeHtml } from "../../utils/helpers.js";

function initials(name = "") {
    return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "U";
}

export function renderLayout(summary = {}) {
    return `
        <div class="page-header enterprise-page-head">
            <div>
                <span class="report-eyebrow">Access and accountability</span>
                <h1>Users</h1>
                <p>See every user, what they did, the exact date and time, and a complete individual history.</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" id="users-add-btn">Add User</button>
                <button class="btn btn-outline" id="users-export-btn">Export History</button>
                <button class="btn btn-primary" id="users-refresh-btn">Refresh</button>
            </div>
        </div>

        <div class="users-summary-grid">
            <div class="metric-card"><span>Total Users</span><strong class="viz-stat-value" id="users-total">${summary.total || 0}</strong></div>
            <div class="metric-card"><span>Active</span><strong class="viz-stat-value" id="users-active">${summary.active || 0}</strong></div>
            <div class="metric-card"><span>Inactive</span><strong class="viz-stat-value" id="users-inactive">${summary.inactive || 0}</strong></div>
            <div class="metric-card"><span>Roles</span><strong class="viz-stat-value" id="users-roles">${summary.roles || 0}</strong></div>
        </div>

        <div class="users-panel-grid">
            <section class="card">
                <div class="report-builder-topline"><div><span class="report-eyebrow">Directory</span><h2>System Users</h2></div></div>
                <div class="filter-field"><label>Search users</label><input id="users-search" class="premium-input" placeholder="Name, username or role"></div>
                <div class="users-list" id="users-list"></div>
            </section>

            <section class="card">
                <div class="report-builder-topline">
                    <div><span class="report-eyebrow">Server audit trail</span><h2 id="history-title">All User Activity</h2></div>
                    <button class="btn btn-outline" id="users-clear-filter">Show All</button>
                </div>
                <div class="audit-toolbar">
                    <input id="audit-search" class="premium-input" placeholder="Search action or details">
                    <select id="audit-module" class="premium-select"><option value="">All modules</option><option>Authentication</option><option>Dashboard</option><option>Inventory</option><option>CRM</option><option>EOI</option><option>Reports</option><option>Users</option><option>System</option></select>
                    <select id="audit-result" class="premium-select"><option value="">All results</option><option value="success">Success</option><option value="failed">Failed</option></select>
                    <button class="btn btn-outline" id="audit-apply">Apply</button>
                </div>
                <div class="table-wrap audit-table-scroll">
                    <table class="data-table">
                        <thead><tr><th>Date & Time</th><th>User</th><th>Action</th><th>Module</th><th>Result</th><th>Duration</th></tr></thead>
                        <tbody id="users-audit-body"><tr><td colspan="6" class="table-empty">Loading history...</td></tr></tbody>
                    </table>
                </div>
            </section>
        </div>

        <div class="modal-overlay hidden" id="user-create-modal">
            <div class="modal-box user-create-box">
                <div class="modal-head"><div><span class="report-eyebrow">Admin only</span><h2>Create User</h2></div><button class="modal-close" id="user-create-close" type="button">×</button></div>
                <div class="form-grid">
                    <label>Full Name<input id="new-user-name" class="premium-input" required></label>
                    <label>Username<input id="new-user-username" class="premium-input" required autocomplete="off"></label>
                    <label>Password<input id="new-user-password" class="premium-input" type="password" required autocomplete="new-password"></label>
                    <label>Role<select id="new-user-role" class="premium-select"><option value="User">User</option><option value="Admin">Admin</option></select></label>
                    <label>Sales Manager<input id="new-user-manager" class="premium-input"></label>
                    <label>Sales Director<input id="new-user-director" class="premium-input"></label>
                    <label>Email<input id="new-user-email" class="premium-input" type="email"></label>
                    <label>Mobile<input id="new-user-mobile" class="premium-input"></label>
                </div>
                <label class="form-check"><input class="form-check-input" id="new-user-active" type="checkbox" checked><span class="form-check-label">Active user</span></label>
                <div class="modal-actions"><button class="btn btn-outline" id="user-create-cancel" type="button">Cancel</button><button class="btn btn-primary" id="user-create-save" type="button">Create User</button></div>
            </div>
        </div>`;
}

export function renderUsers(users = [], selected = "") {
    if (!users.length) return `<div class="users-empty">No users found.</div>

        <div class="modal-overlay hidden" id="user-create-modal">
            <div class="modal-box user-create-box">
                <div class="modal-head"><div><span class="report-eyebrow">Admin only</span><h2>Create User</h2></div><button class="modal-close" id="user-create-close" type="button">×</button></div>
                <div class="form-grid">
                    <label>Full Name<input id="new-user-name" class="premium-input" required></label>
                    <label>Username<input id="new-user-username" class="premium-input" required autocomplete="off"></label>
                    <label>Password<input id="new-user-password" class="premium-input" type="password" required autocomplete="new-password"></label>
                    <label>Role<select id="new-user-role" class="premium-select"><option value="User">User</option><option value="Admin">Admin</option></select></label>
                    <label>Sales Manager<input id="new-user-manager" class="premium-input"></label>
                    <label>Sales Director<input id="new-user-director" class="premium-input"></label>
                    <label>Email<input id="new-user-email" class="premium-input" type="email"></label>
                    <label>Mobile<input id="new-user-mobile" class="premium-input"></label>
                </div>
                <label class="form-check"><input class="form-check-input" id="new-user-active" type="checkbox" checked><span class="form-check-label">Active user</span></label>
                <div class="modal-actions"><button class="btn btn-outline" id="user-create-cancel" type="button">Cancel</button><button class="btn btn-primary" id="user-create-save" type="button">Create User</button></div>
            </div>
        </div>`;
    return users.map(u => `
        <button type="button" class="user-list-card ${selected === u.username ? "active" : ""}" data-username="${escapeHtml(u.username)}">
            <span class="user-avatar-pro">${escapeHtml(initials(u.name || u.username))}</span>
            <span><strong>${escapeHtml(u.name || u.username)}</strong><small>@${escapeHtml(u.username)} · ${escapeHtml(u.role || "No role")}</small></span>
            <span class="badge ${u.active ? "badge-available" : "badge-cancelled"}">${u.active ? "Active" : "Inactive"}</span>
        </button>`).join("");
}

export function renderAudit(rows = [], resultFilter = "") {
    const filtered = resultFilter === "success" ? rows.filter(x => x.success) : resultFilter === "failed" ? rows.filter(x => !x.success) : rows;
    if (!filtered.length) return `<tr><td colspan="6" class="table-empty">No activity matches the selected filters.</td></tr>`;
    return filtered.map(x => `
        <tr class="detail-row" data-detail='${escapeHtml(JSON.stringify(x))}'>
            <td>${escapeHtml(new Date(x.timestamp).toLocaleString("en-GB"))}</td>
            <td><strong>${escapeHtml(x.userName || x.username || "Unknown")}</strong><br><small>${escapeHtml(x.role || "")}</small></td>
            <td>${escapeHtml(x.action)}</td>
            <td>${escapeHtml(x.module)}</td>
            <td><strong class="${x.success ? "audit-success" : "audit-failed"}">${x.success ? "Success" : "Failed"}</strong></td>
            <td>${escapeHtml(String(x.durationMs || 0))} ms</td>
        </tr>`).join("");
}
