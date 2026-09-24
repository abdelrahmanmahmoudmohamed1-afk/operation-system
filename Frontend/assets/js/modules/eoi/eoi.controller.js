import Module from "../../core/module.js";
import EoiService from "./eoi.service.js";
import { renderLayout, renderRows, renderKpis, renderForm } from "./eoi.view.js";
import { renderLoading, renderEmptyRow, renderErrorRow } from "../../utils/state.js";

class EOIController extends Module {
    constructor() {
        super();
        this.data = null;
        this.bootstrap = null;
    }

    async render() {
        this.container.innerHTML = renderLayout();
        document.getElementById("eoi-table-body").innerHTML = renderLoading({ rows: 6 });
        document.getElementById("eoi-kpis").innerHTML = renderLoading({ variant: "kpis", rows: 2 });
        await this.loadData();
    }

    async loadData() {
        const tbody = document.getElementById("eoi-table-body");
        const kpisBox = document.getElementById("eoi-kpis");

        if (tbody) tbody.innerHTML = renderLoading({ rows: 6 });
        if (kpisBox) kpisBox.innerHTML = renderLoading({ variant: "kpis", rows: 2 });

        try {
            this.data = await EoiService.loadData({});

            if (tbody) {
                tbody.innerHTML = this.data.rows.length
                    ? renderRows(this.data.rows)
                    : renderEmptyRow(7, "No EOI records yet");
            }
            if (kpisBox) kpisBox.innerHTML = renderKpis(this.data);
        } catch (error) {
            this.logger().error("EOI load failed", error);
            if (tbody) tbody.innerHTML = renderErrorRow(7, error.message);
            this.notify().error(error.message);
        }
    }

    bindEvents() {
        const addBtn = document.getElementById("eoi-add-btn");
        if (addBtn) addBtn.addEventListener("click", () => this.openForm());
    }

    async openForm() {
        const root = document.getElementById("eoi-modal-root");
        if (!root) return;

        try {
            this.bootstrap = await EoiService.loadBootstrap();
        } catch (error) {
            this.notify().error(error.message);
            return;
        }

        root.innerHTML = renderForm({ salesOptions: this.bootstrap.sales, lists: this.bootstrap.lists });

        document.getElementById("eoi-cancel-btn").addEventListener("click", () => { root.innerHTML = ""; });
        document.getElementById("eoi-modal-backdrop").addEventListener("click", (e) => {
            if (e.target.id === "eoi-modal-backdrop") root.innerHTML = "";
        });

        document.getElementById("eoi-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            const errorBox = document.getElementById("eoi-form-error");
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const formData = Object.fromEntries(new FormData(e.target).entries());

            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Saving..."; }
            errorBox.classList.add("hidden");

            try {
                await EoiService.save(formData);
                this.notify().success("EOI saved successfully");
                root.innerHTML = "";
                await this.loadData();
            } catch (error) {
                errorBox.textContent = error.message;
                errorBox.classList.remove("hidden");
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Save EOI"; }
            }
        });
    }
}

export default new EOIController();