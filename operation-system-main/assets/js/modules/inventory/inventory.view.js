import { escapeHtml, buildTableHead } from "../../utils/helpers.js";
import Formatter from "../../utils/formatter.js";

const COLUMNS = [
    { key: "unitCode", label: "Unit Code" },
    { key: "project", label: "Project" },
    { key: "unitType", label: "Type" },
    { key: "floor", label: "Floor" },
    { key: "status", label: "Status" },
    { key: "area", label: "Area" },
    { key: "soldPrice", label: "Price" },
    { key: "profile", label: "360" }
];

function slugStatus(status) {
    return String(status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function statusBadge(status) {
    return `<span class="badge badge-${slugStatus(status)}">${escapeHtml(status || "-")}</span>`;
}

export function renderLayout(projects) {
    const options = (projects || []).map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");

    return `
        <div class="page-header">
            <div>
                <h1>Inventory</h1>
                <p>All units across projects</p>
            </div>
        </div>

        <div class="filter-bar">
            <div class="filter-field">
                <label>Project</label>
                <select id="inv-project-filter">
                    <option value="ALL">All Projects</option>
                    ${options}
                </select>
            </div>
            <div class="filter-field">
                <label>Status</label>
                <select id="inv-status-filter">
                    <option value="ALL">All Statuses</option>
                </select>
            </div>
            <button class="btn btn-outline" id="inv-refresh-btn">Refresh</button>
        </div>

        <div class="kpi-grid" id="inv-kpis"></div>

        <div class="table-wrap">
            <table class="data-table">
                <thead><tr>${buildTableHead(COLUMNS)}</tr></thead>
                <tbody id="inv-table-body"></tbody>
            </table>
        </div>
    `;
}

/**
 * بتبني خيارات فلتر الحالة ديناميكيًا من الحالات الموجودة فعليًا
 * في الداتا، مش من قائمة ثابتة في الكود — فأي حالة جديدة تتضاف
 * في الشيت تظهر هنا تلقائيًا من غير ما حد يعدّل كود.
 */
export function renderStatusOptions(rows, currentValue) {
    const set = new Set();
    (rows || []).forEach((r) => { if (r.status) set.add(r.status); });

    const statuses = Array.from(set).sort();
    const options = statuses.map((s) => `
        <option value="${escapeHtml(s)}" ${s === currentValue ? "selected" : ""}>${escapeHtml(s)}</option>
    `).join("");

    return `<option value="ALL" ${currentValue === "ALL" ? "selected" : ""}>All Statuses</option>${options}`;
}

export function renderKpis(rows) {
    const total = rows.length;
    const value = rows.reduce((s, r) => s + Number(r.soldPrice || 0), 0);

    const statusCounts = {};
    rows.forEach((r) => {
        const s = r.status || "Blank";
        statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const items = [["Total Units", total], ["Total Value", Formatter.money(value)]];

    Object.keys(statusCounts).sort().forEach((s) => {
        items.push([s, statusCounts[s]]);
    });

    return items.map(([title, val]) => `
        <div class="kpi-card">
            <div class="kpi-title">${escapeHtml(title)}</div>
            <div class="kpi-value">${val}</div>
        </div>
    `).join("");
}

export function renderRows(rows) {
    return rows.map((r) => `
        <tr class="detail-row" data-detail='${escapeHtml(JSON.stringify(r))}'>
            <td>${escapeHtml(r.unitCode)}</td>
            <td>${escapeHtml(r.project)}</td>
            <td>${escapeHtml(r.unitType)}</td>
            <td>${escapeHtml(r.floor)}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${Formatter.number(r.area)}</td>
            <td>${Formatter.money(r.soldPrice)}</td>
            <td><button type="button" class="btn btn-primary btn-sm inv-open-360" data-unit-row='${escapeHtml(JSON.stringify(r))}'>Open</button></td>
        </tr>
    `).join("");
}
