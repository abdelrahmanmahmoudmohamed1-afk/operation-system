import Module from "../../core/module.js";
import ContractsService from "./contracts.service.js";
import { renderLayout, renderRows } from "./contracts.view.js";
import { renderLoading, renderEmptyRow, renderErrorRow } from "../../utils/state.js";

class ContractsController extends Module {
    async render() {
        this.container.innerHTML = renderLayout();
        document.getElementById("contracts-table-body").innerHTML = renderLoading({ rows: 6 });

        const tbody = document.getElementById("contracts-table-body");

        try {
            const rows = await ContractsService.loadContracted();

            if (tbody) {
                tbody.innerHTML = rows.length
                    ? renderRows(rows)
                    : renderEmptyRow(6, "No signed contracts yet");
            }
        } catch (error) {
            this.logger().error("Contracts load failed", error);
            if (tbody) tbody.innerHTML = renderErrorRow(6, error.message);
            this.notify().error(error.message);
        }
    }
}

export default new ContractsController();