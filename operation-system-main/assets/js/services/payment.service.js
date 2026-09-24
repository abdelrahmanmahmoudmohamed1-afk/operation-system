const PLAN_RULES = {
    5: { discountRate: 0.15, downRate: 0.10 },
    6: { discountRate: 0.15, downRate: 0.15 },
    7: { discountRate: 0.05, downRate: 0.10 },
    8: { discountRate: 0.05, downRate: 0.10 },
    9: { discountRate: 0.05, downRate: 0.15 },
    10: { discountRate: 0.05, downRate: 0.20 }
};

const FREQUENCY = {
    monthly: { months: 1, perYear: 12, label: "Monthly" },
    quarter: { months: 3, perYear: 4, label: "Quarterly" },
    semi: { months: 6, perYear: 2, label: "Semi Annual" },
    annual: { months: 12, perYear: 1, label: "Annual" }
};

class PaymentService {
    getAvailableYears() {
        return Object.keys(PLAN_RULES).map(Number).sort((a, b) => a - b);
    }

    round(value, step = 1) {
        const s = Number(step || 1);
        return s <= 1 ? Math.round(value) : Math.ceil(value / s) * s;
    }

    addMonths(date, months) {
        const d = new Date(date);
        d.setMonth(d.getMonth() + Number(months || 0));
        return d;
    }

    calculate({ ticketPrice, years, bookingDate, options = {} }) {
        const rule = PLAN_RULES[years];
        if (!rule) throw new Error("Plan years not supported: " + years);

        const frequency = FREQUENCY[options.frequency || "quarter"] || FREQUENCY.quarter;
        const discountRate = options.discountRate ?? rule.discountRate;
        const downRate = options.downRate ?? rule.downRate;
        const rounding = options.rounding || 1;
        const firstAfterMonths = Number(options.firstAfterMonths || frequency.months);
        const maintenanceRate = Number(options.maintenanceRate || 0);
        const customPayments = this.normalizeCustomPayments(options.customPayments || []);

        const basePrice = Number(ticketPrice || 0);
        if (!basePrice || basePrice <= 0) throw new Error("Ticket price is missing or invalid");

        const discountedPrice = this.round(basePrice * (1 - discountRate), rounding);
        const standardDownPayment = this.round(discountedPrice * downRate, rounding);
        const maintenanceAmount = this.round(discountedPrice * maintenanceRate, rounding);
        const start = bookingDate ? new Date(bookingDate) : new Date();
        const schedule = [];

        let upfrontPaid = 0;
        schedule.push({ label: "Down Payment", date: start, amount: standardDownPayment, type: "downPayment" });
        upfrontPaid += standardDownPayment;

        customPayments.forEach((p, index) => {
            const amount = p.amountType === "percent"
                ? this.round(discountedPrice * (Number(p.value || 0) / 100), rounding)
                : this.round(Number(p.value || 0), rounding);
            if (amount > 0) {
                schedule.push({
                    label: p.label || `Custom Payment ${index + 1}`,
                    date: this.addMonths(start, p.afterMonths || 0),
                    amount,
                    type: "customPayment"
                });
                upfrontPaid += amount;
            }
        });

        if (maintenanceAmount) {
            schedule.push({ label: "Maintenance", date: start, amount: maintenanceAmount, type: "maintenance" });
        }

        const remaining = Math.max(discountedPrice - upfrontPaid, 0);
        const installmentsCount = years * frequency.perYear;
        let installmentAmount = this.round(remaining / installmentsCount, rounding);

        let installmentPaid = 0;
        for (let i = 1; i <= installmentsCount; i++) {
            const date = this.addMonths(start, firstAfterMonths + ((i - 1) * frequency.months));
            let amount = installmentAmount;
            if (i === installmentsCount) amount = Math.max(remaining - installmentPaid, 0);
            installmentPaid += amount;
            schedule.push({ label: "Installment " + i, date, amount, type: "installment" });
        }

        schedule.sort((a, b) => new Date(a.date) - new Date(b.date));

        const collectedAt36Months = this.collectedUntil(schedule, start, 36, false);
        const collectedRateAt36Months = discountedPrice ? collectedAt36Months / discountedPrice : 0;
        const validation = this.validateScenario({ schedule, discountedPrice, start });

        return {
            ticketPrice: basePrice,
            years,
            discountRate,
            discountedPrice,
            downPayment: standardDownPayment,
            customPaymentsTotal: upfrontPaid - standardDownPayment,
            collectedBeforeInstallments: upfrontPaid,
            collectedAt36Months,
            collectedRateAt36Months,
            maintenanceAmount,
            remaining,
            installmentsCount,
            installmentAmount,
            frequency: options.frequency || "quarter",
            frequencyLabel: frequency.label,
            firstAfterMonths,
            customPayments,
            schedule,
            validation
        };
    }

    normalizeCustomPayments(rows) {
        return (rows || [])
            .map((r) => ({
                label: String(r.label || "").trim(),
                amountType: r.amountType === "amount" ? "amount" : "percent",
                value: Number(r.value || 0),
                afterMonths: Number(r.afterMonths || 0)
            }))
            .filter((r) => r.value > 0);
    }

    collectedUntil(schedule, start, months, includeMaintenance = false) {
        const limit = this.addMonths(start, months);
        return (schedule || [])
            .filter((x) => includeMaintenance || x.type !== "maintenance")
            .filter((x) => new Date(x.date) <= limit)
            .reduce((sum, x) => sum + Number(x.amount || 0), 0);
    }

    validateScenario(plan) {
        const collected = this.collectedUntil(plan.schedule, plan.start || new Date(), 36, false);
        const rate = plan.discountedPrice ? collected / plan.discountedPrice : 0;
        const passed = rate >= 0.5;
        return {
            passed,
            collectedAt36Months: collected,
            collectedRateAt36Months: rate,
            message: passed
                ? "Validation passed: collected amount reaches 50% within 3 years."
                : "Warning: collected amount is less than 50% within 3 years."
        };
    }

    compareToStandard({ ticketPrice, years, bookingDate, options = {} }) {
        const custom = this.calculate({ ticketPrice, years, bookingDate, options });
        const standard = this.calculate({ ticketPrice, years, bookingDate, options: {} });
        const delta = custom.collectedAt36Months - standard.collectedAt36Months;
        const tolerance = 1;
        let status = "equal";
        let message = "The custom scenario matches the standard scenario exactly for collected cash flow within 3 years.";
        if (delta < -tolerance) {
            status = "lower";
            message = "Warning: the custom scenario collects less than the standard payment plan within 3 years.";
        } else if (delta > tolerance) {
            status = "higher";
            message = "Positive: the custom scenario collects more than the standard payment plan within 3 years.";
        }
        return { custom, standard, delta, status, message };
    }
}

export default new PaymentService();
