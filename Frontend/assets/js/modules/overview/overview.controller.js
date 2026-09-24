import Module from "../../core/module.js";
import OverviewService from "./overview.service.js";
import { renderLayout, renderKpis, renderPipeline, renderProjects } from "./overview.view.js";
import { renderLoading, renderError } from "../../utils/state.js";

class OverviewController extends Module {
    async render() {
        this.container.innerHTML = renderLayout();
        document.getElementById("overview-kpis").innerHTML = renderLoading({ variant: "kpis", rows: 8 });
        await this.load();
    }

    async load() {
        try {
            const data = await OverviewService.loadData();
            document.getElementById("overview-meta").textContent = `Generated: ${data.meta?.generatedAt || "-"}`;
            document.getElementById("overview-kpis").innerHTML = renderKpis(data);
            document.getElementById("overview-pipeline").innerHTML = renderPipeline(data.statusMix || []);
            document.getElementById("overview-projects").innerHTML = renderProjects(data.projectPerformance || []);
        } catch (error) {
            this.logger().error("Overview load failed", error);
            this.container.innerHTML = renderError({ message: error.message, retryId: "overview-retry" });
            document.getElementById("overview-retry")?.addEventListener("click", () => this.render());
            this.notify().error(error.message);
        }
    }
}

export default new OverviewController();
