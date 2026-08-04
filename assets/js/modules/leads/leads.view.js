import { escapeHtml } from "../../utils/helpers.js";

export function renderLayout(){
  return `
  <div class="page-header"><div><h1>Leads</h1><p>Import, review and update lead records in bulk</p></div><div class="page-header-actions"><button class="btn btn-outline" id="leads-refresh">Refresh</button><button class="btn btn-primary" id="leads-import-open">Import Excel</button></div></div>
  <div class="filter-bar leads-toolbar">
    <div class="filter-field"><label>Search</label><input id="leads-search" placeholder="Name, mobile, project, sales or status"></div>
    <div class="filter-field"><label>Bulk status</label><select id="leads-bulk-status"><option value="">Select status</option><option>Not Contacted</option><option>Potential</option><option>No Potential</option><option>Follow Up</option><option>Meeting</option><option>Reserved</option><option>Closed</option><option>Wrong Number</option></select></div>
    <button class="btn btn-primary" id="leads-apply-status">Update Selected</button>
  </div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th><input type="checkbox" id="leads-select-all"></th><th>Date</th><th>Lead ID</th><th>Client</th><th>Mobile</th><th>Address</th><th>Project</th><th>Sales</th><th>Status</th><th>Stage</th><th>Source</th></tr></thead><tbody id="leads-body"><tr><td colspan="11" class="table-empty">Loading...</td></tr></tbody></table></div>
  <div id="leads-modal-root"></div>`;
}
export function renderRows(rows=[]){
  if(!rows.length) return `<tr><td colspan="11" class="table-empty">No leads found</td></tr>`;
  return rows.map(r=>`<tr>
    <td><input type="checkbox" class="lead-check" value="${Number(r.rowNumber||0)}"></td>
    <td>${escapeHtml(r.date||'-')}</td><td>${escapeHtml(r.leadId||'-')}</td><td>${escapeHtml(r.clientName||'-')}</td>
    <td><div>${escapeHtml(r.clientPhone||'-')}</div><small>${escapeHtml(r.clientPhone2||'')}</small></td>
    <td class="cell-wrap">${escapeHtml(r.clientAddress||'-')}</td><td>${escapeHtml(r.project||'-')}</td><td>${escapeHtml(r.salesName||'-')}</td>
    <td><span class="badge">${escapeHtml(r.status||'-')}</span></td><td>${escapeHtml(r.stage||'-')}</td><td>${escapeHtml(r.source||'-')}</td>
  </tr>`).join('');
}
export function renderImportModal(){
  return `<div class="modal-backdrop" id="leads-import-backdrop"><div class="modal-box leads-import-modal"><h2>Import Leads from Excel</h2><p class="note">Supported formats: .xlsx, .xls and .csv. Review the detected rows before saving.</p>
  <div class="form-grid"><div class="field-full"><label>Excel file</label><input type="file" id="leads-excel-file" accept=".xlsx,.xls,.csv"></div><div><label>Duplicates</label><select id="leads-duplicate-mode"><option value="skip">Skip existing mobile numbers</option><option value="update">Update existing rows</option><option value="new">Import as new rows</option></select></div></div>
  <div id="leads-import-summary" class="import-summary hidden"></div><div class="table-wrap import-preview-wrap"><table class="data-table"><thead id="leads-preview-head"></thead><tbody id="leads-preview-body"><tr><td class="table-empty">Choose a file to preview data.</td></tr></tbody></table></div>
  <p id="leads-import-error" class="form-error hidden"></p><div class="form-actions"><button class="btn btn-outline" id="leads-import-cancel">Cancel</button><button class="btn btn-primary" id="leads-import-save" disabled>Import Leads</button></div></div></div>`;
}
