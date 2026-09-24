import Module from '../../core/module.js';
import Service from './commandcenter.service.js';
import { layout, body } from './commandcenter.view.js';

class CommandCenterController extends Module {
 constructor(){ super(); this.mode='executive'; this.data=null; this.customize=false; }
 async render(){ this.container.innerHTML=layout(); await this.load(); }
 async load(){ try{ this.data=await Service.load(); document.getElementById('cc-body').innerHTML=body(this.data,this.mode); this.applyWidgetOrder(); this.prepareWidgets(); }catch(e){ this.container.innerHTML=`<div class="state-box state-error"><strong>Command Center couldn't load</strong><span>${e.message}</span></div>`; } }
 bindEvents(){
  this.container.addEventListener('click', async e=>{
   if(e.target.closest('#cc-mode-btn')){ this.mode=this.mode==='executive'?'personal':'executive'; document.getElementById('cc-mode-btn').textContent=this.mode==='executive'?'Personal Mode':'Management Mode'; document.getElementById('cc-body').innerHTML=body(this.data,this.mode); this.applyWidgetOrder(); this.prepareWidgets(); }
   if(e.target.closest('#cc-customize')){ this.customize=!this.customize; e.target.closest('#cc-customize').textContent=this.customize?'Done':'Customize'; this.prepareWidgets(); this.notify().info(this.customize?'Drag Command Center panels to personalize your workspace.':'Workspace layout saved.'); }
   if(e.target.closest('#cc-new-task')) window.dispatchEvent(new CustomEvent('operation:quick-create',{detail:{type:'task'}}));
   const t=e.target.closest('.task-toggle'); if(t){ this.service('enterpriseStore').toggleTask(t.dataset.id); await this.load(); }
   const a=e.target.closest('.approval-action'); if(a){ this.service('enterpriseStore').updateApproval(a.dataset.id,a.dataset.status); await this.load(); }
  });
  this.on('operation:enterprise-refresh',()=>this.load());
 }
 prepareWidgets(){
   const grid=this.container.querySelector('.mission-grid'); if(!grid)return;
   grid.classList.toggle('customize-mode',this.customize);
   [...grid.querySelectorAll('[data-widget]')].forEach(el=>{el.draggable=this.customize;});
   if(this.dragBound)return; this.dragBound=true;
   grid.addEventListener('dragstart',e=>{const el=e.target.closest('[data-widget]');if(!el||!this.customize)return;el.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',el.dataset.widget||'');});
   grid.addEventListener('dragend',e=>{e.target.closest('[data-widget]')?.classList.remove('dragging');this.saveWidgetOrder();});
   grid.addEventListener('dragover',e=>{if(!this.customize)return;e.preventDefault();const dragging=grid.querySelector('.dragging');if(!dragging)return;const target=e.target.closest('[data-widget]');if(target&&target!==dragging){const r=target.getBoundingClientRect();const after=e.clientY>r.top+r.height/2;grid.insertBefore(dragging,after?target.nextSibling:target);}});
 }
 saveWidgetOrder(){const order=[...this.container.querySelectorAll('.mission-grid [data-widget]')].map(x=>x.dataset.widget);localStorage.setItem('ops_command_widget_order',JSON.stringify(order));}
 applyWidgetOrder(){const grid=this.container.querySelector('.mission-grid');if(!grid)return;let order=[];try{order=JSON.parse(localStorage.getItem('ops_command_widget_order')||'[]');}catch{}order.forEach(id=>{const el=grid.querySelector(`[data-widget="${CSS.escape(id)}"]`);if(el)grid.appendChild(el);});}
}
export default new CommandCenterController();
