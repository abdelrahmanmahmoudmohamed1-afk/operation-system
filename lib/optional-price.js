/** Keep absent Sheet prices distinct from genuine zero-valued prices. */
export function optionalPrice(value, parseNumber) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const result = parseNumber(value);
  return Number.isFinite(result) ? result : null;
}
