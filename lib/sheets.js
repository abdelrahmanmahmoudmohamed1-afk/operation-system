import { google } from 'googleapis';

const SOURCES = {
  inventory: [
    { project:'Layana', id:process.env.GOOGLE_LAYANA_SPREADSHEET_ID || '1Dfz8g9zijDKTqEEn_t2gx3x2PvIVZ5BPDhCv_01QsCE', sheet:'Layana Inventory Management', headerRow:2 },
    { project:'Mersea', id:process.env.GOOGLE_MERSEA_SPREADSHEET_ID || '1-QId0GNeIfn_jB1XdGBFbgvn9LsNFVi4d1nh_oV_ek4', sheet:'Mersea Inventory Management', headerRow:2 }
  ],
  clients: [
    { project:'Layana', id:process.env.GOOGLE_LAYANA_SPREADSHEET_ID || '1Dfz8g9zijDKTqEEn_t2gx3x2PvIVZ5BPDhCv_01QsCE', sheet:'Layana Transaction', headerRow:2 },
    { project:'Mersea', id:process.env.GOOGLE_MERSEA_SPREADSHEET_ID || '1-QId0GNeIfn_jB1XdGBFbgvn9LsNFVi4d1nh_oV_ek4', sheet:'Mersea Transaction', headerRow:2 }
  ],
  eoi: [{ project:'Mersea', id:process.env.GOOGLE_EOI_SPREADSHEET_ID || '1pbU2xflJX1s9Ts__o3MhIslJDGOc9GoNf_vPX6fQwJg', sheet:'EOIS MERSEA', headerRow:1 }],
  leads: [{ project:'', id:process.env.GOOGLE_LEADS_SPREADSHEET_ID || '1SzaCVURxxKxGcBLVtlYtH6M4u-npDfjIV1Q7BXO63ec', sheet:'Feedback Leads', headerRow:1 }]
};
const pick=(r,keys,fb='')=>{for(const k of keys){if(r[k]!==undefined&&r[k]!==null&&String(r[k]).trim()!=='')return r[k];}return fb;};
const num=v=>{const x=Number(String(v??'').replace(/,/g,'').replace(/[^0-9.-]/g,''));return Number.isFinite(x)?x:0;};
let cachedClient=null;
const sourceCache=new Map();
const CACHE_TTL=Math.max(15000,Number(process.env.GOOGLE_SHEETS_CACHE_TTL_MS||120000));
const pendingReads=new Map();
function enabled(){return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);}
function client(){
  if(cachedClient)return cachedClient;
  const key=String(process.env.GOOGLE_PRIVATE_KEY||'').replace(/\\n/g,'\n');
  const auth=new google.auth.JWT({email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key,scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
  cachedClient=google.sheets({version:'v4',auth}); return cachedClient;
}
function a1Name(name){return `'${String(name).replace(/'/g,"''")}'!A:DZ`;}
function headerHas(headers,aliases){const set=new Set(headers.map(x=>String(x||'').trim().toLowerCase()));return aliases.some(x=>set.has(String(x).toLowerCase()));}
function validateHeaders(kind,src,headers){
  const rules={
    inventory:[['Unit Code','UnitCode','Unit No','Unit Number'],['Status','Unit Status']],
    clients:[['Unit Code','UnitCode','Unit No','Unit Number'],['Client Name English','Client Name Arabic','Client Name']],
    eoi:[['Client Full Name','Client Name','Client Name English','Client Name Arabic']],
    leads:[['Client Name','Full Name','Name'],['Lead Status','Status']]
  };
  const missing=(rules[kind]||[]).filter(group=>!headerHas(headers,group));
  if(missing.length){const expected=missing.map(x=>x.join(' / ')).join(', ');throw new Error(`${src.sheet}: header row ${src.headerRow||1} is not valid for ${kind}. Missing ${expected}.`);}
}
async function readSource(src,kind){
  const cacheKey=`${src.id}|${src.sheet}|${kind}`;
  const cached=sourceCache.get(cacheKey);
  if(cached && Date.now()-cached.at<CACHE_TTL) return cached.rows;
  if(pendingReads.has(cacheKey)) return pendingReads.get(cacheKey);
  const job=(async()=>{
    const res=await client().spreadsheets.values.get({spreadsheetId:src.id,range:a1Name(src.sheet),majorDimension:'ROWS',valueRenderOption:'FORMATTED_VALUE'},{timeout:10000});
    const values=res.data.values||[]; const hi=Math.max(0,(src.headerRow||1)-1); const headers=(values[hi]||[]).map(x=>String(x||'').trim());
    if(!headers.some(Boolean))throw new Error(`${src.sheet}: header row ${src.headerRow||1} is empty.`);
    validateHeaders(kind,src,headers);
    const rows=values.slice(hi+1).filter(row=>row.some(v=>String(v??'').trim()!=='' )).map((row,i)=>{const o={};headers.forEach((h,j)=>{if(h)o[h]=row[j]??'';});o.__rowNumber=hi+i+2;return o;});
    sourceCache.set(cacheKey,{at:Date.now(),rows});
    return rows;
  })().finally(()=>pendingReads.delete(cacheKey));
  pendingReads.set(cacheKey,job);
  return job;
}
async function readMany(kind){if(!enabled())return null;const groups=await Promise.all(SOURCES[kind].map(async src=>({src,rows:await readSource(src,kind)})));return groups.flatMap(({src,rows})=>rows.map(r=>({src,r})));}
export async function sheetInventory(){const all=await readMany('inventory');if(all===null)return null;return all.map(({src,r},i)=>({id:`sheet-${src.project}-${i}`,project:String(pick(r,['Project','Project Name'],src.project)||src.project),unit_code:String(pick(r,['Unit Code','UnitCode','Unit No','Unit Number'])),status:String(pick(r,['Status','Unit Status'])),building:String(pick(r,['Building'])),floor:String(pick(r,['Floor'])),unit_type:String(pick(r,['Unit Type','UnitType','Type'])),area:num(pick(r,['In Door Area','Indoor Area','Total Area','Area'])),price:num(pick(r,['Price After Discount','System Price','Sold Price','Price','Total Price','Unit Price'])),raw_data:r,updated_at:new Date().toISOString()})).filter(x=>x.unit_code);}
export async function sheetClients(){const all=await readMany('clients');if(all===null)return null;return all.map(({src,r},i)=>({id:`sheet-client-${src.project}-${i}`,project:String(pick(r,['Project','Project Name'],src.project)||src.project),unit_code:String(pick(r,['Unit Code','UnitCode','Unit No','Unit Number'])),client_name:String(pick(r,['Client Name English','Client Name Arabic','Client Name'])),mobile1:String(pick(r,['Client Phone Number','Client Phone','Phone','Mobile'])),mobile2:String(pick(r,['Client Phone Number 2','Client Phone 2','Mobile 2'])),address:String(pick(r,['Residence address','Residence Address','Client Address','Address'])),email:String(pick(r,['E-mail','Email','Client Email'])),status:String(pick(r,['Status','Unit Status','Contract Status'])),sales_name:String(pick(r,['Sales Name','Sales','Sales Agent'])),contract_date:pick(r,['Contract Date','Actual Contract Date'])||null,reservation_date:pick(r,['Reservition Date','Reservation Date'])||null,sold_date:pick(r,['Sold Date','Sale Date'])||null,value:num(pick(r,['Price After Discount','System Price','Sold Price','Value'])),raw_data:r,updated_at:new Date().toISOString()})).filter(x=>x.unit_code||x.client_name);}
export async function sheetEOI(){const all=await readMany('eoi');if(all===null)return null;return all.map(({src,r},i)=>({id:`sheet-eoi-${i}`,project:String(pick(r,['Project','Project Name'],src.project)||src.project),unit_code:String(pick(r,['Unit Code','UnitCode'])),client_name:String(pick(r,['Client Full Name','Client Name','Client Name English','Client Name Arabic'])),status:String(pick(r,['Status'],'')),eoi_date:pick(r,['EOI Date','Date and Time','Date'])||null,raw_data:r,updated_at:new Date().toISOString()}));}
export async function sheetLeads(){const all=await readMany('leads');if(all===null)return null;return all.map(({r},i)=>({id:`sheet-lead-${i}`,row_number:Number(r.__rowNumber||i+2),client_name:String(pick(r,['Client Name','Full Name','Name'])),phone:String(pick(r,['Client Phone Number','Client Phone','Mobile','Phone'])),project:String(pick(r,['Project','Project Name'])),sales_name:String(pick(r,['Sales Name','Assigned To','Sales'])),status:String(pick(r,['Lead Status','Status'],'Not Contacted')),stage:String(pick(r,['Lead Stage','Stage'],'New')),source:String(pick(r,['Lead Source','Source','Campaign Name'])),last_comment:String(pick(r,['Last Comment','Comment','Comments'])),raw_data:r,updated_at:new Date().toISOString()}));}
export function sheetsEnabled(){return enabled();}
