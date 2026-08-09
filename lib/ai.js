import { admin } from './supabase.js';
import { signDocumentRows } from './documents.js';
import { sheetInventory, sheetClients, sheetEOI, sheetLeads, sheetsEnabled } from './sheets.js';
import { gmailStatus } from './gmail.js';
import { n, norm } from './helpers.js';

const ROUTES=['commandcenter','overview','dashboard','crm','inventory','digitaltwin','reports','eoi','leads','contracts','documents','payment','users','settings','analytics','tasks','quality','achievement'];
const STOP=new Set([
  'هات','هاتلي','هاتي','جيب','جيبلي','جيبي','طلع','طلعلي','وريني','ورينى','اعرض','اعرضلي','اعرضلى','عايز','عاوز','محتاج','ممكن','لو','ياريت','من فضلك','العميل','عميل','الكلاينت','كلاينت','الوحدة','وحدة','يونت','اليونت','بتاع','بتاعة','بتاعت','ده','دا','دي','دى','اللي','اللى','الى','الي','في','فى','من','على','عن','مع','نفس','بتاعه','بتاعها','pdf','ملف','افتح','فتح','دور','دورلي','دورلى',
  'please','show','find','search','open','get','give','send','me','the','a','an','client','customer','unit','for','of','to','pdf','file','document'
]);
const SYNONYMS=new Map(Object.entries({
  'ميرسي':'mersea','مرسي':'mersea','mersea':'mersea','لايانا':'layana','ليانا':'layana','layana':'layana',
  'كونتراكت':'contracted','كونتراكتد':'contracted','كونتراكتيت':'contracted','كونتراكتيد':'contracted','contract':'contracted','contracted':'contracted',
  'سولد':'sold','مباع':'sold','مبيوع':'sold','sold':'sold','ريسيرف':'reserved','ريسيرفد':'reserved','ريزيرفد':'reserved','محجوز':'reserved','reserved':'reserved',
  'افيلابل':'available','متاح':'available','available':'available','فرز':'فرز','تجنيب':'تجنيب',
  'موبايل':'phone','موبيل':'phone','تليفون':'phone','تلفون':'phone','فون':'phone','phone':'phone',
  'عقد':'contract','العقد':'contract','contracts':'contract','contractpdf':'contract',
  'رسمه':'floorplan','رسمة':'floorplan','الرسمه':'floorplan','الرسمهالهندسيه':'floorplan','floorplan':'floorplan','drawing':'floorplan'
}));
function arabicNorm(v){
  return String(v??'').toLowerCase().normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g,'')
    .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
    .replace(/[ـ]/g,'').replace(/[^\p{L}\p{N}@._-]+/gu,' ').replace(/\s+/g,' ').trim();
}
function canonicalToken(v){const x=arabicNorm(v).replace(/\s+/g,'');return SYNONYMS.get(x)||x;}
function tokens(v){
  return arabicNorm(v).split(/\s+/).map(canonicalToken).filter(x=>x.length>1&&!STOP.has(x));
}
function compact(v){return arabicNorm(v).replace(/[^\p{L}\p{N}]/gu,'');}
function hay(row){
  const values=Object.values(row?.raw_data||{}).concat(Object.values(row||{}).filter(v=>typeof v!=='object'));
  const normal=arabicNorm(values.join(' '));
  return {normal,compact:compact(values.join(' ')),tokens:new Set(tokens(values.join(' ')))};
}
function levenshtein(a,b){
  a=String(a||'');b=String(b||'');if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;
  const prev=Array.from({length:b.length+1},(_,i)=>i),cur=new Array(b.length+1);
  for(let i=1;i<=a.length;i++){cur[0]=i;for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));for(let j=0;j<=b.length;j++)prev[j]=cur[j];}
  return prev[b.length];
}
function tokenSimilarity(a,b){
  if(a===b)return 1;if(a.length>=3&&b.length>=3&&(a.includes(b)||b.includes(a)))return .9;
  const max=Math.max(a.length,b.length);if(max<3)return 0;const sim=1-levenshtein(a,b)/max;return sim;
}
function tokenHit(t,h){
  if(h.normal.includes(t)||h.compact.includes(compact(t)))return 1;
  let best=0;for(const ht of h.tokens){const sim=tokenSimilarity(t,ht);if(sim>best)best=sim;if(best>=.94)break;}return best;
}
function recordBoost(row,q){
  const qc=compact(q);let b=0;
  const fields=[row?.unit_code,row?.unitCode,row?.['Unit Code'],row?.mobile1,row?.mobile2,row?.phone,row?.client_name,row?.clientName,row?.project];
  for(const f of fields){const fc=compact(f);if(fc&&qc&&fc===qc)b+=18;else if(fc&&qc&&(fc.includes(qc)||qc.includes(fc)))b+=8;}
  return b;
}
function score(row,q){
  const ts=tokens(q);if(!ts.length)return 0;const h=hay(row);let points=recordBoost(row,q),hits=0,strong=0;
  for(const t of ts){const sim=tokenHit(t,h);if(sim>=.58){hits++;points+=(t.length>=5?4:3)*sim;if(sim>=.86)strong++;}}
  const required=ts.length<=2?1:Math.ceil(ts.length*.5);
  if(hits<required)return 0;
  if(strong===ts.length)points+=6;
  const exact=arabicNorm(q);if(exact&&h.normal.includes(exact))points+=12;
  return points+(hits/ts.length)*8;
}
function top(rows,q,limit=20){return [...rows].map(r=>[score(r,q),r]).filter(x=>x[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,limit).map(x=>x[1]);}
function unitShape(r){return {id:r.id,project:r.project,unitCode:r.unit_code,status:r.status,building:r.building,floor:r.floor,unitType:r.unit_type,area:n(r.area),price:n(r.price),raw:r.raw_data||{}};}
function clientShape(r){return {id:r.id,project:r.project,unitCode:r.unit_code,clientName:r.client_name,mobile1:r.mobile1,mobile2:r.mobile2,address:r.address,email:r.email,status:r.status,salesName:r.sales_name,contractDate:r.contract_date,reservationDate:r.reservation_date,soldDate:r.sold_date,value:n(r.value),raw:r.raw_data||{}};}
async function dbRows(table){const {data,error}=await admin.from(table).select('*').limit(5000);if(error)throw error;return data||[];}
async function live(kind){
  try{
    const s=kind==='units'?await sheetInventory():kind==='clients'?await sheetClients():kind==='eoi'?await sheetEOI():kind==='leads'?await sheetLeads():null;
    if(Array.isArray(s)&&s.length)return {rows:s,source:'Google Sheets'};
  }catch(e){console.warn('AI live source error',kind,e.message);}
  const table={units:'inventory_units',clients:'clients',eoi:'eoi_records',leads:'leads'}[kind];
  const d=table?await dbRows(table):[];return {rows:d,source:d.length?'Supabase':'Unavailable'};
}
async function documents(query='',kind=''){
  let q=admin.from('documents').select('*').order('created_at',{ascending:false}).limit(100);
  if(kind)q=q.eq('kind',kind);const {data,error}=await q;if(error)throw error;
  const rows=query?top(data||[],query,20):(data||[]);return signDocumentRows(rows);
}

const tools=[
 {type:'function',name:'workspace_summary',description:'Get a live executive summary of units, CRM clients, EOI and data-source status. Use for broad questions about the business.',parameters:{type:'object',properties:{project:{type:['string','null']}},required:['project'],additionalProperties:false},strict:true},
 {type:'function',name:'search_clients',description:'Fuzzy-search live CRM data. Understand approximate Egyptian Arabic names, phone fragments, unit codes, sales names and projects; the query does not need exact wording.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},strict:true},
 {type:'function',name:'search_units',description:'Fuzzy-search live inventory by approximate unit code, building, status, project, unit type or natural-language description.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},strict:true},
 {type:'function',name:'get_client_profile',description:'Get the best matching client and related unit/documents from an approximate name, phone or unit reference.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},strict:true},
 {type:'function',name:'get_unit_details',description:'Get the best matching unit plus linked CRM client, contract scans and floor plan.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},strict:true},
 {type:'function',name:'find_client_documents',description:'Find contract PDFs/documents using an approximate client name or unit code and return clickable temporary URLs.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},strict:true},
 {type:'function',name:'find_floor_plan',description:'Find an architectural drawing PDF by approximate unit reference.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},strict:true},
 {type:'function',name:'eoi_summary',description:'Calculate live EOI totals and breakdown from Google Sheets/Supabase. Use when user asks total EOI, EOI by project/status/date context.',parameters:{type:'object',properties:{project:{type:['string','null']}},required:['project'],additionalProperties:false},strict:true},
 {type:'function',name:'document_coverage',description:'Calculate contract-scan and architectural-drawing coverage.',parameters:{type:'object',properties:{project:{type:['string','null']}},required:['project'],additionalProperties:false},strict:true},
 {type:'function',name:'navigate',description:'Navigate the UI to the requested Operation System module. Use when user asks to open/go to a section.',parameters:{type:'object',properties:{route:{type:'string',enum:ROUTES}},required:['route'],additionalProperties:false},strict:true},
 {type:'function',name:'payment_plan',description:'Calculate and critique a real-estate payment plan. Use for what-if scenarios and commercial advice. The result is a heuristic decision-support analysis, not a guaranteed sales forecast.',parameters:{type:'object',properties:{price:{type:'number'},down_payment_pct:{type:'number'},years:{type:'number'},discount_pct:{type:'number'},frequency:{type:'string',enum:['monthly','quarterly','semiannual','annual']},maintenance_pct:{type:'number'}},required:['price','down_payment_pct','years','discount_pct','frequency','maintenance_pct'],additionalProperties:false},strict:true},
 {type:'function',name:'create_reminder',description:'Create a real reminder for the signed-in user. Use when the user directly asks to be reminded.',parameters:{type:'object',properties:{title:{type:'string'},due_at:{type:'string',description:'ISO 8601 datetime'}},required:['title','due_at'],additionalProperties:false},strict:true},
 {type:'function',name:'gmail_status',description:'Check whether Gmail is connected for actual email sending.',parameters:{type:'object',properties:{},additionalProperties:false},strict:true},
 {type:'function',name:'prepare_email',description:'Prepare a reviewed email action. Use for email requests. Never claim sent until the user presses the Send action and Gmail confirms.',parameters:{type:'object',properties:{to:{type:'string'},subject:{type:'string'},body:{type:'string'},document_ids:{type:'array',items:{type:'string'}}},required:['to','subject','body','document_ids'],additionalProperties:false},strict:true}
];

async function runTool(name,args,user){
  if(name==='navigate')return {route:args.route,uiAction:{kind:'route',label:`Open ${args.route}`,payload:{route:args.route},auto:true}};
  if(name==='workspace_summary'){
    const [u,c,e]=await Promise.all([live('units'),live('clients'),live('eoi')]);let units=u.rows,clients=c.rows,eoi=e.rows;const p=norm(args.project||'');if(p){units=units.filter(x=>norm(x.project)===p);clients=clients.filter(x=>norm(x.project)===p);eoi=eoi.filter(x=>norm(x.project)===p);}
    const counts={};for(const x of units)counts[norm(x.status)||'unknown']=(counts[norm(x.status)||'unknown']||0)+1;
    return {sources:{inventory:u.source,crm:c.source,eoi:e.source},units:units.length,clients:clients.length,eoi:eoi.length,statuses:counts,portfolioValue:units.reduce((s,x)=>s+n(x.price),0)};
  }
  if(name==='search_clients'){const c=await live('clients');return {source:c.source,results:top(c.rows,args.query,20).map(clientShape)};}
  if(name==='search_units'){const u=await live('units');return {source:u.source,results:top(u.rows,args.query,25).map(unitShape)};}
  if(name==='get_client_profile'){
    const c=await live('clients');const matches=top(c.rows,args.query,5);if(!matches.length)return {found:false,source:c.source};const client=matches[0];const u=await live('units');const unit=u.rows.find(x=>norm(x.project)===norm(client.project)&&norm(x.unit_code)===norm(client.unit_code));const docs=await documents(`${client.client_name||''} ${client.unit_code||''}`);return {found:true,source:c.source,client:clientShape(client),unit:unit?unitShape(unit):null,documents:docs};
  }
  if(name==='get_unit_details'){
    const u=await live('units');const matches=top(u.rows,args.query,5);if(!matches.length)return {found:false,source:u.source};const unit=matches[0];const c=await live('clients');const client=c.rows.find(x=>norm(x.project)===norm(unit.project)&&norm(x.unit_code)===norm(unit.unit_code));const docs=await documents(unit.unit_code||'');return {found:true,source:u.source,unit:unitShape(unit),client:client?clientShape(client):null,documents:docs};
  }
  if(name==='find_client_documents'){
    const rows=await documents(args.query,'contract');return {count:rows.length,documents:rows,uiActions:rows.slice(0,5).filter(x=>x.url).map(x=>({kind:'open-url',label:`Open ${x.file_name||'PDF'}`,payload:{url:x.url}}))};
  }
  if(name==='find_floor_plan'){
    const u=await live('units');const match=top(u.rows,args.query,1)[0];const query=match?`${match.project} ${match.unit_code}`:args.query;let rows=await documents(query,'floor_plan');if(match)rows=rows.filter(x=>norm(x.project)===norm(match.project)&&norm(x.unit_code)===norm(match.unit_code));const doc=rows[0]||null;return {found:Boolean(doc),unit:match?unitShape(match):null,document:doc,uiAction:doc?.url?{kind:'open-url',label:'Open architectural drawing',payload:{url:doc.url}}:{kind:'route',label:'Open Digital Twin to upload drawing',payload:{route:'digitaltwin'}}};
  }
  if(name==='eoi_summary'){
    const e=await live('eoi');let rows=e.rows;const p=norm(args.project||'');if(p)rows=rows.filter(x=>norm(x.project)===p);const byProject={},byStatus={};rows.forEach(x=>{const pr=x.project||'Unknown',st=x.status||'Unknown';byProject[pr]=(byProject[pr]||0)+1;byStatus[st]=(byStatus[st]||0)+1;});return {source:e.source,total:rows.length,byProject,byStatus};
  }
  if(name==='document_coverage'){
    const [u,c]=await Promise.all([live('units'),live('clients')]);let units=u.rows,clients=c.rows;const p=norm(args.project||'');if(p){units=units.filter(x=>norm(x.project)===p);clients=clients.filter(x=>norm(x.project)===p);}const docs=await documents();const keys=k=>new Set(docs.filter(x=>x.kind===k).map(x=>`${norm(x.project)}|${norm(x.unit_code)}`));const contracts=keys('contract'),plans=keys('floor_plan');const sold=clients.filter(x=>['sold','contracted'].includes(norm(x.status)));const contractCount=sold.filter(x=>contracts.has(`${norm(x.project)}|${norm(x.unit_code)}`)).length;const planCount=units.filter(x=>plans.has(`${norm(x.project)}|${norm(x.unit_code)}`)).length;return {contractScans:{required:sold.length,uploaded:contractCount,missing:Math.max(0,sold.length-contractCount)},floorPlans:{totalUnits:units.length,uploaded:planCount,missing:Math.max(0,units.length-planCount)}};
  }
  if(name==='payment_plan'){
    const price=n(args.price),dp=Math.max(0,Math.min(100,n(args.down_payment_pct))),years=Math.max(1,n(args.years)),disc=Math.max(0,Math.min(100,n(args.discount_pct))),maintenance=Math.max(0,n(args.maintenance_pct));
    const after=price*(1-disc/100),down=after*dp/100,rem=after-down,ppy={monthly:12,quarterly:4,semiannual:2,annual:1}[args.frequency]||12,count=Math.max(1,Math.round(years*ppy)),installment=rem/count,monthlyEquivalent=installment/(12/ppy),maintenanceValue=after*maintenance/100;
    const cash36=down+Math.min(count,36/12*ppy)*installment;let score=55+dp*1.15-Math.max(0,years-8)*4-disc*1.6+(cash36/Math.max(after,1)-.45)*35;score=Math.round(Math.max(0,Math.min(100,score)));
    const warnings=[];if(dp<5)warnings.push('Very low down payment weakens early cash collection.');if(years>10)warnings.push('Long tenor increases collection exposure.');if(disc>10)warnings.push('High discount materially reduces revenue.');if(monthlyEquivalent>after*.02)warnings.push('Installment burden is relatively high versus ticket price.');
    return {price,priceAfterDiscount:after,discountCost:price-after,downPayment:down,remaining:rem,installments:count,installment,monthlyEquivalent,maintenanceValue,cashCollected36Months:cash36,cashCollected36MonthsPct:after?cash36/after*100:0,score,assessment:score>=80?'Strong':score>=65?'Good':score>=50?'Balanced':'Risky',warnings};
  }
  if(name==='create_reminder'){
    const due=new Date(args.due_at);if(!Number.isFinite(due.getTime())||due.getTime()<Date.now()-60000)throw new Error('Reminder time is invalid or already passed.');const {data,error}=await admin.from('reminders').insert({user_id:user.id,title:args.title,due_at:due.toISOString(),source:'ai'}).select('*').single();if(error)throw error;return {created:true,reminder:data,uiAction:{kind:'reminder',label:'Activate device notification',payload:{id:data.id,title:data.title,dueAt:data.due_at}}};
  }
  if(name==='gmail_status')return gmailStatus(user.id);
  if(name==='prepare_email'){
    const state=await gmailStatus(user.id);return {gmail:state,preview:{to:args.to,subject:args.subject,body:args.body,documentIds:args.document_ids||[]},uiAction:{kind:'send-email',label:state.connected?'Review & send with Gmail':'Connect Gmail to send',payload:{to:args.to,subject:args.subject,body:args.body,documentIds:args.document_ids||[],needsConnect:!state.connected}}};
  }
  return {error:`Unknown tool ${name}`};
}

function outputText(response){return response?.output_text||(response?.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n')||'';}
async function openai(body){
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{throw new Error(`OpenAI returned an invalid response (${r.status}).`);}if(!r.ok)throw new Error(data?.error?.message||`OpenAI request failed (${r.status}).`);return data;
}
export async function operationAI({question,history=[],context={}},user){
  if(!process.env.OPENAI_API_KEY)return {enabled:false,answer:'الـ AI متجهز في السيستم لكن مفتاح OpenAI لسه مش متضاف على Vercel. أول ما تضيف OPENAI_API_KEY هيشتغل بالمحادثة الطبيعية والأدوات الحية.',expert:'System Setup',actions:[{kind:'route',label:'Open Settings',payload:{route:'settings'}}]};
  const model=process.env.OPENAI_MODEL||'gpt-5.6';
  const instructions=`You are Operation AI inside a real-estate developer Sales Operations System. You are not a keyword bot. Understand intent, paraphrases, Egyptian colloquial Arabic, Arabizi, English, typos, incomplete references, and conversational follow-ups. When the user writes Arabic, reply in natural Egyptian Arabic unless a formal document is requested. Keep context and resolve pronouns such as "هو", "العميل ده", "نفس الوحدة", "العقد بتاعه" from conversation/tool results.\n\nDATA RULES: Never invent live company data. Use tools whenever the answer depends on units, clients, EOI, documents, coverage or current system state. If a data source is unavailable, say which connection is missing instead of reporting zero. Search approximately; do not require literal wording. Before searching, mentally rewrite colloquial Egyptian Arabic, spelling mistakes, Arabizi, abbreviations and references into the shortest useful entity query. Prefer a client name, phone fragment, project name or unit code over copying the whole sentence into a search tool. If the first search returns no useful result, automatically try a simpler alternative query before asking the user.\n\nACTION RULES: Navigation can be executed automatically. Reminders may be created when explicitly requested. Email must always be prepared first and shown for review; never claim it was sent until the Gmail send endpoint confirms. For PDFs, locate the actual document and provide an open action. If no PDF/floor plan exists, say that clearly and offer the right upload module.\n\nREASONING QUALITY: If a request is contradictory, impossible, commercially weak, unsafe, or missing a genuinely required parameter, explain the problem plainly and propose the best practical fix. For payment plans distinguish exact arithmetic from heuristic commercial judgment and never present a conversion uplift as guaranteed without historical model evidence.\n\nSTYLE: Be warm, concise, competent, and conversational. Do not dump internal tool traces. Ask a clarification only when you cannot safely infer the missing detail from context/tools. When several close matches exist, show the best few choices instead of pretending there is one exact match. Never say '0 results' just because the user's wording was not literal; simplify and retry first.`;
  const hist=history.slice(-24).map(x=>({role:x.role==='assistant'?'assistant':'user',content:String(x.content||x.text||'').slice(0,12000)}));
  let response=await openai({model,instructions,input:[...hist,{role:'user',content:`UI context: ${JSON.stringify(context).slice(0,6000)}\n\nUser request: ${question}`}],tools,reasoning:{effort:'medium'}});
  const actions=[],trace=[];
  for(let turn=0;turn<8;turn++){
    const calls=(response.output||[]).filter(x=>x.type==='function_call');if(!calls.length)break;const outputs=[];
    for(const call of calls){let args={};try{args=JSON.parse(call.arguments||'{}')}catch{};let result;try{result=await runTool(call.name,args,user);}catch(e){result={error:e.message||String(e)};}trace.push({tool:call.name,args,ok:!result?.error});if(result?.uiAction)actions.push(result.uiAction);if(Array.isArray(result?.uiActions))actions.push(...result.uiActions);outputs.push({type:'function_call_output',call_id:call.call_id,output:JSON.stringify(result).slice(0,90000)});}
    response=await openai({model,instructions,previous_response_id:response.id,input:outputs,tools,reasoning:{effort:'medium'}});
  }
  const answer=outputText(response)||'تم.';return {enabled:true,answer,expert:'Operation AI · GPT-5.6',actions,toolTrace:trace,suggestedActions:[]};
}
