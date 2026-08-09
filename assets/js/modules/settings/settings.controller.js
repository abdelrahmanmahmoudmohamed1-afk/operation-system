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
            if (out) out.innerHTML = `<div class="state-box state-loading"><span class="mini-spinner"></span><span>Checking frontend/backend compatibility…</span></div>`;
            try {
                const d = await SettingsService.getSystemDiagnostics();
                const info = d.info || {};
                const required = ["createSystemUser","uploadUnitFloorPlan","uploadClientContract","getInventoryData","getClients","getEOIData"];
                const actions = Array.isArray(info.actions) ? info.actions : [];
                const missing = actions.length ? required.filter(x => !actions.includes(x)) : required;
                if (out) out.innerHTML = `
                    <div class="integrity-item"><span>Frontend</span><strong>v5.7</strong><em class="audit-success">Ready</em></div>
                    <div class="integrity-item"><span>Backend</span><strong>${this.escapeHtml(info.backendBuild || info.version || "Unavailable")}</strong><em class="${d.ok ? "audit-success" : "audit-fail"}">${d.ok ? "Connected" : "Failed"}</em></div>
                    <div class="integrity-item"><span>API actions</span><strong>${actions.length || 0}</strong><em class="${missing.length ? "audit-fail" : "audit-success"}">${missing.length ? `Missing ${missing.length}` : "Matched"}</em></div>
                    <div class="integrity-item"><span>Latency</span><strong>${d.latency} ms</strong><em>${d.latency < 1500 ? "Good" : "Slow"}</em></div>
                    ${missing.length ? `<div class="state-box state-error" style="grid-column:1/-1"><strong>Backend mismatch</strong><span>Missing: ${missing.map(x=>this.escapeHtml(x)).join(", ")}. Deploy the included Operation_System_Backend v5.7 as one new version.</span></div>` : ""}`;
            } catch (error) {
                if (out) out.innerHTML = `<div class="state-box state-error"><strong>Diagnostics failed</strong><span>${this.escapeHtml(error.message)}</span></div>`;
            }
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
        ["compactMode", "animations", "showDetails", "soundEffects", "autoSaveReports", "showReportKpis", "exportWithFilters", "confirmDelete", "successToasts", "errorToasts", "saveHistory"].forEach((key) => {
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
            showDetails: this.val("settings-show-details", true),
            soundEffects: this.val("settings-sound-effects", true),
            autoSaveReports: this.val("settings-autosave-reports", true),
            showReportKpis: this.val("settings-show-report-kpis", true),
            exportWithFilters: this.val("settings-export-with-filters", false),
            confirmDelete: this.val("settings-confirm-delete", true),
            successToasts: this.val("settings-success-toasts", true),
            errorToasts: this.val("settings-error-toasts", true),
            saveHistory: this.val("settings-save-history", true)
        };
        localStorage.setItem(this.prefKey, JSON.stringify(prefs));
        localStorage.setItem("operation_sound_enabled", prefs.soundEffects ? "1" : "0");
        localStorage.setItem("operation_language", prefs.language);
        document.documentElement.lang = prefs.language;
        document.documentElement.dir = prefs.language === "ar" ? "rtl" : "ltr";
        document.body.classList.toggle("compact-density", !!prefs.compactMode);
        document.body.classList.toggle("reduced-motion-ui", prefs.animations === false);
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
