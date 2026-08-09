import { admin } from './supabase.js';
import { signDocumentRows } from './documents.js';
import { norm, n } from './helpers.js';

const tools = [
  {type:'function',name:'search_clients',description:'Search CRM clients by name, phone, unit code, or project.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},strict:true},
  {type:'function',name:'search_units',description:'Search inventory by unit code, status, building, type, project, or free text.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},strict:true},
  {type:'function',name:'find_client_documents',description:'Find contract PDFs and client documents by client name, unit code, or project.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},strict:true},
  {type:'function',name:'find_floor_plan',description:'Find architectural drawing PDF for a unit.',parameters:{type:'object',properties:{unit_code:{type:'string'},project:{type:['string','null']}},required:['unit_code','project'],additionalProperties:false},strict:true},
  {type:'function',name:'navigate',description:'Navigate the Operation System UI to a module.',parameters:{type:'object',properties:{route:{type:'string',enum:['overview','dashboard','crm','inventory','digitaltwin','reports','eoi','leads','contracts','payment','users','settings','analytics','tasks']}},required:['route'],additionalProperties:false},strict:true},
  {type:'function',name:'payment_plan',description:'Calculate and evaluate a real-estate payment plan.',parameters:{type:'object',properties:{price:{type:'number'},down_payment_pct:{type:'number'},years:{type:'number'},discount_pct:{type:'number'},frequency:{type:'string',enum:['monthly','quarterly','semiannual','annual']}},required:['price','down_payment_pct','years','discount_pct','frequency'],additionalProperties:false},strict:true}
];

async function runTool(name,args){
  if(name==='navigate') return { uiAction:{kind:'route',label:`Open ${args.route}`,payload:{route:args.route}}, route:args.route };
  if(name==='search_clients'){
    const q=String(args.query||'').trim(); const like=`%${q}%`;
    const {data,error}=await admin.from('clients').select('*').or(`client_name.ilike.${like},mobile1.ilike.${like},unit_code.ilike.${like},project.ilike.${like}`).limit(20); if(error)throw error; return data||[];
  }
  if(name==='search_units'){
    const q=String(args.query||'').trim(); const like=`%${q}%`;
    const {data,error}=await admin.from('inventory_units').select('*').or(`unit_code.ilike.${like},project.ilike.${like},status.ilike.${like},building.ilike.${like},unit_type.ilike.${like}`).limit(25); if(error)throw error; return data||[];
  }
  if(name==='find_client_documents'){
    const q=String(args.query||'').trim(); const like=`%${q}%`;
    const {data,error}=await admin.from('documents').select('*').or(`client_name.ilike.${like},unit_code.ilike.${like},project.ilike.${like}`).order('created_at',{ascending:false}).limit(20); if(error)throw error; return signDocumentRows(data||[]);
  }
  if(name==='find_floor_plan'){
    let query=admin.from('documents').select('*').eq('kind','floor_plan').eq('unit_code',args.unit_code).order('created_at',{ascending:false}).limit(1);
    if(args.project) query=query.eq('project',args.project);
    const {data,error}=await query; if(error)throw error; return (await signDocumentRows(data||[]))[0]||null;
  }
  if(name==='payment_plan'){
    const price=n(args.price), dp=Math.max(0,Math.min(100,n(args.down_payment_pct))), years=Math.max(1,n(args.years)), disc=Math.max(0,Math.min(100,n(args.discount_pct)));
    const after=price*(1-disc/100), down=after*dp/100, rem=after-down; const perYear={monthly:12,quarterly:4,semiannual:2,annual:1}[args.frequency]||12; const count=Math.round(years*perYear); const installment=count?rem/count:0;
    const score=Math.round(Math.max(0,Math.min(100,55 + dp*1.2 - Math.max(0,years-8)*4 - disc*1.5)));
    return {price,price_after_discount:after,down_payment:down,remaining:rem,installments:count,installment,score,assessment:score>=75?'Strong':score>=60?'Balanced':'Risky'};
  }
  return {error:'Unknown tool'};
}

export async function operationAI({question,history=[],context={}}){
  if(!process.env.OPENAI_API_KEY) return {enabled:false,answer:'AI backend is not configured. Add OPENAI_API_KEY in Vercel Environment Variables.'};
  const model=process.env.OPENAI_MODEL||'gpt-5.6';
  const instructions=`You are Operation AI, an expert real-estate sales-operations copilot. Speak natural Egyptian Arabic when the user writes Arabic and natural English otherwise. Be conversational, precise, and proactive. Never invent live company data: use tools. If a request is impossible, contradictory, risky, or missing required details, explain exactly what is wrong and propose the best fix. You can navigate modules, find clients/units/PDFs/floor plans, and analyze payment plans. For external actions such as sending email, prepare a preview and request confirmation unless a dedicated approved tool exists. Keep answers compact but useful.`;
  const input=[...history.slice(-16).map(x=>({role:x.role==='assistant'?'assistant':'user',content:String(x.content||x.text||'')})),{role:'user',content:`Workspace context: ${JSON.stringify(context).slice(0,8000)}\n\nUser: ${question}`}];
  let response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,instructions,input,tools,reasoning:{effort:'medium'}})}).then(r=>r.json());
  const uiActions=[]; const trace=[];
  for(let turn=0;turn<5;turn++){
    const calls=(response.output||[]).filter(x=>x.type==='function_call');
    if(!calls.length) break;
    const outputs=[];
    for(const call of calls){ let args={}; try{args=JSON.parse(call.arguments||'{}')}catch{}; const result=await runTool(call.name,args); trace.push({tool:call.name,args}); if(result?.uiAction)uiActions.push(result.uiAction); outputs.push({type:'function_call_output',call_id:call.call_id,output:JSON.stringify(result)}); }
    response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,instructions,previous_response_id:response.id,input:outputs,tools,reasoning:{effort:'medium'}})}).then(r=>r.json());
  }
  const answer=response.output_text || (response.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n') || 'تم.';
  return {enabled:true,answer,expert:'Operation AI',actions:uiActions,toolTrace:trace,suggestedActions:[]};
}
