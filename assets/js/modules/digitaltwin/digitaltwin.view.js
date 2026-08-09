import Formatter from '../../utils/formatter.js';
import { escapeHtml } from '../../utils/helpers.js';

function slug(v){ return String(v||'blank').toLowerCase().replace(/[^a-z0-9]+/g,'-'); }
function statusLabel(v){ return escapeHtml(v || 'Unknown'); }

export function layout(){
  return `<div class="page-header enterprise-page-head twin-page-head">
    <div><div class="eyebrow">Portfolio visualization</div><h1>Digital Twin</h1><p>Explore buildings, floors and units as a live operational map.</p></div>
    <div class="page-header-actions"><button class="btn btn-outline" id="twin-reset">Reset View</button><button class="btn btn-primary" data-route="inventory">Open Inventory</button></div>
  </div>
  <section class="twin-command-bar card">
    <label><span>Project</span><select id="twin-project"><option value="ALL">All Projects</option></select></label>
    <label><span>Building</span><select id="twin-building"><option value="ALL">All Buildings</option></select></label>
    <label><span>Status</span><select id="twin-status"><option value="ALL">All Statuses</option></select></label>
    <label class="twin-search"><span>Find unit</span><input id="twin-search" placeholder="Unit code, type, floor…"></label>
  </section>
  <div id="twin-kpis" class="kpi-grid twin-kpis"></div>
  <div class="twin-layout"><section id="twin-stage" class="card twin-stage"></section><aside id="twin-inspector" class="card twin-inspector"></aside></div>`;
}

export function controls(units){
  const uniq = (key) => Array.from(new Set(units.map(x=>x[key]).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b)));
  return { projects:uniq('project'), buildings:uniq('building'), statuses:uniq('status') };
}

export function renderKpis(rows){
  const closed = rows.filter(x=>['reserved','contracted','sold'].includes(String(x.status||'').toLowerCase())).length;
  const available = rows.filter(x=>String(x.status||'').toLowerCase()==='available').length;
  const value = rows.reduce((s,x)=>s+Number(x.price||0),0);
  return [
    ['Visible Units', rows.length, 'Live map'],
    ['Available', available, 'Ready inventory'],
    ['Closed Pipeline', closed, rows.length?`${Math.round(closed/rows.length*100)}% occupancy`:'0% occupancy'],
    ['Portfolio Value', Formatter.money(value), 'Visible scope']
  ].map(([a,b,c])=>`<div class="kpi-card twin-kpi"><div class="kpi-title">${escapeHtml(a)}</div><div class="kpi-value">${escapeHtml(b)}</div><div class="kpi-sub">${escapeHtml(c)}</div></div>`).join('');
}

export function renderStage(rows){
  if(!rows.length) return `<div class="empty-state"><strong>No units in this view</strong><span>Change a filter or reset the Digital Twin.</span></div>`;
  const groups = {};
  rows.forEach(u=>{ const key=`${u.project||'Unknown'}::${u.building||'Unassigned'}`; (groups[key] ||= {project:u.project||'Unknown',building:u.building||'Unassigned',units:[]}).units.push(u); });
  return `<div class="twin-world">${Object.values(groups).map(g=>{
    const closed=g.units.filter(x=>['reserved','contracted','sold'].includes(String(x.status||'').toLowerCase())).length;
    const occupancy=g.units.length?Math.round(closed/g.units.length*100):0;
    const floors=Array.from(new Set(g.units.map(x=>x.floor||'—'))).length;
    return `<article class="twin-building-card" data-building="${escapeHtml(g.building)}">
      <header><div><span>${escapeHtml(g.project)}</span><h3>${escapeHtml(g.building)}</h3></div><strong>${occupancy}%</strong></header>
      <div class="twin-building-meta"><span>${g.units.length} units</span><span>${floors} floors</span><span>${Formatter.money(g.units.reduce((s,x)=>s+Number(x.price||0),0))}</span></div>
      <div class="twin-unit-grid">${g.units.slice().sort((a,b)=>String(a.unitCode).localeCompare(String(b.unitCode),undefined,{numeric:true})).map(u=>`<button class="twin-unit status-${slug(u.status)}" data-unit-id="${escapeHtml(u.id)}" title="${escapeHtml(u.unitCode)} · ${statusLabel(u.status)}"><strong>${escapeHtml(u.unitCode||'—')}</strong><small>${escapeHtml(u.floor||'')}</small></button>`).join('')}</div>
    </article>`;
  }).join('')}</div>`;
}

export function renderInspector(unit, allRows, planState=null){
  if(!unit){
    return `<div class="twin-inspector-empty"><span class="twin-orb"></span><div><div class="eyebrow">Live twin</div><h2>Select a unit</h2><p>Choose any unit to inspect commercial data and its architectural drawing.</p></div><div class="twin-legend"><i class="available"></i>Available<i class="reserved"></i>Reserved<i class="contracted"></i>Contracted<i class="sold"></i>Sold</div></div>`;
  }
  const plan=planState?.plan||null; const loading=planState?.loading;
  const planHtml=loading?`<div class="floor-plan-state"><span class="mini-spinner"></span> Loading architectural drawing…</div>`:plan?.url?`<div class="floor-plan-preview"><div class="floor-plan-preview-head"><strong>Architectural Drawing</strong><a class="btn btn-outline btn-sm" href="${escapeHtml(plan.openUrl||plan.url)}" target="_blank" rel="noopener">Open PDF</a></div><iframe src="${escapeHtml(plan.url)}" title="Floor plan PDF"></iframe></div>`:`<div class="floor-plan-empty"><strong>No architectural drawing uploaded</strong><span>Upload the unit drawing as PDF. It will be linked permanently to ${escapeHtml(unit.unitCode||'this unit')}.</span><label class="btn btn-primary floor-plan-upload-label">Upload Drawing<input type="file" class="twin-floor-plan-file" data-unit-id="${escapeHtml(unit.id)}" accept="application/pdf,.pdf" hidden></label></div>`;
  return `<div class="twin-detail-head"><div><span class="eyebrow">Unit intelligence</span><h2>${escapeHtml(unit.unitCode||'Unit')}</h2><p>${escapeHtml(unit.project||'')} · ${escapeHtml(unit.building||'')} · Floor ${escapeHtml(unit.floor||'—')}</p></div><span class="badge badge-${slug(unit.status)}">${statusLabel(unit.status)}</span></div>
  <div class="twin-detail-grid"><div><span>Type</span><strong>${escapeHtml(unit.unitType||'—')}</strong></div><div><span>Area</span><strong>${Formatter.number(unit.area)} m²</strong></div><div><span>Price</span><strong>${Formatter.money(unit.price)}</strong></div><div><span>Status</span><strong>${statusLabel(unit.status)}</strong></div></div>
  <div class="unit-plan-section">${planHtml}</div>
  <button class="btn btn-outline twin-open-360" data-unit-id="${escapeHtml(unit.id)}">Open Unit 360</button>`;
}
