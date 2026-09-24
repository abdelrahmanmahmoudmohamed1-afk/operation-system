/**
 * ===========================================================
 * OPERATION SYSTEM UNIFIED BACKEND — Code.gs
 * ===========================================================
 * نقطة دخول الـ Web App الوحيدة لكل النظام. بيقدّم الفرونت إند
 * (Operation System) وبيشغّل كل الـ API functions اللي الموديولات
 * المختلفة (Dashboard, CRM, Inventory, EOI...) بتناديها عن طريق
 * google.script.run.
 * ===========================================================
 */

/**
 * الفرونت إند بتاعك (Operation System) مستضاف لوحده ومش جوه Apps
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
  getSystemInfo: (p) => { requireAuth_(p.token); return getSystemInfo_(); },
  recordUserActivity: (p) => recordUserActivity(p.token, p.data),

  // Dashboard
  getDashboardFilters: (p) => getDashboardFilters(p.token),
  getDashboardData: (p) => getDashboardData(p.token, p.filters),
  getAchievementData: (p) => getAchievementData(p.token, p.filters),

  // CRM / Client
  getClientFormBootstrap: (p) => { requireAuth_(p.token); return getClientFormBootstrap(); },
  getSales: (p) => { requireAuth_(p.token); return getSales(); },
  getCompanies: (p) => { requireAuth_(p.token); return getCompanies(p.salesName); },
  getManagerDirector: (p) => { requireAuth_(p.token); return getManagerDirector(p.salesName); },
  saveClientRegistration: (p) => saveClientRegistration(p.token, p.data),
  getClients: (p) => getClients(p.token, p.filters),
  uploadClientContract: (p) => uploadClientContract(p.token, p.data),
  uploadContractPdf: (p) => uploadClientContract(p.token, p.data),
  getClientDocuments: (p) => getClientDocuments(p.token, p.filters),
  getDocumentCoverage: (p) => getDocumentCoverage(p.token, p.filters),
  getUnitFloorPlan: (p) => getUnitFloorPlan(p.token, p.filters),
  uploadUnitFloorPlan: (p) => uploadUnitFloorPlan(p.token, p.data),
  uploadFloorPlanPdf: (p) => uploadUnitFloorPlan(p.token, p.data),
  getUnitFloorPlanCoverage: (p) => getUnitFloorPlanCoverage(p.token, p.filters),

  // Inventory
  getInventoryData: (p) => getInventoryData(p.token, p.filters),
  getInventoryProjects: (p) => { requireAuth_(p.token); return getInventoryProjects(); },
  getAvailableUnitsByProject: (p) => { requireAuth_(p.token); return getAvailableUnitsByProject(p.project); },
  getAvailableLayanaUnits: (p) => getAvailableLayanaUnits(p.token),
  refreshAvailableLayanaUnits: (p) => refreshAvailableLayanaUnits(p.token),

  // EOI
  getEOIFormBootstrap: (p) => { requireAuth_(p.token); return getEOIFormBootstrap(); },
  saveEOI: (p) => saveEOI(p.token, p.data),
  getEOIData: (p) => getEOIData(p.token, p.filters),

  // Leads
  getLeadsData: (p) => getLeadsData(p.token, p.filters),
  bulkUpdateLeadStatus: (p) => bulkUpdateLeadStatus(p.token, p.data),
  importLeads: (p) => importLeads(p.token, p.data),

  // Users & Audit
  getUsersData: (p) => getUsersData(p.token),
  createSystemUser: (p) => createSystemUser(p.token, p.data),
  getAuditHistory: (p) => getAuditHistory(p.token, p.filters),
  operationAiChat: (p) => operationAiChat(p.token, p.data)
};


function getApiActions_() {
  return Object.keys(ACTION_MAP || {}).sort();
}

const AUDITED_API_ACTIONS_ = {
  login:1, logout:1, changeOwnPassword:1, saveClientRegistration:1,
  uploadClientContract:1, uploadContractPdf:1, saveEOI:1, bulkUpdateLeadStatus:1, importLeads:1,
  createSystemUser:1, uploadUnitFloorPlan:1, uploadFloorPlanPdf:1
};

function shouldAuditApiAction_(action) {
  return !!AUDITED_API_ACTIONS_[String(action || '')];
}

function handleRequest_(params) {
  const action = params.action;
  const handler = ACTION_MAP[action];

  if (!handler) {
    return jsonOutput_({ ok: false, message: 'Unknown action: ' + action });
  }

  const startedAt = new Date();
  const startMs = Date.now();
  let payload = null;
  try {
    payload = normalizeParams_(params);
    const result = handler(payload);
    if (shouldAuditApiAction_(action)) { try { recordApiAudit_(action, payload, true, '', Date.now() - startMs, startedAt); } catch (auditErr) {} }
    return jsonOutput_({ ok: true, message: 'OK', data: result });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    if (shouldAuditApiAction_(action)) { try { recordApiAudit_(action, payload || params, false, message, Date.now() - startMs, startedAt); } catch (auditErr) {} }

    // رسايل مخصوصة لانتهاء الجلسة عشان الفرونت إند يرجّع لصفحة اللوجين
    if (message === 'AUTH_REQUIRED' || message === 'SESSION_EXPIRED') {
      return jsonOutput_({ ok: false, status: 401, message: message });
    }
    if (message === 'FORBIDDEN') {
      return jsonOutput_({ ok: false, status: 403, message: 'You do not have permission to access this module.' });
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
