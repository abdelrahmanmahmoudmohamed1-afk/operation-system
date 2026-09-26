import { projectLabel } from "../../utils/project-label.js";
import { escapeHtml } from "../../utils/helpers.js";

export function renderLayout(){
 return `
 <div class="page-header"><div><div class="eyebrow">Pipeline workspace</div><h1>Leads</h1><p>Search, update, import and progress leads through the sales funnel.</p></div><div class="page-header-actions"><div class="segmented-control"><button class="seg-btn active" data-leads-view="table">Table</button><button class="seg-btn" data-leads-view="kanban">Kanban</button></div><button class="btn btn-outline" id="leads-refresh">Refresh</button><button class="btn btn-primary" id="leads-import">Import Excel</button></div></div>
 <div class="card leads-toolbar">
   <input id="leads-search" class="premium-input" placeholder="Search name, phone, project, sales, status...">
   <select id="leads-status" class="premium-select"><option value="ALL">All Statuses</option></select>
   <select id="leads-bulk-status" class="premium-select"><option value="">Bulk status...</option><option>Potential</option><option>No Potential</option><option>Not Contacted</option><option>Follow Up</option><option>Meeting</option><option>Reserved</option><option>Lost</option></select>
   <button class="btn btn-primary" id="leads-apply-bulk">Update Selected</button>
 </div>
 <div class="kpi-grid" id="leads-kpis"></div>
 <div class="table-wrap" id="leads-table-view"><table class="data-table"><thead><tr><th><input type="checkbox" id="leads-select-all"></th><th>Date</th><th>Client</th><th>Phone</th><th>Project</th><th>Sales</th><th>Status</th><th>Stage</th><th>Source</th><th>Lead Age</th><th>Status Age</th><th>Last Comment</th></tr></thead><tbody id="leads-body"></tbody></table></div>
 <div class="lead-kanban hidden" id="leads-kanban-view"></div>
 <div id="leads-modal-root"></div>`;
}
export function renderRows(rows=[]){
 if(!rows.length) return `<tr><td colspan="12" class="table-empty">No leads found</td></tr>`;
 return rows.map(r=>`<tr><td><input type="checkbox" class="lead-select" value="${Number(r.rowNumber)}"></td><td>${escapeHtml(r.date||'')}</td><td>${escapeHtml(r.clientName||'')}</td><td>${escapeHtml(r.phone||'')}</td><td>${escapeHtml(projectLabel(r.project||''))}</td><td>${escapeHtml(r.salesName||'')}</td><td><span class="status-badge">${escapeHtml(r.status||'-')}</span></td><td>${escapeHtml(r.stage||'')}</td><td>${escapeHtml(r.source||'')}</td><td>${Number(r.leadAgeDays||0)}d</td><td>${Number(r.statusAgeDays||0)}d</td><td class="cell-wrap">${escapeHtml(r.lastComment||'')}</td></tr>`).join('');
}
export function renderKpis(data){ return `<div class="kpi-card"><div class="kpi-title">Total Leads</div><div class="kpi-value">${Number(data?.meta?.total||0)}</div></div><div class="kpi-card"><div class="kpi-title">Selected</div><div class="kpi-value" id="leads-selected-count">0</div></div>`; }
export function renderImportModal(){return `<div class="modal-backdrop" id="leads-import-backdrop"><div class="modal-box"><div class="modal-head"><div><h2>Import Leads</h2><p>Excel / CSV is imported into the system CRM. Existing Lead ID / phone records are updated instead of duplicated.</p></div><button class="modal-close" id="leads-import-close">×</button></div><input type="file" id="leads-file" accept=".xlsx,.xls,.csv"><p class="form-error hidden" id="leads-import-error"></p><div class="modal-actions"><button class="btn btn-outline" id="leads-import-cancel">Cancel</button><button class="btn btn-primary" id="leads-import-run">Import</button></div></div></div>`;}

export function renderKanban(rows=[]){
 const stages=["New","Not Contacted","Potential","Follow Up","Meeting","Reserved","Contracted","Lost"];
 const stageOf=(r)=>String(r.stage||r.status||"New");
 return stages.map(stage=>{const items=rows.filter(r=>stageOf(r).toLowerCase()===stage.toLowerCase() || (stage==='New' && !stageOf(r)));return `<section class="kanban-column"><div class="kanban-head"><strong>${escapeHtml(stage)}</strong><span>${items.length}</span></div><div class="kanban-body">${items.map(r=>`<article class="lead-kanban-card"><div class="lead-kanban-top"><strong>${escapeHtml(r.clientName||'Unnamed lead')}</strong><span>${escapeHtml(projectLabel(r.project||'-'))}</span></div><p>${escapeHtml(r.phone||'No mobile')}</p><div class="lead-kanban-meta"><span>${escapeHtml(r.salesName||'Unassigned')}</span><span>${escapeHtml(r.source||'')}</span></div></article>`).join('')||`<div class="empty-state compact"><span>No leads</span></div>`}</div></section>`}).join('');
}
