import DashboardService from "../../services/dashboard.service.js";

class DashboardModuleService {
    async loadFilters() { return DashboardService.getFilters(); }
    async loadData(filters) { return DashboardService.getData(filters); }
}

export default new DashboardModuleService();
