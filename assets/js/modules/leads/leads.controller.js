import Module from "../../core/module.js";
import LeadsService from "./leads.service.js";
import { renderLayout, renderRows, renderImportModal } from "./leads.view.js";
import { renderLoading, renderErrorRow } from "../../utils/state.js";

class LeadsController extends Module {
  constructor(){ super(); this.rows=[]; this.importRows=[]; }
  async render(){ this.container.innerHTML=renderLayout(); await this.load(); }
  async load(search=''){
    const body=document.getElementById('leads-body'); if(body) body.innerHTML=renderLoading({rows:11});
    try{ this.rows=await LeadsService.load({search}); if(body) body.innerHTML=renderRows(this.rows); }
    catch(e){ if(body) body.innerHTML=renderErrorRow(11,e.message); this.notify().error(e.message); }
  }
  bindEvents(){
    let timer; document.getElementById('leads-search')?.addEventListener('input',e=>{clearTimeout(timer);timer=setTimeout(()=>this.load(e.target.value),300);});
    document.getElementById('leads-refresh')?.addEventListener('click',()=>this.load(document.getElementById('leads-search')?.value||''));
    document.getElementById('leads-select-all')?.addEventListener('change',e=>document.querySelectorAll('.lead-check').forEach(x=>x.checked=e.target.checked));
    document.getElementById('leads-apply-status')?.addEventListener('click',()=>this.applyBulkStatus());
    document.getElementById('leads-import-open')?.addEventListener('click',()=>this.openImport());
  }
  async applyBulkStatus(){
    const ids=[...document.querySelectorAll('.lead-check:checked')].map(x=>Number(x.value)).filter(Boolean); const status=document.getElementById('leads-bulk-status')?.value||'';
    if(!ids.length) return this.notify().warning('Select at least one lead.'); if(!status) return this.notify().warning('Select the new status.');
    try{ const r=await LeadsService.bulkStatus(ids,status); this.notify().success(`${r.updated||ids.length} leads updated`); await this.load(document.getElementById('leads-search')?.value||''); }
    catch(e){ this.notify().error(e.message); }
  }
  openImport(){
    const root=document.getElementById('leads-modal-root'); root.innerHTML=renderImportModal();
    document.getElementById('leads-import-cancel').addEventListener('click',()=>root.innerHTML='');
    document.getElementById('leads-import-backdrop').addEventListener('click',e=>{if(e.target.id==='leads-import-backdrop')root.innerHTML='';});
    document.getElementById('leads-excel-file').addEventListener('change',e=>this.readExcel(e.target.files?.[0]));
    document.getElementById('leads-import-save').addEventListener('click',()=>this.saveImport(root));
  }
  async readExcel(file){
    const err=document.getElementById('leads-import-error'); err.classList.add('hidden'); this.importRows=[];
    if(!file) return; try{
      const buffer=await file.arrayBuffer(); const wb=window.XLSX.read(buffer,{type:'array',cellDates:true}); const ws=wb.Sheets[wb.SheetNames[0]];
      this.importRows=window.XLSX.utils.sheet_to_json(ws,{defval:''}); if(!this.importRows.length) throw new Error('The selected sheet has no data rows.');
      const cols=Object.keys(this.importRows[0]); document.getElementById('leads-preview-head').innerHTML='<tr>'+cols.slice(0,8).map(c=>`<th>${this.escape(c)}</th>`).join('')+'</tr>';
      document.getElementById('leads-preview-body').innerHTML=this.importRows.slice(0,20).map(r=>'<tr>'+cols.slice(0,8).map(c=>`<td>${this.escape(r[c])}</td>`).join('')+'</tr>').join('');
      const summary=document.getElementById('leads-import-summary'); summary.textContent=`${this.importRows.length} rows detected in ${wb.SheetNames[0]}`; summary.classList.remove('hidden'); document.getElementById('leads-import-save').disabled=false;
    }catch(e){ err.textContent=e.message;err.classList.remove('hidden');document.getElementById('leads-import-save').disabled=true; }
  }
  escape(v){ return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  async saveImport(root){
    const btn=document.getElementById('leads-import-save'); const err=document.getElementById('leads-import-error'); btn.disabled=true;btn.textContent='Importing...';
    try{ const mode=document.getElementById('leads-duplicate-mode').value; const r=await LeadsService.importRows(this.importRows,mode); this.notify().success(`Import complete: ${r.added} added, ${r.updated} updated, ${r.skipped} skipped`); root.innerHTML=''; await this.load(); }
    catch(e){err.textContent=e.message;err.classList.remove('hidden');btn.disabled=false;btn.textContent='Import Leads';}
  }
}
export default new LeadsController();
