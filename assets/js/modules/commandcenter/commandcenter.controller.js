import Module from '../../core/module.js';
import Service from './commandcenter.service.js';
import { layout, body } from './commandcenter.view.js';
class CommandCenterController extends Module {
 constructor(){ super(); this.mode='executive'; this.data=null; }
 async render(){ this.container.innerHTML=layout(); await this.load(); }
 async load(){ try{ this.data=await Service.load(); document.getElementById('cc-body').innerHTML=body(this.data,this.mode); }catch(e){ this.container.innerHTML=`<div class="state-box state-error"><strong>Command Center couldn't load</strong><span>${e.message}</span></div>`; } }
 bindEvents(){
  this.container.addEventListener('click', async e=>{
   if(e.target.closest('#cc-mode-btn')){ this.mode=this.mode==='executive'?'personal':'executive'; document.getElementById('cc-mode-btn').textContent=this.mode==='executive'?'Personal Mode':'Management Mode'; document.getElementById('cc-body').innerHTML=body(this.data,this.mode); }
   if(e.target.closest('#cc-new-task')) window.dispatchEvent(new CustomEvent('operation:quick-create',{detail:{type:'task'}}));
   const t=e.target.closest('.task-toggle'); if(t){ this.service('enterpriseStore').toggleTask(t.dataset.id); await this.load(); }
   const a=e.target.closest('.approval-action'); if(a){ this.service('enterpriseStore').updateApproval(a.dataset.id,a.dataset.status); await this.load(); }
  });
  this.on('operation:enterprise-refresh',()=>this.load());
 }
}
export default new CommandCenterController();
