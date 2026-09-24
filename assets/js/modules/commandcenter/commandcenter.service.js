import EnterpriseData from '../../services/enterprise.data.js';
import Container from '../../core/container.js';

function norm(v){return String(v??'').trim().toLowerCase();}
function num(v){const n=Number(String(v??'').replace(/,/g,'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0;}

class CommandCenterService {
  async load(){
    const live=await EnterpriseData.loadAll();
    const store=Container.get('enterpriseStore');
    const units=EnterpriseData.normalizeUnits(live.inventory||[]);
    const clients=EnterpriseData.normalizeClients(live.clients||[]);
    const quality=EnterpriseData.buildQuality(live);
    const insights=EnterpriseData.buildInsights(live);
    const projects=this.projects(units,clients);
    const leaderboard=this.leaderboard(clients);
    const journey=this.journey(clients,live.eoi||[]);
    const pulse=this.pulse({quality,units,clients,tasks:store.getTasks(),approvals:store.getApprovals()});
    const buildings=this.buildingHeat(units);
    return {live,tasks:store.getTasks(),notifications:store.getNotifications(),activity:store.getActivities(),targets:store.getTargets(),approvals:store.getApprovals(),insights,quality,projects,leaderboard,journey,pulse,buildings};
  }
  projects(units,clients){
    const map={};
    const get=p=>map[p]||(map[p]={project:p,units:0,available:0,reserved:0,contracted:0,sold:0,value:0,clients:0});
    units.forEach(u=>{const x=get(u.project||'Unknown');x.units++;const st=norm(u.status);if(st in x)x[st]++;x.value+=num(u.price);});
    clients.forEach(c=>get(c.project||'Unknown').clients++);
    return Object.values(map).sort((a,b)=>b.value-a.value);
  }
  leaderboard(clients){
    const map={};
    clients.forEach(c=>{const s=c.sales||'Unassigned';const x=map[s]||(map[s]={sales:s,clients:0,reserved:0,contracted:0,sold:0,value:0,score:0});x.clients++;const st=norm(c.status);if(st in x)x[st]++;x.value+=num(c.value);});
    return Object.values(map).map(x=>({...x,score:x.sold*5+x.contracted*3+x.reserved*2+Math.round(x.value/1000000)})).sort((a,b)=>b.score-a.score||b.value-a.value).slice(0,10);
  }
  journey(clients,eoi){
    const status=(s)=>clients.filter(c=>norm(c.status)===s).length;
    return [
      {stage:'Leads / Clients',count:clients.length},
      {stage:'EOI',count:Array.isArray(eoi)?eoi.length:0},
      {stage:'Reserved',count:status('reserved')},
      {stage:'Contracted',count:status('contracted')},
      {stage:'Sold',count:status('sold')}
    ];
  }
  pulse({quality,units,clients,tasks,approvals}){
    const high=quality.filter(x=>x.severity==='High').length;
    const medium=quality.filter(x=>x.severity==='Medium').length;
    const openTasks=tasks.filter(x=>x.status!=='Done').length;
    const pending=approvals.filter(x=>x.status==='Pending').length;
    const closed=units.filter(x=>['reserved','contracted','sold'].includes(norm(x.status))).length;
    const coverage=units.length?closed/units.length:0;
    let score=88+Math.round(coverage*10)-high*4-medium*1-Math.min(8,openTasks)-Math.min(6,pending*2);
    score=Math.max(0,Math.min(100,score));
    let state='Healthy',tone='positive';if(score<75){state='Watch',tone='warning';}if(score<55){state='Critical',tone='danger';}
    return {score,state,tone,high,medium,openTasks,pending,clients:clients.length};
  }
  buildingHeat(units){
    const map={};
    units.forEach(u=>{const k=`${u.project||'Unknown'} / ${u.building||'Unassigned'}`;const x=map[k]||(map[k]={name:k,total:0,closed:0,value:0});x.total++;x.value+=num(u.price);if(['reserved','contracted','sold'].includes(norm(u.status)))x.closed++;});
    return Object.values(map).map(x=>({...x,rate:x.total?Math.round(x.closed/x.total*100):0})).sort((a,b)=>b.rate-a.rate||b.value-a.value).slice(0,12);
  }
}
export default new CommandCenterService();
