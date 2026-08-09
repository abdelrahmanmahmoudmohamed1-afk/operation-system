import Module from "../../core/module.js";
import SettingsService from "./settings.service.js";
import AuditService from "../../services/audit.service.js";
import { renderLayout } from "./settings.view.js";

class SettingsController extends Module {
    constructor() {
        super();
        this.prefKey = "operation_system_preferences_v1";
    }

    async render() {
        const user = SettingsService.getCurrentUser();
        const theme = SettingsService.getTheme();
        const prefs = this.getPrefs();
        const history = AuditService.list(120);
        this.container.innerHTML = renderLayout(user, theme, prefs, history);
        this.applyPrefsToForm(prefs);
    }

    bindEvents() {
        const form = document.getElementById("settings-password-form");
        const themeSelect = document.getElementById("settings-theme-select");

        if (form) {
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                const errorBox = document.getElementById("settings-pw-error");
                const btn = form.querySelector("button[type='submit']");
                const { oldPassword, newPassword } = Object.fromEntries(new FormData(form).entries());

                btn.classList.add("is-loading");
                btn.disabled = true;
                const result = await SettingsService.changePassword(oldPassword, newPassword);
                btn.classList.remove("is-loading");
                btn.disabled = false;

                if (!result.success) {
                    errorBox.textContent = result.message;
                    errorBox.classList.remove("hidden");
                    AuditService.record("Password update failed", "Settings", { message: result.message });
                    return;
                }

                errorBox.classList.add("hidden");
                this.notify().success(result.message || "Password updated");
                AuditService.record("Password updated", "Settings", {});
                form.reset();
            });
        }

        const applyTheme = (value) => {
            SettingsService.setTheme(value);
            AuditService.record("Theme changed", "Settings", { theme: value });
            document.querySelectorAll(".theme-option").forEach((x) => {
                const input = x.querySelector("input");
                x.classList.toggle("active", input?.value === value);
            });
            if (themeSelect && themeSelect.value !== value) themeSelect.value = value;
            this.notify().success(`Theme applied: ${value}`);
        };

        themeSelect?.addEventListener("change", (e) => applyTheme(e.target.value));
        document.querySelectorAll("[name='settings-theme-radio']").forEach((radio) => {
            radio.addEventListener("change", (e) => applyTheme(e.target.value));
        });

        document.getElementById("settings-run-diagnostics")?.addEventListener("click", async () => {
            const out = document.getElementById("settings-diagnostics-result");
            const setPill = (id, text, ok = null) => {
                const el = document.getElementById(id); if (!el) return;
                el.textContent = text;
                el.classList.toggle("audit-success", ok === true);
                el.classList.toggle("audit-fail", ok === false);
            };
            if (out) out.innerHTML = `<div class="state-box state-loading" style="grid-column:1/-1"><span class="mini-spinner"></span><span>Running live checks across Vercel, Supabase, Google Sheets, Storage, OpenAI and Gmail…</span></div>`;
            try {
                const d = await SettingsService.getSystemDiagnostics();
                const info = d.info || {};
                const supabaseOk = !!info.supabase?.configured;
                const pgOk = !!info.postgres?.configured && info.postgres?.schema !== false;
                const sheetsOk = !!info.googleSheets?.configured;
                const sheetsLive = Number(info.googleSheets?.inventoryRows || 0) + Number(info.googleSheets?.clientRows || 0) + Number(info.googleSheets?.eoiRows || 0) + Number(info.googleSheets?.leadRows || 0);
                const storageOk = !!info.storage?.ok;
                const openAiOk = !!info.openai?.configured;
                const gmailConfigured = !!info.gmail?.configured;
                const gmailConnected = !!info.gmail?.connected;
                const counts = info.databaseCounts || {};
                setPill("openai-status-pill", openAiOk ? (info.openai?.model || "Configured") : "Key missing", openAiOk);
                setPill("gmail-status-pill", gmailConnected ? "Connected" : (gmailConfigured ? "Needs connect" : "OAuth missing"), gmailConnected ? true : false);
                const gmailCopy = document.getElementById("gmail-status-copy");
                if (gmailCopy) gmailCopy.textContent = gmailConnected ? `Connected as ${info.gmail?.accountEmail || "your Google account"}.` : (gmailConfigured ? "OAuth is configured. Connect the Gmail account that should send messages." : "Add Google Gmail OAuth credentials in Vercel first.");
                const status = (ok, yes="Connected", no="Missing") => `<em class="${ok ? "audit-success" : "audit-fail"}">${ok ? yes : no}</em>`;
                if (out) out.innerHTML = `
                    <div class="integrity-item"><span>Frontend</span><strong>${this.escapeHtml(info.runtime?.frontendBuild || "Enterprise X")}</strong>${status(true,"Ready")}</div>
                    <div class="integrity-item"><span>Vercel API</span><strong>${this.escapeHtml(info.runtime?.build || "Enterprise X")}</strong>${status(!!d.ok,"Connected","Failed")}</div>
                    <div class="integrity-item"><span>Supabase</span><strong>${pgOk ? "Postgres + Auth" : (supabaseOk ? "API only" : "Not configured")}</strong>${status(supabaseOk && pgOk,"Ready")}</div>
                    <div class="integrity-item"><span>Google Sheets</span><strong>${sheetsOk ? `${sheetsLive} live row(s)` : "Service account missing"}</strong>${status(sheetsOk, sheetsLive ? "Reading live data" : "Configured · no rows")}</div>
                    <div class="integrity-item"><span>Storage</span><strong>${this.escapeHtml(info.storage?.bucket || "operation-documents")}</strong>${status(storageOk,"Ready",info.storage?.message || "Unavailable")}</div>
                    <div class="integrity-item"><span>OpenAI</span><strong>${this.escapeHtml(info.openai?.model || "Not configured")}</strong>${status(openAiOk,"Ready","Create a new API key")}</div>
                    <div class="integrity-item"><span>Gmail</span><strong>${gmailConnected ? this.escapeHtml(info.gmail?.accountEmail || "Connected") : (gmailConfigured ? "OAuth ready" : "OAuth missing")}</strong>${status(gmailConnected,"Connected",gmailConfigured ? "Connect account" : "Not configured")}</div>
                    <div class="integrity-item"><span>Latency</span><strong>${Number(info.runtime?.latencyMs || d.latency || 0)} ms</strong><em>${Number(info.runtime?.latencyMs || d.latency || 0) < 1800 ? "Good" : "Slow"}</em></div>
                    <div class="integrity-database-summary" style="grid-column:1/-1"><strong>Central records</strong><span>Users ${Number(counts.profiles || 0)} · Documents ${Number(counts.documents || 0)} · Audit ${Number(counts.audit_logs || 0)} · Reminders ${Number(counts.reminders || 0)}</span></div>
                    ${!sheetsOk ? `<div class="state-box state-warning" style="grid-column:1/-1"><strong>Operational data is not connected yet</strong><span>Add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in Vercel, then share the Layana / Mersea / EOI / Leads Google Sheets with that service-account email. Until then the system will show Data Source Unavailable instead of pretending zero is real data.</span></div>` : ""}
                    ${!openAiOk ? `<div class="state-box state-warning" style="grid-column:1/-1"><strong>Operation AI brain is waiting</strong><span>Create a fresh OpenAI API key (the previously exposed key must stay revoked) and save it in Vercel as OPENAI_API_KEY, then redeploy.</span></div>` : ""}`;
            } catch (error) {
                if (out) out.innerHTML = `<div class="state-box state-error" style="grid-column:1/-1"><strong>Diagnostics failed</strong><span>${this.escapeHtml(error.message)}</span></div>`;
            }
        });

        document.getElementById("settings-check-gmail")?.addEventListener("click", async () => {
            try {
                const data = await SettingsService.getGmailStatus();
                const pill = document.getElementById("gmail-status-pill");
                const copy = document.getElementById("gmail-status-copy");
                if (pill) { pill.textContent = data.connected ? "Connected" : (data.configured ? "Needs connect" : "OAuth missing"); pill.classList.toggle("audit-success", !!data.connected); pill.classList.toggle("audit-fail", !data.connected); }
                if (copy) copy.textContent = data.connected ? `Connected as ${data.accountEmail || "your Google account"}.` : (data.configured ? "OAuth is ready. Connect your Gmail account once." : "Gmail OAuth credentials are not configured in Vercel yet.");
                this.notify()[data.connected ? "success" : "warning"](data.connected ? "Gmail is connected" : "Gmail is not connected yet");
            } catch (error) { this.notify().error(error.message || "Could not check Gmail"); }
        });

        document.getElementById("settings-connect-gmail")?.addEventListener("click", async () => {
            try {
                const url = await SettingsService.getGmailConnectUrl();
                if (!url) throw new Error("Gmail OAuth URL is unavailable. Add GOOGLE_GMAIL_CLIENT_ID and GOOGLE_GMAIL_CLIENT_SECRET in Vercel first.");
                window.open(url, "gmail-connect", "noopener,noreferrer,width=680,height=760");
                this.notify().info("Finish Google authorization in the new window, then use Check Gmail.");
            } catch (error) { this.notify().error(error.message || "Could not start Gmail connection"); }
        });
        document.getElementById("settings-save-preferences")?.addEventListener("click", () => this.savePrefs());
        document.getElementById("settings-export-audit")?.addEventListener("click", () => this.exportAudit());
        document.getElementById("settings-clear-audit")?.addEventListener("click", () => {
            if (!confirm("Clear local activity history?")) return;
            AuditService.clear();
            AuditService.record("Audit history cleared", "Settings", {});
            this.notify().success("History cleared");
            this.render();
            this.bindEvents();
        });
    }

    escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

    getPrefs() {
        try { return JSON.parse(localStorage.getItem(this.prefKey) || "{}"); } catch { return {}; }
    }

    val(id, fallback = "") {
        const el = document.getElementById(id);
        if (!el) return fallback;
        if (el.type === "checkbox") return el.checked;
        return el.value;
    }

    applyPrefsToForm(prefs) {
        const set = (id, value) => { const el = document.getElementById(id); if (!el || value === undefined) return; if (el.type === "checkbox") el.checked = !!value; else el.value = value; };
        set("settings-language", prefs.language || localStorage.getItem("operation_language") || "en");
        set("settings-number-format", prefs.numberFormat || "en-EG");
        set("settings-default-route", prefs.defaultRoute || "overview");
        set("settings-report-source", prefs.reportSource || "auto");
        set("settings-export-format", prefs.exportFormat || "csv");
        set("settings-row-limit", prefs.rowLimit || 500);
        ["compactMode", "animations", "soundEffects", "showDetails", "autoSaveReports", "showReportKpis", "exportWithFilters", "confirmDelete", "successToasts", "errorToasts", "saveHistory"].forEach((key) => {
            const id = "settings-" + key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
            if (prefs[key] !== undefined) set(id, prefs[key]);
        });
    }

    savePrefs() {
        const prefs = {
            language: this.val("settings-language", "en"),
            numberFormat: this.val("settings-number-format", "en-EG"),
            defaultRoute: this.val("settings-default-route", "overview"),
            reportSource: this.val("settings-report-source", "auto"),
            exportFormat: this.val("settings-export-format", "csv"),
            rowLimit: Number(this.val("settings-row-limit", 500)) || 500,
            compactMode: this.val("settings-compact-mode", false),
            animations: this.val("settings-animations", true),
            soundEffects: this.val("settings-sound-effects", true),
            showDetails: this.val("settings-show-details", true),
            autoSaveReports: this.val("settings-autosave-reports", true),
            showReportKpis: this.val("settings-show-report-kpis", true),
            exportWithFilters: this.val("settings-export-with-filters", false),
            confirmDelete: this.val("settings-confirm-delete", true),
            successToasts: this.val("settings-success-toasts", true),
            errorToasts: this.val("settings-error-toasts", true),
            saveHistory: this.val("settings-save-history", true)
        };
        localStorage.setItem(this.prefKey, JSON.stringify(prefs));
        localStorage.setItem("operation_language", prefs.language);
        document.documentElement.lang = prefs.language;
        document.documentElement.dir = prefs.language === "ar" ? "rtl" : "ltr";
        document.body.classList.toggle("compact-density", !!prefs.compactMode);
        document.body.classList.toggle("reduced-motion-ui", prefs.animations === false);
        localStorage.setItem("operation_sound_enabled", prefs.soundEffects === false ? "0" : "1");
        AuditService.record("Preferences saved", "Settings", prefs);
        this.notify().success("Preferences saved");
        setTimeout(() => location.reload(), 450);
    }

    exportAudit() {
        const rows = AuditService.list(500);
        if (!rows.length) return this.notify().warning("No history to export");
        const keys = ["createdAt", "user", "role", "module", "action", "url", "details"];
        const csv = [keys.join(",")].concat(rows.map((r) => keys.map((k) => `"${String(k === "details" ? JSON.stringify(r[k] || {}) : r[k] ?? "").replace(/"/g, '""')}"`).join(","))).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "operation-system-activity-history.csv";
        a.click();
        URL.revokeObjectURL(a.href);
        AuditService.record("Audit exported", "Settings", { rows: rows.length });
    }
}

export default new SettingsController();
