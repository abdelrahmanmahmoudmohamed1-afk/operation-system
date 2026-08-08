/**
 * ===========================================================
 * OPERATION SYSTEM BACKEND — Client.gs
 * ===========================================================
 * كل ما يخص موديول CRM: قائمة السيلز، الشركات المرتبطة بكل
 * سيلز، المدير والديركتور بتوعه، تسجيل عميل جديد، وقراءة كل
 * العملاء مفلترة حسب صلاحية اليوزر.
 * ===========================================================
 */

// ================= Sales Team =================

function getSales() {
  const ss = SpreadsheetApp.openById(SPREADSHEETS.SETTINGS);
  const sh = ss.getSheetByName(SHEET_NAMES.salesData);
  if (!sh) return [];

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const data = sh.getRange('B2:B' + lastRow).getValues().flat().filter(String);
  return [...new Set(data)];
}

function getManagerDirector(salesName) {
  const ss = SpreadsheetApp.openById(SPREADSHEETS.SETTINGS);
  const sh = ss.getSheetByName(SHEET_NAMES.salesData);
  if (!sh) return { manager: '', director: '' };

  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (norm_(data[i][1]) === norm_(salesName)) {
      return { manager: data[i][2] || '', director: data[i][3] || '' };
    }
  }
  return { manager: '', director: '' };
}

/**
 * شركات البروكر المرتبطة بسيلز معين + شركات "Open Race" (متاحة للكل).
 * البنية: A=N/S | B-E=Sales 1-4 | F=Broker Name | G=Open Race Company
 * بيرجع array من { name, openRace } عشان الفرونت يميّز شركات الـ
 * Open Race بصرياً.
 */
function getCompanies(salesName) {
  const ss = SpreadsheetApp.openById(SPREADSHEETS.SETTINGS);
  const sh = ss.getSheetByName(SHEET_NAMES.salesCompany);
  if (!sh) throw new Error("Sheet 'Sales Company' not found");

  const data = sh.getDataRange().getValues();
  const target = norm_(salesName);
  const map = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const sales1 = norm_(row[1]);
    const sales2 = norm_(row[2]);
    const sales3 = norm_(row[3]);
    const sales4 = norm_(row[4]);
    const companyName = clean_(row[5]);
    const openRaceCompany = clean_(row[6]);

    if (companyName && (sales1 === target || sales2 === target || sales3 === target || sales4 === target)) {
      if (!(companyName in map)) map[companyName] = false;
    }
    if (openRaceCompany) {
      map[openRaceCompany] = true;
    }
  }

  return Object.keys(map).sort().map(name => ({ name: name, openRace: map[name] }));
}

// ================= بيانات نماذج CRM (Bootstrap) =================

function getClientFormBootstrap() {
  return { sales: getSales(), lists: STATIC_LISTS };
}

// ================= حفظ تسجيل عميل جديد =================

function saveClientRegistration(token, obj) {
  requireAuth_(token);
  validateClientRegistration_(obj);

  const ss = SpreadsheetApp.openById(SPREADSHEETS.DATA);
  const sheet = ss.getSheetByName(SHEET_NAMES.clientRegistration);
  if (!sheet) throw new Error('Client Registration sheet not found');

  const headers = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = new Array(headers.length).fill('');

  function set(h, v) {
    const i = headers.findIndex(x => normalizeHeader_(x) === normalizeHeader_(h));
    if (i !== -1) row[i] = v;
  }

  set('Unit Code', obj.unitCode);
  set('Project', obj.project);
  set('Date', new Date());
  set('Client Name', obj.clientName);
  set('ID / Pass No.', obj.idPassNo);
  set('Client Phone', obj.clientPhone);
  set('Client Email', obj.clientEmail);
  set('Clint Type', obj.clintType);
  set('Client Nationality', obj.clientNationality);
  set('Client Residence', obj.clientResidence);
  set('Booking Deposit', obj.bookingDeposit);
  set('Payment Method', obj.paymentMethod);
  set('Source', obj.source);
  set('Sales Name', obj.salesName1);
  set('Sales Name 2', obj.salesName2);
  set('Sales Name 3', obj.salesName3);
  set('Sales Manager 1', obj.salesManager1);
  set('Sales Manager 2', obj.salesManager2);
  set('Sales Manager 3', obj.salesManager3);
  set('Sales Director', obj.salesDirector1);
  set('Broker Company Name', obj.brokerCompanyName);
  set('Agent Broker Name', obj.agentBrokerName);

  sheet.appendRow(row);
  clearInventoryCache_();
  return { success: true, message: 'Client saved successfully.' };
}

function validateClientRegistration_(o) {
  const missing = [];
  if (!o.project) missing.push('Project');
  if (!o.unitCode) missing.push('Unit Code');
  if (!o.clientName) missing.push('Client Name');
  if (!o.clientPhone) missing.push('Client Phone');
  if (missing.length) throw new Error('Missing fields: ' + missing.join(', '));
  if (o.clientPhone && !/^01\d{9}$/.test(o.clientPhone)) {
    throw new Error('Phone number must start with 01 and contain 11 digits.');
  }
}

// ================= قراءة كل العملاء (لموديول CRM في الفرونت) =================

/**
 * كل العملاء/العقود مفلترة حسب صلاحية اليوزر، جاهزة لعرضها
 * في جدول CRM بالفرونت إند (clients.list).
 */
function getClients(token, filters) {
  const session = requireAuth_(token);
  let rows = readClientDb_().filter(x => roleAllowed_(x, session));

  filters = filters || {};
  if (filters.project && filters.project !== 'ALL') {
    rows = rows.filter(x => x.project === filters.project);
  }
  if (filters.search) {
    const q = norm_(filters.search);
    rows = rows.filter(x =>
      norm_(x.clientName).indexOf(q) !== -1 ||
      norm_(x.unitCode).indexOf(q) !== -1 ||
      norm_(x.clientPhone).indexOf(q) !== -1 ||
      norm_(x.clientPhone2).indexOf(q) !== -1 ||
      norm_(x.clientAddress).indexOf(q) !== -1
    );
  }

  return rows.map(x => ({
    unitCode: x.unitCode,
    project: x.project,
    unitType: x.unitType,
    status: x.status,
    clientName: x.clientName,
    clientPhone: x.clientPhone || '',
    clientPhone2: x.clientPhone2 || '',
    clientAddress: x.clientAddress || '',
    salesName: x.salesName,
    salesManager: x.salesManager,
    salesDirector: x.salesDirector,
    brokerCompany: x.brokerCompany,
    soldPrice: x.soldPrice,
    area: x.area,
    contractDate: formatDate_(x.contractDate),
    reservationDate: formatDate_(x.reservationDate),
    soldDate: formatDate_(x.soldDate)
  }));
}
