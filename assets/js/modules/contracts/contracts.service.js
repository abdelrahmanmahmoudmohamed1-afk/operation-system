import ClientService from "../../services/client.service.js";

class ContractsModuleService {
    async loadContracted() {
        const project = sessionStorage.getItem("operation_global_project") || "ALL";
        const filters = project && project !== "ALL" ? { project } : {};
        const all = await ClientService.getClients(filters);
        return all.filter((c) => String(c.status).toLowerCase() === "contracted");
    }
}

export default new ContractsModuleService();
