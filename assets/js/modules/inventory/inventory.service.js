import InventoryService from "../../services/inventory.service.js";

class InventoryModuleService {
    async loadUnits(filters) {
        return InventoryService.getData(filters);
    }

    async loadProjects() {
        return InventoryService.getProjects();
    }
}

export default new InventoryModuleService();
