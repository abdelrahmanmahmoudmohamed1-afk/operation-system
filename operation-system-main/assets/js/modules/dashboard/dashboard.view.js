import { escapeHtml } from "../../utils/helpers.js";
import Formatter from "../../utils/formatter.js";

export function renderLayout() {
    return `
        <div class="page-header">
            <div>
                <h1>Executive Dashboard</h1>
                <p id="dash-meta">Loading...</p>
            </div>
            <button class="btn btn-outline" id="dash-refresh-btn">Refresh</button>
        </div>

        <div class="kpi-grid" id="dash-kpis"></div>

        <div class="dash-section-title">Status Combinations</div>
        <div class="kpi-grid" id="dash-combo-kpis"></div>

        <div class="dash-charts-grid">
            <div class="card dash-chart-card">
                <div class="dash-chart-title">Monthly Trend (Sales vs Cancellations)</div>
                <div class="dash-chart-canvas">
                    <canvas id="dash-trend-chart"></canvas>
                </div>
            </div>

            <div class="card dash-chart-card">
                <div class="dash-chart-title">Inventory Status Mix</div>
                <div class="dash-chart-canvas">
                    <canvas id="dash-status-chart"></canvas>
                </div>
            </div>
        </div>

        <div class="card dash-chart-card dash-wide-chart-card">
            <div class="dash-chart-title">Project Performance (by Value)</div>
            <div class="dash-chart-canvas dash-chart-canvas-wide">
                <canvas id="dash-project-chart"></canvas>
            </div>
        </div>

        <div class="dash-section-title">Project Performance</div>
        <div class="table-wrap" style="margin-bottom:18px">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Units</th>
                        <th>Value</th>
                        <th>Avg Unit Price</th>
                    </tr>
                </thead>
                <tbody id="dash-project-table"></tbody>
            </table>
        </div>

        <div class="dash-section-title">Sales Performance</div>
        <div class="table-wrap" style="margin-bottom:18px">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Sales</th>
                        <th>Units</th>
                        <th>Value</th>
                        <th>Avg Unit Price</th>
                    </tr>
                </thead>
                <tbody id="dash-sales-table"></tbody>
            </table>
        </div>

        <div class="dash-section-title">Manager / Director Performance</div>
        <div class="dash-2col">
            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Manager</th>
                            <th>Units</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody id="dash-manager-table"></tbody>
                </table>
            </div>

            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Director</th>
                            <th>Units</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody id="dash-director-table"></tbody>
                </table>
            </div>
        </div>

        <div class="dash-section-title">Broker Performance</div>
        <div class="table-wrap" style="margin-bottom:18px">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Broker</th>
                        <th>Units</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody id="dash-broker-table"></tbody>
            </table>
        </div>

        <div class="dash-section-title">Top Units</div>
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Unit Code</th>
                        <th>Project</th>
                        <th>Type</th>
                        <th>Sales</th>
                        <th>Area</th>
                        <th>Value</th>
                        <th>Contract Date</th>
                    </tr>
                </thead>
                <tbody id="dash-top-units-table"></tbody>
            </table>
        </div>
    `;
}

export function renderKpis(k = {}) {
    const items = [
        ["Active Sales Value", Formatter.money(k.totalSalesValue || 0)],
        ["Contracted Units", k.contractedUnits || 0],
        ["Sold Units", k.soldUnits || 0],
        ["Reserved Units", k.reservedUnits || 0],
        ["Available Units", k.availableUnits || 0],
        ["Cancelled Units", k.cancelledUnits || 0],
        ["Avg Unit Price", Formatter.money(k.avgUnitPrice || 0)],
        ["Remaining DP", Formatter.money(k.remainingDp || 0)]
    ];

    return items.map(([title, value]) => `
        <div class="kpi-card">
            <div class="kpi-title">${escapeHtml(title)}</div>
            <div class="kpi-value">${value}</div>
        </div>
    `).join("");
}

export function renderStatusComboKpis(statusMix = []) {
    const find = (name) => {
        return statusMix.find((r) => String(r.Status || "").toLowerCase() === name.toLowerCase());
    };

    const sumOf = (...names) => {
        const rows = names.map(find).filter(Boolean);

        return {
            units: rows.reduce((s, r) => s + Number(r.Units || 0), 0),
            value: rows.reduce((s, r) => s + Number(r.Value || 0), 0)
        };
    };

    const items = [
        ["Contracted", sumOf("Contracted")],
        ["Sold", sumOf("Sold")],
        ["Reserved", sumOf("Reserved")],
        ["Contracted + Sold", sumOf("Contracted", "Sold")],
        ["Sold + Reserved", sumOf("Sold", "Reserved")],
        ["All Active Sales", sumOf("Contracted", "Sold", "Reserved")]
    ];

    return items.map(([title, item]) => `
        <div class="kpi-card">
            <div class="kpi-title">${escapeHtml(title)}</div>
            <div class="kpi-value">${item.units}</div>
            <div class="kpi-sub">${Formatter.money(item.value)}</div>
        </div>
    `).join("");
}

function genericRows(rows, columns, emptyColspan) {
    if (!rows || !rows.length) {
        return `<tr><td colspan="${emptyColspan}" class="table-empty">No data</td></tr>`;
    }

    return rows.map((r) => `
        <tr>
            ${columns.map((c) => {
                const value = r[c.key];

                if (c.money) {
                    return `<td>${Formatter.money(value || 0)}</td>`;
                }

                return `<td>${escapeHtml(value ?? "")}</td>`;
            }).join("")}
        </tr>
    `).join("");
}

export function renderProjectTable(rows) {
    return genericRows(rows, [
        { key: "Project" },
        { key: "Units" },
        { key: "Value", money: true },
        { key: "AvgUnitPrice", money: true }
    ], 4);
}

export function renderSalesTable(rows) {
    return genericRows(rows, [
        { key: "Sales" },
        { key: "Units" },
        { key: "Value", money: true },
        { key: "AvgUnitPrice", money: true }
    ], 4);
}

export function renderManagerTable(rows) {
    return genericRows(rows, [
        { key: "Manager" },
        { key: "Units" },
        { key: "Value", money: true }
    ], 3);
}

export function renderDirectorTable(rows) {
    return genericRows(rows, [
        { key: "Director" },
        { key: "Units" },
        { key: "Value", money: true }
    ], 3);
}

export function renderBrokerTable(rows) {
    return genericRows(rows, [
        { key: "Broker" },
        { key: "Units" },
        { key: "Value", money: true }
    ], 3);
}

export function renderTopUnitsTable(rows) {
    return genericRows(rows, [
        { key: "UnitCode" },
        { key: "Project" },
        { key: "UnitType" },
        { key: "Sales" },
        { key: "Area" },
        { key: "Value", money: true },
        { key: "ContractDate" }
    ], 7);
}