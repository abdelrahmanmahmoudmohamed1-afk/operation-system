import Module from "../../core/module.js";
import InventoryService from "./inventory.service.js";
import { renderLayout, renderRows, renderKpis, renderStatusOptions } from "./inventory.view.js";
import { openUnit360 } from "../../utils/profile360.js";
import { renderLoading, renderEmptyRow, renderErrorRow } from "../../utils/state.js";

class InventoryController extends Module {
  constructor(){ super(); this.units=[]; this.allStatuses=[]; this.searchTerm=""; this.loading=false; }
  async render(){
    this.container.innerHTML=renderLayout(["Layana","Mersea"]);
    const gp=sessionStorage.getItem("operation_global_project")||"ALL"; const ps=document.getElementById("inv-project-filter"); if(ps&&[...ps.options].some(o=>o.value===gp))ps.value=gp;
    const gs=sessionStorage.getItem("operation_global_search"); if(gs){try{const x=JSON.parse(gs); if(x.target==="all"||x.target==="inventory")this.searchTerm=x.term||"";}catch{}}
    document.getElementById("inv-table-body").innerHTML=renderLoading({rows:6}); document.getElementById("inv-kpis").innerHTML=renderLoading({variant:"kpis",rows:4});
    await Promise.all([this.hydrateProjects(),this.loadUnits(true)]);
  }
  async hydrateProjects(){
    try{const projects=await InventoryService.loadProjects(); const sel=document.getElementById("inv-project-filter"); if(!sel)return; const current=sel.value; const merged=[...new Set(["Layana","Mersea",...(projects||[])].filter(Boolean))]; sel.innerHTML='<option value="ALL">All Projects</option>'+merged.map(p=>`<option value="${p}">${p}</option>`).join(''); if([...sel.options].some(o=>o.value===current))sel.value=current;}catch(e){this.logger().warn("Project list fallback in use",e);}
  }
  async loadUnits(isFirst=false){
    if(this.loading)return; this.loading=true; const tbody=document.getElementById("inv-table-body"), kpis=document.getElementById("inv-kpis"), status=document.getElementById("inv-status-filter");
    if(tbody)tbody.innerHTML=renderLoading({rows:6}); if(kpis)kpis.innerHTML=renderLoading({variant:"kpis",rows:4});
    const filters={project:document.getElementById("inv-project-filter")?.value||sessionStorage.getItem("operation_global_project")||"ALL",status:status?.value||"ALL"};
    try{
      this.units=await InventoryService.loadUnits(filters);
      if(isFirst||!this.allStatuses.length){ this.allStatuses=[...new Set((this.units||[]).map(x=>x.status).filter(Boolean))]; if(status)status.innerHTML=renderStatusOptions(this.units,filters.status); }
      const visible=this.applySearch(this.units); if(tbody)tbody.innerHTML=visible.length?renderRows(visible):renderEmptyRow(8,"No units match the selected filters"); if(kpis)kpis.innerHTML=renderKpis(visible);
    }catch(error){ this.logger().error("Inventory load failed",error); if(tbody)tbody.innerHTML=renderErrorRow(8,error.message); if(kpis)kpis.innerHTML=renderKpis([]); this.notify().error(`Inventory: ${error.message}`); }finally{this.loading=false;}
  }
  applySearch(rows){const q=String(this.searchTerm||"").toLowerCase().trim();return !q?(rows||[]):(rows||[]).filter(r=>Object.values(r).some(v=>String(v??"").toLowerCase().includes(q)));}
  bindEvents(){
    const p=document.getElementById("inv-project-filter"),s=document.getElementById("inv-status-filter"),r=document.getElementById("inv-refresh-btn");
    p?.addEventListener("change",()=>{this.allStatuses=[];sessionStorage.setItem("operation_global_project",p.value||"ALL");this.loadUnits(true);}); s?.addEventListener("change",()=>this.loadUnits()); r?.addEventListener("click",()=>this.loadUnits(true));
    document.getElementById("inv-table-body")?.addEventListener("click",e=>{const b=e.target.closest(".inv-open-360");if(!b)return;try{openUnit360(JSON.parse(b.dataset.unitRow||"{}"));}catch{}});
    window.addEventListener("operation:global-search",e=>{if(!["all","inventory"].includes(e.detail?.target||"all"))return;this.searchTerm=e.detail?.term||"";const v=this.applySearch(this.units);const tb=document.getElementById("inv-table-body"),kb=document.getElementById("inv-kpis");if(tb)tb.innerHTML=v.length?renderRows(v):renderEmptyRow(8,"No units match your search");if(kb)kb.innerHTML=renderKpis(v);});
  }
}
export default new InventoryController();
