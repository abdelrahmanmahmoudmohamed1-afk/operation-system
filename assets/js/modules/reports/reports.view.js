import { escapeHtml } from "../../utils/helpers.js";
import Formatter from "../../utils/formatter.js";

const SOURCE_OPTIONS = [
    ["auto", "Smart Detailed Report"],
    ["reportRows", "Detailed Units Report"],
    ["projectPerformance", "Project Performance"],
    ["salesPerformance", "Sales Performance"],
    ["brokerPerformance", "Broker Performance"],
    ["managerPerformance", "Manager Performance"],
    ["directorPerformance", "Director Performance"],
    ["statusMix", "Status Mix"],
    ["trendMonthly", "Monthly Trend"],
    ["topUnits", "Top Units"],
    ["inventory", "Inventory Snapshot"],
    ["clients", "Clients / CRM"],
    ["eoi", "EOI Pipeline"],
    ["contracts", "Contracts Follow-up"]
];

const DEFAULT_COLUMNS = {
    auto: ["UnitCode", "Project", "Status", "ContractStatus", "Orientation", "UnitType", "Client", "Sales", "Broker", "ContractDate", "SoldDate", "ReservationDate", "Value"],
    reportRows: ["UnitCode", "Project", "Status", "ContractStatus", "Orientation", "UnitType", "Client", "Sales", "Broker", "ContractDate", "SoldDate", "ReservationDate", "Value"],
    projectPerformance: ["Project", "Units", "Value", "AvgUnitPrice"],
    salesPerformance: ["Sales", "Units", "Value", "AvgUnitPrice"],
    brokerPerformance: ["Broker", "Units", "Value", "AvgUnitPrice"],
    managerPerformance: ["Manager", "Units", "Value", "AvgUnitPrice"],
    directorPerformance: ["Director", "Units", "Value", "AvgUnitPrice"],
    statusMix: ["Status", "Units", "Value"],
    trendMonthly: ["Month", "SalesUnits", "SalesValue", "CancelledUnits", "CancelledValue"],
    topUnits: ["UnitCode", "Project", "Status", "UnitType", "Sales", "ContractDate", "Value"],
    inventory: ["UnitCode", "Project", "Status", "UnitType", "Orientation", "Floor", "Building", "Area", "IndoorArea", "OutdoorArea", "AvgSalesPrice", "Value"],
    clients: ["Client", "Phone", "Project", "UnitCode", "Status", "Sales", "Broker", "Value"],
    eoi: ["EOI", "Client", "Project", "UnitType", "Sales", "Status", "CreatedAt", "Value"],
    contracts: ["UnitCode", "Client", "Project", "ContractStatus", "ContractDate", "Sales", "Broker", "Value"]
};

const COLUMN_LIBRARY = [
    "UnitCode", "Project", "Status", "ContractStatus", "Orientation", "UnitType", "Building", "Floor", "Area", "IndoorArea", "OutdoorArea", "AvgSalesPrice",
    "Client", "Phone", "Sales", "Broker", "Manager", "Director", "Source", "Channel",
    "ReservationDate", "ContractDate", "SoldDate", "CreatedAt", "Month", "Units", "Value", "SalesValue", "AvgUnitPrice", "CancelledUnits", "CancelledValue"
];

const ORIENTATION_FALLBACK = ["North", "South", "East", "West", "North East", "North West", "South East", "South West", "Prime View", "Landscape", "Street", "Garden", "Pool", "Clubhouse"];
const STATUS_FALLBACK = ["Available", "Hold", "Reserved", "Contracted", "Sold", "Cancelled", "Sent for Signature", "DP Completed", "DP Not Completed", "Cheques Not Submitted", "Ready To Deliver", "Pending"];

function option(value, label, selected = false) {
    return `<option value="${escapeHtml(value)}" ${selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function uniqueValues(rows, key) {
    return Array.from(new Set((rows || []).map((r) => r?.[key]).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
}

function buildFilterOptions(data) {
    const rows = data?.__smartRows || data?.reportRows || data?.topUnits || [];
    return {
        projects: uniqueValues(rows, "Project"),
        statuses: uniqueValues(rows, "Status").concat(uniqueValues(rows, "ContractStatus")).filter((v, i, a) => a.indexOf(v) === i),
        orientations: uniqueValues(rows, "Orientation"),
        unitTypes: uniqueValues(rows, "UnitType"),
        buildings: uniqueValues(rows, "Building"),
        floors: uniqueValues(rows, "Floor"),
        sales: uniqueValues(rows, "Sales"),
        brokers: uniqueValues(rows, "Broker"),
        managers: uniqueValues(rows, "Manager"),
        directors: uniqueValues(rows, "Director"),
        sources: uniqueValues(rows, "Source").concat(uniqueValues(rows, "Channel")).filter((v, i, a) => a.indexOf(v) === i)
    };
}

function renderSelect(id, label, values, allLabel = "All") {
    return `
        <div class="filter-field report-filter-field">
            <label>${escapeHtml(label)}</label>
            <div class="select-shell">
                <select id="${escapeHtml(id)}" class="premium-select">
                    ${option("ALL", allLabel)}
                    ${(values || []).map((v) => option(v, v)).join("")}
                </select>
            </div>
        </div>
    `;
}

function renderColumnSelector() {
    return `
        <div class="report-column-bank">
            ${COLUMN_LIBRARY.map((c) => `
                <label class="column-pill"><input type="checkbox" name="report-columns" value="${escapeHtml(c)}"> ${escapeHtml(c)}</label>
            `).join("")}
        </div>
    `;
}

function moneyAware(key) {
    return /value|price|amount|salesvalue|cancelledvalue|avgunitprice/i.test(key);
}

function formatCell(key, value) {
    if (value === null || value === undefined || value === "") return "—";
    if (moneyAware(key)) return Formatter.money(Number(value) || 0);
    if (/date|created/i.test(key) && value) return Formatter.date(value);
    return escapeHtml(value);
}

function table(title, rows, columns, summary = {}) {
    if (!rows || !rows.length) {
        return `
            <div class="state-box state-block report-empty-state">
                <div class="state-icon">!</div>
                <div>
                    <strong>No matching rows</strong><br>
                    <span class="muted">Try changing source, filters, columns, date range or value range.</span>
                </div>
            </div>
        `;
    }

    const selectable = rows.some((r) => r && r.UnitCode);
    const head = `${selectable ? `<th class="report-select-col"><input type="checkbox" id="report-select-all" checked aria-label="Select all report rows"></th>` : ""}` + columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
    const body = rows.map((r, index) => `
        <tr class="detail-row report-click-row" data-report-index="${index}" data-detail='${escapeHtml(JSON.stringify(r))}'>
            ${selectable ? `<td class="report-select-col"><input type="checkbox" class="report-row-check" data-report-index="${index}" checked aria-label="Include row in report"></td>` : ""}
            ${columns.map((c) => `<td>${formatCell(c, r[c])}</td>`).join("")}
        </tr>
    `).join("");

    return `
        <div class="table-wrap report-table-wrap enterprise-table-wrap">
            <div class="report-table-header">
                <div>
                    <div class="dash-chart-title">${escapeHtml(title)}</div>
                    <strong id="report-summary-rows">${rows.length}</strong> rows selected
                    <span class="report-summary-note">Total value: <b id="report-summary-value">${Formatter.money(summary.value || 0)}</b> · Units: <b id="report-summary-units">${summary.units || rows.length}</b></span>
                </div>
                <div class="report-actions-mini">
                    <button class="btn btn-outline" id="report-export-json">Export JSON</button>
                    <button class="btn btn-outline" id="report-export-csv">Export CSV</button>
                    <button class="btn btn-outline" id="report-print">Print</button>
                </div>
            </div>
            <div class="report-table-scroll">
                <table class="data-table report-data-table">
                    <thead><tr>${head}</tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        </div>
    `;
}

function countBy(rows, field, value) {
    return rows.filter((x) => String(x[field] || "").toLowerCase() === String(value).toLowerCase()).length;
}

function kpiCards(data) {
    const rows = data?.__smartRows || data?.reportRows || [];
    const sold = rows.filter((r) => String(r.Status || r.ContractStatus || "").toLowerCase() === "sold").length;
    const contracted = rows.filter((r) => String(r.Status || r.ContractStatus || "").toLowerCase() === "contracted").length;
    const reserved = rows.filter((r) => String(r.Status || r.ContractStatus || "").toLowerCase() === "reserved").length;
    const activeRows = rows.filter((r) => ["sold", "contracted", "reserved"].includes(String(r.Status || r.ContractStatus || "").toLowerCase()));
    const totalValue = activeRows.reduce((s, r) => s + Number(r.Value || r.SalesValue || 0), 0);
    const totalArea = activeRows.reduce((s, r) => s + Number(r.Area || r.IndoorArea || 0), 0);
    const avgSalesM2 = totalArea ? Math.round(totalValue / totalArea) : 0;
    const avgArea = activeRows.length ? Math.round(totalArea / activeRows.length) : 0;
    return `
        <div class="kpi-grid report-kpi-grid enterprise-report-kpis">
            <div class="kpi-card detail-card" data-detail-title="Contracted" data-detail-value="${contracted}" data-detail-sub="Contract status"><div class="kpi-title">Contracted</div><div class="kpi-value" id="report-kpi-contracted">${contracted}</div><div class="kpi-sub">contract base</div></div>
            <div class="kpi-card detail-card" data-detail-title="Sold" data-detail-value="${sold}" data-detail-sub="Sold stock"><div class="kpi-title">Sold</div><div class="kpi-value" id="report-kpi-sold">${sold}</div><div class="kpi-sub">sold stock</div></div>
            <div class="kpi-card detail-card" data-detail-title="Reserved" data-detail-value="${reserved}" data-detail-sub="Reserved units"><div class="kpi-title">Reserved</div><div class="kpi-value" id="report-kpi-reserved">${reserved}</div><div class="kpi-sub">reserved units</div></div>
            <div class="kpi-card detail-card" data-detail-title="Contracted + Sold" data-detail-value="${contracted + sold}" data-detail-sub="Closed base"><div class="kpi-title">Contracted + Sold</div><div class="kpi-value">${contracted + sold}</div><div class="kpi-sub">closed base</div></div>
            <div class="kpi-card detail-card" data-detail-title="Sold + Reserved" data-detail-value="${sold + reserved}" data-detail-sub="Movement base"><div class="kpi-title">Sold + Reserved</div><div class="kpi-value">${sold + reserved}</div><div class="kpi-sub">movement base</div></div>
            <div class="kpi-card detail-card" data-detail-title="Total C + S + R" data-detail-value="${contracted + sold + reserved}" data-detail-sub="Full active base"><div class="kpi-title">Total C + S + R</div><div class="kpi-value">${contracted + sold + reserved}</div><div class="kpi-sub">full active base</div></div>
            <div class="kpi-card detail-card"><div class="kpi-title">Active Value</div><div class="kpi-value" id="report-kpi-active-value">${Formatter.money(totalValue)}</div><div class="kpi-sub">filtered value pool</div></div>
            <div class="kpi-card detail-card"><div class="kpi-title">Total Area</div><div class="kpi-value">${Formatter.number(totalArea)}</div><div class="kpi-sub">sqm active stock</div></div>
            <div class="kpi-card detail-card"><div class="kpi-title">Avg Selling / m²</div><div class="kpi-value">${Formatter.money(avgSalesM2)}</div><div class="kpi-sub">value divided by area</div></div>
            <div class="kpi-card detail-card"><div class="kpi-title">Avg Area / Unit</div><div class="kpi-value">${Formatter.number(avgArea)}</div><div class="kpi-sub">sqm per active unit</div></div>
        </div>
    `;
}

export function renderReports(data, savedReports = []) {
    const filters = buildFilterOptions(data);
    const saved = savedReports.map((r, i) => `
        <button class="saved-report-chip" data-saved-report="${i}" title="${escapeHtml(r.name)}">
            <span>${escapeHtml(r.name)}</span>
            <small>${escapeHtml(r.source || "Report")} · ${escapeHtml(r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Saved")}</small>
        </button>
    `).join("");

    return `
        <div class="page-header premium-report-head enterprise-page-head">
            <div>
                <span class="report-eyebrow">Enterprise reporting center</span>
                <h1>Reports Builder</h1>
                <p>Advanced filters, contract status, orientation, grouping, saved report views and exports.</p>
            </div>
            <div class="report-head-tools">
                <button class="btn btn-outline" id="report-reset">Reset</button>
                <button class="btn btn-primary" id="report-apply-head">Run Report</button>
            </div>
        </div>

        ${kpiCards(data)}

        <div class="card report-builder report-builder-premium enterprise-report-builder">
            <div class="report-builder-topline">
                <div>
                    <span class="report-eyebrow">Custom Report Workspace</span>
                    <h2>Build a professional report</h2>
                </div>
                <div class="report-save-inline">
                    <input id="report-name" class="premium-input" placeholder="Report name to save...">
                    <button class="btn btn-outline" id="report-save">Save View</button>
                    <button class="btn btn-primary" id="report-apply">Apply</button>
                </div>
            </div>

            <div class="report-tabs">
                <button class="report-tab active" data-report-tab="filters">Filters</button>
                <button class="report-tab" data-report-tab="columns">Columns</button>
                <button class="report-tab" data-report-tab="saved">Saved Views</button>
            </div>

            <div class="report-tab-panel active" id="report-tab-filters">
                <div class="report-builder-grid premium-report-grid enterprise-filter-grid">
                    <div class="filter-field report-filter-field wide">
                        <label>Report Source</label>
                        <div class="select-shell"><select id="report-source" class="premium-select">${SOURCE_OPTIONS.map(([v, l]) => option(v, l, v === "auto")).join("")}</select></div>
                    </div>
                    <div class="filter-field report-filter-field wide">
                        <label>Search Contains</label>
                        <input id="report-query" class="premium-input" placeholder="Unit, client, project, sales, broker, status...">
                    </div>
                    ${renderSelect("report-project", "Project", filters.projects)}
                    ${renderSelect("report-status", "Contract Status", filters.statuses.length ? filters.statuses : STATUS_FALLBACK)}
                    ${renderSelect("report-orientation", "Orientation", filters.orientations.length ? filters.orientations : ORIENTATION_FALLBACK)}
                    ${renderSelect("report-unit-type", "Unit Type", filters.unitTypes)}
                    ${renderSelect("report-building", "Building", filters.buildings)}
                    ${renderSelect("report-floor", "Floor", filters.floors)}
                    ${renderSelect("report-sales", "Sales Agent", filters.sales)}
                    ${renderSelect("report-broker", "Broker", filters.brokers)}
                    ${renderSelect("report-manager", "Manager", filters.managers)}
                    ${renderSelect("report-director", "Director", filters.directors)}
                    ${renderSelect("report-source-channel", "Source / Channel", filters.sources)}
                    <div class="filter-field report-filter-field">
                        <label>From Date</label>
                        <input id="report-from-date" class="premium-input" type="date">
                    </div>
                    <div class="filter-field report-filter-field">
                        <label>To Date</label>
                        <input id="report-to-date" class="premium-input" type="date">
                    </div>
                    <div class="filter-field report-filter-field">
                        <label>Minimum Value</label>
                        <input id="report-min-value" class="premium-input" type="number" placeholder="0">
                    </div>
                    <div class="filter-field report-filter-field">
                        <label>Maximum Value</label>
                        <input id="report-max-value" class="premium-input" type="number" placeholder="No limit">
                    </div>
                    <div class="filter-field report-filter-field">
                        <label>Group By</label>
                        <div class="select-shell"><select id="report-group" class="premium-select">
                            ${["None", "Project", "Status", "ContractStatus", "Orientation", "UnitType", "Building", "Sales", "Broker", "Manager", "Director", "Month"].map((v) => option(v, v)).join("")}
                        </select></div>
                    </div>
                    <div class="filter-field report-filter-field">
                        <label>Sort By</label>
                        <div class="select-shell"><select id="report-sort" class="premium-select">
                            ${["Value", "Units", "AvgUnitPrice", "ContractDate", "ReservationDate", "Project", "Status", "Orientation", "Sales"].map((v) => option(v, v)).join("")}
                        </select></div>
                    </div>
                    <div class="filter-field report-filter-field">
                        <label>Sort Direction</label>
                        <div class="select-shell"><select id="report-direction" class="premium-select">
                            ${option("desc", "Descending")}${option("asc", "Ascending")}
                        </select></div>
                    </div>
                </div>
            </div>

            <div class="report-tab-panel" id="report-tab-columns">
                <div class="report-column-tools">
                    <button class="btn btn-outline" id="columns-default">Default Columns</button>
                    <button class="btn btn-outline" id="columns-all">Select All</button>
                    <button class="btn btn-outline" id="columns-clear">Clear</button>
                </div>
                ${renderColumnSelector()}
            </div>

            <div class="report-tab-panel" id="report-tab-saved">
                <div class="saved-reports premium-saved-reports">
                    <strong>Saved Reports</strong>
                    <div class="saved-report-list">${saved || `<span class="muted">No saved reports yet. Save one and it will stay after refresh/update.</span>`}</div>
                </div>
            </div>
        </div>

        <div id="report-output">
            ${table("Smart Detailed Report", data.__smartRows || data.reportRows || data.topUnits || [], DEFAULT_COLUMNS.auto, { value: (data.__smartRows || []).reduce((s,r)=>s+Number(r.Value||0),0), units: (data.__smartRows || data.reportRows || []).length })}
        </div>
    `;
}

export function renderCustomReport(title, rows, source = "auto", selectedColumns = null) {
    const columns = selectedColumns?.length ? selectedColumns : (DEFAULT_COLUMNS[source] || DEFAULT_COLUMNS.auto);
    const value = rows.reduce((s, r) => s + Number(r.Value || r.SalesValue || 0), 0);
    const units = rows.reduce((s, r) => s + Number(r.Units || 0), 0) || rows.length;
    return table(title, rows, columns, { value, units });
}

export function renderGroupedReport(title, rows, groupField) {
    const groups = new Map();
    rows.forEach((r) => {
        const key = r[groupField] || "Unassigned";
        if (!groups.has(key)) groups.set(key, { [groupField]: key, Units: 0, Value: 0, AvgUnitPrice: 0 });
        const g = groups.get(key);
        g.Units += Number(r.Units || 1);
        g.Value += Number(r.Value || r.SalesValue || 0);
        g.AvgUnitPrice = g.Units ? Math.round(g.Value / g.Units) : 0;
    });
    const result = Array.from(groups.values()).sort((a, b) => Number(b.Value || 0) - Number(a.Value || 0));
    return table(`${title} · Grouped by ${groupField}`, result, [groupField, "Units", "Value", "AvgUnitPrice"], { value: result.reduce((s,r)=>s+r.Value,0), units: result.reduce((s,r)=>s+r.Units,0) });
}
