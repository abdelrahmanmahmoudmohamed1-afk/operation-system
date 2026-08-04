/**
 * ===========================================================
 * OPERATION SYSTEM BACKEND — Dashboard.gs
 * ===========================================================
 * Executive dashboard aggregations. Uses Inventory.gs readers
 * and Auth.gs role filtering.
 * ===========================================================
 */

function getDashboardFilters(token) {
  requireAuth_(token);
  const rows = readInventory_();
  return {
    projects: all_(rows.map(r => r.project)),
    statuses: all_(rows.map(r => r.status)),
    sales: all_(rows.map(r => r.salesName)),
    managers: all_(rows.map(r => r.salesManager)),
    directors: all_(rows.map(r => r.salesDirector)),
    brokers: all_(rows.map(r => r.brokerCompany))
  };
}

function getDashboardData(token, filters) {
  const session = requireAuth_(token);
  filters = filters || {};

  const cache = CacheService.getScriptCache();
  const roleKey = lower_(session.role || '') + '|' + lower_(session.name || session.user || '');
  const cacheKey = 'operation_system_dashboard_v5_' + Utilities.base64EncodeWebSafe(roleKey + '|' + JSON.stringify(filters)).slice(0, 180);
  try {
    const cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  const allRows = readInventory_().filter(x => roleAllowed_(x, session));
  const rows = allRows.filter(x => dashboardMatchFilters_(x, filters));
  const cancelled = readCancelled_().filter(x => roleAllowed_(x, session)).filter(x => dashboardMatchFilters_(x, filters));

  const soldLike = rows.filter(x => isSoldLikeStatus_(x.status));
  const available = rows.filter(x => lower_(x.status) === 'available');
  const totalSalesValue = sum_(soldLike, 'soldPrice');
  const availableValue = sum_(available, 'soldPrice');

  const result = {
    meta: {
      generatedAt: formatDateTime_(new Date()),
      rowsInventory: rows.length,
      rowsSoldLike: soldLike.length,
      rowsCancelled: cancelled.length
    },
    kpis: {
      totalSalesValue: round_(totalSalesValue),
      soldUnits: soldLike.length,
      availableUnits: available.length,
      availableValue: round_(availableValue),
      cancelledUnits: cancelled.length,
      cancellationRate: pct_(cancelled.length, soldLike.length + cancelled.length),
      avgUnitPrice: soldLike.length ? round_(totalSalesValue / soldLike.length) : 0,
      remainingDp: round_(sum_(soldLike, 'remainingDp'))
    },
    statusMix: groupStatus_(rows),
    projectPerformance: groupPerformance_(soldLike, 'project', 'Project'),
    salesPerformance: groupPerformance_(soldLike, 'salesName', 'Sales'),
    managerPerformance: groupPerformance_(soldLike, 'salesManager', 'Manager'),
    directorPerformance: groupPerformance_(soldLike, 'salesDirector', 'Director'),
    brokerPerformance: groupPerformance_(soldLike, 'brokerCompany', 'Broker'),
    trendMonthly: monthlyTrend_(soldLike, cancelled),
    topUnits: soldLike.slice().sort((a,b) => num_(b.soldPrice) - num_(a.soldPrice)).slice(0, 20).map(unitRow_),
    reportRows: soldLike.map(reportUnitRow_)
  };

  try { cache.put(cacheKey, JSON.stringify(result), 120); } catch (e) {}
  return result;
}

function dashboardMatchFilters_(x, f) {
  if (f.project && f.project !== 'ALL' && x.project !== f.project) return false;
  if (f.status && f.status !== 'ALL' && x.status !== f.status) return false;
  if (f.sales && f.sales !== 'ALL' && x.salesName !== f.sales) return false;
  if (f.manager && f.manager !== 'ALL' && x.salesManager !== f.manager) return false;
  if (f.director && f.director !== 'ALL' && x.salesDirector !== f.director) return false;
  if (f.broker && f.broker !== 'ALL' && x.brokerCompany !== f.broker) return false;

  const from = f.fromDate ? startOfDay_(new Date(f.fromDate)) : null;
  const to = f.toDate ? endOfDay_(new Date(f.toDate)) : null;
  const d = x.contractDate || x.reservationDate || x.holdDate || null;
  if ((from || to) && !matchDate_(d, from, to)) return false;
  return true;
}

function isSoldLikeStatus_(status) {
  const s = lower_(status);
  return s === 'sold' || s === 'contracted' || s === 'reserved';
}

function groupStatus_(rows) {
  const map = {};
  rows.forEach(x => {
    const key = clean_(x.status) || 'Blank';
    if (!map[key]) map[key] = { Status: key, Units: 0, Value: 0 };
    map[key].Units++;
    map[key].Value += num_(x.soldPrice);
  });
  return Object.keys(map).map(k => ({ Status: k, Units: map[k].Units, Value: round_(map[k].Value) })).sort((a,b) => b.Units - a.Units || b.Value - a.Value);
}

function groupPerformance_(rows, field, label) {
  const map = {};
  rows.forEach(x => {
    const key = clean_(x[field]) || 'Blank';
    if (!map[key]) map[key] = { Units: 0, Value: 0 };
    map[key].Units++;
    map[key].Value += num_(x.soldPrice);
  });
  return Object.keys(map).map(k => ({
    [label]: k,
    Units: map[k].Units,
    Value: round_(map[k].Value),
    AvgUnitPrice: map[k].Units ? round_(map[k].Value / map[k].Units) : 0
  })).sort((a,b) => b.Value - a.Value);
}

function monthlyTrend_(soldRows, cancelledRows) {
  const map = {};
  function ensure(key) {
    if (!map[key]) map[key] = { Month: key, SalesValue: 0, SalesUnits: 0, CancelledValue: 0, CancelledUnits: 0 };
    return map[key];
  }
  soldRows.forEach(x => {
    const d = x.contractDate || x.reservationDate || x.holdDate;
    if (!d) return;
    const key = Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM');
    const row = ensure(key);
    row.SalesUnits++;
    row.SalesValue += num_(x.soldPrice);
  });
  cancelledRows.forEach(x => {
    const d = x.cancellationDate || x.contractDate || x.reservationDate;
    if (!d) return;
    const key = Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM');
    const row = ensure(key);
    row.CancelledUnits++;
    row.CancelledValue += num_(x.soldPrice);
  });
  return Object.keys(map).sort().map(k => ({
    Month: k,
    SalesValue: round_(map[k].SalesValue),
    SalesUnits: map[k].SalesUnits,
    CancelledValue: round_(map[k].CancelledValue),
    CancelledUnits: map[k].CancelledUnits
  }));
}

function reportUnitRow_(x) {
  return {
    UnitCode: x.unitCode,
    Project: x.project,
    Status: x.status,
    ContractStatus: x.status,
    Orientation: x.orientation || '',
    UnitType: x.unitType,
    Floor: x.floor,
    Area: round_(x.area),
    Client: x.clientName || '',
    Sales: x.salesName,
    Manager: x.salesManager,
    Director: x.salesDirector,
    Broker: x.brokerCompany,
    Source: x.source || '',
    PaymentType: x.paymentType || '',
    ReservationDate: formatDate_(x.reservationDate),
    ContractDate: formatDate_(x.contractDate || x.reservationDate),
    Value: round_(x.soldPrice),
    RemainingDp: round_(x.remainingDp)
  };
}

function unitRow_(x) {
  return {
    UnitCode: x.unitCode,
    Project: x.project,
    UnitType: x.unitType,
    Status: x.status,
    Orientation: x.orientation || '',
    Sales: x.salesName,
    Area: round_(x.area),
    Value: round_(x.soldPrice),
    ContractDate: formatDate_(x.contractDate || x.reservationDate)
  };
}
