/** Leads management: list, import and bulk status updates. */

const LEAD_ALIASES_ = {
  id: ['Lead ID','ID','LeadId'],
  date: ['Date','Lead Date','Created Date','Creation Date','Date and Time','Timestamp'],
  name: ['Full Name','Client Name','Name'],
  phone: ['Client Phone Number','Client Phone','Phone','Mobile','Mobile Number'],
  phone2: ['Client Phone Number 2','Client Phone 2','Phone 2','Mobile 2'],
  address: ['Residence address','Residence Address','Client Address','Address','Full Address'],
  project: ['Project Name','Project'],
  sales: ['Assigned To','Sales Name','Sales'],
  manager: ['Sales Manager','Manager'],
  director: ['Sales Director','Director'],
  status: ['Lead Status','Status'],
  stage: ['Lead Stage','Stage'],
  source: ['Lead Source Information','Lead Source','Source'],
  campaign: ['Campaign Name','Campaign'],
  comment: ['Last Comment','Latest Comment','Comment','Comments']
};

function getLeadsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEETS.LEADS);
  const sh = ss.getSheetByName(SHEET_NAMES.leads);
  if (!sh) throw new Error('Leads sheet not found: ' + SHEET_NAMES.leads);
  return sh;
}

function readLeads_() {
  const sh = getLeadsSheet_();
  const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  const values = sh.getRange(1,1,lastRow,lastCol).getValues();
  const headers = values[0].map(normalizeHeader_);
  function idx(aliases){ for (let i=0;i<aliases.length;i++){ const n=normalizeHeader_(aliases[i]); const p=headers.indexOf(n); if(p>=0)return p; } return -1; }
  function val(r, aliases){ const i=idx(aliases); return i>=0 ? r[i] : ''; }
  return values.slice(1).map(function(r,i){
    return {
      rowNumber: i+2,
      leadId: clean_(val(r, LEAD_ALIASES_.id)) || ('LD-' + (i+2)),
      date: formatDate_(date_(val(r, LEAD_ALIASES_.date))),
      clientName: clean_(val(r, LEAD_ALIASES_.name)),
      clientPhone: clean_(val(r, LEAD_ALIASES_.phone)),
      clientPhone2: clean_(val(r, LEAD_ALIASES_.phone2)),
      clientAddress: clean_(val(r, LEAD_ALIASES_.address)),
      project: clean_(val(r, LEAD_ALIASES_.project)),
      salesName: clean_(val(r, LEAD_ALIASES_.sales)),
      manager: clean_(val(r, LEAD_ALIASES_.manager)),
      director: clean_(val(r, LEAD_ALIASES_.director)),
      status: clean_(val(r, LEAD_ALIASES_.status)),
      stage: clean_(val(r, LEAD_ALIASES_.stage)),
      source: clean_(val(r, LEAD_ALIASES_.source)),
      campaign: clean_(val(r, LEAD_ALIASES_.campaign)),
      lastComment: clean_(val(r, LEAD_ALIASES_.comment))
    };
  }).filter(function(x){ return x.clientName || x.clientPhone || x.project || x.salesName || x.status; });
}

function getLeadsData(token, filters) {
  const session = requireAuth_(token);
  filters = filters || {};
  let rows = readLeads_();
  const role = lower_(session.role);
  if (ROLES.DIRECTOR.some(function(x){return role.indexOf(x)!==-1;})) rows = rows.filter(function(x){ return norm_(x.director)===norm_(session.salesDirector||session.name) || norm_(x.salesName)===norm_(session.name); });
  else if (ROLES.MANAGER.some(function(x){return role.indexOf(x)!==-1;})) rows = rows.filter(function(x){ return norm_(x.manager)===norm_(session.salesManager||session.name) || norm_(x.salesName)===norm_(session.name); });
  else if (!ROLES.ADMIN.includes(role)) rows = rows.filter(function(x){ return norm_(x.salesName)===norm_(session.name); });
  if (filters.search) { const q=norm_(filters.search); rows=rows.filter(function(x){ return [x.leadId,x.clientName,x.clientPhone,x.clientPhone2,x.clientAddress,x.project,x.salesName,x.status,x.stage,x.source].map(norm_).join(' ').indexOf(q)!==-1; }); }
  if (filters.status) rows=rows.filter(function(x){return norm_(x.status)===norm_(filters.status);});
  if (filters.project) rows=rows.filter(function(x){return norm_(x.project)===norm_(filters.project);});
  return rows;
}

function ensureLeadColumns_(sh) {
  const required=['Date','Full Name','Client Phone Number','Client Phone Number 2','Residence address','Project Name','Assigned To','Sales Manager','Sales Director','Lead Status','Lead Stage','Lead Source Information','Campaign Name','Last Comment'];
  let headers=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(clean_);
  const normalized=headers.map(normalizeHeader_);
  required.forEach(function(h){ if(normalized.indexOf(normalizeHeader_(h))===-1){ headers.push(h); normalized.push(normalizeHeader_(h)); sh.getRange(1,headers.length).setValue(h); } });
  return headers;
}

function importLeadsBulk(token, rows, duplicateMode) {
  requireAuth_(token);
  if (!Array.isArray(rows) || !rows.length) throw new Error('No lead rows supplied.');
  if (rows.length > 3000) throw new Error('Maximum 3000 rows per import.');
  const sh=getLeadsSheet_();
  const headers=ensureLeadColumns_(sh), normalized=headers.map(normalizeHeader_);
  const existing=readLeads_();
  const phoneMap={}; existing.forEach(function(x){ if(x.clientPhone) phoneMap[norm_(x.clientPhone)]=x.rowNumber; });
  let added=0, updated=0, skipped=0; const errors=[];
  function pick(obj,names){ for(let i=0;i<names.length;i++){ for(const k in obj){ if(normalizeHeader_(k)===normalizeHeader_(names[i])) return obj[k]; } } return ''; }
  function set(arr,h,v){ const i=normalized.indexOf(normalizeHeader_(h)); if(i>=0)arr[i]=v; }
  rows.forEach(function(obj,index){
    try {
      const name=clean_(pick(obj,LEAD_ALIASES_.name)); const phone=clean_(pick(obj,LEAD_ALIASES_.phone));
      if(!name && !phone){ skipped++; errors.push({row:index+2,message:'Missing name and phone'}); return; }
      const data=new Array(headers.length).fill('');
      set(data,'Date',date_(pick(obj,LEAD_ALIASES_.date))||new Date()); set(data,'Full Name',name);
      set(data,'Client Phone Number',phone); set(data,'Client Phone Number 2',clean_(pick(obj,LEAD_ALIASES_.phone2)));
      set(data,'Residence address',clean_(pick(obj,LEAD_ALIASES_.address))); set(data,'Project Name',clean_(pick(obj,LEAD_ALIASES_.project)));
      set(data,'Assigned To',clean_(pick(obj,LEAD_ALIASES_.sales))); set(data,'Sales Manager',clean_(pick(obj,LEAD_ALIASES_.manager)));
      set(data,'Sales Director',clean_(pick(obj,LEAD_ALIASES_.director))); set(data,'Lead Status',clean_(pick(obj,LEAD_ALIASES_.status))||'Not Contacted');
      set(data,'Lead Stage',clean_(pick(obj,LEAD_ALIASES_.stage))); set(data,'Lead Source Information',clean_(pick(obj,LEAD_ALIASES_.source)));
      set(data,'Campaign Name',clean_(pick(obj,LEAD_ALIASES_.campaign))); set(data,'Last Comment',clean_(pick(obj,LEAD_ALIASES_.comment)));
      const existingRow=phone ? phoneMap[norm_(phone)] : null;
      if(existingRow && duplicateMode==='update'){ sh.getRange(existingRow,1,1,data.length).setValues([data]); updated++; }
      else if(existingRow && duplicateMode!=='new'){ skipped++; }
      else { sh.appendRow(data); added++; }
    } catch(e){ skipped++; errors.push({row:index+2,message:e.message}); }
  });
  return {success:true,added:added,updated:updated,skipped:skipped,errors:errors.slice(0,100)};
}

function bulkUpdateLeadStatus(token, rowNumbers, status) {
  requireAuth_(token);
  if (!Array.isArray(rowNumbers) || !rowNumbers.length) throw new Error('Select at least one lead.');
  status=clean_(status); if(!status) throw new Error('Select a new status.');
  const sh=getLeadsSheet_(); const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(normalizeHeader_);
  let statusCol=-1; LEAD_ALIASES_.status.some(function(a){ const i=headers.indexOf(normalizeHeader_(a)); if(i>=0){statusCol=i+1;return true;} return false; });
  if(statusCol<0){ statusCol=sh.getLastColumn()+1; sh.getRange(1,statusCol).setValue('Lead Status'); }
  rowNumbers.map(Number).filter(function(n){return n>=2;}).forEach(function(r){ sh.getRange(r,statusCol).setValue(status); });
  return {success:true,updated:rowNumbers.length,status:status};
}
