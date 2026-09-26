// Pure helpers used by the Google Sheets + Postgres allocation path.
export function parseEOINumber(value) {
  const digits = String(value ?? '').trim().replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
  if (!/^\d+$/.test(digits)) return 0;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}
export function nextEOINumber(sheetNumbers, databaseNumber, lastReserved, increment = 1) {
  if (!Number.isInteger(increment) || increment < 1 || increment > 1000) throw new Error('Invalid EOI increment');
  const maximum = Math.max(0, ...sheetNumbers.map(parseEOINumber), parseEOINumber(databaseNumber), parseEOINumber(lastReserved));
  if (!Number.isSafeInteger(maximum + increment)) throw new Error('EOI numbering limit reached');
  return maximum + increment;
}
export function normalizeRequestId(value) {
  const id = String(value ?? '').trim();
  if (!/^[a-zA-Z0-9_-]{12,100}$/.test(id)) throw new Error('Invalid EOI submission ID');
  return id;
}
