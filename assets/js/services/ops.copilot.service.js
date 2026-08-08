import EnterpriseData from './enterprise.data.js';

function norm(v){return String(v??'').trim().toLowerCase();}
function money(v){return Number(v||0).toLocaleString('en-US',{maximumFractionDigits:0});}

class OpsCopilotService {
  async ask(question){
    const live=await EnterpriseData.loadAll();
    const units=EnterpriseData.normalizeUnits(live.inventory||[]);
    const clients=EnterpriseData.normalizeClients(live.clients||[]);
    const q=norm(question);
    const project = ['layana','mersea'].find(p=>q.includes(p));
    const scopedUnits=project?units.filter(x=>norm(x.project)===project):units;
    const scopedClients=project?clients.filter(x=>norm(x.project)===project):clients;
    const sold=scopedUnits.filter(x=>norm(x.status)==='sold');
    const contracted=scopedUnits.filter(x=>norm(x.status)==='contracted');
    const reserved=scopedUnits.filter(x=>norm(x.status)==='reserved');
    const available=scopedUnits.filter(x=>norm(x.status)==='available');

    if(/top|best|highest|اكتر|أكتر|افضل|أفضل/.test(q) && /sales|سيلز/.test(q)){
      const map={}; scopedClients.forEach(c=>{const s=c.sales||'Unassigned';const x=map[s]||(map[s]={name:s,value:0,count:0,sold:0,contracted:0});x.count++;x.value+=Number(c.value||0);if(norm(c.status)==='sold')x.sold++;if(norm(c.status)==='contracted')x.contracted++;});
      const rows=Object.values(map).sort((a,b)=>(b.sold*5+b.contracted*3+b.value/1e6)-(a.sold*5+a.contracted*3+a.value/1e6)).slice(0,5);
      return {title:'Top sales performance',answer:rows.length?`${rows[0].name} currently leads the visible scope with ${rows[0].sold} sold and ${rows[0].contracted} contracted records.`:'No sales performance data is available.',rows:rows.map(x=>({label:x.name,value:`${x.sold} sold · ${x.contracted} contracted · ${money(x.value)}`})),route:'analytics'};
    }
    if(/available|متاح|متاحة/.test(q)) return {title:'Available inventory',answer:`${available.length} available unit(s) are visible${project?` in ${project}`:''}.`,rows:available.slice(0,12).map(x=>({label:x.unitCode||'Unit',value:`${x.project} · ${x.building||'-'} · ${money(x.price)}`})),route:'digitaltwin'};
    if(/sold|مباع|سولد/.test(q)) return {title:'Sold portfolio',answer:`${sold.length} sold unit(s) are visible with a combined value of ${money(sold.reduce((s,x)=>s+Number(x.price||0),0))}.`,rows:sold.slice(0,10).map(x=>({label:x.unitCode||'Unit',value:`${x.project} · ${money(x.price)}`})),route:'reports'};
    if(/contract|كونتراكت|contracted/.test(q)) return {title:'Contracted portfolio',answer:`${contracted.length} contracted unit(s) are visible with a combined value of ${money(contracted.reduce((s,x)=>s+Number(x.price||0),0))}.`,rows:contracted.slice(0,10).map(x=>({label:x.unitCode||'Unit',value:`${x.project} · ${money(x.price)}`})),route:'reports'};
    if(/reserved|reserve|ريسيرف/.test(q)) return {title:'Reserved portfolio',answer:`${reserved.length} reserved unit(s) are visible.`,rows:reserved.slice(0,10).map(x=>({label:x.unitCode||'Unit',value:`${x.project} · ${money(x.price)}`})),route:'achievement'};
    if(/mobile|phone|موبايل|تليفون/.test(q) && /missing|ناقص|مش/.test(q)){
      const rows=scopedClients.filter(x=>!x.mobile1);return {title:'CRM mobile quality',answer:`${rows.length} client record(s) are missing a primary mobile number.`,rows:rows.slice(0,12).map(x=>({label:x.clientName||'Client',value:`${x.project} · ${x.unitCode||'-'}`})),route:'quality'};
    }
    if(/client|crm|عميل|عملاء/.test(q)) return {title:'CRM snapshot',answer:`${scopedClients.length} client record(s) are visible. ${scopedClients.filter(x=>x.mobile1).length} include a primary mobile number.`,rows:scopedClients.slice(0,10).map(x=>({label:x.clientName||'Client',value:`${x.project} · ${x.unitCode||'-'} · ${x.mobile1||'No mobile'}`})),route:'crm'};
    if(/summary|overview|ملخص|وضع الشركة|status/.test(q)){
      return {title:'Executive summary',answer:`Visible scope contains ${scopedUnits.length} unit(s): ${available.length} available, ${reserved.length} reserved, ${contracted.length} contracted and ${sold.length} sold. CRM contains ${scopedClients.length} client record(s).`,rows:[{label:'Portfolio value',value:money(scopedUnits.reduce((s,x)=>s+Number(x.price||0),0))},{label:'Closed pipeline',value:String(reserved.length+contracted.length+sold.length)},{label:'CRM coverage',value:`${scopedClients.filter(x=>x.mobile1).length}/${scopedClients.length} with mobile`}],route:'commandcenter'};
    }
    const terms=q.split(/\s+/).filter(x=>x.length>1);
    const unitMatches=scopedUnits.filter(x=>terms.some(t=>Object.values(x).some(v=>norm(v).includes(t)))).slice(0,8);
    const clientMatches=scopedClients.filter(x=>terms.some(t=>Object.values(x).some(v=>norm(v).includes(t)))).slice(0,8);
    return {title:'Workspace search',answer:`I found ${unitMatches.length} matching unit(s) and ${clientMatches.length} matching client record(s) in the visible scope.`,rows:[...unitMatches.map(x=>({label:x.unitCode||'Unit',value:`Unit · ${x.project} · ${x.status}`})),...clientMatches.map(x=>({label:x.clientName||'Client',value:`Client · ${x.project} · ${x.mobile1||'No mobile'}`}))].slice(0,12),route:unitMatches.length?'digitaltwin':'crm'};
  }
}
export default new OpsCopilotService();
