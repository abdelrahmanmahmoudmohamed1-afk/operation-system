/**
 * ===========================================================
 * TOLEDO UNIFIED BACKEND — Auth.gs
 * ===========================================================
 * تسجيل دخول واحد لكل الموديولات. بيرجع توكن (session token)
 * بدل ما كل صفحة تبعت اليوزر/الباسورد تاني في كل طلب، وده
 * أأمن وأسرع. الفرونت إند بيخزن التوكن ده ويبعته مع كل نداء.
 * ===========================================================
 */

const AUTH_CACHE_PREFIX = 'toledo_auth_';
const AUTH_SECONDS = 21600; // 6 ساعات
const LOGIN_ATTEMPT_PREFIX = 'toledo_login_attempt_';
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_SECONDS = 900; // 15 دقيقة

/**
 * تسجيل الدخول. بيرجع:
 * { success: true, token, user: { name, user, role, salesManager, salesDirector } }
 * أو { success: false, message }
 */
function login(username, password) {
  try {
    const u = norm_(username);
    const p = clean_(password);

    if (!u || !p) {
      return { success: false, message: 'Please enter your username and password.' };
    }

    const cache = CacheService.getScriptCache();
    const attemptKey = LOGIN_ATTEMPT_PREFIX + Utilities.base64EncodeWebSafe(u).slice(0, 80);
    const attempts = Number(cache.get(attemptKey) || 0);
    if (attempts >= LOGIN_MAX_ATTEMPTS) {
      return { success: false, message: 'Too many failed attempts. Please try again in 15 minutes.' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEETS.SETTINGS);
    const sh = getSheetOrThrow_(ss, SHEET_NAMES.users);
    const headerMap = getHeaderMap_(sh, HEADER_ROW.users);
    const data = sh.getDataRange().getValues();

    const nameAliases = ['Name', 'Full Name'];
    const usernameAliases = ['Username', 'User'];
    const passwordAliases = ['Password'];
    const roleAliases = ['Role'];
    const managerAliases = ['Sales Manager', 'Manager'];
    const directorAliases = ['Sales Director', 'Director'];

    for (let i = HEADER_ROW.users; i < data.length; i++) {
      const row = data[i];
      const rowUser = norm_(getByAlias_(row, headerMap, usernameAliases));
      const rowPass = clean_(getByAlias_(row, headerMap, passwordAliases));

      if (rowUser === u && rowPass === p) {
        const user = {
          name: clean_(getByAlias_(row, headerMap, nameAliases)),
          user: clean_(getByAlias_(row, headerMap, usernameAliases)),
          role: clean_(getByAlias_(row, headerMap, roleAliases)),
          salesManager: clean_(getByAlias_(row, headerMap, managerAliases)),
          salesDirector: clean_(getByAlias_(row, headerMap, directorAliases))
        };

        const token = Utilities.getUuid();
        cache.remove(attemptKey);
        cache.put(
          AUTH_CACHE_PREFIX + token,
          JSON.stringify(user),
          AUTH_SECONDS
        );

        return { success: true, token: token, user: user };
      }
    }

    cache.put(attemptKey, String(attempts + 1), LOGIN_BLOCK_SECONDS);
    return { success: false, message: 'Invalid username or password.' };
  } catch (err) {
    return { success: false, message: 'Login error: ' + err.message };
  }
}

/**
 * بيتاكد إن التوكن صالح ويرجع بيانات اليوزر. لو مش صالح بيرمي Error
 * عشان كل دالة API تستخدمه تتعامل مع "الجلسة منتهية" بشكل موحّد.
 */
function requireAuth_(token) {
  token = clean_(token);
  if (!token) throw new Error('AUTH_REQUIRED');

  const cached = CacheService.getScriptCache().get(AUTH_CACHE_PREFIX + token);
  if (!cached) throw new Error('SESSION_EXPIRED');

  return JSON.parse(cached);
}

/**
 * نسخة بترجع null بدل ما ترمي Error، مفيدة لما المسموح إن الطلب
 * يكمل حتى من غير جلسة (نادر، بس موجودة للمرونة).
 */
function tryAuth_(token) {
  try {
    return requireAuth_(token);
  } catch (e) {
    return null;
  }
}

function logout(token) {
  token = clean_(token);
  if (token) CacheService.getScriptCache().remove(AUTH_CACHE_PREFIX + token);
  return true;
}

function changeOwnPassword(token, oldPassword, newPassword) {
  const session = requireAuth_(token);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEETS.SETTINGS);
    const usersSheet = getSheetOrThrow_(ss, SHEET_NAMES.users);
    const logSheet = ss.getSheetByName(SHEET_NAMES.passwordLog);
    const headerMap = getHeaderMap_(usersSheet, HEADER_ROW.users);
    const data = usersSheet.getDataRange().getValues();

    const oldPass = clean_(oldPassword);
    const newPass = clean_(newPassword);

    if (!oldPass || !newPass) {
      return { success: false, message: 'Current and new passwords are required.' };
    }
    if (newPass.length < 6) {
      return { success: false, message: 'The new password must be at least 6 characters.' };
    }

    const usernameAliases = ['Username', 'User'];
    const passwordAliases = ['Password'];
    const nameAliases = ['Name', 'Full Name'];
    const roleAliases = ['Role'];
    const passwordColIdx = findCol_(headerMap, passwordAliases);

    for (let i = HEADER_ROW.users; i < data.length; i++) {
      const row = data[i];
      const rowUsername = clean_(getByAlias_(row, headerMap, usernameAliases));
      const rowPassword = clean_(getByAlias_(row, headerMap, passwordAliases));

      if (norm_(rowUsername) === norm_(session.user)) {
        if (rowPassword !== oldPass) {
          return { success: false, message: 'The current password is incorrect.' };
        }
        if (passwordColIdx !== -1) {
          usersSheet.getRange(i + 1, passwordColIdx + 1).setValue(newPass);
        }
        if (logSheet) {
          logSheet.appendRow([
            new Date(), rowUsername,
            clean_(getByAlias_(row, headerMap, nameAliases)),
            clean_(getByAlias_(row, headerMap, roleAliases)),
            'PASSWORD CHANGED'
          ]);
        }
        return { success: true, message: 'Password changed successfully.' };
      }
    }

    return { success: false, message: 'User not found.' };
  } catch (err) {
    return { success: false, message: 'Error: ' + err.message };
  }
}

/**
 * فلترة الصفوف حسب صلاحية الدور — منطق موحّد يستخدمه أي موديول
 * (CRM, Inventory, Dashboard...) عشان السيلز يشوف بياناته بس،
 * المانجر يشوف فريقه، الديركتور يشوف إدارته، والأدمن يشوف الكل.
 */
function roleAllowed_(row, session) {
  if (!session || !session.role) return true;
  const role = lower_(session.role);

  if (ROLES.ADMIN.indexOf(role) !== -1) return true;

  if (ROLES.DIRECTOR.indexOf(role) !== -1) {
    return norm_(row.salesDirector) === norm_(session.salesDirector || session.name) ||
           norm_(row.salesName) === norm_(session.name);
  }

  if (ROLES.MANAGER.indexOf(role) !== -1) {
    return norm_(row.salesManager) === norm_(session.salesManager || session.name) ||
           norm_(row.salesName) === norm_(session.name);
  }

  return norm_(row.salesName) === norm_(session.name) || norm_(row.salesName) === norm_(session.user);
}
