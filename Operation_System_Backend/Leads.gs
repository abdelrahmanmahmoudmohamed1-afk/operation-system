/** Operation System — Leads API. */
function getLeadsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEETS.LEADS);
  const sh = ss.getSheetByName(SHEET_NAMES.leads);
  if (!sh) throw new Error('Leads sheet not found: ' + SHEET_NAMES.leads);
  return sh;
}

function leadsHeaderInfo_() {
  const sh = getLeadsSheet_();
  const lastCol = sh.getLastColumn();
  const headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0] : [];
  const normalized = headers.map(normalizeHeader_);
  function idx(aliases) {
    aliases = Array.isArray(aliases) ? aliases : [aliases];
    for (let i = 0; i < aliases.length; i++) {
      const p = normalized.indexOf(normalizeHeader_(aliases[i]));
      if (p >= 0) return p;
    }
    return -1;
  }
  return { sh: sh, headers: headers, idx: idx };
}

function getLeadsData(token, filters) {
  const session = requireAuth_(token);
  filters = filters || {};
  const info = leadsHeaderInfo_();
  const sh = info.sh;
  if (sh.getLastRow() < 2) return { meta: { total: 0 }, rows: [], statuses: [], projects: [] };
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getDisplayValues();
  const iName = info.idx(['Full Name','Client Name','Name']);
  const iPhone = info.idx(['Client Phone','Phone','Mobile','Client Phone Number']);
  const iProject = info.idx(['Project Name','Project']);
  const iSales = info.idx(['Assigned To','Sales Name','Sales']);
  const iStatus = info.idx(['Lead Status','Status']);
  const iStage = info.idx(['Lead Stage','Stage']);
  const iSource = info.idx(['Lead Source Information','Lead Source','Source']);
  const iComment = info.idx(['Last Comment','Latest Comment','Comment','Comments']);
  const iDate = info.idx(['Date','Lead Date','Created Date','Creation Date','Timestamp']);
  const rows = [];
  values.forEach(function(r, index) {
    const row = {
      rowNumber: index + 2,
      clientName: iName >= 0 ? clean_(r[iName]) : '',
      phone: iPhone >= 0 ? clean_(r[iPhone]) : '',
      project: iProject >= 0 ? clean_(r[iProject]) : '',
      salesName: iSales >= 0 ? clean_(r[iSales]) : '',
      status: iStatus >= 0 ? clean_(r[iStatus]) : '',
      stage: iStage >= 0 ? clean_(r[iStage]) : '',
      source: iSource >= 0 ? clean_(r[iSource]) : '',
      lastComment: iComment >= 0 ? clean_(r[iComment]) : '',
      date: iDate >= 0 ? clean_(r[iDate]) : ''
    };
    if (!roleAllowed_(row, session)) return;
    if (filters.project && filters.project !== 'ALL' && norm_(row.project) !== norm_(filters.project)) return;
    if (filters.status && filters.status !== 'ALL' && norm_(row.status) !== norm_(filters.status)) return;
    if (filters.search) {
      const q = norm_(filters.search);
      if ([row.clientName,row.phone,row.project,row.salesName,row.status,row.stage,row.source,row.lastComment].every(function(v){return norm_(v).indexOf(q) === -1;})) return;
    }
    if (row.clientName || row.phone || row.salesName || row.status || row.project) rows.push(row);
  });
  return {
    meta: { total: rows.length },
    rows: rows,
    statuses: all_(rows.map(function(x){return x.status;})),
    projects: all_(rows.map(function(x){return x.project;}))
  };
}

function bulkUpdateLeadStatus(token, data) {
  const session = requireAuth_(token);
  data = data || {};
  const rowNumbers = (data.rowNumbers || []).map(Number).filter(function(n){return n >= 2;});
  const status = clean_(data.status);
  if (!rowNumbers.length || !status) throw new Error('Select at least one lead and a status.');
  const info = leadsHeaderInfo_();
  const statusIdx = info.idx(['Lead Status','Status']);
  if (statusIdx < 0) throw new Error('Lead Status column not found.');
  rowNumbers.forEach(function(rowNo) { info.sh.getRange(rowNo, statusIdx + 1).setValue(status); });
  try { recordApiAudit_('bulkUpdateLeadStatus', { token: token, data: { count: rowNumbers.length, status: status } }, true, '', 0, new Date()); } catch (_) {}
  return { success: true, updated: rowNumbers.length, status: status };
}

function importLeads(token, data) {
  const session = requireAuth_(token);
  if (!isSystemAdmin_(session)) throw new Error('FORBIDDEN');
  data = data || {};
  const rows = Array.isArray(data.rows) ? data.rows : [];
  if (!rows.length) throw new Error('No rows to import.');
  const info = leadsHeaderInfo_();
  const headerLookup = {};
  info.headers.forEach(function(h, i){ headerLookup[normalizeHeader_(h)] = i; });
  const output = [];
  rows.forEach(function(obj) {
    const row = new Array(info.headers.length).fill('');
    Object.keys(obj || {}).forEach(function(k) {
      const idx = headerLookup[normalizeHeader_(k)];
      if (idx !== undefined) row[idx] = obj[k];
    });
    output.push(row);
  });
  if (output.length) info.sh.getRange(info.sh.getLastRow() + 1, 1, output.length, info.headers.length).setValues(output);
  return { success: true, imported: output.length };
}
