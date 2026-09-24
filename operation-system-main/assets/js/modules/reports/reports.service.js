import DashboardService from "../../services/dashboard.service.js";
import InventoryService from "../../services/inventory.service.js";
import ClientService from "../../services/client.service.js";
import EOIService from "../../services/eoi.service.js";

function num(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const n = Number(String(value ?? "").replace(/,/g, "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
}

function statusOf(row = {}) {
    return String(row.status || row.Status || row.contractStatus || row.ContractStatus || "").trim();
}

function projectOf(row = {}) {
    return String(row.project || row.Project || "").trim();
}

function valueOf(row = {}) {
    return num(row.soldPrice ?? row.Value ?? row.value ?? row["Price After Discount"] ?? row["Sold Price"] ?? row["Contract Price"]);
}

function unitCodeOf(row = {}) {
    return row.unitCode || row.UnitCode || row["Unit Code"] || "";
}

function buildFallbackRows(inventory = [], clients = []) {
    const byKey = new Map();
    const add = (row, source) => {
        const project = projectOf(row);
        const unitCode = unitCodeOf(row);
        const key = `${project.toLowerCase()}||${String(unitCode).toLowerCase()}`;
        const current = byKey.get(key) || {};
        const merged = { ...current, ...row };
        byKey.set(key, {
            ...merged,
            UnitCode: unitCode || current.UnitCode || "",
            Project: project || current.Project || "",
            Status: statusOf(row) || current.Status || "",
            ContractStatus: statusOf(row) || current.ContractStatus || "",
            UnitType: row.unitType || row.UnitType || row["Unit Type"] || current.UnitType || "",
            Floor: row.floor || row.Floor || current.Floor || "",
            Building: row.building || row.Building || current.Building || "",
            Area: num(row.area ?? row.Area ?? row.totalArea ?? row["In Door Area"] ?? current.Area),
            Client: row.clientName || row.Client || row["Client Name English"] || row["Client Name Arabic"] || current.Client || "",
            Phone: row.clientPhone || row.Phone || row["Client Phone Number"] || current.Phone || "",
            Sales: row.salesName || row.Sales || row["Sales Name"] || current.Sales || "",
            Broker: row.broker || row.Broker || row["Broker Company"] || current.Broker || "",
            Manager: row.manager || row.Manager || row["Sales Manager"] || current.Manager || "",
            Director: row.director || row.Director || row["Sales Director"] || current.Director || "",
            ReservationDate: row.reservationDate || row.ReservationDate || row["Reservition Date"] || row["Reservation Date"] || current.ReservationDate || "",
            ContractDate: row.contractDate || row.ContractDate || row["Contract Date"] || current.ContractDate || "",
            SoldDate: row.soldDate || row.SoldDate || row["Sold Date"] || current.SoldDate || "",
            Value: valueOf(row) || current.Value || 0,
            __source: source
        });
    };
    (inventory || []).forEach((r) => add(r, "inventory"));
    (clients || []).forEach((r) => add(r, "crm"));
    return Array.from(byKey.values()).filter((r) => r.UnitCode || r.Client || r.Project);
}

function groupPerformance(rows, field, label) {
    const map = new Map();
    rows.forEach((r) => {
        const key = String(r[field] || "Unassigned").trim() || "Unassigned";
        const item = map.get(key) || { [label]: key, Units: 0, Value: 0, AvgUnitPrice: 0 };
        item.Units += 1;
        item.Value += num(r.Value);
        map.set(key, item);
    });
    return Array.from(map.values()).map((x) => ({ ...x, AvgUnitPrice: x.Units ? Math.round(x.Value / x.Units) : 0 })).sort((a,b) => b.Value - a.Value);
}

class ReportsModuleService {
    async loadOverview() {
        const project = sessionStorage.getItem("operation_global_project") || "ALL";
        const filters = project && project !== "ALL" ? { project } : {};
        const settled = await Promise.allSettled([
            DashboardService.getData(filters),
            InventoryService.getData(filters),
            ClientService.getClients(filters),
            EOIService.getData(filters)
        ]);

        const dashboard = settled[0].status === "fulfilled" ? settled[0].value : {};
        const inventory = settled[1].status === "fulfilled" ? settled[1].value : [];
        const clients = settled[2].status === "fulfilled" ? settled[2].value : [];
        const eoiData = settled[3].status === "fulfilled" ? settled[3].value : { rows: [] };
        const fallbackRows = buildFallbackRows(inventory, clients);
        const reportRows = Array.isArray(dashboard.reportRows) && dashboard.reportRows.length ? dashboard.reportRows : fallbackRows;
        const contracts = (clients || []).filter((c) => String(c.status || "").trim().toLowerCase() === "contracted");

        const dashboardRows = Array.isArray(dashboard.reportRows) ? dashboard.reportRows.length : 0;
        const operationalRows = dashboardRows + (inventory?.length || 0) + (clients?.length || 0);
        if (operationalRows === 0) {
            const failed = settled.map((x, i) => x.status === "rejected" ? ["Dashboard","Inventory","CRM","EOI"][i] : null).filter(Boolean);
            throw new Error(failed.length
                ? `Live data unavailable: ${failed.join(", ")} failed. The system will not display fake zero KPIs.`
                : "Live operational sources returned 0 rows. The system will not display fake zero KPIs. Check the deployed backend and sheet mapping.");
        }

        const fallbackStatusMix = groupPerformance(reportRows.map((r) => ({ ...r, __status: r.ContractStatus || r.Status })), "__status", "Status");
        const fallbackProjects = groupPerformance(reportRows, "Project", "Project");
        const totalSalesValue = reportRows.filter((r) => ["reserved","contracted","sold"].includes(String(r.ContractStatus || r.Status || "").toLowerCase())).reduce((s,r) => s + num(r.Value), 0);

        return {
            ...dashboard,
            reportRows,
            statusMix: Array.isArray(dashboard.statusMix) && dashboard.statusMix.length ? dashboard.statusMix : fallbackStatusMix,
            projectPerformance: Array.isArray(dashboard.projectPerformance) && dashboard.projectPerformance.length ? dashboard.projectPerformance : fallbackProjects,
            inventory: inventory || [],
            clients: clients || [],
            contracts,
            eoi: eoiData?.rows || [],
            kpis: {
                ...(dashboard.kpis || {}),
                totalSalesValue: num(dashboard?.kpis?.totalSalesValue) || totalSalesValue
            },
            __sourceHealth: {
                dashboard: settled[0].status === "fulfilled",
                inventory: settled[1].status === "fulfilled",
                clients: settled[2].status === "fulfilled",
                eoi: settled[3].status === "fulfilled"
            }
        };
    }
}

export default new ReportsModuleService();
