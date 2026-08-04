import DashboardService from "../../services/dashboard.service.js";

class ReportsModuleService {
    async loadOverview() {
        return DashboardService.getData({});
    }
}

export default new ReportsModuleService();
