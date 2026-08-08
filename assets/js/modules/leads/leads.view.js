import { escapeHtml } from "../../utils/helpers.js";

export function renderLayout(){
 return `
 <div class="page-header"><div><h1>Leads</h1><p>Search, update and import leads</p></div><div class="page-header-actions"><button class="btn btn-outline" id="leads-refresh">Refresh</button><button class="btn btn-primary" id="leads-import">Import Excel</button></div></div>
 <div class="card leads-toolbar">
   <input id="leads-search" class="premium-input" placeholder="Search name, phone, project, sales, status...">
   <select id="leads-status" class="premium-select"><option value="ALL">All Statuses</option></select>
   <select id="leads-bulk-status" class="premium-select"><option value="">Bulk status...</option><option>Potential</option><option>No Potential</option><option>Not Contacted</option><option>Follow Up</option><option>Meeting</option><option>Reserved</option><option>Lost</option></select>
   <button class="btn btn-primary" id="leads-apply-bulk">Update Selected</button>
 </div>
 <div class="kpi-grid" id="leads-kpis"></div>
 <div class="table-wrap"><table class="data-table"><thead><tr><th><input type="checkbox" id="leads-select-all"></th><th>Date</th><th>Client</th><th>Phone</th><th>Project</th><th>Sales</th><th>Status</th><th>Stage</th><th>Source</th><th>Last Comment</th></tr></thead><tbody id="leads-body"></tbody></table></div>
 <div id="leads-modal-root"></div>`;
}
export function renderRows(rows=[]){
 if(!rows.length) return `<tr><td colspan="10" class="table-empty">No leads found</td></tr>`;
 return rows.map(r=>`<tr><td><input type="checkbox" class="lead-select" value="${Number(r.rowNumber)}"></td><td>${escapeHtml(r.date||'')}</td><td>${escapeHtml(r.clientName||'')}</td><td>${escapeHtml(r.phone||'')}</td><td>${escapeHtml(r.project||'')}</td><td>${escapeHtml(r.salesName||'')}</td><td><span class="status-badge">${escapeHtml(r.status||'-')}</span></td><td>${escapeHtml(r.stage||'')}</td><td>${escapeHtml(r.source||'')}</td><td class="cell-wrap">${escapeHtml(r.lastComment||'')}</td></tr>`).join('');
}
export function renderKpis(data){ return `<div class="kpi-card"><div class="kpi-title">Total Leads</div><div class="kpi-value">${Number(data?.meta?.total||0)}</div></div><div class="kpi-card"><div class="kpi-title">Selected</div><div class="kpi-value" id="leads-selected-count">0</div></div>`; }
export function renderImportModal(){return `<div class="modal-backdrop" id="leads-import-backdrop"><div class="modal-box"><div class="modal-head"><div><h2>Import Leads</h2><p>Excel / CSV headers are matched to the sheet headers.</p></div><button class="modal-close" id="leads-import-close">×</button></div><input type="file" id="leads-file" accept=".xlsx,.xls,.csv"><p class="form-error hidden" id="leads-import-error"></p><div class="modal-actions"><button class="btn btn-outline" id="leads-import-cancel">Cancel</button><button class="btn btn-primary" id="leads-import-run">Import</button></div></div></div>`;}
