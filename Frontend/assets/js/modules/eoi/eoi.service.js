import EOIService from "../../services/eoi.service.js";

class EoiModuleService {
    async loadBootstrap() { return EOIService.getBootstrap(); }
    async save(data) { return EOIService.save(data); }
    async loadData(filters) { return EOIService.getData(filters); }
}

export default new EoiModuleService();
