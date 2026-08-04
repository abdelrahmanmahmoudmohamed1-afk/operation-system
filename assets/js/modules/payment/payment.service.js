import InventoryService from "../../services/inventory.service.js";
import PaymentCalculator from "../../services/payment.service.js";

const SOLD_STATUSES = new Set(["sold", "contracted", "resold", "cancelled"]);

class PaymentModuleService {
    async loadUnits() {
        const units = await InventoryService.getLayanaUnits();
        return (units || [])
            .filter((u) => {
                const status = String(u.status || u.Status || u.inventoryStatus || u.InventoryStatus || "").trim().toLowerCase();
                return !SOLD_STATUSES.has(status);
            })
            .sort((a, b) => String(a.unitCode || a.UnitCode || "").localeCompare(String(b.unitCode || b.UnitCode || "")));
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
