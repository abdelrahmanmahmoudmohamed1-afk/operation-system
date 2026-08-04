/**
 * ---------------------------------------------------------
 * CRM Module — View
 * كل دوال الـ HTML هنا فقط، من غير أي منطق نداء API.
 * ---------------------------------------------------------
 */

import { escapeHtml, buildTable, buildTableHead } from "../../utils/helpers.js";
import Formatter from "../../utils/formatter.js";

const TABLE_COLUMNS = [
    { key: "unitCode", label: "Unit Code" },
    { key: "project", label: "Project" },
    { key: "clientName", label: "Client" },
    { key: "clientPhone", label: "Mobile" },
    { key: "clientAddress", label: "Address" },
    { key: "salesName", label: "Sales" },
    { key: "status", label: "Status" },
    { key: "soldPrice", label: "Value" },
    { key: "contractDate", label: "Contract Date" },
    { key: "documents", label: "Documents" }
];

function statusBadge(status) {
    const key = String(status || "").toLowerCase();
    return `<span class="badge badge-${key}">${escapeHtml(status || "-")}</span>`;
}

export function renderLayout() {
    return `
        <div class="page-header">
            <div>
                <h1>CRM</h1>
                <p>Clients, contracts and registrations</p>
            </div>
            <button class="btn btn-primary" id="crm-add-btn">+ Register Client</button>
        </div>

        <div class="filter-bar">
            <div class="filter-field">
                <label>Search</label>
                <input type="text" id="crm-search" placeholder="Client, mobile, address or unit code">
            </div>
            <button class="btn btn-outline" id="crm-refresh-btn">Refresh</button>
        </div>

        <div class="table-wrap">
            <table class="data-table">
                <thead><tr>${buildTableHead(TABLE_COLUMNS)}</tr></thead>
                <tbody id="crm-table-body">
                    <tr><td colspan="${TABLE_COLUMNS.length}" class="table-empty">Loading...</td></tr>
                </tbody>
            </table>
        </div>

        <div id="crm-modal-root"></div>
    `;
}

export function renderTableRows(rows) {
    if (!rows || !rows.length) {
        return `<tr><td colspan="${TABLE_COLUMNS.length}" class="table-empty">No clients found</td></tr>`;
    }

    return rows.map((row) => `
        <tr class="detail-row" data-detail='${escapeHtml(JSON.stringify(row))}'>
            <td>${escapeHtml(row.unitCode)}</td>
            <td>${escapeHtml(row.project)}</td>
            <td>${escapeHtml(row.clientName)}</td>
            <td><div>${escapeHtml(row.clientPhone || "-")}</div><small>${escapeHtml(row.clientPhone2 || "")}</small></td>
            <td class="cell-wrap">${escapeHtml(row.clientAddress || "-")}</td>
            <td>${escapeHtml(row.salesName)}</td>
            <td>${statusBadge(row.status)}</td>
            <td>${Formatter.money(row.soldPrice)}</td>
            <td>${escapeHtml(row.contractDate || "-")}</td>
            <td><button type="button" class="btn btn-outline btn-sm crm-upload-contract" data-client='${escapeHtml(JSON.stringify({unitCode:row.unitCode,project:row.project,clientName:row.clientName}))}'>Upload PDF</button></td>
        </tr>
    `).join("");
}

export function renderRegisterForm({ salesOptions, lists }) {
    const salesOpts = (salesOptions || []).map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    const nationalityOpts = (lists.nationalities || []).map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("");
    const sourceOpts = (lists.sourceOptions || []).map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    const paymentOpts = (lists.paymentMethods || []).map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");

    return `
        <div class="modal-backdrop" id="crm-modal-backdrop">
            <div class="modal-box">
                <h2>Register New Client</h2>

                <form id="crm-client-form">
                    <div class="form-grid">
                        <div>
                            <label>Project</label>
                            <input type="text" name="project" required>
                        </div>
                        <div>
                            <label>Unit Code</label>
                            <input type="text" name="unitCode" required>
                        </div>
                        <div class="field-full">
                            <label>Client Name</label>
                            <input type="text" name="clientName" required>
                        </div>
                        <div>
                            <label>Client Phone</label>
                            <input type="text" name="clientPhone" placeholder="01xxxxxxxxx" required>
                        </div>
                        <div>
                            <label>Client Email</label>
                            <input type="email" name="clientEmail">
                        </div>
                        <div>
                            <label>Nationality</label>
                            <select name="clientNationality">${nationalityOpts}</select>
                        </div>
                        <div>
                            <label>Sales Name</label>
                            <select name="salesName1" id="crm-sales-select">
                                <option value="">Select sales</option>
                                ${salesOpts}
                            </select>
                        </div>
                        <div>
                            <label>Source</label>
                            <select name="source">${sourceOpts}</select>
                        </div>
                        <div>
                            <label>Booking Deposit</label>
                            <input type="number" name="bookingDeposit" min="0">
                        </div>
                        <div>
                            <label>Payment Method</label>
                            <select name="paymentMethod">${paymentOpts}</select>
                        </div>
                    </div>

                    <p class="form-error hidden" id="crm-form-error"></p>

                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" id="crm-cancel-btn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Client</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}


export function renderUploadContractModal(client = {}) {
    return `
        <div class="modal-backdrop" id="crm-contract-modal-backdrop">
            <div class="modal-box crm-contract-upload-modal">
                <h2>Upload Client Contract</h2>
                <p class="modal-subtitle">${escapeHtml(client.project || "-")} — ${escapeHtml(client.unitCode || "-")} — ${escapeHtml(client.clientName || "-")}</p>
                <form id="crm-contract-upload-form">
                    <div class="form-grid">
                        <div>
                            <label>Document Type</label>
                            <select name="documentType" class="premium-select">
                                <option value="Contract">Contract</option>
                                <option value="ID">ID</option>
                                <option value="Payment Receipt">Payment Receipt</option>
                                <option value="Cancellation">Cancellation</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="field-full">
                            <label>PDF File (max 8 MB)</label>
                            <input type="file" id="crm-contract-file" name="file" accept="application/pdf,.pdf" required>
                        </div>
                    </div>
                    <p class="form-error hidden" id="crm-contract-error"></p>
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" id="crm-contract-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="crm-contract-submit">Upload PDF</button>
                    </div>
                </form>
            </div>
        </div>`;
}
