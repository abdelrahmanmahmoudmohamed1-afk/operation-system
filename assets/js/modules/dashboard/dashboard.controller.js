import { projectLabel } from "../../utils/project-label.js";
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

const CHART_COLORS = ["#2563eb", "#60a5fa", "#4ADE80", "#F87171", "#6B94C4", "#A8D5C8", "#D89A5B"];
function themeChartColors() {
    const css = getComputedStyle(document.documentElement);
    const pick = (name, fallback) => (css.getPropertyValue(name) || '').trim() || fallback;
    return {
        text: pick('--text', '#20242B'),
        muted: pick('--text-muted', pick('--muted', '#6B7280')),
        line: pick('--line', 'rgba(127,127,127,.18)'),
        surface: pick('--surface', pick('--card', '#FFFFFF')),
        accent: pick('--accent', '#2563eb')
    };
}

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

            if (metaEl) {
                metaEl.textContent = `Updated ${new Date(data.meta.generatedAt).toLocaleString()} · ${data.meta.rowsInventory} inventory units`;
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
                        borderColor: "#2563eb",
                        backgroundColor: "rgba(37,99,235,.12)",
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
                    legend: { position: "bottom", labels: { color: themeChartColors().text, boxWidth: 12, font: { family: "Inter" } } }
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
                    borderColor: "#2563eb",
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: chartBaseOptions(true)
        });
    }

    bindEvents() {
        const refreshBtn = document.getElementById("dash-refresh-btn");
        if (refreshBtn) refreshBtn.addEventListener("click", () => this.loadData());
    }

    async destroy() {
        Object.keys(this.charts).forEach((k) => this.destroyChart(k));
        await super.destroy();
    }
}

function chartBaseOptions(hideLegend = false) {
    const c = themeChartColors();
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: !hideLegend, labels: { color: c.text, font: { family: "Inter" } } }
        },
        scales: {
            x: { ticks: { color: c.muted, font: { family: "Inter" } }, grid: { color: c.line } },
            y: { ticks: { color: c.muted, font: { family: "Inter" } }, grid: { color: c.line } }
        }
    };
}

export default new DashboardController();
