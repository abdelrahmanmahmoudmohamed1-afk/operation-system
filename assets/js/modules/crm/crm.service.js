/**
 * ---------------------------------------------------------
 * CRM Module — Service
 * بيربط بين الـ view والـ ClientService العام (services/client.service.js)
 * ---------------------------------------------------------
 */

import ClientService from "../../services/client.service.js";

class CrmModuleService {
    async loadClients(filters) {
        return ClientService.getClients(filters);
    }

    async loadBootstrap() {
        return ClientService.getBootstrap();
    }

    async loadCompanies(salesName) {
        return ClientService.getCompanies(salesName);
    }

    async loadManagerDirector(salesName) {
        return ClientService.getManagerDirector(salesName);
    }

    async saveClient(data) {
        return ClientService.saveClient(data);
    }

    async uploadContract(data) {
        return ClientService.uploadContract(data);
    }

    async loadDocuments(filters = {}) {
        return ClientService.getDocuments(filters);
    }
}

export default new CrmModuleService();
