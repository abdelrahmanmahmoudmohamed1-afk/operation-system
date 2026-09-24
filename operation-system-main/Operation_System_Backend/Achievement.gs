/**
 * Achievement report: one current state per unit.
 * Sold units are counted only as Sold, Contracted only as Contracted,
 * Reserved only as Reserved. The date used is status-specific.
 */
function getAchievementData(token, filters) {
  const session = requireAuth_(token);
  filters = filters || {};
  const range = achievementRange_(filters);
  const map = {};

  readInventory_().filter(function(x) { return roleAllowed_(x, session); }).forEach(function(x) {
    const status = lower_(x.status);
    if (status !== 'sold' && status !== 'contracted' && status !== 'reserved') return;
    if (filters.project && norm_(filters.project) !== 'all' && norm_(x.project) !== norm_(filters.project)) return;

    let eventDate = null;
    if (status === 'sold') eventDate = x.soldDate || null;
    else if (status === 'contracted') eventDate = x.contractDate || null;
    else if (status === 'reserved') eventDate = x.reservationDate || null;

    if (!eventDate) return;
    if (!matchDate_(eventDate, range.from, range.to)) return;

    const key = norm_(x.project) + '||' + norm_(x.unitCode);
    if (!key || key === '||') return;
    map[key] = {
      Project: clean_(x.project),
      UnitCode: clean_(x.unitCode),
      Status: clean_(x.status),
      Date: formatDate_(eventDate),
      Client: clean_(x.clientName),
      Mobile: clean_(x.clientPhone),
      Sales: clean_(x.salesName),
      Manager: clean_(x.salesManager),
      Broker: clean_(x.brokerCompany),
      UnitType: clean_(x.unitType),
      Area: round_(x.area),
      Value: round_(x.soldPrice)
    };
  });

  const rows = Object.keys(map).map(function(k) { return map[k]; }).sort(function(a,b) {
    return String(b.Date || '').localeCompare(String(a.Date || '')) || String(a.UnitCode || '').localeCompare(String(b.UnitCode || ''));
  });

  function stage(name) {
    const items = rows.filter(function(r) { return lower_(r.Status) === lower_(name); });
    return { units: items.length, value: round_(items.reduce(function(s,r){ return s + num_(r.Value); }, 0)) };
  }

  const reserved = stage('Reserved');
  const contracted = stage('Contracted');
  const sold = stage('Sold');

  return {
    meta: {
      generatedAt: formatDateTime_(new Date()),
      project: filters.project || 'ALL',
      from: range.from ? formatDate_(range.from) : '',
      to: range.to ? formatDate_(range.to) : '',
      units: rows.length,
      value: round_(rows.reduce(function(s,r){ return s + num_(r.Value); }, 0))
    },
    kpis: { reserved: reserved, contracted: contracted, sold: sold },
    rows: rows
  };
}

function achievementRange_(f) {
  const period = norm_(f.period || 'all');
  const month = Number(f.month || 0);
  const year = Number(f.year || 0);
  const day = Number(f.day || 0);

  if (period === 'all') return { from: null, to: null };
  if (period === 'custom') {
    const from = f.dateFrom ? startOfDay_(new Date(f.dateFrom)) : null;
    const to = f.dateTo ? endOfDay_(new Date(f.dateTo)) : null;
    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) throw new Error('Please select both From and To dates.');
    if (from > to) throw new Error('From date cannot be after To date.');
    return { from: from, to: to };
  }

  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || (now.getMonth() + 1);
  const d = day || now.getDate();
  const base = new Date(y, m - 1, d);

  if (period === 'daily') return { from: startOfDay_(base), to: endOfDay_(base) };
  if (period === 'weekly') {
    const weekday = base.getDay(); // Sunday 0
    const start = new Date(base);
    start.setDate(base.getDate() - ((weekday + 1) % 7)); // Saturday-start business week
    return { from: startOfDay_(start), to: endOfDay_(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)) };
  }
  if (period === 'monthly') return { from: new Date(y, m - 1, 1), to: endOfDay_(new Date(y, m, 0)) };
  return { from: null, to: null };
}
