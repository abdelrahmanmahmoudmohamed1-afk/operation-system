import Module from '../../core/module.js';
import Service from './digitaltwin.service.js';
import { layout, controls, renderKpis, renderStage, renderInspector } from './digitaltwin.view.js';
import { openUnit360 } from '../../utils/profile360.js';

class DigitalTwinController extends Module {
  constructor(){ super(); this.data=null; this.rows=[]; this.visible=[]; }
  async render(){ this.container.innerHTML=layout(); await this.load(); }
  async load(){
    try{
      this.data=await Service.load(); this.rows=this.data.units||[];
      this.paintControls(); this.apply();
    }catch(e){
      document.getElementById('twin-stage').innerHTML=`<div class="state-box state-error"><strong>Digital Twin unavailable</strong><span>${e.message}</span></div>`;
    }
  }
  paintControls(){
    const c=controls(this.rows); const option=(v)=>`<option value="${String(v).replace(/"/g,'&quot;')}">${v}</option>`;
    const p=document.getElementById('twin-project'), b=document.getElementById('twin-building'), s=document.getElementById('twin-status');
    p.innerHTML='<option value="ALL">All Projects</option>'+c.projects.map(option).join('');
    b.innerHTML='<option value="ALL">All Buildings</option>'+c.buildings.map(option).join('');
    s.innerHTML='<option value="ALL">All Statuses</option>'+c.statuses.map(option).join('');
    const global=sessionStorage.getItem('operation_global_project')||'ALL'; if([...p.options].some(o=>o.value===global)) p.value=global;
  }
  apply(){
    const project=document.getElementById('twin-project')?.value||'ALL';
    const building=document.getElementById('twin-building')?.value||'ALL';
    const status=document.getElementById('twin-status')?.value||'ALL';
    const q=(document.getElementById('twin-search')?.value||'').toLowerCase().trim();
    this.visible=this.rows.filter(u=>(project==='ALL'||u.project===project)&&(building==='ALL'||u.building===building)&&(status==='ALL'||u.status===status)&&(!q||Object.values(u).some(v=>String(v??'').toLowerCase().includes(q))));
    document.getElementById('twin-kpis').innerHTML=renderKpis(this.visible);
    document.getElementById('twin-stage').innerHTML=renderStage(this.visible);
    document.getElementById('twin-inspector').innerHTML=renderInspector(null,this.visible);
  }
  bindEvents(){
    this.container.addEventListener('change',e=>{if(e.target.matches('#twin-project,#twin-building,#twin-status'))this.apply();});
    this.container.addEventListener('input',e=>{if(e.target.matches('#twin-search'))this.apply();});
    this.container.addEventListener('click',e=>{
      if(e.target.closest('#twin-reset')){ ['twin-project','twin-building','twin-status'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='ALL';}); const q=document.getElementById('twin-search');if(q)q.value='';this.apply();return; }
      const unitBtn=e.target.closest('.twin-unit'); if(unitBtn){ const unit=this.rows.find(x=>String(x.id)===String(unitBtn.dataset.unitId)); document.querySelectorAll('.twin-unit.active').forEach(x=>x.classList.remove('active'));unitBtn.classList.add('active'); document.getElementById('twin-inspector').innerHTML=renderInspector(unit,this.visible);return; }
      const open=e.target.closest('.twin-open-360'); if(open){ const unit=this.rows.find(x=>String(x.id)===String(open.dataset.unitId)); if(unit)openUnit360(unit); }
    });
    this.on('operation:project-change',()=>this.load());
  }
}
export default new DigitalTwinController();
