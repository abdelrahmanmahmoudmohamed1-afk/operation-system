/**
 * Users & server-side audit trail.
 * Password values are never returned to the frontend.
 */

const AUDIT_HEADERS_ = [
  'Timestamp', 'User Name', 'Username', 'Role', 'Action', 'Module',
  'Details', 'Success', 'Duration Ms'
];

function requireAdmin_(token) {
  const session = requireAuth_(token);
  if (!isSystemAdmin_(session)) throw new Error('FORBIDDEN');
  return session;
}


function getOrCreateAuditSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEETS.SETTINGS);
  let sh = ss.getSheetByName(SHEET_NAMES.auditLog);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAMES.auditLog);
    sh.getRange(1, 1, 1, AUDIT_HEADERS_.length).setValues([AUDIT_HEADERS_]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, AUDIT_HEADERS_.length)
      .setFontWeight('bold')
      .setBackground('#241714')
      .setFontColor('#fff1c9');
  }
  return sh;
}

function actionModule_(action) {
  const a = String(action || 'Unknown');
  if (/login|logout|password/i.test(a)) return 'Authentication';
  if (/dashboard/i.test(a)) return 'Dashboard';
  if (/inventory|unit/i.test(a)) return 'Inventory';
  if (/client|crm/i.test(a)) return 'CRM';
  if (/eoi/i.test(a)) return 'EOI';
  if (/report/i.test(a)) return 'Reports';
  if (/user|audit/i.test(a)) return 'Users';
  if (/lead/i.test(a)) return 'Leads';
  return 'System';
}

function safeAuditDetails_(payload, errorMessage) {
  const source = Object.assign({}, payload || {});
  delete source.password;
  delete source.oldPassword;
  delete source.newPassword;
  delete source.token;
  let text = '';
  try { text = JSON.stringify(source); } catch (e) { text = String(source); }
  if (errorMessage) text += (text ? ' | ' : '') + 'Error: ' + errorMessage;
  return text.slice(0, 4000);
}

function recordApiAudit_(action, payload, success, errorMessage, durationMs, timestamp) {
  const actionName = String(action || 'Unknown');
  let session = null;
  try { session = payload && payload.token ? tryAuth_(payload.token) : null; } catch (e) {}

  // Login has no token yet, so use the submitted username.
  const username = clean_((session && session.user) || (payload && payload.username));
  const userName = clean_((session && session.name) || username || 'Anonymous');
  const role = clean_(session && session.role);

  const sh = getOrCreateAuditSheet_();
  sh.appendRow([
    timestamp || new Date(), userName, username, role,
    actionName, actionModule_(actionName),
    safeAuditDetails_(payload, errorMessage), success ? 'TRUE' : 'FALSE',
    Number(durationMs || 0)
  ]);
}

function readUsers_() {
  const ss = SpreadsheetApp.openById(SPREADSHEETS.SETTINGS);
  const sh = getSheetOrThrow_(ss, SHEET_NAMES.users);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headerMap = getHeaderMap_(sh, HEADER_ROW.users);

  const aliases = {
    name: ['Name', 'Full Name'],
    username: ['Username', 'User'],
    role: ['Role'],
    manager: ['Sales Manager', 'Manager'],
    director: ['Sales Director', 'Director'],
    active: ['Active', 'Status', 'Enabled'],
    email: ['Email', 'User Email'],
    mobile: ['Mobile', 'Phone', 'User Mobile']
  };

  return values.slice(HEADER_ROW.users).map(function(row, index) {
    const name = clean_(getByAlias_(row, headerMap, aliases.name));
    const username = clean_(getByAlias_(row, headerMap, aliases.username));
    const rawActive = lower_(getByAlias_(row, headerMap, aliases.active));
    return {
      rowNumber: index + HEADER_ROW.users + 1,
      name: name,
      username: username,
      role: norm_(getByAlias_(row, headerMap, aliases.role)) === 'admin' ? 'Admin' : 'User',
      manager: clean_(getByAlias_(row, headerMap, aliases.manager)),
      director: clean_(getByAlias_(row, headerMap, aliases.director)),
      email: clean_(getByAlias_(row, headerMap, aliases.email)),
      mobile: clean_(getByAlias_(row, headerMap, aliases.mobile)),
      active: !rawActive || ['active', 'yes', 'true', '1', 'enabled'].indexOf(rawActive) !== -1
    };
  }).filter(function(x) { return x.name || x.username; });
}

function getUsersData(token) {
  requireAdmin_(token);
  const users = readUsers_();
  const byRole = {};
  users.forEach(function(u) {
    const key = clean_(u.role) || 'Unassigned';
    byRole[key] = (byRole[key] || 0) + 1;
  });
  return {
    users: users,
    summary: {
      total: users.length,
      active: users.filter(function(u){ return u.active; }).length,
      inactive: users.filter(function(u){ return !u.active; }).length,
      roles: Object.keys(byRole).length
    },
    byRole: Object.keys(byRole).map(function(role){ return { role: role, count: byRole[role] }; })
  };
}

function getAuditHistory(token, filters) {
  requireAdmin_(token);
  filters = filters || {};
  const sh = getOrCreateAuditSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const limit = Math.max(1, Math.min(2000, Number(filters.limit || 500)));
  const startRow = Math.max(2, lastRow - limit + 1);
  const rows = sh.getRange(startRow, 1, lastRow - startRow + 1, AUDIT_HEADERS_.length).getValues();
  const q = norm_(filters.search);
  const userFilter = norm_(filters.username || filters.user);
  const actionFilter = norm_(filters.action);
  const moduleFilter = norm_(filters.module);
  const from = filters.dateFrom ? date_(filters.dateFrom) : null;
  const to = filters.dateTo ? date_(filters.dateTo) : null;
  if (to) to.setHours(23,59,59,999);

  return rows.map(function(r, i) {
    return {
      id: 'AUD-' + (startRow + i),
      timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0] || ''),
      userName: clean_(r[1]),
      username: clean_(r[2]),
      role: clean_(r[3]),
      action: clean_(r[4]),
      module: clean_(r[5]),
      details: clean_(r[6]),
      success: String(r[7]).toUpperCase() === 'TRUE',
      durationMs: Number(r[8] || 0)
    };
  }).filter(function(x) {
    const d = x.timestamp ? new Date(x.timestamp) : null;
    if (userFilter && norm_(x.username || x.userName) !== userFilter) return false;
    if (actionFilter && norm_(x.action).indexOf(actionFilter) === -1) return false;
    if (moduleFilter && norm_(x.module) !== moduleFilter) return false;
    if (q && [x.userName,x.username,x.role,x.action,x.module,x.details].map(norm_).join(' ').indexOf(q) === -1) return false;
    if (from && (!d || d < from)) return false;
    if (to && (!d || d > to)) return false;
    return true;
  }).reverse();
}


function ensureUserColumns_(sh) {
  const required = ['Name','Username','Password','Role','Sales Manager','Sales Director','Active','Email','Mobile'];
  const headerRow = HEADER_ROW.users;
  const lastCol = Math.max(sh.getLastColumn(), 1);
  let headers = sh.getRange(headerRow, 1, 1, lastCol).getValues()[0].map(clean_);
  required.forEach(function(header) {
    if (headers.map(normHeader_).indexOf(normHeader_(header)) === -1) {
      headers.push(header);
      sh.getRange(headerRow, headers.length).setValue(header);
    }
  });
  return headers;
}

function createSystemUser(token, data) {
  const admin = requireAdmin_(token);
  data = data || {};
  const name = clean_(data.name);
  const username = clean_(data.username);
  const password = clean_(data.password);
  const roleInput = norm_(data.role || 'user');
  const role = roleInput === 'admin' ? 'Admin' : 'User';
  if (!name || !username || !password) throw new Error('Name, username and password are required.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');

  const ss = SpreadsheetApp.openById(SPREADSHEETS.SETTINGS);
  const sh = getSheetOrThrow_(ss, SHEET_NAMES.users);
  const headers = ensureUserColumns_(sh);
  const normalized = headers.map(normHeader_);
  const values = sh.getDataRange().getValues();
  const usernameCol = normalized.indexOf(normHeader_('Username'));
  for (let i = HEADER_ROW.users; i < values.length; i++) {
    if (norm_(values[i][usernameCol]) === norm_(username)) throw new Error('Username already exists.');
  }

  const row = new Array(headers.length).fill('');
  function set(header, value) { const i = normalized.indexOf(normHeader_(header)); if (i >= 0) row[i] = value; }
  set('Name', name); set('Username', username); set('Password', password); set('Role', role);
  set('Sales Manager', clean_(data.manager)); set('Sales Director', clean_(data.director));
  set('Active', data.active === false ? 'Inactive' : 'Active');
  set('Email', clean_(data.email)); set('Mobile', clean_(data.mobile));
  sh.appendRow(row);
  return { success: true, message: 'User created successfully.', user: { name, username, role, active: data.active !== false } };
}
