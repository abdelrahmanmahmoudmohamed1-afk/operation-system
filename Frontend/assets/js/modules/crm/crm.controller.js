import Module from "../../core/module.js";
import CrmService from "./crm.service.js";
import { renderLayout, renderTableRows, renderRegisterForm } from "./crm.view.js";
import { renderLoading, renderEmptyRow, renderErrorRow } from "../../utils/state.js";

class CRMController extends Module {
    constructor() {
        super();
        this.clients = [];
        this.bootstrap = null;
    }

    async render() {
        this.container.innerHTML = renderLayout();
        document.getElementById("crm-table-body").innerHTML = renderLoading({ rows: 6 });

        // لو جاي من بار البحث العام فوق، نطبّق الكلمة على طول
        const pendingSearch = sessionStorage.getItem("toledo_pending_search");
        const globalSearch = sessionStorage.getItem("toledo_global_search");
        let searchTerm = pendingSearch || "";
        if (globalSearch) {
            try {
                const parsed = JSON.parse(globalSearch);
                if (parsed.target === "all" || parsed.target === "crm") searchTerm = parsed.term || searchTerm;
            } catch { /* ignore */ }
        }
        if (searchTerm) {
            sessionStorage.removeItem("toledo_pending_search");
            const searchInput = document.getElementById("crm-search");
            if (searchInput) searchInput.value = searchTerm;
            await this.loadClients(searchTerm);
            return;
        }

        await this.loadClients();
    }

    async loadClients(search = "") {
        const tbody = document.getElementById("crm-table-body");
        if (tbody) tbody.innerHTML = renderLoading({ rows: 6 });

        try {
            this.clients = await CrmService.loadClients({ search });

            if (tbody) {
                tbody.innerHTML = this.clients.length
                    ? renderTableRows(this.clients)
                    : renderEmptyRow(7, search ? "No clients match your search" : "No clients registered yet");
            }
        } catch (error) {
            this.logger().error("CRM load failed", error);
            if (tbody) tbody.innerHTML = renderErrorRow(7, error.message);
            this.notify().error(error.message);
        }
    }

    bindEvents() {
        const searchInput = document.getElementById("crm-search");
        const refreshBtn = document.getElementById("crm-refresh-btn");
        const addBtn = document.getElementById("crm-add-btn");

        if (searchInput) {
            let timer;
            searchInput.addEventListener("input", (e) => {
                clearTimeout(timer);
                timer = setTimeout(() => this.loadClients(e.target.value), 350);
            });
        }

        if (refreshBtn) refreshBtn.addEventListener("click", () => this.loadClients());
        window.addEventListener("toledo:global-search", (e) => {
            const term = e.detail?.term || "";
            const target = e.detail?.target || "all";
            if (target === "all" || target === "crm") {
                if (searchInput) searchInput.value = term;
                this.loadClients(term);
            }
        });
        if (addBtn) addBtn.addEventListener("click", () => this.openRegisterModal());
    }

    async openRegisterModal() {
        const root = document.getElementById("crm-modal-root");
        if (!root) return;

        try {
            this.bootstrap = await CrmService.loadBootstrap();
        } catch (error) {
            this.notify().error(error.message);
            return;
        }

        root.innerHTML = renderRegisterForm({
            salesOptions: this.bootstrap.sales,
            lists: this.bootstrap.lists
        });

        document.getElementById("crm-cancel-btn").addEventListener("click", () => { root.innerHTML = ""; });
        document.getElementById("crm-modal-backdrop").addEventListener("click", (e) => {
            if (e.target.id === "crm-modal-backdrop") root.innerHTML = "";
        });

        document.getElementById("crm-client-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            await this.submitClient(e.target, root);
        });
    }

    async submitClient(form, modalRoot) {
        const errorBox = document.getElementById("crm-form-error");
        const submitBtn = form.querySelector('button[type="submit"]');
        const formData = Object.fromEntries(new FormData(form).entries());

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Saving..."; }
        errorBox.classList.add("hidden");

        try {
            await CrmService.saveClient(formData);
            this.notify().success("Client registered successfully");
            modalRoot.innerHTML = "";
            await this.loadClients();
        } catch (error) {
            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Save Client"; }
        }
    }
}

export default new CRMController();
