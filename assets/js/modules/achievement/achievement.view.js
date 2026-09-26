import { projectLabel } from "../../utils/project-label.js";
import { escapeHtml } from "../../utils/helpers.js";
import Formatter from "../../utils/formatter.js";

export function renderLayout(){
    const now=new Date();
    const months=Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?"selected":""}>${new Date(2000,i,1).toLocaleString('en',{month:'long'})}</option>`).join('');
    const years=Array.from({length:7},(_,i)=>now.getFullYear()-3+i).map(y=>`<option value="${y}" ${y===now.getFullYear()?"selected":""}>${y}</option>`).join('');
    return `
      <div class="page-header enterprise-page-head">
        <div><span class="report-eyebrow">Current-stage performance</span><h1>Achievement</h1><p>Reserved, Contracted and Sold only — one current status per unit.</p></div>
        <div class="page-header-actions"><button class="btn btn-outline" id="ach-print">Print / PDF</button><button class="btn btn-primary" id="ach-refresh">Refresh</button></div>
      </div>
      <div class="card achievement-filter-card">
        <div class="achievement-filter-grid">
          <div class="filter-field"><label>Period</label><select id="ach-period" class="premium-select"><option value="all">All Data</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly" selected>Monthly</option><option value="custom">Custom Range</option></select></div>
          <div class="filter-field"><label>Month</label><select id="ach-month" class="premium-select">${months}</select></div>
          <div class="filter-field"><label>Year</label><select id="ach-year" class="premium-select">${years}</select></div>
          <div class="filter-field"><label>Day</label><input id="ach-day" class="premium-input" type="number" min="1" max="31" value="${now.getDate()}"></div>
          <div class="filter-field ach-custom hidden"><label>From</label><input id="ach-from" class="premium-input" type="date"></div>
          <div class="filter-field ach-custom hidden"><label>To</label><input id="ach-to" class="premium-input" type="date"></div>
        </div>
      </div>
      <div class="kpi-grid" id="ach-kpis"></div>
      <div class="card achievement-table-card">
        <div class="report-table-header"><div><div class="dash-chart-title">Achievement Units</div><strong id="ach-selected">0</strong> selected <span id="ach-selected-value" class="report-summary-note"></span></div><div class="report-actions-mini"><button class="btn btn-outline" id="ach-select-all-btn">Select All</button><button class="btn btn-outline" id="ach-clear-btn">Clear</button></div></div>
        <div class="table-wrap"><table class="data-table achievement-table"><thead><tr><th class="report-select-col"></th><th>Date</th><th>Project</th><th>Unit</th><th>Status</th><th>Client</th><th>Mobile</th><th>Sales</th><th>Unit Type</th><th>Area</th><th>Value</th></tr></thead><tbody id="ach-body"></tbody></table></div>
      </div>`;
}

export function renderKpis(data){
    const k=data?.kpis||{}; const m=data?.meta||{};
    const item=(title,obj)=>`<div class="kpi-card"><div class="kpi-title">${escapeHtml(title)}</div><div class="kpi-value">${obj?.units||0}</div><div class="kpi-sub">${Formatter.money(obj?.value||0)}</div></div>`;
    return item('Reserved',k.reserved)+item('Contracted',k.contracted)+item('Sold',k.sold)+`<div class="kpi-card"><div class="kpi-title">Grand Total</div><div class="kpi-value">${m.units||0}</div><div class="kpi-sub">${Formatter.money(m.value||0)}</div></div>`;
}

export function renderRows(rows=[]){
    if(!rows.length) return `<tr><td colspan="11" class="table-empty">No achievement units match this period.</td></tr>`;
    return rows.map((r,i)=>`<tr class="achievement-row" data-index="${i}"><td class="report-select-col"><input class="ach-select" type="checkbox" value="${i}" checked></td><td>${escapeHtml(r.Date||'-')}</td><td>${escapeHtml(projectLabel(r.Project||'-'))}</td><td>${escapeHtml(r.UnitCode||'-')}</td><td><span class="status-badge">${escapeHtml(r.Status||'-')}</span></td><td>${escapeHtml(r.Client||'-')}</td><td>${escapeHtml(r.Mobile||'-')}</td><td>${escapeHtml(r.Sales||'-')}</td><td>${escapeHtml(r.UnitType||'-')}</td><td>${escapeHtml(r.Area||0)}</td><td>${Formatter.money(r.Value||0)}</td></tr>`).join('');
}
