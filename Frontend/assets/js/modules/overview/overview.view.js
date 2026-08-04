import Formatter from "../../utils/formatter.js";
import { escapeHtml } from "../../utils/helpers.js";

function statusSum(statusMix, names) {
    const wanted = names.map((x) => x.toLowerCase());
    const rows = (statusMix || []).filter((r) => wanted.includes(String(r.Status || "").toLowerCase()));
    return {
        units: rows.reduce((s, r) => s + Number(r.Units || 0), 0),
        value: rows.reduce((s, r) => s + Number(r.Value || 0), 0)
    };
}

export function renderLayout() {
    return `
        <div class="overview-hero card">
            <div>
                <div class="eyebrow">Toledo CRM</div>
                <h1>Business Overview</h1>
                <p id="overview-meta">Loading executive summary...</p>
            </div>
            <div class="overview-actions">
                <button class="btn btn-primary" data-route="inventory">Open Inventory</button>
                <button class="btn btn-outline" data-route="reports">Build Report</button>
            </div>
        </div>

        <div class="kpi-grid" id="overview-kpis"></div>

        <div class="dash-2col">
            <div class="card overview-panel">
                <div class="dash-chart-title">Pipeline Snapshot</div>
                <div id="overview-pipeline"></div>
            </div>
            <div class="card overview-panel">
                <div class="dash-chart-title">Quick Actions</div>
                <div class="quick-actions-grid">
                    <button class="quick-action" data-route="crm">Add / View Clients</button>
                    <button class="quick-action" data-route="eoi">Manage EOI</button>
                    <button class="quick-action" data-route="payment">Payment Plans</button>
                    <button class="quick-action" data-route="settings">System Settings</button>
                </div>
            </div>
        </div>

        <div class="dash-section-title">Top Projects</div>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Project</th><th>Units</th><th>Value</th><th>Avg Unit Price</th></tr></thead>
                <tbody id="overview-projects"></tbody>
            </table>
        </div>
    `;
}

export function renderKpis(data) {
    const k = data.kpis || {};
    const mix = data.statusMix || [];
    const contracted = statusSum(mix, ["Contracted"]);
    const sold = statusSum(mix, ["Sold"]);
    const reserved = statusSum(mix, ["Reserved"]);
    const contractedSold = statusSum(mix, ["Contracted", "Sold"]);
    const soldReserved = statusSum(mix, ["Sold", "Reserved"]);
    const allThree = statusSum(mix, ["Contracted", "Sold", "Reserved"]);

    const items = [
        ["Total Sales Value", Formatter.money(k.totalSalesValue || allThree.value)],
        ["Contracted", contracted.units, Formatter.money(contracted.value)],
        ["Sold", sold.units, Formatter.money(sold.value)],
        ["Reserved", reserved.units, Formatter.money(reserved.value)],
        ["Contracted + Sold", contractedSold.units, Formatter.money(contractedSold.value)],
        ["Sold + Reserved", soldReserved.units, Formatter.money(soldReserved.value)],
        ["All Three", allThree.units, Formatter.money(allThree.value)],
        ["Available Units", k.availableUnits || 0, Formatter.money(k.availableValue || 0)]
    ];

    return items.map(([title, value, sub]) => `
        <div class="kpi-card detail-card" data-detail-title="${escapeHtml(title)}" data-detail-value="${escapeHtml(value)}" data-detail-sub="${escapeHtml(sub || "")}">
            <div class="kpi-title">${escapeHtml(title)}</div>
            <div class="kpi-value">${escapeHtml(value)}</div>
            ${sub ? `<div class="kpi-sub">${escapeHtml(sub)}</div>` : ""}
        </div>
    `).join("");
}

export function renderPipeline(statusMix) {
    if (!statusMix || !statusMix.length) return `<p class="muted">No pipeline data</p>`;
    return statusMix.slice(0, 8).map((r) => `
        <div class="pipeline-row detail-card" data-detail-title="${escapeHtml(r.Status)}" data-detail-value="${escapeHtml(r.Units)}" data-detail-sub="${escapeHtml(Formatter.money(r.Value || 0))}">
            <span>${escapeHtml(r.Status)}</span>
            <strong>${escapeHtml(r.Units)}</strong>
            <em>${Formatter.money(r.Value || 0)}</em>
        </div>
    `).join("");
}

export function renderProjects(rows) {
    if (!rows || !rows.length) return `<tr><td colspan="4">No data</td></tr>`;
    return rows.slice(0, 8).map((r) => `
        <tr class="detail-row" data-detail='${escapeHtml(JSON.stringify(r))}'>
            <td>${escapeHtml(r.Project)}</td>
            <td>${escapeHtml(r.Units)}</td>
            <td>${Formatter.money(r.Value)}</td>
            <td>${Formatter.money(r.AvgUnitPrice)}</td>
        </tr>
    `).join("");
}
