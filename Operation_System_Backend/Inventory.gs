/**
 * Operation System backend — unified inventory/data readers.
 * Reads all configured projects from PROJECT_SOURCES and merges client data
 * by Project + Unit Code. This keeps every module on one canonical dataset.
 */

const INVENTORY_CACHE_KEY = 'operation_inventory_enterprise_v1';
const INVENTORY_CACHE_SECONDS = 300;

const INVENTORY_CORE_CACHE_KEY = 'operation_inventory_core_v2';
const INVENTORY_CORE_CACHE_SECONDS = 600;

/** Fast inventory-only reader. It intentionally skips transaction/client sheets. */
function getInventoryCore_() {
  const cache = CacheService.getScriptCache();
  try {
    const cached = cache.get(INVENTORY_CORE_CACHE_KEY);
    if (cached) return JSON.parse(cached, dateReviver_);
  } catch (e) {}
  let inventory = [];
  (PROJECT_SOURCES || []).forEach(function(source) {
    const ss = SpreadsheetApp.openById(source.spreadsheetId);
    inventory = inventory.concat(readInventoryFromSource_(ss, source));
  });
  try { cache.put(INVENTORY_CORE_CACHE_KEY, JSON.stringify(inventory), INVENTORY_CORE_CACHE_SECONDS); } catch (e) {}
  return inventory;
}


function getMergedDataBundle_() {
  const cache = CacheService.getScriptCache();
  try {
    const cached = cache.get(INVENTORY_CACHE_KEY);
    if (cached) return JSON.parse(cached, dateReviver_);
  } catch (e) {}

  let inventory = [];
  let clientDb = [];
  let cancelled = [];

  (PROJECT_SOURCES || []).forEach(function(source) {
    const ss = SpreadsheetApp.openById(source.spreadsheetId);
    inventory = inventory.concat(readInventoryFromSource_(ss, source));
    clientDb = clientDb.concat(readClientDbFromSource_(ss, source));
    if (source.cancelledSheet) cancelled = cancelled.concat(readCancelledFromSource_(ss, source));
  });

  const clientMap = {};
  clientDb.forEach(function(x) {
    const key = norm_(x.project) + '||' + norm_(x.unitCode);
    if (key !== '||') clientMap[key] = x;
  });

  const mergedInventory = inventory.map(function(x) {
    const c = clientMap[norm_(x.project) + '||' + norm_(x.unitCode)] || {};
    const status = lower_(x.status);
    const transactionPrice = num_(c.soldPrice);
    return Object.assign({}, x, {
      soldPrice: transactionPrice > 0 && (status === 'sold' || status === 'contracted' || status === 'reserved') ? transactionPrice : num_(x.soldPrice),
      contractDate: x.contractDate || c.contractDate || null,
      soldDate: x.soldDate || c.soldDate || null,
      reservationDate: x.reservationDate || c.reservationDate || null,
      clientName: c.clientName || x.clientName || '',
      clientPhone: c.clientPhone || x.clientPhone || '',
      clientPhone2: c.clientPhone2 || x.clientPhone2 || '',
      clientAddress: c.clientAddress || x.clientAddress || '',
      paymentType: c.paymentType || x.paymentType || '',
      contractPlace: c.contractPlace || x.contractPlace || '',
      clientType: c.clientType || x.clientType || '',
      salesName: x.salesName || c.salesName || '',
      salesManager: x.salesManager || c.salesManager || '',
      salesDirector: x.salesDirector || c.salesDirector || '',
      brokerCompany: x.brokerCompany || c.brokerCompany || ''
    });
  });

  const bundle = { inventory: mergedInventory, clientDb: clientDb, cancelled: cancelled };
  try { cache.put(INVENTORY_CACHE_KEY, JSON.stringify(bundle), INVENTORY_CACHE_SECONDS); } catch (e) {}
  return bundle;
}

function dateReviver_(key, value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}

function clearInventoryCache_() {
  const cache = CacheService.getScriptCache();
  cache.remove(INVENTORY_CACHE_KEY);
  cache.remove(INVENTORY_CORE_CACHE_KEY);
}

function readInventory_() { return getMergedDataBundle_().inventory; }
function readClientDb_() { return getMergedDataBundle_().clientDb; }
function readCancelled_() { return getMergedDataBundle_().cancelled; }

function findSheetByName_(ss, names) {
  names = (Array.isArray(names) ? names : [names]).filter(Boolean);
  for (let i = 0; i < names.length; i++) {
    const sh = ss.getSheetByName(names[i]);
    if (sh) return sh;
  }
  return null;
}

function readInventoryFromSource_(ss, source) {
  const aliases = [source.inventorySheet];
  if (source.key === 'Layana') aliases.push('Inventory Management');
  const sh = findSheetByName_(ss, aliases);
  if (!sh) throw new Error('Inventory sheet not found for ' + source.key + ': ' + aliases.join(' | '));

  const headerRow = Number(source.headerRowInventory || 2);
  const headerMap = getHeaderMap_(sh, headerRow);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow <= headerRow || lastCol < 1) return [];
  const rows = sh.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues();

  return rows.filter(function(r) {
    return rowHasAnyAlias_(r, headerMap, [FIELD_ALIASES.unitCode, FIELD_ALIASES.status, FIELD_ALIASES.soldPrice]);
  }).map(function(r) {
    return {
      sourceSheet: sh.getName(),
      unitCode: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.unitCode)),
      building: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.building)),
      unitType: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.unitType)),
      orientation: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.orientation)),
      project: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.project)) || source.key,
      status: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.status)),
      floor: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.floor)),
      area: num_(getByAlias_(r, headerMap, FIELD_ALIASES.area)),
      soldPrice: num_(getByAlias_(r, headerMap, FIELD_ALIASES.soldPrice)),
      remainingDp: num_(getByAlias_(r, headerMap, FIELD_ALIASES.remainingDp)),
      paymentYears: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.paymentYears)),
      paymentType: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.paymentType)),
      salesName: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesName)),
      salesManager: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesManager)),
      salesDirector: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesDirector)),
      source: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.source)),
      brokerCompany: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.brokerCompany)),
      nationality: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.nationality)),
      reservationDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.reservationDate)),
      contractDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.contractDate)),
      soldDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.soldDate)),
      deliveryDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.deliveryDate)),
      holdDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.holdDate)),
      clientName: '', clientPhone: '', clientPhone2: '', clientAddress: ''
    };
  }).filter(function(x) { return x.unitCode || x.status; });
}

function readClientDbFromSource_(ss, source) {
  const sh = ss.getSheetByName(source.transactionSheet);
  if (!sh) return [];
  const headerRow = Number(source.headerRowTransaction || 2);
  const headerMap = getHeaderMap_(sh, headerRow);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow <= headerRow || lastCol < 1) return [];
  const rows = sh.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getDisplayValues();

  return rows.filter(function(r) {
    return rowHasAnyAlias_(r, headerMap, [FIELD_ALIASES.unitCode, FIELD_ALIASES.clientName, FIELD_ALIASES.salesName]);
  }).map(function(r) {
    return {
      sourceSheet: sh.getName(),
      unitCode: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.unitCode)),
      building: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.building)),
      unitType: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.unitType)),
      orientation: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.orientation)),
      project: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.project)) || source.key,
      status: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.status)),
      floor: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.floor)),
      soldPrice: num_(getByAlias_(r, headerMap, FIELD_ALIASES.soldPrice)),
      area: num_(getByAlias_(r, headerMap, FIELD_ALIASES.area)),
      paymentType: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.paymentType)),
      salesName: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesName)),
      salesManager: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesManager)),
      salesDirector: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesDirector)),
      clientName: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.clientName)),
      clientPhone: phone_(getByAlias_(r, headerMap, FIELD_ALIASES.clientPhone)),
      clientPhone2: phone_(getByAlias_(r, headerMap, FIELD_ALIASES.clientPhone2)),
      clientAddress: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.clientAddress)),
      brokerCompany: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.brokerCompany)),
      contractPlace: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.contractPlace)),
      clientType: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.clientType)),
      reservationDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.reservationDate)),
      contractDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.contractDate)),
      soldDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.soldDate))
    };
  }).filter(function(x) { return x.unitCode || x.clientName; });
}

function readCancelledFromSource_(ss, source) {
  const sh = ss.getSheetByName(source.cancelledSheet);
  if (!sh) return [];
  const headerRow = Number(source.headerRowCancelled || 1);
  const headerMap = getHeaderMap_(sh, headerRow);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow <= headerRow || lastCol < 1) return [];
  const rows = sh.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues();
  return rows.map(function(r) {
    return {
      sourceSheet: sh.getName(),
      unitCode: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.unitCode)),
      unitType: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.unitType)),
      orientation: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.orientation)),
      project: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.project)) || source.key,
      status: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.status)) || 'Cancelled',
      floor: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.floor)),
      area: num_(getByAlias_(r, headerMap, FIELD_ALIASES.area)),
      soldPrice: num_(getByAlias_(r, headerMap, FIELD_ALIASES.soldPrice)),
      salesName: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesName)),
      salesManager: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesManager)),
      salesDirector: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.salesDirector)),
      brokerCompany: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.brokerCompany)),
      clientName: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.clientName)),
      clientPhone: phone_(getByAlias_(r, headerMap, FIELD_ALIASES.clientPhone)),
      clientPhone2: phone_(getByAlias_(r, headerMap, FIELD_ALIASES.clientPhone2)),
      clientAddress: clean_(getByAlias_(r, headerMap, FIELD_ALIASES.clientAddress)),
      reservationDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.reservationDate)),
      contractDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.contractDate)),
      soldDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.soldDate)),
      cancellationDate: date_(getByAlias_(r, headerMap, FIELD_ALIASES.cancellationDate))
    };
  }).filter(function(x) { return x.unitCode || x.clientName; });
}

// ================= API يستخدمها الفرونت إند =================

/**
 * كل بيانات المخزون مفلترة حسب صلاحية اليوزر (يستخدمها موديول
 * الـ Inventory في الفرونت إند).
 */
function getInventoryData(token, filters) {
  const session = requireAuth_(token);
  const rows = getInventoryCore_().filter(x => roleAllowed_(x, session));

  if (filters) {
    return rows.filter(x => {
      if (filters.project && norm_(filters.project) !== 'all' && norm_(x.project) !== norm_(filters.project)) return false;
      if (filters.status && norm_(filters.status) !== 'all' && norm_(x.status) !== norm_(filters.status)) return false;
      if (filters.unitType && norm_(filters.unitType) !== 'all' && norm_(x.unitType) !== norm_(filters.unitType)) return false;
      return true;
    });
  }

  return rows;
}

/**
 * قائمة المشاريع اللي فيها وحدات متاحة (يستخدمها فورم تسجيل العميل).
 */
function getInventoryProjects() {
  return [...new Set((PROJECT_SOURCES || []).map(function(s){return s.key;}).filter(Boolean))].sort();
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
