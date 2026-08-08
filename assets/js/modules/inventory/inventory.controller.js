import Module from "../../core/module.js";
import InventoryService from "./inventory.service.js";
import { renderLayout, renderRows, renderKpis, renderStatusOptions } from "./inventory.view.js";
import { renderLoading, renderEmptyRow, renderErrorRow } from "../../utils/state.js";

class InventoryController extends Module {
    constructor() {
        super();
        this.units = [];
        this.allStatuses = [];
        this.searchTerm = "";
    }

    async render() {
        let projects = [];

        try {
            projects = await InventoryService.loadProjects();
        } catch (error) {
            this.logger().warn("Failed to load projects list", error);
        }

        this.container.innerHTML = renderLayout(projects);
        const selectedGlobalProject = sessionStorage.getItem("operation_global_project") || "ALL";
        const projectSelect = document.getElementById("inv-project-filter");
        if (projectSelect && Array.from(projectSelect.options).some((o) => o.value === selectedGlobalProject)) {
            projectSelect.value = selectedGlobalProject;
        }
        const globalSearch = sessionStorage.getItem("operation_global_search");
        if (globalSearch) {
            try {
                const parsed = JSON.parse(globalSearch);
                if (parsed.target === "all" || parsed.target === "inventory") {
                    this.searchTerm = parsed.term || "";
                }
            } catch { this.searchTerm = ""; }
        }
        document.getElementById("inv-table-body").innerHTML = renderLoading({ rows: 6 });
        document.getElementById("inv-kpis").innerHTML = renderLoading({ variant: "kpis", rows: 4 });
        await this.loadUnits(true);
    }

    async loadUnits(isFirstLoad = false) {
        const tbody = document.getElementById("inv-table-body");
        const kpisBox = document.getElementById("inv-kpis");
        const statusSelect = document.getElementById("inv-status-filter");

        if (tbody) tbody.innerHTML = renderLoading({ rows: 6 });
        if (kpisBox) kpisBox.innerHTML = renderLoading({ variant: "kpis", rows: 4 });

        const filters = {
            project: document.getElementById("inv-project-filter")?.value || sessionStorage.getItem("operation_global_project") || "ALL",
            status: statusSelect?.value || "ALL"
        };

        try {
            this.units = await InventoryService.loadUnits(filters);

            // أول مرة بس بنبني قائمة كل الحالات الممكنة من الداتا
            // مفلترة بالمشروع بس (مش بالحالة نفسها)، عشان القايمة
            // متفضلش فاضية لو اخترت حالة معينة.
            if (isFirstLoad || !this.allStatuses.length) {
                const allForStatuses = filters.project === "ALL"
                    ? this.units
                    : await InventoryService.loadUnits({ project: filters.project, status: "ALL" });

                if (statusSelect) statusSelect.innerHTML = renderStatusOptions(allForStatuses, filters.status);
            }

            const visibleUnits = this.applySearch(this.units);
            if (tbody) {
                tbody.innerHTML = visibleUnits.length
                    ? renderRows(visibleUnits)
                    : renderEmptyRow(7, "No units match the selected filters");
            }
            if (kpisBox) kpisBox.innerHTML = renderKpis(visibleUnits);
        } catch (error) {
            this.logger().error("Inventory load failed", error);
            if (tbody) tbody.innerHTML = renderErrorRow(7, error.message);
            this.notify().error(error.message);
        }
    }

    applySearch(rows) {
        const q = String(this.searchTerm || "").toLowerCase().trim();
        if (!q) return rows || [];
        return (rows || []).filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)));
    }

    bindEvents() {
        const projectFilter = document.getElementById("inv-project-filter");
        const statusFilter = document.getElementById("inv-status-filter");
        const refreshBtn = document.getElementById("inv-refresh-btn");

        if (projectFilter) {
            projectFilter.addEventListener("change", () => {
                this.allStatuses = [];
                sessionStorage.setItem("operation_global_project", projectFilter.value || "ALL");
                const global = document.getElementById("global-project-filter");
                if (global && Array.from(global.options).some((o) => o.value === projectFilter.value)) global.value = projectFilter.value;
                this.loadUnits(true);
            });
        }
        if (statusFilter) statusFilter.addEventListener("change", () => this.loadUnits());
        if (refreshBtn) refreshBtn.addEventListener("click", () => this.loadUnits(true));
        window.addEventListener("operation:global-search", (e) => {
            const target = e.detail?.target || "all";
            if (target !== "all" && target !== "inventory") return;
            this.searchTerm = e.detail?.term || "";
            const tbody = document.getElementById("inv-table-body");
            const kpisBox = document.getElementById("inv-kpis");
            const visibleUnits = this.applySearch(this.units);
            if (tbody) tbody.innerHTML = visibleUnits.length ? renderRows(visibleUnits) : renderEmptyRow(7, "No units match your search");
            if (kpisBox) kpisBox.innerHTML = renderKpis(visibleUnits);
        });
    }
}

export default new InventoryController();
