/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: dashboard.controller.js
 * Layer: Modules / Dashboard
 * Responsibility:
 * - Dashboard module controller: KPIs, charts, and detail
 *   tables, wired to the real backend
 * ---------------------------------------------------------
 * Version: 1.1.0
 * ---------------------------------------------------------
 */

import Module from "../../core/module.js";
import DashboardService from "./dashboard.service.js";
import {
    renderLayout, renderKpis, renderStatusComboKpis, renderProjectTable, renderSalesTable,
    renderManagerTable, renderDirectorTable, renderBrokerTable, renderTopUnitsTable
} from "./dashboard.view.js";
import { renderLoading, renderError, renderEmptyRow } from "../../utils/state.js";

const CHART_COLORS = ["#C9A227", "#E7DDD0", "#8A7B65", "#4ADE80", "#F87171", "#6B94C4", "#A8D5C8"];

class DashboardController extends Module {
    constructor() {
        super();
        this.charts = {};
    }

    async render() {
        this.container.innerHTML = renderLayout();
        document.getElementById("dash-kpis").innerHTML = renderLoading({ variant: "kpis", rows: 8 });
        await this.loadData();
    }

    async loadData() {
        const metaEl = document.getElementById("dash-meta");
        const kpisEl = document.getElementById("dash-kpis");

        if (kpisEl) kpisEl.innerHTML = renderLoading({ variant: "kpis", rows: 8 });

        try {
            const data = await DashboardService.loadData({});

            if (!data?.meta || Number(data.meta.rowsInventory || 0) === 0) {
                throw new Error("No inventory rows were returned. The backend deployment or sheet configuration needs attention; zero cards are not valid data.");
            }
            if (metaEl) {
                metaEl.textContent = `Updated ${data.meta.generatedAt} • ${data.meta.rowsInventory} rows • ${data.meta.sourceSheet || "Inventory"}`;
            }

            if (kpisEl) kpisEl.innerHTML = renderKpis(data.kpis);

            const comboEl = document.getElementById("dash-combo-kpis");
            if (comboEl) comboEl.innerHTML = renderStatusComboKpis(data.statusMix || []);

            this.fillTable("dash-project-table", data.projectPerformance, renderProjectTable, 4);
            this.fillTable("dash-sales-table", data.salesPerformance, renderSalesTable, 4);
            this.fillTable("dash-manager-table", data.managerPerformance, renderManagerTable, 3);
            this.fillTable("dash-director-table", data.directorPerformance, renderDirectorTable, 3);
            this.fillTable("dash-broker-table", data.brokerPerformance, renderBrokerTable, 3);
            this.fillTable("dash-top-units-table", data.topUnits, renderTopUnitsTable, 7);

            this.renderTrendChart(data.trendMonthly || []);
            this.renderStatusChart(data.statusMix || []);
            this.renderProjectChart(data.projectPerformance || []);
        } catch (error) {
            this.logger().error("Dashboard load failed", error);

            if (metaEl) metaEl.textContent = "Failed to load data";
            if (kpisEl) {
                kpisEl.innerHTML = renderError({ message: error.message, retryId: "dash-retry-kpis" });
                document.getElementById("dash-retry-kpis")?.addEventListener("click", () => this.loadData());
            }

            this.notify().error(error.message);
        }
    }

    fillTable(id, rows, renderFn, colspan) {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = rows && rows.length ? renderFn(rows) : renderEmptyRow(colspan, "No data for this period");
    }

    destroyChart(key) {
        if (this.charts[key]) {
            try { this.charts[key].destroy(); } catch (e) { /* ignore */ }
            delete this.charts[key];
        }
    }

    renderTrendChart(rows) {
        this.destroyChart("trend");
        const canvas = document.getElementById("dash-trend-chart");
        if (!canvas || typeof Chart === "undefined") return;

        this.charts.trend = new Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
                labels: rows.map((r) => r.Month),
                datasets: [
                    {
                        label: "Sales Value",
                        data: rows.map((r) => r.SalesValue),
                        borderColor: "#C9A227",
                        backgroundColor: "rgba(201,162,39,.15)",
                        tension: .3,
                        fill: true
                    },
                    {
                        label: "Cancelled Value",
                        data: rows.map((r) => r.CancelledValue),
                        borderColor: "#F87171",
                        backgroundColor: "rgba(248,113,113,.10)",
                        tension: .3,
                        fill: true
                    }
                ]
            },
            options: chartBaseOptions()
        });
    }

    renderStatusChart(rows) {
        this.destroyChart("status");
        const canvas = document.getElementById("dash-status-chart");
        if (!canvas || typeof Chart === "undefined") return;

        this.charts.status = new Chart(canvas.getContext("2d"), {
            type: "doughnut",
            data: {
                labels: rows.map((r) => r.Status),
                datasets: [{
                    data: rows.map((r) => r.Units),
                    backgroundColor: CHART_COLORS,
                    borderColor: "rgba(255,255,255,.15)",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "62%",
                plugins: {
                    legend: { position: "bottom", labels: { color: "#ECEEF1", boxWidth: 12, font: { family: "Raleway" } } }
                }
            }
        });
    }

    renderProjectChart(rows) {
        this.destroyChart("project");
        const canvas = document.getElementById("dash-project-chart");
        if (!canvas || typeof Chart === "undefined") return;

        const top = rows.slice(0, 10);

        this.charts.project = new Chart(canvas.getContext("2d"), {
            type: "bar",
            data: {
                labels: top.map((r) => r.Project),
                datasets: [{
                    label: "Value",
                    data: top.map((r) => r.Value),
                    backgroundColor: "rgba(201,162,39,.55)",
                    borderColor: "#C9A227",
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: chartBaseOptions(true)
        });
    }

    bindEvents() {
        const refreshBtn = document.getElementById("dash-refresh-btn");
        if (refreshBtn) refreshBtn.addEventListener("click", () => { DashboardService.clearCache?.(); this.loadData(); });
    }

    async destroy() {
        Object.keys(this.charts).forEach((k) => this.destroyChart(k));
        await super.destroy();
    }
}

function chartBaseOptions(hideLegend = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: !hideLegend, labels: { color: "#ECEEF1", font: { family: "Raleway" } } }
        },
        scales: {
            x: { ticks: { color: "#8B94A3", font: { family: "Raleway" } }, grid: { color: "rgba(255,255,255,.06)" } },
            y: { ticks: { color: "#8B94A3", font: { family: "Raleway" } }, grid: { color: "rgba(255,255,255,.06)" } }
        }
    };
}

export default new DashboardController();
