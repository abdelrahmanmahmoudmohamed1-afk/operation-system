import { escapeHtml, buildTableHead } from "../../utils/helpers.js";
import Formatter from "../../utils/formatter.js";

const COLUMNS = [
    { key: "Date", label: "Date" },
    { key: "ClientName", label: "Client" },
    { key: "Project", label: "Project" },
    { key: "Housing", label: "Housing" },
    { key: "Phone", label: "Phone" },
    { key: "Interest", label: "Interest" },
    { key: "Deposit", label: "Deposit" },
    { key: "Sales", label: "Sales" },
    { key: "Source", label: "Source" }
];

export function renderLayout(projects = []) {
    const projectOptions = (projects || []).map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
    return `
        <div class="page-header">
            <div>
                <h1>EOI</h1>
                <p>Expression of Interest entries</p>
            </div>
            <div class="page-header-actions"><select id="eoi-project-filter" class="premium-select"><option value="ALL">All Projects</option>${projectOptions}</select><button class="btn btn-primary" id="eoi-add-btn">+ New EOI</button></div>
        </div>

        <div class="kpi-grid" id="eoi-kpis"></div>

        <div class="table-wrap">
            <table class="data-table">
                <thead><tr>${buildTableHead(COLUMNS)}</tr></thead>
                <tbody id="eoi-table-body">
                    <tr><td colspan="${COLUMNS.length}" class="table-empty">Loading...</td></tr>
                </tbody>
            </table>
        </div>

        <div id="eoi-modal-root"></div>
    `;
}

export function renderKpis(data) {
    const items = [
        ["Total EOIs", data.meta.total],
        ["Total Deposits", Formatter.money(data.meta.totalDeposit)]
    ];

    return items.map(([t, v]) => `
        <div class="kpi-card"><div class="kpi-title">${t}</div><div class="kpi-value">${v}</div></div>
    `).join("");
}

export function renderRows(rows) {
    if (!rows || !rows.length) {
        return `<tr><td colspan="${COLUMNS.length}" class="table-empty">No EOI records found</td></tr>`;
    }

    return rows.map((r) => `
        <tr>
            <td>${escapeHtml(r.Date)}</td>
            <td>${escapeHtml(r.ClientName)}</td>
            <td>${escapeHtml(r.Project)}</td>
            <td>${escapeHtml(r.Housing)}</td>
            <td>${escapeHtml(r.Phone)}</td>
            <td>${escapeHtml(r.Interest)}</td>
            <td>${Formatter.money(r.Deposit)}</td>
            <td>${escapeHtml(r.Sales)}</td>
            <td>${escapeHtml(r.Source)}</td>
        </tr>
    `).join("");
}

export function renderForm({ salesOptions, lists }) {
    const salesOpts = (salesOptions || []).map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    const sourceOpts = (lists.sourceOptions || []).map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    const interestOpts = (lists.interestOptions || []).map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    const paymentOpts = (lists.paymentMethods || []).map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    const projectOpts = (lists.projectOptions || ["Layana","Mersea"]).map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    const housingOpts = (lists.housingOptions || ["Housing","Investment","Second Home","Other"]).map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");

    return `
        <div class="modal-backdrop" id="eoi-modal-backdrop">
            <div class="modal-box">
                <h2>New EOI Entry</h2>

                <form id="eoi-form">
                    <div class="form-grid">
                        <div><label>Client Name</label><input type="text" name="clientName1" required></div>
                        <div><label>Client Phone</label><input type="text" name="clientPhone" placeholder="01xxxxxxxxx" required></div>
                        <div><label>Project</label><select name="project" required><option value="">Select</option>${projectOpts}</select></div>
                        <div><label>Housing</label><select name="housing"><option value="">Select</option>${housingOpts}</select></div>
                        <div><label>Interest</label><select name="interest" required><option value="">Select</option>${interestOpts}</select></div>
                        <div><label>Sales Name</label><select name="salesName1" required><option value="">Select</option>${salesOpts}</select></div>
                        <div><label>Source</label><select name="source" required><option value="">Select</option>${sourceOpts}</select></div>
                        <div><label>Deposit</label><input type="number" name="depositEOI" min="0" required></div>
                        <div><label>Payment Method</label><select name="paymentMethod">${paymentOpts}</select></div>
                    </div>

                    <p class="form-error hidden" id="eoi-form-error"></p>

                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" id="eoi-cancel-btn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save EOI</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}
