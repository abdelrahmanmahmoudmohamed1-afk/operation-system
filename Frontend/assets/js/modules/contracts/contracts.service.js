import ClientService from "../../services/client.service.js";

class ContractsModuleService {
    async loadContracted() {
        const all = await ClientService.getClients({});
        return all.filter((c) => String(c.status).toLowerCase() === "contracted");
    }
}

export default new ContractsModuleService();
