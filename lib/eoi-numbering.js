import {google} from 'googleapis';
import {dbPool} from './schema.js';
import {nextEOINumber, parseEOINumber, normalizeRequestId} from './eoi-number-utils.js';
const ID=process.env.GOOGLE_EOI_SPREADSHEET_ID||process.env.GOOGLE_EOI_SHEETS||process.env.GOOGLE_EOI_SHEET||'1k0N-63K7tpinWHmODki7eLKXnH8k9wWetBUgKPgLOwg';
<<<<<<< HEAD
const TAB=process.env.GOOGLE_EOI_TAB_NAME||'EOIS MERSEA';
const aliases=['EOIS MERSEA','EOIS MERSEA Form','EOI Data',"EOI's",'EOI'];
=======
const TAB=process.env.GOOGLE_EOI_TAB_NAME||"EOI'S";
const aliases=["EOI'S",'EOIS MERSEA Form','EOI Data',"EOI's",'EOI'];
>>>>>>> 59ceaeaa254018bd3f46753cad2329b65710ed6e
const normalized=v=>String(v??'').trim().toLowerCase().replace(/[_\s-]+/g,' ');
const quoted=t=>`'${t.replace(/'/g,"''")}'`;
function sheets(){
  if(!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||!process.env.GOOGLE_PRIVATE_KEY)throw new Error('EOI Google Sheet credentials are missing');
  const auth=new google.auth.JWT({email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key:process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'),scopes:['https://www.googleapis.com/auth/spreadsheets']});
  return google.sheets({version:'v4',auth});
}
async function sheetState(s){
  const meta=await s.spreadsheets.get({spreadsheetId:ID,fields:'sheets.properties.title'});
  const names=(meta.data.sheets||[]).map(x=>x.properties.title);
  const tab=[TAB,...aliases].find(x=>names.includes(x));
  if(!tab)throw new Error('EOI tab not found in configured spreadsheet');
  const res=await s.spreadsheets.values.get({spreadsheetId:ID,range:`${quoted(tab)}!A:DZ`,valueRenderOption:'FORMATTED_VALUE'});
  const rows=res.data.values||[],header=rows[0]||[];
  const index=header.findIndex(x=>['eoi number','eoi no','eoi #'].includes(normalized(x)));
  if(index<0)throw new Error('EOI Number column is missing in EOI sheet');
  const requestIndex=header.findIndex(x=>['eoi request id','request id'].includes(normalized(x)));
  if(requestIndex<0)throw new Error('EOI Request ID column is missing. Add this new column to the existing EOI sheet before enabling safe retries. Existing rows must not be changed.');
  return {tab,header,index,requestIndex,rows};
}
export async function eoiNumberingSettings(){
  const p=dbPool();if(!p)throw new Error('Postgres connection required for safe EOI numbering');
  await p.query('create table if not exists public.eoi_numbering_settings (id integer primary key default 1 check(id=1), increment integer not null default 1 check(increment between 1 and 1000), last_number bigint not null default 0)');
  await p.query('insert into public.eoi_numbering_settings(id) values(1) on conflict do nothing');
  const r=await p.query('select increment,last_number from public.eoi_numbering_settings where id=1');return r.rows[0];
}
export async function updateEOIIncrement(value){
  const increment=Number(value);if(!Number.isInteger(increment)||increment<1||increment>1000)throw new Error('Increment must be an integer from 1 to 1000');
  await eoiNumberingSettings();const r=await dbPool().query('update public.eoi_numbering_settings set increment=$1 where id=1 returning increment,last_number',[increment]);return r.rows[0];
}
function record(d,number,requestId){
  const data={...d,eoiNumber:number,'EOI Number':number,eoiRequestId:requestId};
  return {project:d.project||d.Project||'',unit_code:d.unitCode||d['Unit Code']||'',client_name:d.clientName1||d.clientName||d['Client Name']||'',status:d.status||'Done',eoi_date:d.date||new Date().toISOString(),raw_data:data,updated_at:new Date().toISOString()};
}
function sheetRow(state,rec,d,number,requestId){
  return state.header.map(h=>{const k=normalized(h);
    if(['eoi number','eoi no','eoi #'].includes(k))return String(number);
    if(['eoi request id','request id'].includes(k))return requestId;
    if(['client full name','client name'].includes(k))return rec.client_name;
    if(['project','project name'].includes(k))return rec.project;
    if(['unit code','unitcode'].includes(k))return rec.unit_code;
    if(['eoi date','date'].includes(k))return rec.eoi_date;
    if(['status','operation status'].includes(k))return rec.status;
    if(['client phone','client phone number'].includes(k))return d.clientPhone||'';
    if(['sales agent 1','sales name','sales agent'].includes(k))return d.salesName1||'';
    if(['source','channel'].includes(k))return d.source||'';
    if(['total paid amount','deposit'].includes(k))return d.depositEOI||'';
    if(k==='payment method')return d.paymentMethod||'';
    return d[h]??'';
  });
}
export async function saveNumberedEOI(d){
  const requestId=normalizeRequestId(d.eoiRequestId);
  await eoiNumberingSettings();const p=dbPool(),c=await p.connect();let sheetWriteAttempted=false;
  try{
    await c.query('begin');await c.query('select pg_advisory_xact_lock(47110091)');
    const existing=await c.query("select * from public.eoi_records where raw_data->>'eoiRequestId'=$1 limit 1",[requestId]);
    if(existing.rows.length){await c.query('commit');return existing.rows[0];}
    const settings=(await c.query('select increment,last_number from public.eoi_numbering_settings where id=1 for update')).rows[0];
    const s=sheets(),state=await sheetState(s);
    const matching=state.rows.slice(1).filter(r=>String(r[state.requestIndex]||'')===requestId);
    if(matching.length>1)throw new Error('Duplicate EOI submission ID detected in Google Sheet; manual reconciliation required');
    const dbMax=(await c.query("select coalesce(max((raw_data->>'eoiNumber')::bigint),0) as n from public.eoi_records where raw_data->>'eoiNumber' ~ '^[0-9]+$'")).rows[0].n;
    let number;
    if(matching.length){
      number=parseEOINumber(matching[0][state.index]);
      if(!number)throw new Error('Existing EOI submission has an invalid number; manual reconciliation required');
      const used=await c.query("select id from public.eoi_records where raw_data->>'eoiNumber'=$1 limit 1",[String(number)]);
      if(used.rows.length)throw new Error('EOI number belongs to a different submission; manual reconciliation required');
    }else{
      number=nextEOINumber(state.rows.slice(1).map(r=>r[state.index]),dbMax,settings.last_number,Number(settings.increment));
    }
    const rec=record(d,number,requestId);
    const inserted=await c.query('insert into public.eoi_records(project,unit_code,client_name,status,eoi_date,raw_data,updated_at) values($1,$2,$3,$4,$5,$6,$7) returning *',[rec.project,rec.unit_code,rec.client_name,rec.status,rec.eoi_date,rec.raw_data,rec.updated_at]);
    if(!matching.length){
      sheetWriteAttempted=true;
      await s.spreadsheets.values.append({spreadsheetId:ID,range:`${quoted(state.tab)}!A:DZ`,valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[sheetRow(state,rec,d,number,requestId)]}});
    }
    await c.query('update public.eoi_numbering_settings set last_number=greatest(last_number,$1) where id=1',[number]);
    await c.query('commit');return inserted.rows[0];
  }catch(e){
    await c.query('rollback').catch(()=>{});
    if(sheetWriteAttempted){
      // A timeout can occur after Google accepts the append. The same request ID
      // must be reused for safe retry; do not generate another ID on failure.
      e.message=`${e.message}. Save may have reached Google Sheets; retry with the SAME EOI submission ID, or reconcile before creating a new EOI.`;
    }
    throw e;
  }finally{c.release();}
}
