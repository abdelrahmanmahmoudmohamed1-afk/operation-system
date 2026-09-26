import { projectLabel } from "../../utils/project-label.js";
import { escapeHtml } from "../../utils/helpers.js";
import Formatter from "../../utils/formatter.js";

function unitLabel(u) {
    const status = u.status || u.Status || "Available";
    const area = u.area || u.Area || u.totalArea || u.TotalArea || "-";
    return `${projectLabel(u.project || u.Project || "Project")} — ${u.unitCode || u.UnitCode || u.id} — ${u.unitType || u.UnitType || "Unit"} — ${area} m² — ${Formatter.money(u.ticketPrice || u.TicketPrice || u.soldPrice || 0)} — ${status}`;
}

export function renderLayout(units, years) {
    const unitOpts = (units || []).map((u) => `
        <option value="${escapeHtml(u.id || u.unitCode || u.UnitCode)}">${escapeHtml(unitLabel(u))}</option>
    `).join("");

    const yearOpts = (years || []).map((y) => `<option value="${y}">${y} Years</option>`).join("");
    const compareOpts = (years || []).map((y) => `<label class="plan-check"><input type="checkbox" name="pay-compare-years" value="${y}" ${[5,6,7,8,9,10].includes(Number(y)) ? "checked" : ""}> ${y}Y</label>`).join("");

    return `
        <div class="page-header enterprise-page-head">
            <div>
                <span class="report-eyebrow">Payment intelligence center</span>
                <h1>Payment Plans</h1>
                <p>Generate, customize, validate and compare payment scenarios against the standard plan.</p>
            </div>
        </div>

        <div class="card payment-builder-premium enterprise-payment-builder">
            <div class="report-builder-topline">
                <div>
                    <span class="report-eyebrow">Plan Generator</span>
                    <h2>Standard & Custom Payment Plans</h2>
                </div>
                <div class="report-save-inline">
                    <button class="btn btn-outline" id="pay-save-scenario">Save Scenario</button>
                    <button class="btn btn-outline" id="pay-compare-btn">Compare Plans</button>
                    <button class="btn btn-primary" id="pay-generate-btn">Generate Plan</button>
                </div>
            </div>

            <div class="report-tabs">
                <button class="report-tab active" data-pay-tab="basic">Basic</button>
                <button class="report-tab" data-pay-tab="custom">Custom Rules</button>
                <button class="report-tab" data-pay-tab="cashflow">Cash Flow</button>
                <button class="report-tab" data-pay-tab="saved">Saved Scenarios</button>
            </div>

            <div class="report-tab-panel active" id="pay-tab-basic">
                <div class="report-builder-grid premium-report-grid enterprise-filter-grid">
                    <div class="filter-field report-filter-field wide">
                        <label>Unit Code</label>
                        <div class="select-shell"><select id="pay-unit-select" class="premium-select"><option value="">Select available unit</option>${unitOpts}</select></div>
                        <small class="field-hint">Sold / Contracted units are excluded automatically.</small>
                    </div>
                    <div class="filter-field report-filter-field">
                        <label>Main Plan</label>
                        <div class="select-shell"><select id="pay-years-select" class="premium-select">${yearOpts}</select></div>
                    </div>
                    <div class="filter-field report-filter-field">
                        <label>Booking Date</label>
                        <input type="date" id="pay-date-input" class="premium-input">
                    </div>
                    <div class="filter-field report-filter-field wide">
                        <label>Plans to Compare</label>
                        <div class="plan-check-row">${compareOpts}</div>
                    </div>
                </div>
            </div>

            <div class="report-tab-panel" id="pay-tab-custom">
                <div class="report-builder-grid premium-report-grid enterprise-filter-grid">
                    <div class="filter-field report-filter-field"><label>Discount %</label><input type="number" id="pay-custom-discount" class="premium-input" placeholder="Auto" step="0.1"></div>
                    <div class="filter-field report-filter-field"><label>Down Payment %</label><input type="number" id="pay-custom-down" class="premium-input" placeholder="Auto" step="0.1"></div>
                    <div class="filter-field report-filter-field"><label>Frequency</label><div class="select-shell"><select id="pay-frequency" class="premium-select"><option value="quarter">Quarterly</option><option value="monthly">Monthly</option><option value="semi">Semi Annual</option><option value="annual">Annual</option></select></div></div>
                    <div class="filter-field report-filter-field"><label>First Installment After</label><div class="select-shell"><select id="pay-first-after" class="premium-select"><option value="3">3 Months</option><option value="6">6 Months</option><option value="12">12 Months</option></select></div></div>
                    <div class="filter-field report-filter-field"><label>Maintenance %</label><input type="number" id="pay-maintenance" class="premium-input" placeholder="0" step="0.1"></div>
                    <div class="filter-field report-filter-field"><label>Rounding</label><div class="select-shell"><select id="pay-rounding" class="premium-select"><option value="1">Exact</option><option value="1000">Round to 1,000</option><option value="5000">Round to 5,000</option><option value="10000">Round to 10,000</option><option value="100000">Round to 100,000</option></select></div></div>
                </div>
            </div>

            <div class="report-tab-panel" id="pay-tab-cashflow">
                <div class="cashflow-toolbar">
                    <div>
                        <strong>Manual Cash Flow Payments</strong>
                        <p>Add extra payments by percentage or fixed amount, then validate against the 50% / 3 years rule.</p>
                    </div>
                    <button class="btn btn-outline" id="pay-add-custom-payment">Add Payment</button>
                </div>
                <div id="pay-custom-payments" class="custom-payments-list">
                    ${renderCustomPaymentRow(0)}
                </div>
            </div>

            <div class="report-tab-panel" id="pay-tab-saved">
                <div class="saved-reports premium-saved-reports">
                    <strong>Saved Payment Scenarios</strong>
                    <div id="pay-saved-list" class="saved-report-list"><span class="muted">No saved scenarios yet.</span></div>
                </div>
            </div>
        </div>

        <div id="pay-plan-output"></div>
    `;
}

export function renderCustomPaymentRow(index, row = {}) {
    return `
        <div class="custom-payment-row" data-custom-payment-row>
            <input class="premium-input" data-payment-label placeholder="Payment label" value="${escapeHtml(row.label || `Extra Payment ${index + 1}`)}">
            <select class="premium-select" data-payment-type>
                <option value="percent" ${row.amountType !== "amount" ? "selected" : ""}>Percent %</option>
                <option value="amount" ${row.amountType === "amount" ? "selected" : ""}>Fixed Amount</option>
            </select>
            <input class="premium-input" type="number" data-payment-value placeholder="Value" step="0.1" value="${escapeHtml(row.value || "")}">
            <input class="premium-input" type="number" data-payment-after placeholder="After months" value="${escapeHtml(row.afterMonths || 0)}">
            <button class="btn btn-outline" data-remove-payment type="button">Remove</button>
        </div>
    `;
}

export function renderPlan(plan, comparison) {
    if (!plan) return "";

    const validationClass = plan.validation?.passed ? "scenario-ok" : "scenario-warning";
    const compareClass = comparison?.status === "lower" ? "scenario-warning" : comparison?.status === "higher" ? "scenario-ok" : "scenario-exact";

    const rows = plan.schedule.map((s) => `
        <tr>
            <td>${escapeHtml(s.label)}</td>
            <td>${Formatter.date(s.date)}</td>
            <td>${Formatter.money(s.amount)}</td>
            <td>${escapeHtml(s.type || "-")}</td>
        </tr>
    `).join("");

    return `
        <div class="scenario-alerts">
            <div class="scenario-alert ${validationClass}">
                <strong>50% / 3 Years Rule</strong>
                <span>${escapeHtml(plan.validation?.message || "-")}</span>
                <b>${Formatter.percent((plan.validation?.collectedRateAt36Months || 0) * 100)} collected</b>
            </div>
            ${comparison ? `<div class="scenario-alert ${compareClass}"><strong>Standard Plan Comparison</strong><span>${escapeHtml(comparison.message)}</span><b>${Formatter.money(comparison.delta || 0)}</b></div>` : ""}
        </div>

        <div class="kpi-grid enterprise-report-kpis payment-kpis">
            <div class="kpi-card"><div class="kpi-title">Ticket Price</div><div class="kpi-value">${Formatter.money(plan.ticketPrice)}</div></div>
            <div class="kpi-card"><div class="kpi-title">Discount</div><div class="kpi-value">${Formatter.percent(plan.discountRate * 100)}</div></div>
            <div class="kpi-card"><div class="kpi-title">Price After Discount</div><div class="kpi-value">${Formatter.money(plan.discountedPrice)}</div></div>
            <div class="kpi-card"><div class="kpi-title">Down Payment</div><div class="kpi-value">${Formatter.money(plan.downPayment)}</div></div>
            <div class="kpi-card"><div class="kpi-title">Custom Payments</div><div class="kpi-value">${Formatter.money(plan.customPaymentsTotal || 0)}</div></div>
            <div class="kpi-card"><div class="kpi-title">Collected / 3Y</div><div class="kpi-value">${Formatter.money(plan.collectedAt36Months || 0)}</div></div>
            <div class="kpi-card"><div class="kpi-title">Maintenance</div><div class="kpi-value">${Formatter.money(plan.maintenanceAmount || 0)}</div></div>
            <div class="kpi-card"><div class="kpi-title">Installment</div><div class="kpi-value">${Formatter.money(plan.installmentAmount)}</div></div>
        </div>

        <div class="table-wrap report-table-wrap enterprise-table-wrap">
            <div class="report-table-header"><div><div class="dash-chart-title">Cash Flow Schedule</div><strong>${plan.installmentsCount}</strong> installments · ${plan.frequencyLabel || "Quarterly"}</div></div>
            <div class="report-table-scroll">
                <table class="data-table">
                    <thead><tr><th>Payment</th><th>Date</th><th>Amount</th><th>Type</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

export function renderComparison(plans) {
    if (!plans || !plans.length) return "";
    const cards = plans.map((p) => `
        <div class="payment-compare-card detail-row" data-detail='${escapeHtml(JSON.stringify({ years: p.years, price: p.discountedPrice, downPayment: p.downPayment, installment: p.installmentAmount }))}'>
            <div class="payment-compare-title">${p.years} Years</div>
            <div class="payment-compare-price">${Formatter.money(p.discountedPrice)}</div>
            <div class="payment-compare-line"><span>Collected / 3Y</span><strong>${Formatter.money(p.collectedAt36Months || 0)}</strong></div>
            <div class="payment-compare-line"><span>Rule</span><strong>${p.validation?.passed ? "Passed" : "Warning"}</strong></div>
            <div class="payment-compare-line"><span>Discount</span><strong>${Formatter.percent(p.discountRate * 100)}</strong></div>
            <div class="payment-compare-line"><span>Down Payment</span><strong>${Formatter.money(p.downPayment)}</strong></div>
            <div class="payment-compare-line"><span>Installment</span><strong>${Formatter.money(p.installmentAmount)}</strong></div>
            <div class="payment-compare-line"><span>Frequency</span><strong>${escapeHtml(p.frequencyLabel || "Quarterly")}</strong></div>
            <div class="payment-compare-line"><span>Installments</span><strong>${p.installmentsCount}</strong></div>
        </div>
    `).join("");
    return `<div class="dash-section-title">Payment Plan Comparison</div><div class="payment-compare-grid enterprise-payment-compare">${cards}</div>`;
}
