/**
 * ===========================================================
 * OPERATION SYSTEM BACKEND — EOI.gs
 * ===========================================================
 * كل ما يخص EOI (Expression of Interest): حفظ، قراءة، تحليلات.
 * ===========================================================
 */

function getEOIFormBootstrap() {
  return { sales: getSales(), lists: STATIC_LISTS };
}

function saveEOI(token, obj) {
  requireAuth_(token);
  validateEOI_(obj);

  const ss = SpreadsheetApp.openById(SPREADSHEETS.EOI);
  const sheet = ss.getSheetByName(SHEET_NAMES.eoiForm);
  if (!sheet) throw new Error('EOI Form sheet not found');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = new Array(headers.length).fill('');

  function set(h, v) {
    const idx = headers.findIndex(x => normalizeHeader_(x) === normalizeHeader_(h));
    if (idx !== -1) row[idx] = v !== undefined && v !== null ? v : '';
  }

  set('Date and Time', new Date());
  set('Client Name 1', obj.clientName1 || '');
  set('Client Name 2', obj.clientName2 || '');
  set('Client Phone', obj.clientPhone || '');
  set('Client Phone  2', obj.clientPhone2 || '');
  set('ID / Passport No', obj.idPassportNo || '');
  set('Client Email', obj.clientEmail || '');
  set('Local/Overseas', obj.localOverseas || '');
  set('Client Nationality', obj.clientNationality || '');
  set('Client Residence', obj.clientResidence || '');
  set('Project', obj.project || '');
  set('Housing', obj.housingTopic || '');
  set('Housing Topic', obj.housingTopic || '');
  set('Interest', obj.interest || '');
  set("Deposit EOI'S", obj.depositEOI || '');
  set("Deposit EOI'S 2", obj.depositEOI2 || '');
  set('Total Deposit', obj.totalDeposit || '');
  set('Payment Method', obj.paymentMethod || '');
  set('Sales Name', obj.salesName1 || '');
  set('Sales Name 2', obj.salesName2 || '');
  set('Sales Manager', obj.salesManager1 || '');
  set('Sales Director', obj.salesDirector1 || '');
  set('Source', obj.source || '');
  set('Source Breakdown', obj.sourceBreakdown || '');
  set('Broker Company', obj.brokerCompany || '');
  set('Broker Agent Name', obj.brokerAgentName || '');

  sheet.appendRow(row);
  return { success: true, message: 'EOI saved successfully.' };
}

function validateEOI_(o) {
  const missing = [];
  if (!o.clientName1) missing.push('Client Name 1');
  if (!o.clientPhone) missing.push('Client Phone');
  if (!o.salesName1) missing.push('Sales Name 1');
  if (!o.source) missing.push('Source');
  if (!o.interest) missing.push('Interest');
  if (missing.length) throw new Error('بيانات ناقصة: ' + missing.join(', '));
  if (o.clientPhone && !/^01\d{9}$/.test(o.clientPhone)) {
    throw new Error('رقم الهاتف يجب أن يبدأ بـ 01 ويتكون من 11 رقم');
  }
}

function parseAmountSafe_(x) {
  if (x === null || x === undefined || x === '') return 0;
  let s = String(x);
  s = s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  s = s.replace(/EGP|جنيه|,|\s/gi, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * كل صفوف الـ EOI الخام داخل مدى تاريخي اختياري.
 */
function getEOIRows_(fromDate, toDate) {
  const ss = SpreadsheetApp.openById(SPREADSHEETS.EOI);
  const sheet = ss.getSheetByName(SHEET_NAMES.eoiForm);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => clean_(h));
  const idx = name => headers.findIndex(h => normalizeHeader_(h) === normalizeHeader_(name));

  const dateCol = idx('Date and Time');
  const cn1Col = idx('Client Name 1');
  const cpCol = idx('Client Phone');
  const projectCol = idx('Project');
  const housingCol = idx('Housing') > -1 ? idx('Housing') : idx('Housing Topic');
  const interestCol = idx('Interest');
  const depositCol = idx("Deposit EOI'S");
  const deposit2Col = idx("Deposit EOI'S 2");
  const totalDepCol = idx('Total Deposit');
  const pmCol = idx('Payment Method');
  const sn1Col = idx('Sales Name');
  const sm1Col = idx('Sales Manager');
  const sd1Col = idx('Sales Director');
  const sourceCol = idx('Source');
  const natCol = idx('Client Nationality');

  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const d = date_(dateCol > -1 ? r[dateCol] : null);
    if (!d) continue;
    if (!matchDate_(d, fromDate, toDate)) continue;

    const deposit = depositCol > -1 ? parseAmountSafe_(r[depositCol]) : 0;
    const deposit2 = deposit2Col > -1 ? parseAmountSafe_(r[deposit2Col]) : 0;
    const totalDep = totalDepCol > -1 ? parseAmountSafe_(r[totalDepCol]) : (deposit + deposit2);

    rows.push({
      date: d,
      clientName: cn1Col > -1 ? clean_(r[cn1Col]) : '',
      clientPhone: cpCol > -1 ? clean_(r[cpCol]) : '',
      project: projectCol > -1 ? clean_(r[projectCol]) : '',
      housingTopic: housingCol > -1 ? clean_(r[housingCol]) : '',
      interest: interestCol > -1 ? clean_(r[interestCol]) : '',
      deposit: totalDep,
      paymentMethod: pmCol > -1 ? clean_(r[pmCol]) : '',
      salesName: sn1Col > -1 ? clean_(r[sn1Col]) : '',
      salesManager: sm1Col > -1 ? clean_(r[sm1Col]) : '',
      salesDirector: sd1Col > -1 ? clean_(r[sd1Col]) : '',
      source: sourceCol > -1 ? clean_(r[sourceCol]) : '',
      nationality: natCol > -1 ? clean_(r[natCol]) : ''
    });
  }
  return rows;
}

/**
 * بيانات EOI مفلترة حسب صلاحية اليوزر + تحليلات أساسية، لموديول EOI
 * في الفرونت إند.
 */
function getEOIData(token, filters) {
  const session = requireAuth_(token);
  filters = filters || {};

  const from = filters.fromDate ? new Date(filters.fromDate) : null;
  const to = filters.toDate ? new Date(filters.toDate) : null;

  let rows = getEOIRows_(from, to).filter(x => roleAllowed_(x, session));
  if (filters.project && filters.project !== 'ALL') rows = rows.filter(x => !x.project || norm_(x.project) === norm_(filters.project));

  const total = rows.length;
  const totalDeposit = sum_(rows, 'deposit');

  return {
    meta: {
      generatedAt: formatDateTime_(new Date()),
      total: total,
      totalDeposit: round_(totalDeposit)
    },
    bySales: groupCount_(rows, 'salesName', 'Sales'),
    byInterest: groupCount_(rows, 'interest', 'Interest'),
    bySource: groupCount_(rows, 'source', 'Source'),
    byNationality: groupCount_(rows, 'nationality', 'Nationality'),
    rows: rows.map(r => ({
      Date: formatDate_(r.date),
      ClientName: r.clientName,
      Phone: r.clientPhone,
      Project: r.project,
      Housing: r.housingTopic,
      Interest: r.interest,
      Deposit: round_(r.deposit),
      Payment: r.paymentMethod,
      Sales: r.salesName,
      Manager: r.salesManager,
      Director: r.salesDirector,
      Source: r.source
    }))
  };
}
