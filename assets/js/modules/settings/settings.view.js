import { escapeHtml } from "../../utils/helpers.js";

const themeMeta = [
    ["genius", "Genius", "Financial terminal glass style"],
    
    ["odoo", "Odoo ERP", "Clean ERP workspace with purple accent"],
    ["oracle", "Oracle ERP", "White executive workspace with red accent"],
    ["sap", "SAP Fiori", "Clear blue enterprise operations theme"],
    ["aurora", "Aurora", "Blue violet premium glow"],
    ["obsidian", "Obsidian", "Deep black executive UI"],
    ["executive", "Executive", "Warm brass boardroom theme"],
    ["dark", "Dark", "Classic dark mode"],
    ["light", "Light", "Clean light workspace"]
];

function checked(value) { return value ? "checked" : ""; }

function settingSwitch(id, title, desc, isChecked = false) {
    return `
        <label class="settings-switch-row">
            <span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(desc)}</small></span>
            <input type="checkbox" id="${escapeHtml(id)}" ${checked(isChecked)}>
            <i></i>
        </label>`;
}

function auditRows(history = []) {
    if (!history.length) return `<div class="state-box state-block"><div class="state-icon">i</div><span>No activity recorded yet.</span></div>`;
    return history.slice(0, 80).map((x) => `
        <div class="audit-row detail-row" data-detail='${escapeHtml(JSON.stringify(x))}'>
            <div><strong>${escapeHtml(x.action)}</strong><span>${escapeHtml(x.module)} · ${escapeHtml(x.user)} · ${escapeHtml(x.role || "")}</span></div>
            <time>${escapeHtml(new Date(x.createdAt).toLocaleString())}</time>
        </div>
    `).join("");
}

export function renderLayout(user, currentTheme, prefs = {}, history = []) {
    const themeCard = (value, title, desc) => `
        <label class="theme-option ${currentTheme === value ? "active" : ""}">
            <input type="radio" name="settings-theme-radio" value="${value}" ${currentTheme === value ? "checked" : ""}>
            <span class="theme-swatch theme-${value}"></span>
            <strong>${title}</strong>
            <small>${desc}</small>
        </label>`;

    return `
        <div class="page-header enterprise-page-head settings-hero-head">
            <div>
                <span class="report-eyebrow">Operation System control center</span>
                <h1>Settings</h1>
                <p>Appearance, language, audit history, workflow behavior, reporting defaults and system preferences.</p>
            </div>
            <div class="settings-head-actions">
                <button class="btn btn-outline" id="settings-export-audit">Export History</button>
                <button class="btn btn-primary" id="settings-save-preferences">Save Preferences</button>
            </div>
        </div>

        <div class="settings-command-center">
            <div class="settings-mini-card"><span>Current User</span><strong>${escapeHtml(user?.name || user?.user || "User")}</strong></div>
            <div class="settings-mini-card"><span>Role</span><strong>${escapeHtml(user?.role || "Admin")}</strong></div>
            <div class="settings-mini-card"><span>Language</span><strong>${escapeHtml((prefs.language || localStorage.getItem("operation_language") || "en").toUpperCase())}</strong></div>
            <div class="settings-mini-card"><span>Audit Events</span><strong>${history.length}</strong></div>
        </div>

        <div class="settings-grid-pro settings-grid-wide">
            <div class="card settings-profile-card">
                <div class="report-builder-topline"><div><span class="report-eyebrow">Account</span><h2>User Profile</h2></div></div>
                <div class="form-grid premium-form-grid">
                    <div class="field-full"><label>Name</label><input class="premium-input" type="text" value="${escapeHtml(user?.name || "")}" disabled></div>
                    <div><label>Username</label><input class="premium-input" type="text" value="${escapeHtml(user?.user || user?.username || "")}" disabled></div>
                    <div><label>Role</label><input class="premium-input" type="text" value="${escapeHtml(user?.role || "")}" disabled></div>
                </div>
            </div>

            <div class="card settings-profile-card">
                <div class="report-builder-topline"><div><span class="report-eyebrow">Security</span><h2>Change Password</h2></div></div>
                <form id="settings-password-form" class="form-grid premium-form-grid">
                    <div class="field-full"><label>Current Password</label><input class="premium-input" type="password" name="oldPassword" required></div>
                    <div class="field-full"><label>New Password</label><input class="premium-input" type="password" name="newPassword" required minlength="6"></div>
                    <p class="form-error hidden" id="settings-pw-error"></p>
                    <div class="form-actions field-full"><button type="submit" class="btn btn-primary">Update Password</button></div>
                </form>
            </div>
        </div>

        <div class="card settings-theme-card">
            <div class="report-builder-topline">
                <div><span class="report-eyebrow">Appearance</span><h2>Premium Themes</h2></div>
                <select id="settings-theme-select" class="premium-select compact-theme-select">
                    ${themeMeta.map(([value, title]) => `<option value="${value}" ${currentTheme === value ? "selected" : ""}>${title}</option>`).join("")}
                </select>
            </div>
            <div class="theme-options-grid">
                ${themeMeta.map(([v,t,d]) => themeCard(v,t,d)).join("")}
            </div>
        </div>

        <div class="settings-grid-pro settings-grid-wide">
            <div class="card settings-panel-pro">
                <div class="report-builder-topline"><div><span class="report-eyebrow">Language & Display</span><h2>Workspace Preferences</h2></div></div>
                <div class="settings-preferences-list">
                    <div class="settings-input-row"><label>System Language</label><select id="settings-language" class="premium-select"><option value="en">English</option><option value="ar">Arabic</option></select></div>
                    <div class="settings-input-row"><label>Number Format</label><select id="settings-number-format" class="premium-select"><option value="en-EG">English Egypt</option><option value="ar-EG">Arabic Egypt</option><option value="en-US">English US</option></select></div>
                    <div class="settings-input-row"><label>Default Landing Page</label><select id="settings-default-route" class="premium-select"><option value="overview">Overview</option><option value="dashboard">Dashboard</option><option value="reports">Reports</option><option value="inventory">Inventory</option></select></div>
                    ${settingSwitch("settings-compact-mode", "Compact density", "Reduce vertical spacing for data-heavy pages", prefs.compactMode)}
                    ${settingSwitch("settings-animations", "Smooth animations", "Keep responsive visual feedback across the system", prefs.animations !== false)}
                    ${settingSwitch("settings-show-details", "Click-to-details", "Open details panel when clicking rows and cards", prefs.showDetails !== false)}
                </div>
            </div>

            <div class="card settings-panel-pro">
                <div class="report-builder-topline"><div><span class="report-eyebrow">Reports Defaults</span><h2>Report Builder Options</h2></div></div>
                <div class="settings-preferences-list">
                    <div class="settings-input-row"><label>Default Report Source</label><select id="settings-report-source" class="premium-select"><option value="auto">Smart Detailed Report</option><option value="inventory">Inventory Snapshot</option><option value="contracts">Contracts</option><option value="salesPerformance">Sales Performance</option></select></div>
                    <div class="settings-input-row"><label>Default Export</label><select id="settings-export-format" class="premium-select"><option value="csv">CSV</option><option value="json">JSON</option><option value="print">Print</option></select></div>
                    <div class="settings-input-row"><label>Rows Preview Limit</label><input id="settings-row-limit" class="premium-input" type="number" min="100" max="5000" value="${escapeHtml(prefs.rowLimit || 500)}"></div>
                    ${settingSwitch("settings-autosave-reports", "Auto-save report views", "Keep last used filters after update or refresh", prefs.autoSaveReports !== false)}
                    ${settingSwitch("settings-show-report-kpis", "Show report KPIs", "Display contracted, sold, reserved, spaces and average price cards", prefs.showReportKpis !== false)}
                    ${settingSwitch("settings-export-with-filters", "Export filter summary", "Include filter metadata in exported reports", prefs.exportWithFilters)}
                </div>
            </div>
        </div>

        <div class="card settings-panel-pro ai-integrations-card">
            <div class="report-builder-topline"><div><span class="report-eyebrow">Operation AI</span><h2>Agent Capabilities · Strategy Engine</h2></div><span class="status-badge">Agent Mode</span></div>
            <div class="ai-capability-grid">
                <div class="ai-capability"><strong>Arabic + English</strong><span>Understands Egyptian Arabic commands and English queries.</span><em class="audit-success">Active</em></div>
                <div class="ai-capability"><strong>Workspace Actions</strong><span>Navigation, filters, reports, CRM lookups and task creation.</span><em class="audit-success">Active</em></div>
                <div class="ai-capability"><strong>Reminders</strong><span>Persistent in-browser reminders with notification and sound while the workspace is running.</span><em class="audit-success">Active</em></div>
                <div class="ai-capability"><strong>Email</strong><span>Creates a reviewed compose window. Direct background sending requires a Gmail/Outlook OAuth backend connection.</span><em>Review required</em></div>
            </div>
        </div>

        <div class="settings-grid-pro settings-grid-wide">
            <div class="card settings-panel-pro">
                <div class="report-builder-topline"><div><span class="report-eyebrow">Workflow</span><h2>Operational Controls</h2></div></div>
                <div class="settings-preferences-list">
                    ${settingSwitch("settings-confirm-delete", "Confirm destructive actions", "Ask before delete, reset or archive operations", prefs.confirmDelete !== false)}
                    ${settingSwitch("settings-success-toasts", "Success notifications", "Show saved / updated / exported messages", prefs.successToasts !== false)}
                    ${settingSwitch("settings-error-toasts", "Error notifications", "Show clear messages when anything fails", prefs.errorToasts !== false)}
                    ${settingSwitch("settings-save-history", "Activity history", "Record who opened, saved, exported or changed anything", prefs.saveHistory !== false)}
                </div>
            </div>

            <div class="card settings-panel-pro audit-panel-card">
                <div class="report-builder-topline">
                    <div><span class="report-eyebrow">Audit Trail</span><h2>Activity History</h2></div>
                    <button class="btn btn-outline" id="settings-clear-audit">Clear</button>
                </div>
                <div class="audit-list" id="settings-audit-list">${auditRows(history)}</div>
            </div>
        </div>
    `;
}
