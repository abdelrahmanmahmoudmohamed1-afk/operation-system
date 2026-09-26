import Module from "../../core/module.js";
import OverviewService from "./overview.service.js";
import { renderLayout, renderKpis, renderUnavailableKpis, renderPipeline, renderProjects } from "./overview.view.js";
import { renderLoading } from "../../utils/state.js";

class OverviewController extends Module {
    async render() {
        this.container.innerHTML = renderLayout();
        const kpis = document.getElementById("overview-kpis");
        if (kpis) kpis.innerHTML = renderLoading({ variant: "kpis", rows: 8 });
        await this.load();
    }

    async load() {
        try {
            const data = await OverviewService.loadData();
            const meta = document.getElementById("overview-meta");
            const kpis = document.getElementById("overview-kpis");
            const pipeline = document.getElementById("overview-pipeline");
            const projects = document.getElementById("overview-projects");

            const mode = data.meta?.sourceMode || "Live";
            if (meta) meta.textContent = `${mode} overview · Updated ${data.meta?.generatedAt ? new Date(data.meta.generatedAt).toLocaleString() : "just now"}`;
            if (kpis) kpis.innerHTML = renderKpis(data);
            if (pipeline) pipeline.innerHTML = renderPipeline(data.statusMix || []);
            if (projects) projects.innerHTML = renderProjects(data.projectPerformance || []);

            // Overview should stay usable even when the dedicated dashboard API is
            // unavailable. Only surface a soft warning when fallback data was used.
            if (data.__sourceHealth && data.__sourceHealth.dashboard === false && (data.reportRows || []).length) {
                this.notify().info("Overview recovered from Inventory / CRM data.");
            }
        } catch (error) {
            this.logger().error("Overview load failed", error);

            // Never destroy the whole page because one data endpoint failed.
            const meta = document.getElementById("overview-meta");
            const kpis = document.getElementById("overview-kpis");
            const pipeline = document.getElementById("overview-pipeline");
            const projects = document.getElementById("overview-projects");
            if (meta) meta.textContent = "Overview data is temporarily unavailable. Other modules remain usable.";
            if (kpis) kpis.innerHTML = renderUnavailableKpis("Data source check required");
            if (pipeline) pipeline.innerHTML = `<div class="state-inline-warning">No pipeline data returned. Use Refresh or change the project filter.</div>`;
            if (projects) projects.innerHTML = `<tr><td colspan="4">No project data returned</td></tr>`;
            this.notify().error(error.message || "Overview could not load data");
        }
    }
}

export default new OverviewController();
