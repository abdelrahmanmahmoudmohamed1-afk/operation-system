import { admin, publicClient, requireUser, requireAdmin, supabaseEnv } from '../lib/supabase.js';
import { json, ok, fail, uniq, n, norm } from '../lib/helpers.js';
import { registerDocument, signDocumentRows } from '../lib/documents.js';
import { operationAI } from '../lib/ai.js';
import { sheetInventory, sheetClients, sheetEOI, sheetLeads, sheetsEnabled, sheetsDiagnostics } from '../lib/sheets.js';
import { ensureSchema, postgresConfigured, tableCounts } from '../lib/schema.js';
import { createGmailConnectUrl, gmailStatus, sendGmail, gmailConfigured } from '../lib/gmail.js';

const BUILD='enterprise-x-1.6.0';
const ACTIONS=['initializeDatabase','bootstrapStatus','bootstrapAdmin','login','refreshSession','logout','changeOwnPassword','getSystemInfo','runDiagnostics','recordUserActivity','getDashboardFilters','getDashboardData','getAchievementData','getClientFormBootstrap','getSales','getCompanies','getManagerDirector','saveClientRegistration','getClients','uploadClientContract','getClientDocuments','deleteDocument','getDocumentCoverage','getUnitFloorPlan','uploadUnitFloorPlan','getUnitFloorPlanCoverage','getInventoryData','getInventoryProjects','getAvailableUnitsByProject','getAvailableLayanaUnits','refreshAvailableLayanaUnits','getEOIFormBootstrap','saveEOI','getEOIData','getLeadsData','bulkUpdateLeadStatus','importLeads','getUsersData','createSystemUser','getAuditHistory','operationAiChat','getGmailStatus','getGmailConnectUrl','sendGmail','getReminders','completeReminder'];
function parseBody(text){try{return text?JSON.parse(text):{}}catch{return{}}}
async function schema(){try{return await ensureSchema();}catch(e){console.error('schema setup failed',e);return {ok:false,configured:postgresConfigured(),message:e.message};}}
async function safeSheet(kind){try{return kind==='inventory'?await sheetInventory():kind==='clients'?await sheetClients():kind==='eoi'?await sheetEOI():kind==='leads'?await sheetLeads():null;}catch(e){console.warn('Google Sheets failed',kind,e.message);return null;}}
async function withTimeout(promise,ms,label='operation'){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>{const e=new Error(`${label} timed out after ${ms}ms`);e.code='UPSTREAM_TIMEOUT';reject(e);},ms);})]);}finally{clearTimeout(timer);}}
async function dbRows(table,filters={}){let q=admin.from(table).select('*');if(filters.project&&String(filters.project).toUpperCase()!=='ALL'&&['inventory_units','clients','eoi_records','leads','documents'].includes(table))q=q.eq('project',filters.project);if(table==='documents')q=q.order('created_at',{ascending:false});else if(table!=='audit_logs')q=q.order('updated_at',{ascending:false,nullsFirst:false});const result=await withTimeout(q.limit(5000),5000,`Supabase ${table}`);const {data,error}=result||{};if(error)throw error;return data||[];}
async function rows(table,filters={}){
  const kind={inventory_units:'inventory',clients:'clients',eoi_records:'eoi',leads:'leads'}[table];
  // Live Sheets are the primary operational source. Never block a live read on Postgres.
  if(kind){
    const live=await safeSheet(kind);
    if(Array.isArray(live)){
      const sheetRows=filters.project&&String(filters.project).toUpperCase()!=='ALL'?live.filter(x=>norm(x.project)===norm(filters.project)):live;
      // Inventory is read-only/live: return immediately. This removes the extra Supabase round-trip that caused long cold-start waits.
      if(table==='inventory_units')return sheetRows;
      // CRM/EOI/Leads may contain local overrides. Merge them only if Supabase responds quickly; otherwise keep the live Sheet responsive.
      let db=[];try{db=await dbRows(table,filters);}catch(e){console.warn(`Supabase merge skipped for ${table}:`,e.message);return sheetRows;}
      const key=table==='clients'?(x=>`${norm(x.project)}|${norm(x.unit_code)}`):table==='leads'?(x=>String(x.row_number||x.id||'')):(x=>String(x.id||`${norm(x.project)}|${norm(x.unit_code)}|${norm(x.client_name)}|${x.eoi_date||''}`));
      const map=new Map(sheetRows.map(x=>[key(x),x]));db.forEach(x=>map.set(key(x),x));return [...map.values()];
    }
  }
  // Sheets unavailable: use Supabase as a bounded fallback instead of waiting indefinitely.
  let db=[];try{db=await dbRows(table,filters);}catch(e){console.warn(`Supabase fallback failed for ${table}:`,e.message);}
  if(kind && !db.length){
    const configured=sheetsEnabled();
    const err=new Error(configured
      ? `Live ${kind} source could not be read. Check Google Sheet sharing, tab name, Spreadsheet ID and Service Account permissions.`
      : `Live ${kind} source is not connected. Add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in Vercel and share the required Google Sheets with that service account.`);
    err.status=503;err.code=configured?'DATA_SOURCE_FAILED':'DATA_SOURCE_NOT_CONFIGURED';throw err;
  }
  return db;
}
function shapeUnit(r){return {...(r.raw_data||{}),id:r.id,project:r.project,Project:r.project,unitCode:r.unit_code,UnitCode:r.unit_code,'Unit Code':r.unit_code,status:r.status,Status:r.status,building:r.building,Building:r.building,floor:r.floor,Floor:r.floor,unitType:r.unit_type,'Unit Type':r.unit_type,area:n(r.area),Area:n(r.area),'In Door Area':n(r.area),price:n(r.price),Value:n(r.price),'Price After Discount':n(r.price)};}
function shapeClient(r){return {...(r.raw_data||{}),id:r.id,project:r.project,Project:r.project,unitCode:r.unit_code,'Unit Code':r.unit_code,clientName:r.client_name,'Client Name English':r.client_name,clientPhone:r.mobile1,'Client Phone Number':r.mobile1,clientPhone2:r.mobile2,'Client Phone Number 2':r.mobile2,address:r.address,'Residence address':r.address,email:r.email,'E-mail':r.email,status:r.status,Status:r.status,salesName:r.sales_name,'Sales Name':r.sales_name,contractDate:r.contract_date,'Contract Date':r.contract_date,reservationDate:r.reservation_date,'Reservition Date':r.reservation_date,soldDate:r.sold_date,'Sold Date':r.sold_date,value:n(r.value),Value:n(r.value),'Price After Discount':n(r.value)};}
function shapeEOI(r){const raw=r.raw_data||{};const pick=(...keys)=>{for(const k of keys){const v=raw[k]??r[k];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;}return '';};return{...raw,id:r.id,Date:pick('EOI Date','Date and Time','Date')||r.eoi_date||'',ClientName:pick('Client Full Name','Client Name','Client Name English','Client Name Arabic','clientName1')||r.client_name||'',Project:pick('Project','Project Name','project')||r.project||'',Housing:pick('Housing','Housing Type','Purpose','housing'),Phone:String(pick('Client Phone Number','Client Phone','Mobile','Phone','clientPhone')||''),Interest:pick('Interest','Gramat Type','Requested Gramat','interest'),Deposit:n(pick('Deposit','Deposit EOI','EOI Amount','Total Paid Amount','depositEOI')),Sales:pick('Sales Name','Sales Agent 1','Sales Agent','salesName1'),Source:pick('Source','Channel','source'),Status:pick('Status','status')||r.status||'',UnitCode:pick('Unit Code','UnitCode','unitCode')||r.unit_code||''};}

function parseDateValue(v){
  if(!v)return null;
  if(v instanceof Date)return Number.isFinite(v.getTime())?v:null;
  if(typeof v==='number'&&Number.isFinite(v)){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return Number.isFinite(d.getTime())?d:null;}
  const t=String(v).trim();
  let m=t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s+.*)?$/);
  if(m){let y=Number(m[3]);if(y<100)y+=2000;const d=new Date(y,Number(m[2])-1,Number(m[1]));return Number.isFinite(d.getTime())?d:null;}
  m=t.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[T\s].*)?$/);
  if(m){const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));return Number.isFinite(d.getTime())?d:null;}
  const d=new Date(t);return Number.isFinite(d.getTime())?d:null;
}
function achievementDate(client){const st=norm(client.status);if(st==='sold')return client.sold_date||client.contract_date||client.reservation_date;if(st==='contracted')return client.contract_date||client.reservation_date;if(st==='reserved')return client.reservation_date;return null;}
function dateMatchesPeriod(value,f={}){const d=parseDateValue(value);if(!d)return String(f.period||'all').toLowerCase()==='all';const period=String(f.period||'all').toLowerCase();if(period==='all')return true;const year=Number(f.year)||new Date().getFullYear(),month=(Number(f.month)||new Date().getMonth()+1)-1,day=Number(f.day)||new Date().getDate();if(period==='monthly')return d.getFullYear()===year&&d.getMonth()===month;if(period==='daily')return d.getFullYear()===year&&d.getMonth()===month&&d.getDate()===day;if(period==='weekly'){const anchor=new Date(year,month,day);anchor.setHours(0,0,0,0);const dow=(anchor.getDay()+6)%7;const from=new Date(anchor);from.setDate(anchor.getDate()-dow);const to=new Date(from);to.setDate(from.getDate()+7);return d>=from&&d<to;}if(period==='quarterly'){const q=Math.floor(month/3),from=new Date(year,q*3,1),to=new Date(year,q*3+3,1);return d>=from&&d<to;}if(period==='custom'){const from=f.dateFrom?new Date(`${f.dateFrom}T00:00:00`):null,to=f.dateTo?new Date(`${f.dateTo}T23:59:59.999`):null;return(!from||d>=from)&&(!to||d<=to);}return true;}
function achievementPayload(clients,filters={}){
  const selected=(clients||[]).filter(c=>['reserved','contracted','sold'].includes(norm(c.status))).filter(c=>dateMatchesPeriod(achievementDate(c),filters));
  const rows=selected.map(c=>{const raw=c.raw_data||{},dt=parseDateValue(achievementDate(c));return{Date:dt?dt.toLocaleDateString('en-GB'):'-',Project:c.project||'',UnitCode:c.unit_code||'',Status:c.status||'',Client:c.client_name||'',Mobile:String(c.mobile1||''),Sales:c.sales_name||'',UnitType:raw['Unit Type']||raw['UnitType']||'',Area:n(raw['In Door Area']||raw['Indoor Area']||raw['Area']),Value:n(c.value)};});
  const kpis={reserved:{units:0,value:0},contracted:{units:0,value:0},sold:{units:0,value:0}};
  for(const r of rows){const st=norm(r.Status);if(kpis[st]){kpis[st].units++;kpis[st].value+=n(r.Value);}}
  return{rows,kpis,meta:{units:rows.length,value:rows.reduce((a,r)=>a+n(r.Value),0),period:filters.period||'all'}};
}
function groupRows(rows,keyFn,label){const map=new Map();for(const r of rows){const name=String(keyFn(r)||'Unassigned').trim()||'Unassigned';const k=norm(name);const x=map.get(k)||{[label]:name,Units:0,Value:0,AvgUnitPrice:0};x.Units++;x.Value+=n(r.value);map.set(k,x);}return [...map.values()].map(x=>({...x,AvgUnitPrice:x.Units?x.Value/x.Units:0})).sort((a,b)=>b.Value-a.Value||b.Units-a.Units);}
function rawPick(r,keys){const raw=r?.raw_data||{};for(const k of keys){const v=raw[k]??r?.[k];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;}return '';}
function dashboard(units,clients=[]){
  const activeClients=(clients||[]).filter(c=>['reserved','contracted','sold'].includes(norm(c.status)));
  const salesRows=activeClients.length?activeClients:units.filter(u=>['reserved','contracted','sold'].includes(norm(u.status))).map(u=>({project:u.project,unit_code:u.unit_code,status:u.status,value:n(u.price),raw_data:u.raw_data||{}}));
  const k={reservedUnits:0,contractedUnits:0,soldUnits:0,availableUnits:0,availableValue:0,totalSalesValue:0,cancelledUnits:0,remainingDp:0};
  for(const u of units){const st=norm(u.status);if(st==='available'){k.availableUnits++;k.availableValue+=n(u.price);}if(['cancelled','canceled','cancel'].includes(st))k.cancelledUnits++;}
  for(const c of salesRows){const st=norm(c.status);if(st==='reserved')k.reservedUnits++;if(st==='contracted')k.contractedUnits++;if(st==='sold')k.soldUnits++;k.totalSalesValue+=n(c.value);k.remainingDp+=n(rawPick(c,['Remaining DP','Remaining After DP']));}
  const closed=k.reservedUnits+k.contractedUnits+k.soldUnits;k.avgUnitPrice=closed?k.totalSalesValue/closed:0;k.cancellationRate=units.length?k.cancelledUnits/units.length*100:0;
  const statusBase=clients.length?clients:units;const statusMap=new Map();for(const r of statusBase){const status=String(r.status||'Unknown');const key=norm(status);const x=statusMap.get(key)||{Status:status,Units:0,Value:0};x.Units++;x.Value+=n(r.value??r.price);statusMap.set(key,x);}const statusMix=[...statusMap.values()].sort((a,b)=>b.Value-a.Value||b.Units-a.Units);
  const projectPerformance=groupRows(salesRows,r=>r.project,'Project');
  const salesPerformance=groupRows(salesRows,r=>rawPick(r,['Sales Name','Sales','Sales Agent'])||r.sales_name,'Sales');
  const managerPerformance=groupRows(salesRows,r=>rawPick(r,['Sales Manager','Manager']),'Manager').map(({AvgUnitPrice,...x})=>x);
  const directorPerformance=groupRows(salesRows,r=>rawPick(r,['Sales Director','Director','HOS']),'Director').map(({AvgUnitPrice,...x})=>x);
  const brokerPerformance=groupRows(salesRows,r=>rawPick(r,['Broker Company','Broker']),'Broker').map(({AvgUnitPrice,...x})=>x);
  const unitMap=new Map(units.map(u=>[`${norm(u.project)}|${norm(u.unit_code)}`,u]));
  const topUnits=salesRows.map(c=>{const u=unitMap.get(`${norm(c.project)}|${norm(c.unit_code)}`)||{};return{UnitCode:c.unit_code||u.unit_code||'',Project:c.project||u.project||'',UnitType:rawPick(c,['Unit Type'])||u.unit_type||'',Sales:rawPick(c,['Sales Name'])||c.sales_name||'',Area:n(rawPick(c,['In Door Area','Indoor Area','Area'])||u.area),Value:n(c.value??u.price),ContractDate:c.contract_date||rawPick(c,['Contract Date'])||''};}).sort((a,b)=>b.Value-a.Value).slice(0,50);
  const trend=new Map();
  for(const c of clients||[]){const st=norm(c.status);const d=parseDateValue(st==='sold'?c.sold_date:st==='contracted'?c.contract_date:c.reservation_date);if(!d)continue;const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;const x=trend.get(key)||{Month:key,SalesValue:0,CancelledValue:0};if(['reserved','contracted','sold'].includes(st))x.SalesValue+=n(c.value);if(['cancelled','canceled','cancel'].includes(st))x.CancelledValue+=n(c.value);trend.set(key,x);}
  const reportRows=(clients.length?clients.map(shapeClient):units.map(shapeUnit));
  return{kpis:k,reportRows,statusMix,projectPerformance,salesPerformance,managerPerformance,directorPerformance,brokerPerformance,topUnits,trendMonthly:[...trend.values()].sort((a,b)=>a.Month.localeCompare(b.Month)).slice(-18),meta:{generatedAt:new Date().toISOString(),rowsInventory:units.length,rowsClients:clients.length,source:sheetsEnabled()?'Google Sheets + Supabase':'Supabase',dataAvailable:units.length>0||clients.length>0}};
}
async function profileFor(id){const {data}=await admin.from('profiles').select('*').eq('id',id).maybeSingle();return data||null;}
async function audit(user,action,module,details={}){try{await admin.from('audit_logs').insert({user_id:user?.id||null,action,module,details});}catch{}}
async function operationAiWithMemory(user,data={}){
  const question=String(data.question||'').trim();
  if(!question)throw new Error('AI question is required.');
  let conversation=null;
  try{
    const {data:latest}=await admin.from('ai_conversations').select('*').eq('user_id',user.id).order('updated_at',{ascending:false}).limit(1).maybeSingle();
    conversation=latest||null;
    if(!conversation){const {data:created,error}=await admin.from('ai_conversations').insert({user_id:user.id,title:'Operation AI'}).select('*').single();if(error)throw error;conversation=created;}
    await admin.from('ai_messages').insert({conversation_id:conversation.id,role:'user',content:question,metadata:{source:'web'}});
  }catch(e){console.warn('AI memory write skipped',e.message);}
  let stored=[];
  if(conversation){
    try{const {data:msgs}=await admin.from('ai_messages').select('role,content,created_at').eq('conversation_id',conversation.id).order('created_at',{ascending:false}).limit(30);stored=(msgs||[]).reverse().slice(0,-1).map(x=>({role:x.role,text:x.content}));}catch{}
  }
  const supplied=Array.isArray(data.history)?data.history:[];
  const result=await operationAI({...data,history:supplied.length?supplied:stored},user);
  if(conversation){
    try{await admin.from('ai_messages').insert({conversation_id:conversation.id,role:'assistant',content:String(result.answer||''),metadata:{expert:result.expert||'',actions:result.actions||[]}});await admin.from('ai_conversations').update({updated_at:new Date().toISOString()}).eq('id',conversation.id);}catch{}
  }
  return {...result,conversationId:conversation?.id||null};
}
async function profileCount(){const result=await withTimeout(admin.from('profiles').select('*',{count:'exact',head:true}),4000,'Supabase profiles check');const {count,error}=result||{};if(error)throw error;return count||0;}
async function bootstrapStatus(){
  try{const count=await profileCount();return {needsBootstrap:count===0,profiles:count,databaseReady:true,schema:{ok:true,configured:postgresConfigured(),mode:'migration-managed'}};}
  catch(e){
    const msg=String(e?.message||'');
    const missing=/profiles|relation .* does not exist|PGRST205|42P01/i.test(msg);
    return {needsBootstrap:false,profiles:null,databaseReady:false,needsMigration:missing,code:missing?'DATABASE_NOT_INITIALIZED':'DATABASE_UNREACHABLE',message:missing?'Supabase database schema is not initialized yet. Run the included migration in Supabase SQL Editor.':msg||'Supabase database could not be reached.'};
  }
}
async function bootstrapAdmin(d){
  const status=await bootstrapStatus();if(!status.needsBootstrap)throw Object.assign(new Error('System already has an administrator.'),{status:409});
  const email=String(d.email||'').trim().toLowerCase(),username=String(d.username||'').trim(),password=String(d.password||'');
  if(!email||!email.includes('@'))throw new Error('A valid email is required.');if(!username)throw new Error('Username is required.');if(password.length<10)throw new Error('Use a password of at least 10 characters.');
  const {data:created,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:d.name||username}});if(error)throw error;
  const profile={id:created.user.id,email,username,full_name:String(d.name||username),role:'admin',is_active:true};
  const {error:pErr}=await admin.from('profiles').insert(profile);if(pErr){try{await admin.auth.admin.deleteUser(created.user.id);}catch{}throw pErr;}
  return {success:true,username,email};
}
async function diagnostics(user=null){
  const started=Date.now(),sc=await schema();let counts={};try{counts=await tableCounts();}catch{}
  const checks={supabase:{...supabaseEnv},postgres:{configured:postgresConfigured(),schema:sc.ok},googleSheets:{configured:sheetsEnabled(),inventoryRows:null,clientRows:null,eoiRows:null,leadsRows:null},openai:{configured:Boolean(process.env.OPENAI_API_KEY),model:process.env.OPENAI_MODEL||'gpt-5.6'},gmail:{configured:gmailConfigured(),connected:false,accountEmail:''},storage:{bucket:'operation-documents',ok:false},runtime:{build:BUILD,latencyMs:0}};
  if(sheetsEnabled()){const [u,c,e,l]=await Promise.all([safeSheet('inventory'),safeSheet('clients'),safeSheet('eoi'),safeSheet('leads')]);checks.googleSheets.inventoryRows=u?.length??null;checks.googleSheets.clientRows=c?.length??null;checks.googleSheets.eoiRows=e?.length??null;checks.googleSheets.leadsRows=l?.length??null;checks.googleSheets.leadRows=l?.length??null;try{checks.googleSheets.debug=await sheetsDiagnostics();}catch(e){checks.googleSheets.debugError=e.message;}}
  try{const {data,error}=await admin.storage.getBucket('operation-documents');checks.storage.ok=!error&&Boolean(data);}catch{}
  if(user){try{checks.gmail={...checks.gmail,...await gmailStatus(user.id)};}catch{}}
  checks.databaseCounts=counts;checks.runtime.latencyMs=Date.now()-started;return checks;
}

async function handle(action,payload){
  // Schema creation is an explicit setup/diagnostics concern. Running DDL on every API request made Vercel cold starts extremely slow.
  if(action==='initializeDatabase')return schema();
  if(action==='bootstrapStatus')return bootstrapStatus();
  if(action==='bootstrapAdmin')return bootstrapAdmin(payload.data||payload);
  if(action==='getSystemInfo'){const boot=await bootstrapStatus();return{backendBuild:BUILD,version:'x1.7.2',platform:'Vercel + Supabase + Google Sheets',actions:ACTIONS,needsBootstrap:Boolean(boot.needsBootstrap),databaseReady:Boolean(boot.databaseReady),databaseStatus:boot,setup:{googleSheets:sheetsEnabled(),openai:Boolean(process.env.OPENAI_API_KEY),gmail:gmailConfigured(),supabase:supabaseEnv,postgres:postgresConfigured()}};}
  if(action==='refreshSession'){const refreshToken=String(payload.refreshToken||'');if(!refreshToken)throw Object.assign(new Error('REFRESH_TOKEN_REQUIRED'),{status:401});const {data,error}=await publicClient.auth.refreshSession({refresh_token:refreshToken});if(error||!data?.session)throw Object.assign(new Error('SESSION_EXPIRED'),{status:401});const profile=await profileFor(data.user.id);return{success:true,token:data.session.access_token,refreshToken:data.session.refresh_token,user:{id:data.user.id,email:data.user.email,name:profile?.full_name||profile?.username||data.user.email,username:profile?.username||'',role:profile?.role||'user'}};}
  if(action==='login'){
    const username=String(payload.username||'').trim();let email=username;
    if(!username.includes('@')){
      let lookup;try{lookup=await withTimeout(admin.from('profiles').select('email').ilike('username',username).maybeSingle(),4000,'Username lookup');}
      catch(e){const err=new Error(/profiles|PGRST205|42P01/i.test(String(e.message||''))?'Database setup is incomplete. Run the Supabase migration before signing in.':`Login service unavailable: ${e.message}`);err.status=503;err.code=/profiles|PGRST205|42P01/i.test(String(e.message||''))?'DATABASE_NOT_INITIALIZED':'AUTH_LOOKUP_TIMEOUT';throw err;}
      if(lookup?.error){const err=new Error(/profiles|PGRST205|42P01/i.test(String(lookup.error.message||''))?'Database setup is incomplete. Run the Supabase migration before signing in.':lookup.error.message);err.status=503;err.code='DATABASE_LOOKUP_FAILED';throw err;}
      email=lookup?.data?.email||'';
    }
    if(!email)return{success:false,message:'Invalid username or password'};
    let authResult;try{authResult=await withTimeout(publicClient.auth.signInWithPassword({email,password:String(payload.password||'')}),8000,'Supabase authentication');}
    catch(e){const err=new Error(`Authentication service timeout. Check the Supabase connection and environment variables.`);err.status=503;err.code='AUTH_TIMEOUT';throw err;}
    const {data,error}=authResult||{};if(error||!data?.session)return{success:false,message:'Invalid username or password'};
    let profile=null;try{profile=await withTimeout(profileFor(data.user.id),4000,'Profile lookup');}catch(e){console.warn('Profile lookup delayed',e.message);}
    if(profile?.is_active===false)return{success:false,message:'User is disabled'};
    return{success:true,token:data.session.access_token,refreshToken:data.session.refresh_token,user:{id:data.user.id,email:data.user.email,name:profile?.full_name||profile?.username||data.user.email,username:profile?.username||'',role:profile?.role||'user'}};
  }
  const user=await requireUser(payload.token);const filters=payload.filters||{};
  switch(action){
    case 'runDiagnostics':return diagnostics(user);
    case 'logout':return{success:true};
    case 'changeOwnPassword':{const pwd=String(payload.newPassword||''),old=String(payload.oldPassword||'');if(pwd.length<10)throw new Error('New password must be at least 10 characters.');if(!old)throw new Error('Current password is required.');const verify=await publicClient.auth.signInWithPassword({email:user.email,password:old});if(verify.error)throw Object.assign(new Error('Current password is incorrect.'),{status:400});const {error}=await admin.auth.admin.updateUserById(user.id,{password:pwd});if(error)throw error;await audit(user,'change_password','settings',{});return{success:true,message:'Password updated'};}
    case 'recordUserActivity':await audit(user,payload.data?.action||'activity',payload.data?.module||'system',payload.data||{});return{success:true};
    case 'getInventoryData':return(await rows('inventory_units',filters)).map(shapeUnit);
    case 'getInventoryProjects':{const data=await rows('inventory_units',{});return uniq(data.map(x=>x.project)).sort();}
    case 'getAvailableUnitsByProject':return(await rows('inventory_units',{project:payload.project})).filter(x=>norm(x.status)==='available').map(shapeUnit);
    case 'getAvailableLayanaUnits':return(await rows('inventory_units',{project:'Layana'})).filter(x=>norm(x.status)==='available').map(shapeUnit);
    case 'refreshAvailableLayanaUnits':return{success:true,message:'Inventory reads live from Google Sheets when configured.'};
    case 'getClients':return(await rows('clients',filters)).map(shapeClient);
    case 'getClientFormBootstrap':{const[u,c]=await Promise.all([rows('inventory_units',{}),rows('clients',{})]);return{sales:uniq(c.map(x=>x.sales_name)).filter(Boolean).sort(),lists:{projects:uniq(u.map(x=>x.project)).sort(),statuses:uniq(c.map(x=>x.status)).filter(Boolean).sort(),nationalities:uniq(c.map(x=>rawPick(x,['Client Nationality','Nationality']))).filter(Boolean).sort(),sourceOptions:['Personal','Direct','Non-Direct','Broker','Referral','Freelance','Digital','Call Center','Visit','Visit (Site)'],paymentMethods:['Cash','Cheque','Transfer']}};}
    case 'getSales':return uniq((await rows('clients',{})).map(x=>x.sales_name)).sort();
    case 'getCompanies':{const c=await rows('clients',{});return uniq(c.map(x=>rawPick(x,['Broker Company','Company'])).filter(Boolean)).sort();}
    case 'getManagerDirector':{const sales=norm(payload.salesName||payload.data?.salesName||'');const c=await rows('clients',{});const match=c.find(x=>norm(x.sales_name)===sales);return{manager:match?String(rawPick(match,['Sales Manager','Manager'])||''):'',director:match?String(rawPick(match,['Sales Director','Director','HOS'])||''):''};}
    case 'saveClientRegistration':{const d=payload.data||{};const rec={project:d.project||d.Project||'',unit_code:d.unitCode||d['Unit Code']||'',client_name:d.clientName||d['Client Name English']||d['Client Name Arabic']||'',mobile1:String(d.clientPhone||d['Client Phone Number']||''),mobile2:String(d.clientPhone2||d['Client Phone Number 2']||''),address:d.clientAddress||d.address||d['Residence address']||'',email:d.clientEmail||d.email||d['E-mail']||'',status:d.status||d.Status||'',sales_name:d.salesName1||d.salesName||d['Sales Name']||'',contract_date:d.contractDate||d['Contract Date']||null,reservation_date:d.reservationDate||d['Reservition Date']||null,sold_date:d.soldDate||d['Sold Date']||null,value:n(d.value||d.Value||d['Price After Discount']),raw_data:d,updated_at:new Date().toISOString()};if(!rec.unit_code)throw new Error('Unit Code is required.');const {data,error}=await admin.from('clients').upsert(rec,{onConflict:'project,unit_code'}).select('*').single();if(error)throw error;await audit(user,'save_client','crm',{unitCode:rec.unit_code});return shapeClient(data);}
    case 'uploadClientContract':{const doc=await registerDocument(payload.data||{},user,'contract');await audit(user,'upload_contract','crm',{unitCode:doc.unit_code,fileName:doc.file_name});return doc;}
    case 'uploadUnitFloorPlan':{const doc=await registerDocument(payload.data||{},user,'floor_plan');await audit(user,'upload_floor_plan','digitaltwin',{unitCode:doc.unit_code,fileName:doc.file_name});return doc;}
    case 'getClientDocuments':{let q=admin.from('documents').select('*').order('created_at',{ascending:false});if(filters.project&&filters.project!=='ALL')q=q.eq('project',filters.project);if(filters.unitCode)q=q.eq('unit_code',filters.unitCode);if(filters.clientName)q=q.ilike('client_name',`%${filters.clientName}%`);const {data,error}=await q.limit(500);if(error)throw error;return signDocumentRows(data||[]);}
    case 'deleteDocument':{const id=String(payload.data?.id||'').trim();if(!id)throw new Error('Document id is required.');const {data:doc,error:findErr}=await admin.from('documents').select('*').eq('id',id).maybeSingle();if(findErr)throw findErr;if(!doc)return{deleted:true};if(doc.storage_path){const {error:storageErr}=await admin.storage.from(doc.bucket||'operation-documents').remove([doc.storage_path]);if(storageErr&&!/not found/i.test(String(storageErr.message||'')))throw storageErr;}const {error:deleteErr}=await admin.from('documents').delete().eq('id',id);if(deleteErr)throw deleteErr;await audit(user,'delete_document','documents',{id,fileName:doc.file_name,unitCode:doc.unit_code,kind:doc.kind});return{deleted:true};}
    case 'getUnitFloorPlan':{let q=admin.from('documents').select('*').eq('kind','floor_plan').order('created_at',{ascending:false}).limit(1);if(filters.project)q=q.eq('project',filters.project);if(filters.unitCode)q=q.eq('unit_code',filters.unitCode);const {data,error}=await q;if(error)throw error;return(await signDocumentRows(data||[]))[0]||null;}
    case 'getDocumentCoverage':{const [clients,docs]=await Promise.all([rows('clients',filters),dbRows('documents',filters)]);const sold=clients.filter(x=>['sold','contracted'].includes(norm(x.status)));const keys=new Set(docs.filter(x=>x.kind==='contract').map(x=>`${norm(x.project)}|${norm(x.unit_code)}`));const withDoc=sold.filter(x=>keys.has(`${norm(x.project)}|${norm(x.unit_code)}`)).length;return{required:sold.length,soldOrContracted:sold.length,withScan:withDoc,withContractScan:withDoc,withoutScan:Math.max(0,sold.length-withDoc),missingContractScan:Math.max(0,sold.length-withDoc),coverage:sold.length?withDoc/sold.length*100:0,contractCoverage:sold.length?withDoc/sold.length*100:0,totalDocuments:docs.length};}
    case 'getUnitFloorPlanCoverage':{const[units,docs]=await Promise.all([rows('inventory_units',filters),dbRows('documents',filters)]);const keys=new Set(docs.filter(x=>x.kind==='floor_plan').map(x=>`${norm(x.project)}|${norm(x.unit_code)}`));const withPlan=units.filter(x=>keys.has(`${norm(x.project)}|${norm(x.unit_code)}`)).length;return{totalUnits:units.length,withPlan,withoutPlan:Math.max(0,units.length-withPlan),coverage:units.length?withPlan/units.length*100:0};}
    case 'getDashboardFilters':{const u=await rows('inventory_units',{});return{projects:uniq(u.map(x=>x.project)).sort(),statuses:uniq(u.map(x=>x.status)).sort(),unitTypes:uniq(u.map(x=>x.unit_type)).sort()};}
    case 'getDashboardData':{const [u,c]=await Promise.all([rows('inventory_units',filters),rows('clients',filters)]);return dashboard(u,c);}
    case 'getAchievementData':{const c=await rows('clients',filters);return achievementPayload(c,filters);}
    case 'getEOIData':{const r=await rows('eoi_records',filters);const shaped=r.map(shapeEOI);return{rows:shaped,meta:{total:shaped.length,totalDeposit:shaped.reduce((a,x)=>a+n(x.Deposit),0)}};}
    case 'getEOIFormBootstrap':{const [u,c]=await Promise.all([rows('inventory_units',{}),rows('clients',{})]);const projects=uniq(u.map(x=>x.project)).sort();return{projects,availableUnits:u.filter(x=>norm(x.status)==='available').map(shapeUnit),sales:uniq(c.map(x=>x.sales_name)).filter(Boolean).sort(),lists:{projectOptions:projects.length?projects:['Layana','Mersea'],sourceOptions:['Personal','Direct','Non-Direct','Broker','Referral','Freelance','Digital','Call Center','Visit','Visit (Site)'],interestOptions:['1 BR','2 BR','3 BR','Investment','Housing','Other'],paymentMethods:['Cash','Cheque','Transfer'],housingOptions:['Housing','Investment','Second Home','Other']}};}
    case 'saveEOI':{const d=payload.data||{};const rec={project:d.project||d.Project||'',unit_code:d.unitCode||d['Unit Code']||'',client_name:d.clientName1||d.clientName||d['Client Name']||'',status:d.status||'Done',eoi_date:d.date||new Date().toISOString(),raw_data:d,updated_at:new Date().toISOString()};const {data,error}=await admin.from('eoi_records').insert(rec).select('*').single();if(error)throw error;await audit(user,'save_eoi','eoi',{unitCode:rec.unit_code,clientName:rec.client_name});return shapeEOI(data);}
    case 'getLeadsData':{const all=await rows('leads',filters);let r=all;const st=String(filters.status||'ALL');if(st&&st!=='ALL')r=r.filter(x=>norm(x.status)===norm(st));const search=norm(filters.search||'');if(search)r=r.filter(x=>norm(`${x.client_name} ${x.phone} ${x.project} ${x.sales_name} ${x.status} ${x.stage} ${x.source} ${x.last_comment} ${JSON.stringify(x.raw_data||{})}`).includes(search));return{rows:r.map(x=>({...x.raw_data,id:x.id,rowNumber:x.row_number,clientName:x.client_name,phone:x.phone,project:x.project,salesName:x.sales_name,status:x.status,stage:x.stage,source:x.source,lastComment:x.last_comment})),statuses:uniq(all.map(x=>x.status)).filter(Boolean).sort(),meta:{total:r.length,all:all.length}};}
    case 'bulkUpdateLeadStatus':{
      const nums=(payload.data?.rowNumbers||[]).map(Number).filter(Boolean);if(!nums.length)throw new Error('Select at least one lead.');
      const status=String(payload.data?.status||'').trim();if(!status)throw new Error('Lead status is required.');
      const liveRows=await safeSheet('leads');
      const current=Array.isArray(liveRows)?liveRows.filter(x=>nums.includes(Number(x.row_number))):[];
      const now=new Date().toISOString();
      const seed=current.map(x=>({row_number:Number(x.row_number),client_name:x.client_name||'',phone:String(x.phone||''),project:x.project||'',sales_name:x.sales_name||'',status,stage:x.stage||'',source:x.source||'',last_comment:x.last_comment||'',raw_data:{...(x.raw_data||{}),'Lead Status':status,Status:status},updated_at:now}));
      if(seed.length){const {error}=await admin.from('leads').upsert(seed,{onConflict:'row_number'});if(error)throw error;}
      const remaining=nums.filter(n=>!seed.some(x=>x.row_number===n));
      if(remaining.length){const {error}=await admin.from('leads').update({status,updated_at:now}).in('row_number',remaining);if(error)throw error;}
      await audit(user,'bulk_lead_status','leads',{count:nums.length,status});return{updated:nums.length};
    }
    case 'importLeads':{const incoming=payload.data?.rows||[];const mapped=incoming.map((d,i)=>({row_number:Number(d.rowNumber||d['Row Number']||Date.now()+i),client_name:d.clientName||d['Client Name']||d.Name||'',phone:String(d.phone||d.Mobile||d.Phone||''),project:d.project||d.Project||'',sales_name:d.salesName||d['Sales Name']||'',status:d.status||d.Status||'Not Contacted',stage:d.stage||d.Stage||'New',source:d.source||d.Source||'',last_comment:d.lastComment||d['Last Comment']||'',raw_data:d,updated_at:new Date().toISOString()}));if(mapped.length){const{error}=await admin.from('leads').upsert(mapped,{onConflict:'row_number'});if(error)throw error;}await audit(user,'import_leads','leads',{count:mapped.length});return{imported:mapped.length,updated:0,skipped:0};}
    case 'getUsersData':{await requireAdmin(payload.token);const {data,error}=await admin.from('profiles').select('*').order('created_at',{ascending:false});if(error)throw error;const users=(data||[]).map(x=>({...x,name:x.full_name,active:x.is_active}));return{users,summary:{total:users.length,admins:users.filter(x=>x.role==='admin').length,active:users.filter(x=>x.is_active!==false).length,inactive:users.filter(x=>x.is_active===false).length,roles:new Set(users.map(x=>x.role).filter(Boolean)).size}};}
    case 'createSystemUser':{
      await requireAdmin(payload.token);const d=payload.data||{};const email=String(d.email||'').trim().toLowerCase();const username=String(d.username||'').trim();const password=String(d.password||'');
      if(!username)throw new Error('Username is required.');if(!email||!email.includes('@'))throw new Error('A valid email is required for a secure central account.');if(password.length<10)throw new Error('Password must be at least 10 characters.');
      const {data:existing}=await admin.from('profiles').select('id,email,username').or(`email.eq.${email},username.ilike.${username}`).limit(1);if(existing?.length)throw Object.assign(new Error('This email or username already exists.'),{status:409});
      const {data:created,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:d.name||d.fullName||username}});if(error)throw error;
      const profile={id:created.user.id,email,username,full_name:d.name||d.fullName||username,role:String(d.role||'user').toLowerCase()==='admin'?'admin':'user',is_active:d.active!==false,manager:d.manager||'',director:d.director||'',mobile:d.mobile||''};
      const{error:pErr}=await admin.from('profiles').insert(profile);if(pErr){try{await admin.auth.admin.deleteUser(created.user.id);}catch{}throw pErr;}
      await audit(user,'create_user','users',{createdUser:username,role:profile.role});return{...profile,name:profile.full_name,active:profile.is_active};
    }
    case 'getAuditHistory':{await requireAdmin(payload.token);const [{data,error},{data:profiles}]=await Promise.all([admin.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(1000),admin.from('profiles').select('id,username,full_name,role')]);if(error)throw error;const pm=new Map((profiles||[]).map(p=>[p.id,p]));let out=(data||[]).map(x=>{const p=pm.get(x.user_id)||{};return{...x,timestamp:x.created_at,createdAt:x.created_at,userName:p.full_name||p.username||'System',username:p.username||'',role:p.role||'',success:x.details?.success!==false,durationMs:x.details?.durationMs||0,details:x.details||{}};});const f=payload.filters||{};if(f.username)out=out.filter(x=>norm(x.username)===norm(f.username));if(f.module)out=out.filter(x=>norm(x.module)===norm(f.module));if(f.search){const q=norm(f.search);out=out.filter(x=>norm(`${x.action} ${x.module} ${JSON.stringify(x.details)}`).includes(q));}return out.slice(0,Number(f.limit||1000));}
    case 'operationAiChat':return operationAiWithMemory(user,payload.data||{});
    case 'getGmailStatus':return gmailStatus(user.id);
    case 'getGmailConnectUrl':return{url:await createGmailConnectUrl(user)};
    case 'sendGmail':{const result=await sendGmail(user.id,payload.data||{});await audit(user,'send_email','communications',{to:result.to,messageId:result.messageId,attachments:result.attachments});return result;}
    case 'getReminders':{const {data,error}=await admin.from('reminders').select('*').eq('user_id',user.id).order('due_at',{ascending:true});if(error)throw error;return data||[];}
    case 'completeReminder':{const {error}=await admin.from('reminders').update({completed:true}).eq('id',payload.id).eq('user_id',user.id);if(error)throw error;return{success:true};}
    default:throw Object.assign(new Error(`Unsupported action: ${action}`),{status:404});
  }
}

async function opsFetch(request){
  const origin=request.headers.get('origin')||'*';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':process.env.ALLOWED_ORIGIN||origin,'Vary':'Origin','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Max-Age':'86400'}});
  try{
    const url=new URL(request.url);
    let payload={};
    if(request.method==='POST') payload=parseBody(await request.text());
    else for(const[k,v]of url.searchParams.entries()){try{payload[k]=JSON.parse(v)}catch{payload[k]=v}}
    const action=payload.action||url.searchParams.get('action');
    if(!action)return json(fail('action is required','BAD_REQUEST'),400,origin);
    const data=await handle(action,payload);
    return json(ok(data),200,origin);
  }catch(error){
    console.error('ops error',error);
    return json(fail(error.message||'Server error',error.code||'SERVER_ERROR'),error.status||500,origin);
  }
}

// Vercel Functions 2026 Web Handler format. Exporting a plain function can be
// interpreted as the legacy Node req/res handler; returning a Web Response from
// that mode leaves the invocation open until maxDuration. This fetch export
// guarantees a real Web Request and that Response is committed immediately.
export default { fetch: opsFetch };
