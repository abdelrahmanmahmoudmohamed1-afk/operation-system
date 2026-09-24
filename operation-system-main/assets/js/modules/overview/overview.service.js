import ReportsService from "../reports/reports.service.js";

function num(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const n = Number(String(value ?? "").replace(/,/g, "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
}

function text(value) {
    return String(value ?? "").trim();
}

function norm(value) {
    return text(value).toLowerCase();
}

function rowStatus(row = {}) {
    return text(row.ContractStatus || row.Status || row.status || row.contractStatus);
}

function rowValue(row = {}) {
    return num(
        row.Value ?? row.value ?? row.soldPrice ?? row.price ??
        row["Price After Discount"] ?? row["System Price"] ??
        row["Contract Price"] ?? row["Sold Price"]
    );
}

function rowRemainingDp(row = {}) {
    return num(
        row.RemainingDP ?? row.remainingDp ?? row["Remaining DP"] ??
        row["Remaining After DP"]
    );
}

function buildStatusMix(rows = []) {
    const map = new Map();
    rows.forEach((row) => {
        const status = rowStatus(row) || "Unknown";
        const key = norm(status);
        const item = map.get(key) || { Status: status, Units: 0, Value: 0 };
        item.Units += 1;
        item.Value += rowValue(row);
        map.set(key, item);
    });
    return Array.from(map.values()).sort((a, b) => b.Value - a.Value || b.Units - a.Units);
}

function buildProjectPerformance(rows = []) {
    const map = new Map();
    rows.forEach((row) => {
        const project = text(row.Project || row.project) || "Unknown";
        const key = norm(project);
        const item = map.get(key) || { Project: project, Units: 0, Value: 0, AvgUnitPrice: 0 };
        item.Units += 1;
        item.Value += rowValue(row);
        map.set(key, item);
    });
    return Array.from(map.values())
        .map((item) => ({ ...item, AvgUnitPrice: item.Units ? Math.round(item.Value / item.Units) : 0 }))
        .sort((a, b) => b.Value - a.Value || b.Units - a.Units);
}

function statusTotals(rows, wanted) {
    const allowed = new Set(wanted.map(norm));
    const filtered = rows.filter((row) => allowed.has(norm(rowStatus(row))));
    return {
        units: filtered.length,
        value: filtered.reduce((sum, row) => sum + rowValue(row), 0)
    };
}

function deriveKpis(data = {}, rows = []) {
    const existing = data.kpis || {};
    const reserved = statusTotals(rows, ["Reserved"]);
    const contracted = statusTotals(rows, ["Contracted"]);
    const sold = statusTotals(rows, ["Sold"]);
    const available = statusTotals(rows, ["Available"]);
    const cancelled = statusTotals(rows, ["Cancelled", "Canceled", "Cancel"]);
    const closed = reserved.units + contracted.units + sold.units;
    const closedValue = reserved.value + contracted.value + sold.value;
    const totalRows = rows.length;

    return {
        ...existing,
        totalSalesValue: num(existing.totalSalesValue) || closedValue,
        reservedUnits: num(existing.reservedUnits) || reserved.units,
        contractedUnits: num(existing.contractedUnits) || contracted.units,
        soldUnits: num(existing.soldUnits) || sold.units,
        availableUnits: num(existing.availableUnits) || available.units,
        availableValue: num(existing.availableValue) || available.value,
        cancelledUnits: num(existing.cancelledUnits) || cancelled.units,
        cancellationRate: num(existing.cancellationRate) || (totalRows ? (cancelled.units / totalRows) * 100 : 0),
        avgUnitPrice: num(existing.avgUnitPrice) || (closed ? closedValue / closed : 0),
        remainingDp: num(existing.remainingDp) || rows.reduce((sum, row) => sum + rowRemainingDp(row), 0)
    };
}

class OverviewService {
    async loadData() {
        // Reuse the resilient Reports data aggregator instead of making Overview
        // depend on getDashboardData alone. ReportsService already falls back to
        // Inventory + CRM when the dashboard endpoint is missing/stale.
        const data = await ReportsService.loadOverview();
        const reportRows = Array.isArray(data.reportRows) ? data.reportRows : [];

        const statusMix = Array.isArray(data.statusMix) && data.statusMix.length
            ? data.statusMix
            : buildStatusMix(reportRows);
        const projectPerformance = Array.isArray(data.projectPerformance) && data.projectPerformance.length
            ? data.projectPerformance
            : buildProjectPerformance(reportRows);

        const sourceHealth = data.__sourceHealth || {};
        const healthySources = Object.values(sourceHealth).filter(Boolean).length;
        const sourceCount = Object.keys(sourceHealth).length;

        return {
            ...data,
            meta: {
                ...(data.meta || {}),
                generatedAt: data.meta?.generatedAt || new Date().toLocaleString(),
                sourceMode: sourceHealth.dashboard ? "Live dashboard" : (reportRows.length ? "Recovered from Inventory / CRM" : "No data returned"),
                healthySources,
                sourceCount
            },
            reportRows,
            statusMix,
            projectPerformance,
            kpis: deriveKpis(data, reportRows)
        };
    }
}

export default new OverviewService();
