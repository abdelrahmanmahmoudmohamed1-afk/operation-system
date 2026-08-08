/**
 * ===========================================================
 * OPERATION SYSTEM BACKEND — Inventory.gs
 * ===========================================================
 * كل ما يخص الوحدات: قراءة المخزون، الوحدات المتاحة، تفاصيل
 * أي وحدة. كل القراءة بالاسم (header-based) مش بترقيم الأعمدة.
 * ===========================================================
 */

const INVENTORY_CACHE_KEY = 'operation_inventory_v4';
const INVENTORY_CACHE_SECONDS = 300;

/**
 * بيرجع inventory + clientDb + cancelled مدموجين في نداء واحد،
 * بيفتح الـ Spreadsheet مرة واحدة بس (مش 3 مرات منفصلة زي الأول)،
 * وبيحط النتيجة في الكاش لمدة 45 ثانية عشان التنقل بين الصفحات
 * يبقى أسرع بدل ما كل صفحة تعيد قراءة آلاف الصفوف من الشيت من
 * الصفر في كل مرة.
 */
function getMergedDataBundle_() {
  const cache = CacheService.getScriptCache();

  try {
    const cached = cache.get(INVENTORY_CACHE_KEY);
    if (cached) return JSON.parse(cached, dateReviver_);
  } catch (e) { /* لو الكاش باظ أو كبير قوي، كمل قراءة عادية */ }

  const ss = SpreadsheetApp.openById(SPREADSHEETS.DATA);

  const inventory = readInventoryFromSheet_(ss);
  const clientDb = readClientDbFromSheet_(ss);
  const cancelled = readCancelledFromSheet_(ss);

  const clientMap = {};
  clientDb.forEach(x => {
    const key = norm_(x.project) + '||' + norm_(x.unitCode);
    if (key !== '||') clientMap[key] = x;
  });

  // دمج بيانات العميل (تاريخ العقد، اسم العميل، طريقة الدفع...) جوه
  // صفوف المخزون لو الوحدة دي مبيوعة، لأن بيانات العقد الفعلية
  // بتتسجل في شيت "Layana Transaction" مش "Inventory Management".
  const mergedInventory = inventory.map(x => {
    const c = clientMap[norm_(x.project) + '||' + norm_(x.unitCode)] || {};
    return Object.assign({}, x, {
      contractDate: x.contractDate || c.contractDate || null,
      soldDate: x.soldDate || c.soldDate || null,
      reservationDate: x.reservationDate || c.reservationDate || null,
      clientName: c.clientName || '',
      clientPhone: c.clientPhone || '',
      clientPhone2: c.clientPhone2 || '',
      clientAddress: c.clientAddress || '',
      paymentType: c.paymentType || '',
      contractPlace: c.contractPlace || '',
      clientType: c.clientType || '',
      salesName: x.salesName || c.salesName || '',
      salesManager: x.salesManager || c.salesManager || '',
      salesDirector: x.salesDirector || c.salesDirector || '',
      brokerCompany: x.brokerCompany || c.brokerCompany || ''
    });
  });

  const bundle = { inventory: mergedInventory, clientDb: clientDb, cancelled: cancelled };

  try {
    cache.put(INVENTORY_CACHE_KEY, JSON.stringify(bundle), INVENTORY_CACHE_SECONDS);
  } catch (e) { /* لو حجم البيانات أكبر من حد الكاش (100KB)، نكمل من غير كاش */ }

  return bundle;
}

/**
 * بيرجّع تواريخ الـ JSON.parse من نصوص ISO لـ Date objects تاني،
 * عشان باقي الكود يقدر يتعامل معاها زي ما لو كانت جاية من الشيت
 * على طول.
 */
function dateReviver_(key, value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}

function clearInventoryCache_() {
  CacheService.getScriptCache().remove(INVENTORY_CACHE_KEY);
}

// ================= قراءة خام (Raw readers) =================

function readInventory_() {
  return getMergedDataBundle_().inventory;
}

function readInventoryFromSheet_(ss) {
  const inventoryNames = SHEET_NAMES.inventoryAliases || [SHEET_NAMES.inventory];
  const sh = inventoryNames.map(function(name){ return ss.getSheetByName(name); }).filter(Boolean)[0];
  if (!sh) {
    throw new Error('Inventory sheet not found. Expected one of: ' + inventoryNames.join(' | '));
  }

  const headerMap = getHeaderMap_(sh, HEADER_ROW.inventory);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow <= HEADER_ROW.inventory || lastCol < 1) return [];
  const v = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const dataRows = v.slice(HEADER_ROW.inventory);

  return dataRows
    .filter(r => rowHasAnyAlias_(r, headerMap, [
      FIELD_ALIASES.unitCode, FIELD_ALIASES.project, FIELD_ALIASES.soldPrice, FIELD_ALIASES.deliveryDate
    ]))
    .map(r => ({
      sourceSheet: SHEET_NAMES.inventory,
      unitCode: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.unitCode)),
      unitType: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.unitType)),
      orientation: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.orientation)),
      project: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.project)),
      status: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.status)),
      floor: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.floor)),
      area: num_(getByAlias_(r, headerMap, FIELD_ALIASES.area)),
      soldPrice: num_(getByAlias_(r, headerMap, FIELD_ALIASES.soldPrice)),
      remainingDp: num_(getByAlias_(r, headerMap, FIELD_ALIASES.remainingDp)),
      paymentYears: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.paymentYears)),
      salesName: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesName)),
      salesManager: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesManager)),
      salesDirector: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesDirector)),
      source: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.source)),
      brokerCompany: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.brokerCompany)),
      nationality: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.nationality)),
      reservationDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.reservationDate)),
      contractDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.contractDate)),
      deliveryDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.deliveryDate)),
      holdDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.holdDate))
    }));
}

function readClientDb_() {
  return getMergedDataBundle_().clientDb;
}

function readClientDbFromSheet_(ss) {
  const sh = ss.getSheetByName(SHEET_NAMES.clientDb);
  if (!sh) return [];

  const headerMap = getHeaderMap_(sh, HEADER_ROW.clientDb);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow <= HEADER_ROW.clientDb || lastCol < 1) return [];
  const range = sh.getRange(1, 1, lastRow, lastCol);
  const v = range.getValues();
  const display = range.getDisplayValues();
  const dataRows = v.slice(HEADER_ROW.clientDb);
  const displayRows = display.slice(HEADER_ROW.clientDb);

  return dataRows
    .map(function(r, rowIndex) { return { raw: r, display: displayRows[rowIndex] || r }; })
    .filter(pair => rowHasAnyAlias_(pair.raw, headerMap, [
      FIELD_ALIASES.unitCode, FIELD_ALIASES.project, FIELD_ALIASES.clientName, FIELD_ALIASES.salesName
    ]))
    .map(pair => { const r = pair.raw, d = pair.display; return ({
      sourceSheet: SHEET_NAMES.clientDb,
      unitCode: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.unitCode)),
      unitType: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.unitType)),
      orientation: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.orientation)),
      project: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.project)),
      status: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.status)),
      floor: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.floor)),
      soldPrice: num_(getByAlias_(r, headerMap, FIELD_ALIASES.soldPrice)),
      area: num_(getByAlias_(r, headerMap, FIELD_ALIASES.area)),
      paymentType: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.paymentType)),
      salesName: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesName)),
      salesManager: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesManager)),
      salesDirector: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesDirector)),
      clientName: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.clientName)),
      clientPhone: normalizePhone_(getByAlias_(d, headerMap, FIELD_ALIASES.clientPhone)),
      clientPhone2: normalizePhone_(getByAlias_(d, headerMap, FIELD_ALIASES.clientPhone2)),
      clientAddress: clean_(getByAlias_(d, headerMap, FIELD_ALIASES.clientAddress)),
      brokerCompany: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.brokerCompany)),
      contractPlace: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.contractPlace)),
      clientType: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.clientType)),
      reservationDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.reservationDate)),
      contractDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.contractDate)),
      soldDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.soldDate))
    }); });
}

function readCancelled_() {
  return getMergedDataBundle_().cancelled;
}

function readCancelledFromSheet_(ss) {
  const sh = ss.getSheetByName(SHEET_NAMES.cancelled);
  if (!sh) return [];

  const headerMap = getHeaderMap_(sh, HEADER_ROW.cancelled);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow <= HEADER_ROW.cancelled || lastCol < 1) return [];
  const v = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const dataRows = v.slice(HEADER_ROW.cancelled);

  return dataRows
    .filter(r => rowHasAnyAlias_(r, headerMap, [
      FIELD_ALIASES.unitCode, FIELD_ALIASES.project, FIELD_ALIASES.status,
      FIELD_ALIASES.clientName, FIELD_ALIASES.salesName, FIELD_ALIASES.soldPrice, FIELD_ALIASES.cancellationDate
    ]))
    .map(r => ({
      sourceSheet: SHEET_NAMES.cancelled,
      unitCode: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.unitCode)),
      unitType: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.unitType)),
      orientation: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.orientation)),
      project: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.project)),
      status: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.status)) || 'Cancelled',
      floor: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.floor)),
      area: num_(getByAlias_(r, headerMap, FIELD_ALIASES.area)),
      soldPrice: num_(getByAlias_(r, headerMap, FIELD_ALIASES.soldPrice)),
      salesName: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesName)),
      salesManager: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesManager)),
      salesDirector: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesDirector)),
      brokerCompany: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.brokerCompany)),
      clientName: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.clientName)),
      clientPhone: normalizePhone_(getByAlias_(d, headerMap, FIELD_ALIASES.clientPhone)),
      clientPhone2: normalizePhone_(getByAlias_(d, headerMap, FIELD_ALIASES.clientPhone2)),
      clientAddress: clean_(getByAlias_(d, headerMap, FIELD_ALIASES.clientAddress)),
      reservationDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.reservationDate)),
      contractDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.contractDate)),
      cancellationDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.cancellationDate))
    }));
}

// ================= API يستخدمها الفرونت إند =================

/**
 * كل بيانات المخزون مفلترة حسب صلاحية اليوزر (يستخدمها موديول
 * الـ Inventory في الفرونت إند).
 */
function getInventoryData(token, filters) {
  const session = requireAuth_(token);
  const rows = readInventory_().filter(x => roleAllowed_(x, session));

  if (filters) {
    return rows.filter(x => {
      if (filters.project && filters.project !== 'ALL' && x.project !== filters.project) return false;
      if (filters.status && filters.status !== 'ALL' && x.status !== filters.status) return false;
      if (filters.unitType && filters.unitType !== 'ALL' && x.unitType !== filters.unitType) return false;
      return true;
    });
  }

  return rows;
}

/**
 * قائمة المشاريع اللي فيها وحدات متاحة (يستخدمها فورم تسجيل العميل).
 */
function getInventoryProjects() {
  const rows = readInventory_();
  return [...new Set(
    rows.filter(x => lower_(x.status) === 'available').map(x => x.project).filter(Boolean)
  )].sort();
}

function getAvailableUnitsByProject(project) {
  const rows = readInventory_();
  return [...new Set(
    rows
      .filter(x => norm_(x.project) === norm_(project) && lower_(x.status) === 'available')
      .map(x => x.unitCode)
      .filter(Boolean)
  )].sort();
}

// ================= وحدات Layana المتاحة + حاسبة خطط السداد =================

const AVAILABLE_CACHE_KEY = 'available_units_v1';
const AVAILABLE_CACHE_SECONDS = 60;

function getAvailableLayanaUnits(token) {
  requireAuth_(token);

  const cache = CacheService.getScriptCache();
  const cached = cache.get(AVAILABLE_CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { cache.remove(AVAILABLE_CACHE_KEY); }
  }

  const ss = SpreadsheetApp.openById(SPREADSHEETS.AVAILABLE);
  const sh = ss.getSheetByName(SHEET_NAMES.layanaUnits);
  if (!sh) throw new Error('Sheet not found: ' + SHEET_NAMES.layanaUnits);

  const lastRow = sh.getLastRow();
  if (lastRow < 3) return [];

  const values = sh.getRange(3, 1, lastRow - 2, 12).getDisplayValues();

  const units = values
    .filter(row => clean_(row[0]) !== '')
    .map((row, index) => ({
      id: clean_(row[3] || 'Layana') + '||' + clean_(row[0]),
      sourceRow: index + 3,
      unitCode: clean_(row[0]),
      building: clean_(row[1]),
      unitType: clean_(row[2]),
      project: clean_(row[3]) || 'Layana',
      status: clean_(row[4]) || 'Available',
      floor: clean_(row[5]),
      indoorArea: num_(row[6]),
      outdoorArea: num_(row[7]),
      outdoorPrice: num_(row[8]),
      totalArea: num_(row[9]),
      totalAreasPrice: num_(row[10]),
      ticketPrice: num_(row[11])
    }));

  cache.put(AVAILABLE_CACHE_KEY, JSON.stringify(units), AVAILABLE_CACHE_SECONDS);
  return units;
}

function refreshAvailableLayanaUnits(token) {
  requireAuth_(token);
  CacheService.getScriptCache().remove(AVAILABLE_CACHE_KEY);
  return getAvailableLayanaUnits(token);
}
