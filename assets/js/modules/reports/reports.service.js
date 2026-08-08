import DashboardService from "../../services/dashboard.service.js";
import InventoryService from "../../services/inventory.service.js";
import ClientService from "../../services/client.service.js";
import EOIService from "../../services/eoi.service.js";

class ReportsModuleService {
    async loadOverview() {
        // Load independent report sources in parallel. A non-critical source
        // failing should not make the entire reporting center unusable.
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

        const contracts = (clients || []).filter((c) => String(c.status || "").trim().toLowerCase() === "contracted");
        return {
            ...dashboard,
            inventory: inventory || [],
            clients: clients || [],
            contracts,
            eoi: eoiData?.rows || [],
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
