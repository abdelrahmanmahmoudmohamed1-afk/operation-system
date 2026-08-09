import { admin, publicClient, requireUser, requireAdmin } from '../lib/supabase.js';
import { json, ok, fail, projectFilter, uniq, n, norm } from '../lib/helpers.js';
import { registerDocument, signDocumentRows } from '../lib/documents.js';
import { operationAI } from '../lib/ai.js';
import { sheetInventory, sheetClients, sheetEOI, sheetLeads, sheetsEnabled } from '../lib/sheets.js';

function parseBody(text){ try{return text?JSON.parse(text):{}}catch{return{}} }
async function rows(table, filters={}){
  let live = null;
  try {
    if (table === 'inventory_units') live = await sheetInventory();
    else if (table === 'clients') live = await sheetClients();
    else if (table === 'eoi_records') live = await sheetEOI();
    else if (table === 'leads') live = await sheetLeads();
  } catch (error) {
    console.warn(`Google Sheets source failed for ${table}; using Supabase only`, error.message);
    live = null;
  }
  let q=admin.from(table).select('*');
  if(filters.project && String(filters.project).toUpperCase()!=='ALL') q=q.eq('project',filters.project);
  const {data:db,error}=await q.order('updated_at',{ascending:false,nullsFirst:false}).limit(5000);
  if(error) throw error;
  const dbRows=db||[];
  if (!Array.isArray(live)) return dbRows;
  let sheetRows = filters.project && String(filters.project).toUpperCase() !== 'ALL'
    ? live.filter(x => String(x.project || '').toLowerCase() === String(filters.project).toLowerCase())
    : live;
  if (table === 'inventory_units') return sheetRows.length ? sheetRows : dbRows;
  const keyOf = table === 'clients'
    ? (x => `${norm(x.project)}|${norm(x.unit_code)}`)
    : table === 'leads'
      ? (x => String(x.row_number || x.id || ''))
      : (x => String(x.id || `${norm(x.project)}|${norm(x.unit_code)}|${norm(x.client_name)}|${x.eoi_date||''}`));
  const map=new Map(sheetRows.map(x=>[keyOf(x),x]));
  dbRows.forEach(x=>map.set(keyOf(x),x));
  return [...map.values()];
}
function shapeUnit(r){return {...(r.raw_data||{}),id:r.id,project:r.project,Project:r.project,unitCode:r.unit_code,UnitCode:r.unit_code,'Unit Code':r.unit_code,status:r.status,Status:r.status,building:r.building,Building:r.building,floor:r.floor,Floor:r.floor,unitType:r.unit_type,'Unit Type':r.unit_type,area:n(r.area),Area:n(r.area),price:n(r.price),Value:n(r.price),'Price After Discount':n(r.price)};}
function shapeClient(r){return {...(r.raw_data||{}),id:r.id,project:r.project,Project:r.project,unitCode:r.unit_code,'Unit Code':r.unit_code,clientName:r.client_name,'Client Name English':r.client_name,clientPhone:r.mobile1,'Client Phone Number':r.mobile1,clientPhone2:r.mobile2,'Client Phone Number 2':r.mobile2,address:r.address,'Residence address':r.address,email:r.email,'E-mail':r.email,status:r.status,Status:r.status,salesName:r.sales_name,'Sales Name':r.sales_name,contractDate:r.contract_date,'Contract Date':r.contract_date,reservationDate:r.reservation_date,'Reservition Date':r.reservation_date,soldDate:r.sold_date,'Sold Date':r.sold_date,value:n(r.value),Value:n(r.value),'Price After Discount':n(r.value)};}
function statusSummary(units){const map={};for(const u of units){const s=u.status||'Unknown';map[s]=(map[s]||0)+1;}return map;}
function dashboard(units,clients){
 const closed=new Set(['reserved','contracted','sold']); const k={reservedUnits:0,contractedUnits:0,soldUnits:0,availableUnits:0,availableValue:0,totalSalesValue:0,cancelledUnits:0,remainingDp:0};
 units.forEach(u=>{const s=norm(u.status);if(s==='available'){k.availableUnits++;k.availableValue+=n(u.price);}if(s==='reserved')k.reservedUnits++;if(s==='contracted')k.contractedUnits++;if(s==='sold')k.soldUnits++;if(['cancelled','canceled','cancel'].includes(s))k.cancelledUnits++;if(closed.has(s))k.totalSalesValue+=n(u.price);});
 const reportRows=units.map(shapeUnit); const statusMix=Object.entries(statusSummary(units)).map(([Status,Units])=>({Status,Units,Value:units.filter(u=>u.status===Status).reduce((s,u)=>s+n(u.price),0)}));
 const pm={};units.forEach(u=>{const p=u.project||'Unknown';pm[p]=pm[p]||{Project:p,Units:0,Value:0};pm[p].Units++;pm[p].Value+=n(u.price);});
 k.avgUnitPrice=(k.reservedUnits+k.contractedUnits+k.soldUnits)?k.totalSalesValue/(k.reservedUnits+k.contractedUnits+k.soldUnits):0;k.cancellationRate=units.length?k.cancelledUnits/units.length*100:0;
 return {kpis:k,reportRows,statusMix,projectPerformance:Object.values(pm),meta:{generatedAt:new Date().toISOString(),source:'Supabase'}};
}
async function profileFor(id){const {data}=await admin.from('profiles').select('*').eq('id',id).maybeSingle();return data||null;}
async function audit(user,action,module,details={}){try{await admin.from('audit_logs').insert({user_id:user?.id||null,action,module,details});}catch{}}

async function handle(action,payload){
 if(action==='getSystemInfo') return {backendBuild:'6.0.0',version:'6.0.0',platform:'Vercel + Supabase + Google Sheets API',googleSheets:sheetsEnabled(),actions:['login','refreshSession','logout','changeOwnPassword','getSystemInfo','recordUserActivity','getDashboardFilters','getDashboardData','getAchievementData','getClientFormBootstrap','getSales','getCompanies','getManagerDirector','saveClientRegistration','getClients','uploadClientContract','getClientDocuments','getDocumentCoverage','getUnitFloorPlan','uploadUnitFloorPlan','getUnitFloorPlanCoverage','getInventoryData','getInventoryProjects','getAvailableUnitsByProject','getAvailableLayanaUnits','refreshAvailableLayanaUnits','getEOIFormBootstrap','saveEOI','getEOIData','getLeadsData','bulkUpdateLeadStatus','importLeads','getUsersData','createSystemUser','getAuditHistory','operationAiChat']};
 if(action==='refreshSession') {
   const refreshToken=String(payload.refreshToken||''); if(!refreshToken) throw Object.assign(new Error('REFRESH_TOKEN_REQUIRED'),{status:401});
   const {data,error}=await publicClient.auth.refreshSession({refresh_token:refreshToken}); if(error||!data?.session) throw Object.assign(new Error('SESSION_EXPIRED'),{status:401});
   const profile=await profileFor(data.user.id); return {success:true,token:data.session.access_token,refreshToken:data.session.refresh_token,user:{id:data.user.id,email:data.user.email,name:profile?.full_name||profile?.username||data.user.email,username:profile?.username||'',role:profile?.role||'user'}};
 }
 if(action==='login'){
   const username=String(payload.username||'').trim();let email=username;
   if(!username.includes('@')){const {data}=await admin.from('profiles').select('email').ilike('username',username).maybeSingle();email=data?.email||'';}
   if(!email) return {success:false,message:'Invalid username or password'};
   const {data,error}=await publicClient.auth.signInWithPassword({email,password:String(payload.password||'')}); if(error||!data?.session)return{success:false,message:'Invalid username or password'};
   const profile=await profileFor(data.user.id); if(profile?.is_active===false)return{success:false,message:'User is disabled'};
   return {success:true,token:data.session.access_token,refreshToken:data.session.refresh_token,user:{id:data.user.id,email:data.user.email,name:profile?.full_name||profile?.username||data.user.email,username:profile?.username||'',role:profile?.role||'user'}};
 }
 const user=await requireUser(payload.token);
 const filters=payload.filters||{};
 switch(action){
   case 'logout': return {success:true};
   case 'changeOwnPassword': {const {error}=await admin.auth.admin.updateUserById(user.id,{password:String(payload.newPassword||'')});if(error)throw error;return{success:true,message:'Password updated'};}
   case 'recordUserActivity': await audit(user,payload.data?.action||'activity',payload.data?.module||'system',payload.data||{});return{success:true};
   case 'getInventoryData': return (await rows('inventory_units',filters)).map(shapeUnit);
   case 'getInventoryProjects': {const data=await rows('inventory_units',{});return uniq(data.map(x=>x.project)).sort();}
   case 'getAvailableUnitsByProject': return (await rows('inventory_units',{project:payload.project})).filter(x=>norm(x.status)==='available').map(shapeUnit);
   case 'getAvailableLayanaUnits': return (await rows('inventory_units',{project:'Layana'})).filter(x=>norm(x.status)==='available').map(shapeUnit);
   case 'refreshAvailableLayanaUnits': return {success:true,message:'Supabase inventory is live; no manual refresh is required.'};
   case 'getClients': return (await rows('clients',filters)).map(shapeClient);
   case 'getClientFormBootstrap': {const [u,c]=await Promise.all([rows('inventory_units',{}),rows('clients',{})]);return{sales:uniq(c.map(x=>x.sales_name)).sort(),lists:{projects:uniq(u.map(x=>x.project)).sort(),statuses:uniq(c.map(x=>x.status)).sort()}};}
   case 'getSales': return uniq((await rows('clients',{})).map(x=>x.sales_name)).sort();
   case 'getCompanies': return [];
   case 'getManagerDirector': return {manager:'',director:''};
   case 'saveClientRegistration': {const d=payload.data||{};const rec={project:d.project||d.Project||'',unit_code:d.unitCode||d['Unit Code']||'',client_name:d.clientName||d['Client Name English']||'',mobile1:d.clientPhone||d['Client Phone Number']||'',mobile2:d.clientPhone2||d['Client Phone Number 2']||'',address:d.address||d['Residence address']||'',email:d.email||d['E-mail']||'',status:d.status||d.Status||'',sales_name:d.salesName||d['Sales Name']||'',contract_date:d.contractDate||d['Contract Date']||null,reservation_date:d.reservationDate||d['Reservition Date']||null,sold_date:d.soldDate||d['Sold Date']||null,value:n(d.value||d.Value||d['Price After Discount']),raw_data:d,updated_at:new Date().toISOString()};const {data,error}=await admin.from('clients').upsert(rec,{onConflict:'project,unit_code'}).select('*').single();if(error)throw error;await audit(user,'save_client','crm',{unitCode:rec.unit_code});return shapeClient(data);}
   case 'uploadClientContract': return registerDocument(payload.data||{},user,'contract');
   case 'uploadUnitFloorPlan': return registerDocument(payload.data||{},user,'floor_plan');
   case 'getClientDocuments': {let q=admin.from('documents').select('*').order('created_at',{ascending:false});if(filters.project&&filters.project!=='ALL')q=q.eq('project',filters.project);if(filters.unitCode)q=q.eq('unit_code',filters.unitCode);if(filters.clientName)q=q.ilike('client_name',`%${filters.clientName}%`);const {data,error}=await q.limit(500);if(error)throw error;return signDocumentRows(data||[]);}
   case 'getUnitFloorPlan': {let q=admin.from('documents').select('*').eq('kind','floor_plan').order('created_at',{ascending:false}).limit(1);if(filters.project)q=q.eq('project',filters.project);if(filters.unitCode)q=q.eq('unit_code',filters.unitCode);const {data,error}=await q;if(error)throw error;return (await signDocumentRows(data||[]))[0]||null;}
   case 'getDocumentCoverage': {const [clients,docs]=await Promise.all([rows('clients',filters),rows('documents',filters)]);const sold=clients.filter(x=>['sold','contracted'].includes(norm(x.status)));const keys=new Set(docs.filter(x=>x.kind==='contract').map(x=>`${norm(x.project)}|${norm(x.unit_code)}`));const withDoc=sold.filter(x=>keys.has(`${norm(x.project)}|${norm(x.unit_code)}`)).length;return{required:sold.length,withScan:withDoc,withoutScan:Math.max(0,sold.length-withDoc),coverage:sold.length?withDoc/sold.length*100:0,totalDocuments:docs.length};}
   case 'getUnitFloorPlanCoverage': {const [units,docs]=await Promise.all([rows('inventory_units',filters),rows('documents',filters)]);const keys=new Set(docs.filter(x=>x.kind==='floor_plan').map(x=>`${norm(x.project)}|${norm(x.unit_code)}`));const withPlan=units.filter(x=>keys.has(`${norm(x.project)}|${norm(x.unit_code)}`)).length;return{totalUnits:units.length,withPlan,withoutPlan:Math.max(0,units.length-withPlan),coverage:units.length?withPlan/units.length*100:0};}
   case 'getDashboardFilters': {const u=await rows('inventory_units',{});return{projects:uniq(u.map(x=>x.project)).sort(),statuses:uniq(u.map(x=>x.status)).sort(),unitTypes:uniq(u.map(x=>x.unit_type)).sort()};}
   case 'getDashboardData': {const [u,c]=await Promise.all([rows('inventory_units',filters),rows('clients',filters)]);return dashboard(u,c);}
   case 'getAchievementData': {const u=await rows('inventory_units',filters);return{rows:u.filter(x=>['sold','contracted','reserved'].includes(norm(x.status))).map(shapeUnit)};}
   case 'getEOIData': {const r=await rows('eoi_records',filters);return{rows:r.map(x=>({...x.raw_data,id:x.id,project:x.project,clientName:x.client_name,unitCode:x.unit_code,status:x.status,date:x.eoi_date}))};}
   case 'getEOIFormBootstrap': {const u=await rows('inventory_units',{});return{projects:uniq(u.map(x=>x.project)).sort(),availableUnits:u.filter(x=>norm(x.status)==='available').map(shapeUnit)};}
   case 'saveEOI': {const d=payload.data||{};const rec={project:d.project||d.Project||'',unit_code:d.unitCode||d['Unit Code']||'',client_name:d.clientName||d['Client Name']||'',status:d.status||'Done',eoi_date:d.date||new Date().toISOString(),raw_data:d,updated_at:new Date().toISOString()};const {data,error}=await admin.from('eoi_records').insert(rec).select('*').single();if(error)throw error;return data;}
   case 'getLeadsData': {const r=await rows('leads',filters);return{rows:r.map(x=>({...x.raw_data,id:x.id,rowNumber:x.row_number,clientName:x.client_name,phone:x.phone,project:x.project,salesName:x.sales_name,status:x.status,stage:x.stage,source:x.source,lastComment:x.last_comment})),statuses:uniq(r.map(x=>x.status)).sort(),meta:{total:r.length}};}
   case 'bulkUpdateLeadStatus': {const nums=(payload.data?.rowNumbers||[]).map(Number);const {error}=await admin.from('leads').update({status:payload.data?.status,updated_at:new Date().toISOString()}).in('row_number',nums);if(error)throw error;return{updated:nums.length};}
   case 'importLeads': {const incoming=payload.data?.rows||[];const mapped=incoming.map((d,i)=>({row_number:Number(d.rowNumber||d['Row Number']||i+1),client_name:d.clientName||d['Client Name']||d.Name||'',phone:String(d.phone||d.Mobile||d.Phone||''),project:d.project||d.Project||'',sales_name:d.salesName||d['Sales Name']||'',status:d.status||d.Status||'Not Contacted',stage:d.stage||d.Stage||'New',source:d.source||d.Source||'',last_comment:d.lastComment||d['Last Comment']||'',raw_data:d,updated_at:new Date().toISOString()}));if(mapped.length){const{error}=await admin.from('leads').upsert(mapped,{onConflict:'row_number'});if(error)throw error;}return{imported:mapped.length,updated:0,skipped:0};}
   case 'getUsersData': {await requireAdmin(payload.token);const {data,error}=await admin.from('profiles').select('*').order('created_at',{ascending:false});if(error)throw error;return{users:data||[],summary:{total:data?.length||0,admins:(data||[]).filter(x=>x.role==='admin').length,active:(data||[]).filter(x=>x.is_active!==false).length}};}
   case 'createSystemUser': {await requireAdmin(payload.token);const d=payload.data||{};const email=String(d.email||'').trim();const password=String(d.password||'');if(!email||password.length<8)throw new Error('Email and a password of at least 8 characters are required.');const {data:created,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:d.name||d.fullName||d.username||email}});if(error)throw error;const profile={id:created.user.id,email,username:d.username||email.split('@')[0],full_name:d.name||d.fullName||d.username||email,role:String(d.role||'user').toLowerCase(),is_active:true};const{error:pErr}=await admin.from('profiles').upsert(profile);if(pErr)throw pErr;await audit(user,'create_user','users',{createdUser:profile.username});return profile;}
   case 'getAuditHistory': {await requireAdmin(payload.token);const {data,error}=await admin.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(1000);if(error)throw error;return data||[];}
   case 'operationAiChat': return operationAI(payload.data||{});
   default: throw Object.assign(new Error(`Unsupported action: ${action}`),{status:404});
 }
}

export default {
 async fetch(request){
   const origin=request.headers.get('origin')||'*';
   if(request.method==='OPTIONS') return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':process.env.ALLOWED_ORIGIN||origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Max-Age':'86400'}});
   try{
     const url=new URL(request.url);let payload={};
     if(request.method==='POST') payload=parseBody(await request.text()); else {for(const[k,v]of url.searchParams.entries()){try{payload[k]=JSON.parse(v)}catch{payload[k]=v}}}
     const action=payload.action||url.searchParams.get('action'); if(!action)return json(fail('action is required','BAD_REQUEST'),400,origin);
     const data=await handle(action,payload); return json(ok(data),200,origin);
   }catch(error){console.error(error);return json(fail(error.message||'Server error',error.code||'SERVER_ERROR'),error.status||500,origin);}
 }
};
