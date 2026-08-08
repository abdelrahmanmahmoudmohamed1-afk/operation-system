function getLeadsData(token, filters) {
  requireAuth_(token); filters = filters || {};
  const ss = SpreadsheetApp.openById(SPREADSHEETS.LEADS);
  const sh = ss.getSheetByName(SHEET_NAMES.leads);
  if (!sh || sh.getLastRow() < 2) return { rows: [], statuses: [] };
  const range = sh.getDataRange(), raw = range.getValues(), disp = range.getDisplayValues();
  const headers = raw[0].map(normalizeHeader_);
  const idxAny = function(names){ for (let i=0;i<names.length;i++){ const x=headers.indexOf(normalizeHeader_(names[i])); if(x>-1)return x;} return -1; };
  const cols = {
    id: idxAny(['Lead ID','ID']), name: idxAny(['Full Name','Client Name','Name']), phone: idxAny(['Client Phone','Phone','Mobile','Client Phone Number']),
    project: idxAny(['Project Name','Project']), sales: idxAny(['Assigned To','Sales Name','Sales']), status: idxAny(['Lead Status','Status']),
    stage: idxAny(['Lead Stage','Stage']), comment: idxAny(['Last Comment','Latest Comment','Comment']), date: idxAny(['Date','Lead Date','Created Date'])
  };
  let rows = raw.slice(1).map(function(r,i){ const d=disp[i+1]||r; return {
    rowNumber:i+2, id: cols.id>-1?clean_(d[cols.id]):('LD-'+(i+2)), clientName:cols.name>-1?clean_(d[cols.name]):'',
    phone:cols.phone>-1?normalizePhone_(d[cols.phone]):'', project:cols.project>-1?clean_(d[cols.project]):'', salesName:cols.sales>-1?clean_(d[cols.sales]):'',
    status:cols.status>-1?clean_(d[cols.status]):'', stage:cols.stage>-1?clean_(d[cols.stage]):'', lastComment:cols.comment>-1?clean_(d[cols.comment]):'',
    date:cols.date>-1?clean_(d[cols.date]):''
  };}).filter(x=>x.clientName||x.phone||x.salesName||x.status);
  if(filters.project&&filters.project!=='ALL')rows=rows.filter(x=>norm_(x.project)===norm_(filters.project));
  if(filters.status&&filters.status!=='ALL')rows=rows.filter(x=>norm_(x.status)===norm_(filters.status));
  if(filters.search){const q=norm_(filters.search);rows=rows.filter(x=>norm_([x.clientName,x.phone,x.project,x.salesName,x.status,x.stage,x.lastComment].join(' ')).indexOf(q)>-1);}
  return {rows:rows,statuses:all_(rows.map(x=>x.status))};
}

function bulkUpdateLeadStatus(token, data) {
  const session=requireAuth_(token); data=data||{}; const ids=(data.ids||[]).map(clean_); const status=clean_(data.status);
  if(!ids.length||!status)throw new Error('Select leads and status.');
  const ss=SpreadsheetApp.openById(SPREADSHEETS.LEADS), sh=ss.getSheetByName(SHEET_NAMES.leads); if(!sh)throw new Error('Feedback Leads sheet not found.');
  const range=sh.getDataRange(), vals=range.getValues(), headers=vals[0].map(normalizeHeader_);
  const idCol=Math.max(headers.indexOf(normalizeHeader_('Lead ID')),headers.indexOf(normalizeHeader_('ID')));
  let statusCol=headers.indexOf(normalizeHeader_('Lead Status')); if(statusCol<0)statusCol=headers.indexOf(normalizeHeader_('Status')); if(statusCol<0)throw new Error('Lead Status column not found.');
  let updated=0; for(let i=1;i<vals.length;i++){const id=idCol>-1?clean_(vals[i][idCol]):('LD-'+(i+1));if(ids.indexOf(id)>-1){sh.getRange(i+1,statusCol+1).setValue(status);updated++;}}
  return {updated:updated,status:status,by:session.name||session.user||''};
}

function importLeads(token, data) {
  requireAuth_(token); data=data||{}; const rows=data.rows||[], mode=clean_(data.mode)||'skip'; if(!rows.length)throw new Error('No rows to import.');
  const ss=SpreadsheetApp.openById(SPREADSHEETS.LEADS), sh=ss.getSheetByName(SHEET_NAMES.leads); if(!sh)throw new Error('Feedback Leads sheet not found.');
  const headerRaw=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0], headers=headerRaw.map(normalizeHeader_);
  const phoneCol=(function(){for(const n of ['Client Phone','Phone','Mobile','Client Phone Number']){const i=headers.indexOf(normalizeHeader_(n));if(i>-1)return i;}return -1;})();
  const existing={}; if(phoneCol>-1&&sh.getLastRow()>1){sh.getRange(2,phoneCol+1,sh.getLastRow()-1,1).getDisplayValues().forEach((r,i)=>{const p=normalizePhone_(r[0]);if(p)existing[p]=i+2;});}
  let added=0,updated=0,skipped=0;
  rows.forEach(function(obj){ const normalized={}; Object.keys(obj||{}).forEach(k=>normalized[normalizeHeader_(k)]=obj[k]); const out=new Array(headers.length).fill(''); headers.forEach((h,i)=>{ if(normalized[h]!==undefined)out[i]=normalized[h]; });
    let phone=''; for(const n of ['Client Phone','Phone','Mobile','Client Phone Number']){const v=normalized[normalizeHeader_(n)];if(v){phone=normalizePhone_(v);break;}}
    const rowNo=phone&&existing[phone]; if(rowNo&&mode==='skip'){skipped++;return;} if(rowNo&&mode==='update'){sh.getRange(rowNo,1,1,out.length).setValues([out]);updated++;return;} sh.appendRow(out);added++; if(phone)existing[phone]=sh.getLastRow(); });
  return {added:added,updated:updated,skipped:skipped};
}
