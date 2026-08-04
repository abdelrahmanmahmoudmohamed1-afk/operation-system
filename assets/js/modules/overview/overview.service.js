import DashboardService from "../../services/dashboard.service.js";

class OverviewService {
    async loadData() {
        return DashboardService.getData({});
    }
}

export default new OverviewService();
