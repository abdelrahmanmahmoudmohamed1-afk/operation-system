/**
 * ===========================================================
 * TOLEDO UNIFIED BACKEND — Code.gs
 * ===========================================================
 * نقطة دخول الـ Web App الوحيدة لكل النظام. بيقدّم الفرونت إند
 * (Toledo System) وبيشغّل كل الـ API functions اللي الموديولات
 * المختلفة (Dashboard, CRM, Inventory, EOI...) بتناديها عن طريق
 * google.script.run.
 * ===========================================================
 */

/**
 * الفرونت إند بتاعك (Toledo System) مستضاف لوحده ومش جوه Apps
 * Script، وبيكلم الباك إند بـ fetch() عادي بنظام { action, ...payload }
 * (شوف api.service.js). فالباك إند هنا شغّال كـ JSON API بس، مش
 * بيقدّم صفحة HTML.
 *
 * GET  → بيستخدم query params: ?action=xxx&token=yyy...
 * POST → بيستخدم JSON body: { action: "xxx", ...payload }
 */

function doGet(e) {
  return handleRequest_(e.parameter || {});
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return jsonOutput_({ ok: false, message: 'Invalid JSON body' });
  }
  return handleRequest_(body);
}

/**
 * خريطة كل الـ actions المسموح بيها → الدالة اللي تنفذها. أي
 * موديول جديد في الفرونت إند المفروض ينادي action موجود هنا.
 */
const ACTION_MAP = {
  // Auth
  login: (p) => login(p.username, p.password),
  logout: (p) => logout(p.token),
  changeOwnPassword: (p) => changeOwnPassword(p.token, p.oldPassword, p.newPassword),
  health: (p) => getSystemHealth_(p.token),

  // Dashboard
  getDashboardFilters: (p) => getDashboardFilters(p.token),
  getDashboardData: (p) => getDashboardData(p.token, p.filters),

  // CRM / Client
  getClientFormBootstrap: (p) => { requireAuth_(p.token); return getClientFormBootstrap(); },
  getSales: (p) => { requireAuth_(p.token); return getSales(); },
  getCompanies: (p) => { requireAuth_(p.token); return getCompanies(p.salesName); },
  getManagerDirector: (p) => { requireAuth_(p.token); return getManagerDirector(p.salesName); },
  saveClientRegistration: (p) => saveClientRegistration(p.token, p.data),
  getClients: (p) => getClients(p.token, p.filters),

  // Inventory
  getInventoryData: (p) => getInventoryData(p.token, p.filters),
  getInventoryProjects: (p) => { requireAuth_(p.token); return getInventoryProjects(); },
  getAvailableUnitsByProject: (p) => { requireAuth_(p.token); return getAvailableUnitsByProject(p.project); },
  getAvailableLayanaUnits: (p) => getAvailableLayanaUnits(p.token),
  refreshAvailableLayanaUnits: (p) => refreshAvailableLayanaUnits(p.token),

  // EOI
  getEOIFormBootstrap: (p) => { requireAuth_(p.token); return getEOIFormBootstrap(); },
  saveEOI: (p) => saveEOI(p.token, p.data),
  getEOIData: (p) => getEOIData(p.token, p.filters)
};

function handleRequest_(params) {
  const action = params.action;
  const handler = ACTION_MAP[action];

  if (!handler) {
    return jsonOutput_({ ok: false, message: 'Unknown action: ' + action });
  }

  try {
    // لو الـ payload جاي كـ JSON string جوه param (حالة GET)، نفكّه
    const payload = normalizeParams_(params);
    const result = handler(payload);
    return jsonOutput_({ ok: true, message: 'OK', data: result });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);

    // رسايل مخصوصة لانتهاء الجلسة عشان الفرونت إند يرجّع لصفحة اللوجين
    if (message === 'AUTH_REQUIRED' || message === 'SESSION_EXPIRED') {
      return jsonOutput_({ ok: false, status: 401, message: message });
    }

    return jsonOutput_({ ok: false, message: message });
  }
}

function normalizeParams_(params) {
  const out = Object.assign({}, params);

  ['filters', 'data'].forEach(key => {
    if (typeof out[key] === 'string') {
      try { out[key] = JSON.parse(out[key]); } catch (e) { /* سايبها زي ما هي */ }
    }
  });

  return out;
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


function getSystemHealth_(token) {
  requireAuth_(token);
  const ss = SpreadsheetApp.openById(SPREADSHEETS.DATA);
  const sh = getSheetByCandidates_(ss, [SHEET_NAMES.inventory, 'Inventory Management', 'Layana Inventory Management']);
  return {
    status: sh ? 'ready' : 'misconfigured',
    spreadsheetId: SPREADSHEETS.DATA,
    configuredSheet: SHEET_NAMES.inventory,
    resolvedSheet: sh ? sh.getName() : '',
    lastRow: sh ? sh.getLastRow() : 0,
    lastColumn: sh ? sh.getLastColumn() : 0,
    generatedAt: formatDateTime_(new Date())
  };
}
