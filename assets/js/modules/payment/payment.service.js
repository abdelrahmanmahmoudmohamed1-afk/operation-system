import InventoryService from "../../services/inventory.service.js";
import PaymentCalculator from "../../services/payment.service.js";

const SOLD_STATUSES = new Set(["sold", "contracted", "resold", "cancelled"]);

function normalizeProject(value) {
    const v = String(value || "ALL").trim();
    return v && v.toUpperCase() !== "ALL" ? v : "ALL";
}

function normalizeUnit(u = {}) {
    const project = u.project || u.Project || "";
    const unitCode = u.unitCode || u.UnitCode || u["Unit Code"] || "";
    const soldPrice = Number(u.ticketPrice || u.TicketPrice || u.soldPrice || u.SoldPrice || u.price || u.Value || 0);
    return {
        ...u,
        id: u.id || `${project}||${unitCode}`,
        project,
        unitCode,
        unitType: u.unitType || u.UnitType || u["Unit Type"] || "Unit",
        status: u.status || u.Status || "Available",
        area: u.area || u.Area || u.totalArea || u.TotalArea || u.indoorArea || u["In Door Area"] || "",
        ticketPrice: soldPrice,
        soldPrice
    };
}

function isSelectable(u = {}) {
    const status = String(u.status || u.Status || u.inventoryStatus || u.InventoryStatus || "").trim().toLowerCase();
    return !SOLD_STATUSES.has(status) && (!status || status === "available" || status === "reserved" || status === "hold" || status === "on hold");
}

class PaymentModuleService {
    async loadUnits() {
        const selectedProject = normalizeProject(sessionStorage.getItem("operation_global_project"));
        const jobs = [];

        // Layana has a dedicated payment-plan source with the exact ticket price.
        if (selectedProject === "ALL" || selectedProject.toLowerCase() === "layana") {
            jobs.push(
                InventoryService.getLayanaUnits()
                    .then((rows) => (rows || []).map(normalizeUnit))
                    .catch(() => [])
            );
        }

        // All other projects are read from the unified inventory engine.
        // For ALL we exclude Layana here to avoid duplicate units because it is
        // already loaded from the dedicated source above.
        jobs.push(
            InventoryService.getData({
                project: selectedProject,
                status: "Available"
            }).then((rows) => (rows || [])
                .map(normalizeUnit)
                .filter((u) => selectedProject !== "ALL" || String(u.project).toLowerCase() !== "layana")
            ).catch(() => [])
        );

        const batches = await Promise.all(jobs);
        const merged = batches.flat();
        const seen = new Set();

        return merged
            .filter(isSelectable)
            .filter((u) => {
                const key = `${String(u.project || "").toLowerCase()}||${String(u.unitCode || "").toLowerCase()}`;
                if (!u.unitCode || seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => {
                const p = String(a.project || "").localeCompare(String(b.project || ""));
                return p || String(a.unitCode || "").localeCompare(String(b.unitCode || ""));
            });
    }

    years() {
        return PaymentCalculator.getAvailableYears();
    }

    calculate(input) {
        return PaymentCalculator.calculate(input);
    }

    compareToStandard(input) {
        return PaymentCalculator.compareToStandard(input);
    }

    validateScenario(plan) {
        return PaymentCalculator.validateScenario(plan);
    }
}

export default new PaymentModuleService();
