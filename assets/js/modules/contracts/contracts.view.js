import { projectLabel } from "../../utils/project-label.js";
import { escapeHtml, buildTableHead } from "../../utils/helpers.js";
import Formatter from "../../utils/formatter.js";

const COLUMNS = [
    { key: "unitCode", label: "Unit Code" },
    { key: "project", label: "Project" },
    { key: "clientName", label: "Client" },
    { key: "salesName", label: "Sales" },
    { key: "soldPrice", label: "Value" },
    { key: "contractDate", label: "Contract Date" }
];

export function renderLayout() {
    return `
        <div class="page-header">
            <div>
                <h1>Contracts</h1>
                <p>Signed and contracted client records</p>
            </div>
        </div>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr>${buildTableHead(COLUMNS)}</tr></thead>
                <tbody id="contracts-table-body"></tbody>
            </table>
        </div>
    `;
}

export function renderRows(rows) {
    return (rows || []).map((r) => `
        <tr class="detail-row" data-detail='${escapeHtml(JSON.stringify(r))}'>
            <td>${escapeHtml(r.unitCode)}</td>
            <td>${escapeHtml(projectLabel(r.project))}</td>
            <td>${escapeHtml(r.clientName)}</td>
            <td>${escapeHtml(r.salesName)}</td>
            <td>${Formatter.money(r.soldPrice)}</td>
            <td>${escapeHtml(r.contractDate || "-")}</td>
        </tr>
    `).join("");
}
