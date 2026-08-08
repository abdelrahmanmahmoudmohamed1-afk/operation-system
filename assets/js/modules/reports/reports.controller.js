import Module from "../../core/module.js";
import ReportsService from "./reports.service.js";
import AuditService from "../../services/audit.service.js";
import { renderReports, renderCustomReport, renderGroupedReport } from "./reports.view.js";
import { renderLoading, renderError } from "../../utils/state.js";

class ReportsController extends Module {
    constructor() {
        super();
        this.data = null;
        this.savedKey = "operation_saved_reports_enterprise_v3";
    }

    async render() {
        this.container.innerHTML = renderLoading({ variant: "block" });
        await this.load();
    }

    async load() {
        try {
            this.data = this.normalizeData(await ReportsService.loadOverview());
            this.container.innerHTML = renderReports(this.data, this.getSavedReports());
            this.bindBuilder();
            this.setDefaultColumns();
        } catch (error) {
            this.logger().error("Reports load failed", error);
            this.container.innerHTML = renderError({ message: error.message, retryId: "reports-retry" });
            document.getElementById("reports-retry")?.addEventListener("click", () => this.render());
            this.notify().error(error.message);
        }
    }

    normalizeData(data = {}) {
        const smartRows = [];
        const primary = Array.isArray(data.reportRows) ? data.reportRows : [];
        if (primary.length) {
            primary.forEach((row) => smartRows.push(this.normalizeRow(row, "reportRows")));
        } else {
            const candidates = ["topUnits", "inventory", "units", "contracts", "clients", "eoi"];
            candidates.forEach((key) => {
                const arr = Array.isArray(data[key]) ? data[key] : [];
                arr.forEach((row) => smartRows.push(this.normalizeRow(row, key)));
            });
        }
        if (!smartRows.length) {
            ["projectPerformance", "salesPerformance", "brokerPerformance", "managerPerformance", "directorPerformance", "statusMix", "trendMonthly"].forEach((key) => {
                const arr = Array.isArray(data[key]) ? data[key] : [];
                arr.forEach((row) => smartRows.push(this.normalizeRow(row, key)));
            });
        }
        return { ...data, __smartRows: smartRows };
    }

    normalizeRow(row = {}, source = "") {
        const pick = (...keys) => keys.map((k) => row[k]).find((v) => v !== undefined && v !== null && v !== "") || "";
        const normalized = {
            ...row,
            UnitCode: pick("UnitCode", "Unit Code", "unitCode", "code", "Unit"),
            Project: pick("Project", "project"),
            Status: pick("Status", "status"),
            ContractStatus: pick("ContractStatus", "Contract Status", "contractStatus", "Status"),
            Orientation: pick("Orientation", "orientation", "View", "view"),
            UnitType: pick("UnitType", "Unit Type", "unitType", "Type"),
            Building: pick("Building", "building"),
            Floor: pick("Floor", "floor"),
            Area: Number(pick("Area", "TotalArea", "Total Area", "Total area", "Total Area SQM", "Total SQM", "IndoorArea", "In Door Area")) || 0,
            IndoorArea: Number(pick("IndoorArea", "Indoor Area", "In Door Area", "Net Area")) || 0,
            OutdoorArea: Number(pick("OutdoorArea", "Outdoor Area", "Out Door Area", "Terrace Area", "Garden Area")) || 0,
            AvgSalesPrice: 0,
            Client: pick("Client", "ClientName", "Client Name", "client"),
            Phone: pick("Phone", "Client Phone", "Client Phone Number", "ClientPhone", "Mobile"),
            Sales: pick("Sales", "SalesName", "Sales Name", "Sales Agent", "sales"),
            Broker: pick("Broker", "BrokerCompany", "Broker Company", "broker"),
            Manager: pick("Manager", "SalesManager", "Sales Manager"),
            Director: pick("Director", "SalesDirector", "Sales Director"),
            Source: pick("Source", "Sourse", "Lead Source"),
            Channel: pick("Channel", "Source Breakdown", "sourceBreakdown"),
            ReservationDate: pick("ReservationDate", "Reservation Date", "Reservition Date"),
            ContractDate: pick("ContractDate", "Contract Date"),
            SoldDate: pick("SoldDate", "Sold Date"),
            CreatedAt: pick("CreatedAt", "Created At", "Date"),
            Month: pick("Month", "month"),
            Units: Number(pick("Units", "units")) || 1,
            Value: Number(pick("Value", "SoldPrice", "Sold Price", "Ticket Price", "ticketPrice", "SalesValue", "Sales Value")) || 0,
            __source: source
        };
        normalized.AvgUnitPrice = Number(pick("AvgUnitPrice", "Avg Unit Price")) || (normalized.Units ? Math.round(normalized.Value / normalized.Units) : 0);
        return normalized;
    }

    bindBuilder() {
        document.getElementById("report-apply")?.addEventListener("click", () => this.applyReport());
        document.getElementById("report-apply-head")?.addEventListener("click", () => this.applyReport());
        document.getElementById("report-save")?.addEventListener("click", () => this.saveReport());
        document.getElementById("report-reset")?.addEventListener("click", () => this.resetBuilder());
        document.getElementById("report-output")?.addEventListener("click", (e) => this.handleOutputClick(e));
        document.querySelectorAll("[data-saved-report]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const report = this.getSavedReports()[Number(btn.dataset.savedReport)];
                if (!report) return;
                this.applyConfigToForm(report);
                this.applyReport(report.name);
            });
        });
        document.querySelectorAll("[data-report-tab]").forEach((btn) => {
            btn.addEventListener("click", () => this.switchTab(btn.dataset.reportTab));
        });
        document.getElementById("columns-default")?.addEventListener("click", () => this.setDefaultColumns());
        document.getElementById("columns-all")?.addEventListener("click", () => this.setAllColumns(true));
        document.getElementById("columns-clear")?.addEventListener("click", () => this.setAllColumns(false));
        ["report-source", "report-project", "report-status", "report-orientation", "report-unit-type", "report-building", "report-floor", "report-sales", "report-broker", "report-manager", "report-director", "report-source-channel", "report-sort", "report-direction", "report-group"].forEach((id) => {
            document.getElementById(id)?.addEventListener("change", () => this.applyReport());
        });
        ["report-query", "report-min-value", "report-max-value", "report-from-date", "report-to-date"].forEach((id) => {
            document.getElementById(id)?.addEventListener("keydown", (e) => { if (e.key === "Enter") this.applyReport(); });
        });
    }

    switchTab(name) {
        document.querySelectorAll(".report-tab").forEach((x) => x.classList.toggle("active", x.dataset.reportTab === name));
        document.querySelectorAll(".report-tab-panel").forEach((x) => x.classList.toggle("active", x.id === `report-tab-${name}`));
    }

    setDefaultColumns() {
        const source = document.getElementById("report-source")?.value || "auto";
        const defaults = {
            auto: ["UnitCode", "Project", "Status", "ContractStatus", "Orientation", "UnitType", "Client", "Sales", "Broker", "ContractDate", "Value"],
            reportRows: ["UnitCode", "Project", "Status", "ContractStatus", "Orientation", "UnitType", "Client", "Sales", "Broker", "ContractDate", "Value"]
        }[source] || ["Project", "Units", "Value", "AvgUnitPrice"];
        document.querySelectorAll("[name='report-columns']").forEach((el) => { el.checked = defaults.includes(el.value); });
    }

    setAllColumns(flag) {
        document.querySelectorAll("[name='report-columns']").forEach((el) => { el.checked = flag; });
    }

    selectedColumns() {
        return Array.from(document.querySelectorAll("[name='report-columns']:checked")).map((el) => el.value);
    }

    applyConfigToForm(report) {
        const set = (id, value) => { const el = document.getElementById(id); if (el && value !== undefined) el.value = value; };
        set("report-source", report.source || "auto");
        set("report-query", report.query || "");
        set("report-project", report.project || "ALL");
        set("report-status", report.status || "ALL");
        set("report-orientation", report.orientation || "ALL");
        set("report-unit-type", report.unitType || "ALL");
        set("report-building", report.building || "ALL");
        set("report-floor", report.floor || "ALL");
        set("report-sales", report.sales || "ALL");
        set("report-broker", report.broker || "ALL");
        set("report-manager", report.manager || "ALL");
        set("report-director", report.director || "ALL");
        set("report-source-channel", report.sourceChannel || "ALL");
        set("report-from-date", report.fromDate || "");
        set("report-to-date", report.toDate || "");
        set("report-min-value", report.minValue || "");
        set("report-max-value", report.maxValue || "");
        set("report-group", report.group || "None");
        set("report-sort", report.sort || "Value");
        set("report-direction", report.direction || "desc");
        set("report-name", report.name || "");
        if (report.columns?.length) {
            document.querySelectorAll("[name='report-columns']").forEach((el) => { el.checked = report.columns.includes(el.value); });
        } else this.setDefaultColumns();
    }

    getCurrentConfig() {
        return {
            name: document.getElementById("report-name")?.value.trim() || "",
            source: document.getElementById("report-source")?.value || "auto",
            query: document.getElementById("report-query")?.value.trim() || "",
            project: document.getElementById("report-project")?.value || "ALL",
            status: document.getElementById("report-status")?.value || "ALL",
            orientation: document.getElementById("report-orientation")?.value || "ALL",
            unitType: document.getElementById("report-unit-type")?.value || "ALL",
            building: document.getElementById("report-building")?.value || "ALL",
            floor: document.getElementById("report-floor")?.value || "ALL",
            sales: document.getElementById("report-sales")?.value || "ALL",
            broker: document.getElementById("report-broker")?.value || "ALL",
            manager: document.getElementById("report-manager")?.value || "ALL",
            director: document.getElementById("report-director")?.value || "ALL",
            sourceChannel: document.getElementById("report-source-channel")?.value || "ALL",
            fromDate: document.getElementById("report-from-date")?.value || "",
            toDate: document.getElementById("report-to-date")?.value || "",
            minValue: Number(document.getElementById("report-min-value")?.value || 0),
            maxValue: Number(document.getElementById("report-max-value")?.value || 0),
            group: document.getElementById("report-group")?.value || "None",
            sort: document.getElementById("report-sort")?.value || "Value",
            direction: document.getElementById("report-direction")?.value || "desc",
            columns: this.selectedColumns()
        };
    }

    sourceRows(source) {
        if (source === "auto") return [...(this.data?.__smartRows || [])];
        return [...(this.data?.[source] || [])].map((r) => this.normalizeRow(r, source));
    }

    buildRows(config) {
        let rows = this.sourceRows(config.source);
        const q = config.query.toLowerCase();
        const eq = (actual, expected) => expected === "ALL" || String(actual || "").toLowerCase() === String(expected || "").toLowerCase();

        if (q) rows = rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)));
        rows = rows.filter((r) => eq(r.Project, config.project));
        rows = rows.filter((r) => eq(r.Status, config.status) || eq(r.ContractStatus, config.status));
        rows = rows.filter((r) => eq(r.Orientation, config.orientation));
        rows = rows.filter((r) => eq(r.UnitType, config.unitType));
        rows = rows.filter((r) => eq(r.Building, config.building));
        rows = rows.filter((r) => eq(r.Floor, config.floor));
        rows = rows.filter((r) => eq(r.Sales, config.sales));
        rows = rows.filter((r) => eq(r.Broker, config.broker));
        rows = rows.filter((r) => eq(r.Manager, config.manager));
        rows = rows.filter((r) => eq(r.Director, config.director));
        rows = rows.filter((r) => eq(r.Source, config.sourceChannel) || eq(r.Channel, config.sourceChannel));
        if (config.minValue) rows = rows.filter((r) => Number(r.Value || r.SalesValue || 0) >= config.minValue);
        if (config.maxValue) rows = rows.filter((r) => Number(r.Value || r.SalesValue || 0) <= config.maxValue);
        if (config.fromDate || config.toDate) {
            const from = config.fromDate ? new Date(config.fromDate) : null;
            const to = config.toDate ? new Date(config.toDate + "T23:59:59") : null;
            rows = rows.filter((r) => {
                const status = String(r.Status || r.ContractStatus || "").toLowerCase();
                const raw = status === "sold" ? (r.SoldDate || r.ContractDate || r.ReservationDate) : status === "contracted" ? (r.ContractDate || r.ReservationDate) : status === "reserved" ? r.ReservationDate : (r.ContractDate || r.ReservationDate || r.CreatedAt || r.Month);
                if (!raw) return false;
                const d = new Date(raw);
                if (Number.isNaN(d.getTime())) return false;
                if (from && d < from) return false;
                if (to && d > to) return false;
                return true;
            });
        }

        rows.sort((a, b) => {
            const av = a[config.sort];
            const bv = b[config.sort];
            const an = Number(av || 0);
            const bn = Number(bv || 0);
            let res;
            if (!Number.isNaN(an) && !Number.isNaN(bn) && (an || bn)) res = bn - an;
            else res = String(av || "").localeCompare(String(bv || ""));
            return config.direction === "asc" ? -res : res;
        });
        return rows;
    }

    applyReport(customTitle = null) {
        const config = this.getCurrentConfig();
        const rows = this.buildRows(config);
        const title = customTitle || `${this.humanize(config.source)} Report`;
        const output = document.getElementById("report-output");
        AuditService.record("Run report", "Reports", { source: config.source, group: config.group, rows: rows.length });
        if (output) output.innerHTML = config.group && config.group !== "None"
            ? renderGroupedReport(title, rows, config.group)
            : renderCustomReport(title, rows, config.source, config.columns);
        this.currentReportRows = rows;
        this.bindReportSelection(rows);
        document.getElementById("report-export-csv")?.addEventListener("click", () => this.exportCsv(this.selectedReportRows(rows), title));
        document.getElementById("report-export-json")?.addEventListener("click", () => this.exportJson(this.selectedReportRows(rows), title));
        document.getElementById("report-print")?.addEventListener("click", () => window.print());
    }

    selectedReportRows(rows = this.currentReportRows || []) {
        const checks = [...document.querySelectorAll(".report-row-check")];
        if (!checks.length) return rows;
        return checks.filter((x) => x.checked).map((x) => rows[Number(x.dataset.reportIndex)]).filter(Boolean);
    }

    bindReportSelection(rows) {
        const all = document.getElementById("report-select-all");
        const checks = [...document.querySelectorAll(".report-row-check")];
        if (!checks.length) return;
        const update = () => {
            checks.forEach((x) => x.closest("tr")?.classList.toggle("report-row-excluded", !x.checked));
            const selected = this.selectedReportRows(rows);
            const value = selected.reduce((sum, row) => sum + Number(row.Value || row.SalesValue || 0), 0);
            const units = selected.reduce((sum, row) => sum + Number(row.Units || 1), 0);
            const countEl = document.getElementById("report-summary-rows"); const valueEl = document.getElementById("report-summary-value"); const unitsEl = document.getElementById("report-summary-units");
            if (countEl) countEl.textContent = selected.length;
            if (valueEl) valueEl.textContent = new Intl.NumberFormat("en-US", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(value);
            if (unitsEl) unitsEl.textContent = units;
            const countStatus = (name) => selected.filter((r) => String(r.Status || r.ContractStatus || "").toLowerCase() === name).length;
            const soldEl = document.getElementById("report-kpi-sold"), contractedEl = document.getElementById("report-kpi-contracted"), reservedEl = document.getElementById("report-kpi-reserved"), activeValueEl = document.getElementById("report-kpi-active-value");
            if (soldEl) soldEl.textContent = countStatus("sold");
            if (contractedEl) contractedEl.textContent = countStatus("contracted");
            if (reservedEl) reservedEl.textContent = countStatus("reserved");
            if (activeValueEl) activeValueEl.textContent = new Intl.NumberFormat("en-US", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(value);
            if (all) { all.checked = selected.length === checks.length; all.indeterminate = selected.length > 0 && selected.length < checks.length; }
        };
        all?.addEventListener("change", () => { checks.forEach((x) => x.checked = all.checked); update(); });
        checks.forEach((x) => x.addEventListener("change", update));
        update();
    }

    saveReport() {
        const config = this.getCurrentConfig();
        const name = config.name || `${this.humanize(config.source)} ${new Date().toLocaleDateString()}`;
        const list = this.getSavedReports().filter((r) => r.name !== name);
        list.unshift({ ...config, name, createdAt: new Date().toISOString() });
        localStorage.setItem(this.savedKey, JSON.stringify(list.slice(0, 50)));
        AuditService.record("Report view saved", "Reports", { name, source: config.source });
        this.notify().success("Report view saved");
        this.container.innerHTML = renderReports(this.data, list);
        this.bindBuilder();
        this.applyConfigToForm({ ...config, name });
        this.applyReport(name);
    }

    resetBuilder() {
        this.container.innerHTML = renderReports(this.data, this.getSavedReports());
        this.bindBuilder();
        this.setDefaultColumns();
        AuditService.record("Report filters reset", "Reports", {});
        this.notify().info("Report filters reset");
    }

    getSavedReports() {
        try { return JSON.parse(localStorage.getItem(this.savedKey) || "[]"); } catch { return []; }
    }

    exportCsv(rows, title) {
        if (!rows.length) return this.notify().warning("No rows to export");
        const keys = this.selectedColumns().length ? this.selectedColumns() : Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
        const csv = [keys.join(",")].concat(rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${title.replace(/\s+/g, "_")}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        AuditService.record("Report JSON exported", "Reports", { title, rows: rows.length });
        AuditService.record("Report CSV exported", "Reports", { title, rows: rows.length });
    }

    exportJson(rows, title) {
        if (!rows.length) return this.notify().warning("No rows to export");
        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${title.replace(/\s+/g, "_")}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    handleOutputClick(e) {
        const row = e.target.closest(".report-click-row");
        if (!row) return;
        try {
            const data = JSON.parse(row.dataset.detail || "{}");
            this.showDetails(data);
        } catch { /* ignore */ }
    }

    showDetails(data) {
        const keys = Object.keys(data).filter((k) => !k.startsWith("__"));
        const html = `<div class="detail-popover"><button class="detail-close">×</button><h3>${data.UnitCode || data.Project || data.Client || data.Sales || "Details"}</h3>${keys.map((k) => `<div><span>${k}</span><strong>${data[k] ?? "—"}</strong></div>`).join("")}</div>`;
        document.querySelector(".detail-popover")?.remove();
        document.body.insertAdjacentHTML("beforeend", html);
        document.querySelector(".detail-close")?.addEventListener("click", () => document.querySelector(".detail-popover")?.remove());
    }

    humanize(value) {
        return String(value || "Report").replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase());
    }
}

export default new ReportsController();
