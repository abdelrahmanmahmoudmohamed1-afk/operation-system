/**
 * ===========================================================
 * OPERATION SYSTEM UNIFIED BACKEND — Utils.gs
 * ===========================================================
 * دوال عامة مشتركة بين كل الملفات: تنظيف نصوص، تواريخ، أرقام،
 * قراءة شيتات بالاسم (مش بالعمود الثابت) عشان أي إعادة ترتيب
 * أو إضافة أعمدة في الشيت متكسرش الكود.
 * ===========================================================
 */

function clean_(v) {
  return String(v == null ? '' : v).trim();
}

function lower_(v) {
  return clean_(v).toLowerCase();
}

function norm_(v) {
  return lower_(v).replace(/\s+/g, ' ');
}

function phone_(v) {
  let s = clean_(v);
  if (!s) return '';
  s = s.replace(/[٠-٩]/g, function(d){ return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); });
  s = s.replace(/\.0$/, '').replace(/[^0-9+]/g, '');
  if (s.indexOf('+20') === 0) s = '0' + s.slice(3);
  if (s.indexOf('20') === 0 && s.length === 12) s = '0' + s.slice(2);
  if (/^1\d{9}$/.test(s)) s = '0' + s;
  return s;
}

function num_(v) {
  if (typeof v === 'number') return v;
  return Number(String(v || '').replace(/,/g, '').replace(/EGP/gi, '').replace(/جنيه/g, '').trim()) || 0;
}

function round_(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function date_(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return v;

  const s = clean_(v);
  if (!s) return null;

  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    const parsed = new Date(year, month, day);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate_(d) {
  if (!d) return '';
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'dd-MMM-yyyy');
}

function formatDateTime_(d) {
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'dd-MMM-yyyy HH:mm');
}

function isoDate_(d) {
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function startOfDay_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays_(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addMonths_(d, months) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

// ================= قراءة الشيتات بالاسم بدل رقم العمود الثابت =================

function getSheetOrThrow_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name);
  return sh;
}

function normalizeHeader_(h) {
  return String(h == null ? '' : h)
    .replace(/\u00A0/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// بيبني { اسم العمود بعد التنظيف: رقم العمود } من صف العناوين الفعلي
function getHeaderMap_(sheet, headerRowNumber) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return {};

  const headers = sheet.getRange(headerRowNumber, 1, 1, lastCol).getValues()[0];
  const map = {};

  headers.forEach(function (h, i) {
    const key = normalizeHeader_(h);
    if (key && !(key in map)) map[key] = i;
  });

  return map;
}

function findCol_(headerMap, aliases) {
  for (let i = 0; i < aliases.length; i++) {
    const key = normalizeHeader_(aliases[i]);
    if (key in headerMap) return headerMap[key];
  }
  return -1;
}

function getByAlias_(row, headerMap, aliases) {
  const idx = findCol_(headerMap, aliases);
  return idx === -1 ? '' : row[idx];
}

function rowHasAnyAlias_(row, headerMap, aliasGroups) {
  return aliasGroups.some(function (aliases) {
    const v = getByAlias_(row, headerMap, aliases);
    return clean_(v) || num_(v) > 0 || date_(v);
  });
}

// ================= مساعدات تجميع/إحصاء عامة =================

function sum_(arr, key) {
  return (arr || []).reduce((s, x) => s + Number(x[key] || 0), 0);
}

function groupCount_(rows, field, label) {
  const map = {};
  rows.forEach(x => {
    const key = clean_(x[field]) || 'Blank';
    if (!map[key]) map[key] = { Name: key, Count: 0, Value: 0 };
    map[key].Count++;
    map[key].Value += x.value || 0;
  });

  return Object.keys(map).map(k => ({
    [label]: k,
    Count: map[k].Count,
    Value: round_(map[k].Value)
  })).sort((a, b) => b.Count - a.Count || b.Value - a.Value);
}

function pct_(part, total) {
  return total ? round_((part / total) * 100) : 0;
}

function all_(arr) {
  const map = {};
  arr.forEach(v => {
    const original = clean_(v);
    const key = norm_(v);
    if (original && !map[key]) map[key] = original;
  });
  return ['ALL'].concat(Object.values(map).sort());
}

function matchDate_(date, from, to) {
  if (!from && !to) return true;
  if (!date) return false;
  const d = new Date(date);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}
