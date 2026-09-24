import Module from "../../core/module.js";
import PaymentService from "./payment.service.js";
import { renderLayout, renderPlan, renderComparison, renderCustomPaymentRow } from "./payment.view.js";

class PaymentController extends Module {
    constructor() {
        super();
        this.units = [];
        this.savedKey = "operation_saved_payment_scenarios_v1";
    }

    async render() {
        try {
            this.units = await PaymentService.loadUnits();
        } catch (error) {
            this.units = [];
            this.logger().warn("Failed to load available units", error);
            this.notify().warning("Units could not be loaded. Check inventory API/data source.");
        }

        this.container.innerHTML = renderLayout(this.units, PaymentService.years());
        const dateInput = document.getElementById("pay-date-input");
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
        this.renderSavedScenarios();
    }

    bindEvents() {
        document.getElementById("pay-generate-btn")?.addEventListener("click", () => this.generate());
        document.getElementById("pay-compare-btn")?.addEventListener("click", () => this.compare());
        document.getElementById("pay-save-scenario")?.addEventListener("click", () => this.saveScenario());
        document.getElementById("pay-add-custom-payment")?.addEventListener("click", () => this.addCustomPaymentRow());
        document.querySelectorAll("[data-pay-tab]").forEach((btn) => btn.addEventListener("click", () => this.switchTab(btn.dataset.payTab)));
        this.bindCustomPaymentRemove();
    }

    switchTab(name) {
        document.querySelectorAll(".report-tab").forEach((x) => x.classList.toggle("active", x.dataset.payTab === name));
        document.querySelectorAll(".report-tab-panel").forEach((x) => x.classList.toggle("active", x.id === `pay-tab-${name}`));
    }

    addCustomPaymentRow(row = null) {
        const list = document.getElementById("pay-custom-payments");
        if (!list) return;
        const count = list.querySelectorAll("[data-custom-payment-row]").length;
        list.insertAdjacentHTML("beforeend", renderCustomPaymentRow(count, row || {}));
        this.bindCustomPaymentRemove();
    }

    bindCustomPaymentRemove() {
        document.querySelectorAll("[data-remove-payment]").forEach((btn) => {
            if (btn.dataset.bound) return;
            btn.dataset.bound = "1";
            btn.addEventListener("click", () => {
                const rows = document.querySelectorAll("[data-custom-payment-row]");
                if (rows.length <= 1) {
                    const row = btn.closest("[data-custom-payment-row]");
                    row?.querySelectorAll("input").forEach((x) => x.value = "");
                    return;
                }
                btn.closest("[data-custom-payment-row]")?.remove();
            });
        });
    }

    getSelectedUnit() {
        const unitId = document.getElementById("pay-unit-select")?.value;
        return this.units.find((u) => String(u.id || u.unitCode || u.UnitCode) === String(unitId));
    }

    getCustomPayments() {
        return Array.from(document.querySelectorAll("[data-custom-payment-row]")).map((row) => ({
            label: row.querySelector("[data-payment-label]")?.value || "Extra Payment",
            amountType: row.querySelector("[data-payment-type]")?.value || "percent",
            value: Number(row.querySelector("[data-payment-value]")?.value || 0),
            afterMonths: Number(row.querySelector("[data-payment-after]")?.value || 0)
        })).filter((x) => x.value > 0);
    }

    getOptions() {
        return {
            discountRate: this.percent("pay-custom-discount"),
            downRate: this.percent("pay-custom-down"),
            frequency: document.getElementById("pay-frequency")?.value || "quarter",
            firstAfterMonths: Number(document.getElementById("pay-first-after")?.value || 3),
            maintenanceRate: this.percent("pay-maintenance") || 0,
            rounding: Number(document.getElementById("pay-rounding")?.value || 1),
            customPayments: this.getCustomPayments()
        };
    }

    percent(id) {
        const value = document.getElementById(id)?.value;
        if (value === "" || value === undefined) return null;
        return Number(value) / 100;
    }

    unitPrice(unit) {
        return Number(unit.ticketPrice || unit.TicketPrice || unit.price || unit.Value || 0);
    }

    generate() {
        const unit = this.getSelectedUnit();
        const years = Number(document.getElementById("pay-years-select")?.value);
        const bookingDate = document.getElementById("pay-date-input")?.value;
        const output = document.getElementById("pay-plan-output");

        if (!unit) return this.notify().warning("Please select an available unit first");

        try {
            window.dispatchEvent(new CustomEvent("operation:busy", { detail: { active: true, kind: "payment", message: "Building payment plan…" } }));
            const input = { ticketPrice: this.unitPrice(unit), years, bookingDate, options: this.getOptions() };
            const comparison = PaymentService.compareToStandard(input);
            if (output) output.innerHTML = renderPlan({ ...comparison.custom, years }, comparison);
            this.notify()[comparison.status === "lower" ? "warning" : "success"](comparison.message);
        } catch (error) {
            this.notify().error(error.message);
        } finally {
            setTimeout(() => window.dispatchEvent(new CustomEvent("operation:busy", { detail: { active: false } })), 420);
        }
    }

    compare() {
        const unit = this.getSelectedUnit();
        const bookingDate = document.getElementById("pay-date-input")?.value;
        const output = document.getElementById("pay-plan-output");
        if (!unit) return this.notify().warning("Please select an available unit first");
        const years = Array.from(document.querySelectorAll("input[name='pay-compare-years']:checked")).map((x) => Number(x.value));
        if (!years.length) return this.notify().warning("Select at least one plan to compare");
        try {
            const options = this.getOptions();
            const plans = years.map((y) => ({ ...PaymentService.calculate({ ticketPrice: this.unitPrice(unit), years: y, bookingDate, options }), years: y }));
            const selectedYears = Number(document.getElementById("pay-years-select")?.value) || years[0];
            const selected = plans.find((p) => p.years === selectedYears) || plans[0];
            const comparison = PaymentService.compareToStandard({ ticketPrice: this.unitPrice(unit), years: selected.years, bookingDate, options });
            if (output) output.innerHTML = renderComparison(plans) + renderPlan(selected, comparison);
        } catch (error) {
            this.notify().error(error.message);
        }
    }

    saveScenario() {
        const unit = this.getSelectedUnit();
        if (!unit) return this.notify().warning("Please select an available unit first");
        const scenario = {
            unitId: unit.id || unit.unitCode || unit.UnitCode,
            unitCode: unit.unitCode || unit.UnitCode,
            years: Number(document.getElementById("pay-years-select")?.value),
            bookingDate: document.getElementById("pay-date-input")?.value,
            options: this.getOptions(),
            createdAt: new Date().toISOString()
        };
        const list = this.savedScenarios();
        list.unshift(scenario);
        localStorage.setItem(this.savedKey, JSON.stringify(list.slice(0, 50)));
        this.renderSavedScenarios();
        this.notify().success("Payment scenario saved");
    }

    savedScenarios() {
        try { return JSON.parse(localStorage.getItem(this.savedKey) || "[]"); } catch { return []; }
    }

    renderSavedScenarios() {
        const el = document.getElementById("pay-saved-list");
        if (!el) return;
        const list = this.savedScenarios();
        if (!list.length) { el.innerHTML = `<span class="muted">No saved scenarios yet.</span>`; return; }
        el.innerHTML = list.map((s, i) => `<button class="saved-report-chip" data-pay-saved="${i}"><span>${s.unitCode} · ${s.years}Y</span><small>${new Date(s.createdAt).toLocaleDateString()}</small></button>`).join("");
        el.querySelectorAll("[data-pay-saved]").forEach((btn) => btn.addEventListener("click", () => this.loadScenario(list[Number(btn.dataset.paySaved)])));
    }

    loadScenario(s) {
        if (!s) return;
        const set = (id, value) => { const el = document.getElementById(id); if (el && value !== undefined && value !== null) el.value = value; };
        set("pay-unit-select", s.unitId);
        set("pay-years-select", s.years);
        set("pay-date-input", s.bookingDate);
        set("pay-frequency", s.options?.frequency);
        set("pay-first-after", s.options?.firstAfterMonths);
        set("pay-rounding", s.options?.rounding);
        set("pay-custom-discount", s.options?.discountRate != null ? s.options.discountRate * 100 : "");
        set("pay-custom-down", s.options?.downRate != null ? s.options.downRate * 100 : "");
        set("pay-maintenance", s.options?.maintenanceRate != null ? s.options.maintenanceRate * 100 : "");
        const list = document.getElementById("pay-custom-payments");
        if (list) {
            const rows = s.options?.customPayments?.length ? s.options.customPayments : [{}];
            list.innerHTML = rows.map((row, i) => renderCustomPaymentRow(i, row)).join("");
            this.bindCustomPaymentRemove();
        }
        this.switchTab("basic");
        this.generate();
    }
}

export default new PaymentController();
