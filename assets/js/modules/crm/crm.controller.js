import Module from "../../core/module.js";
import CrmService from "./crm.service.js";
import { renderLayout, renderTableRows, renderRegisterForm, renderUploadContractModal, renderDocumentsModal, renderDocumentCoverage } from "./crm.view.js";
import { openClient360 } from "../../utils/profile360.js";
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
        const pendingSearch = sessionStorage.getItem("operation_pending_search");
        const globalSearch = sessionStorage.getItem("operation_global_search");
        let searchTerm = pendingSearch || "";
        if (globalSearch) {
            try {
                const parsed = JSON.parse(globalSearch);
                if (parsed.target === "all" || parsed.target === "crm") searchTerm = parsed.term || searchTerm;
            } catch { /* ignore */ }
        }
        if (searchTerm) {
            sessionStorage.removeItem("operation_pending_search");
            const searchInput = document.getElementById("crm-search");
            if (searchInput) searchInput.value = searchTerm;
            await this.loadClients(searchTerm);
            return;
        }

        await Promise.all([this.loadClients(), this.loadCoverage()]);
    }


    async loadCoverage(){
        const box=document.getElementById("crm-document-kpis"); if(!box)return;
        try{const project=sessionStorage.getItem("operation_global_project")||"ALL";const stats=await CrmService.loadDocumentCoverage({project});box.innerHTML=renderDocumentCoverage(stats||{});}catch(e){box.innerHTML=renderDocumentCoverage({});this.logger().warn("Document coverage unavailable",e);}
    }
    async loadClients(search = "") {
        const tbody = document.getElementById("crm-table-body");
        if (tbody) tbody.innerHTML = renderLoading({ rows: 6 });

        try {
            const project = sessionStorage.getItem("operation_global_project") || "ALL";
            this.clients = await CrmService.loadClients({ search, project });

            if (tbody) {
                tbody.innerHTML = this.clients.length
                    ? renderTableRows(this.clients)
                    : renderEmptyRow(10, search ? "No clients match your search" : "No clients registered yet");
            }
        } catch (error) {
            this.logger().error("CRM load failed", error);
            if (tbody) tbody.innerHTML = renderErrorRow(10, error.message);
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

        if (refreshBtn) refreshBtn.addEventListener("click", () => Promise.all([this.loadClients(),this.loadCoverage()]));
        window.addEventListener("operation:global-search", (e) => {
            const term = e.detail?.term || "";
            const target = e.detail?.target || "all";
            if (target === "all" || target === "crm") {
                if (searchInput) searchInput.value = term;
                this.loadClients(term);
            }
        });
        if (addBtn) addBtn.addEventListener("click", () => this.openRegisterModal());

        document.getElementById("crm-table-body")?.addEventListener("click", (event) => {
            const open360 = event.target.closest(".crm-open-360");
            if (open360) {
                event.preventDefault();
                event.stopPropagation();
                try { openClient360(JSON.parse(open360.dataset.clientRow || "{}")); } catch (_) {}
                return;
            }
            const upload = event.target.closest(".crm-upload-contract");
            const view = event.target.closest(".crm-view-documents");
            const button = upload || view;
            if (!button) return;
            event.preventDefault();
            event.stopPropagation();
            let client = {};
            try { client = JSON.parse(button.dataset.client || "{}"); } catch (_) {}
            if (upload) this.openContractUploadModal(client);
            else this.openDocumentsModal(client);
        });
    }

    async openDocumentsModal(client) {
        const root = document.getElementById("crm-modal-root");
        if (!root) return;
        try {
            const docs = await CrmService.loadDocuments({ unitCode: client.unitCode, project: client.project });
            root.innerHTML = renderDocumentsModal(client, Array.isArray(docs) ? docs : []);
            const close = () => { root.innerHTML = ""; };
            document.getElementById("crm-documents-close")?.addEventListener("click", close);
            document.getElementById("crm-documents-modal-backdrop")?.addEventListener("click", (event) => { if (event.target.id === "crm-documents-modal-backdrop") close(); });
            root.querySelectorAll(".crm-download-local-doc").forEach((button) => button.addEventListener("click", async () => {
                const doc = (Array.isArray(docs) ? docs : []).find((x) => String(x.id) === String(button.dataset.docId));
                if (!doc?.base64) return;
                const binary = atob(doc.base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const blob = new Blob([bytes], { type: doc.mimeType || "application/pdf" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = doc.fileName || "document.pdf";
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            }));
        } catch (error) { this.notify().error(error.message || "Could not load client documents"); }
    }

    openContractUploadModal(client) {
        const root = document.getElementById("crm-modal-root");
        if (!root) return;
        root.innerHTML = renderUploadContractModal(client);

        const close = () => { root.innerHTML = ""; };
        document.getElementById("crm-contract-cancel")?.addEventListener("click", close);
        document.getElementById("crm-contract-modal-backdrop")?.addEventListener("click", (event) => {
            if (event.target.id === "crm-contract-modal-backdrop") close();
        });
        document.getElementById("crm-contract-upload-form")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const file = document.getElementById("crm-contract-file")?.files?.[0];
            const errorBox = document.getElementById("crm-contract-error");
            const submit = document.getElementById("crm-contract-submit");
            if (!file) return this.showContractError(errorBox, "Please select a PDF file.");
            if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return this.showContractError(errorBox, "Only PDF files are allowed.");
            if (file.size > 8 * 1024 * 1024) return this.showContractError(errorBox, "The PDF must be 8 MB or smaller.");
            if (submit) { submit.disabled = true; submit.textContent = "Uploading..."; }
            if (errorBox) errorBox.classList.add("hidden");
            try {
                const base64 = await this.fileToBase64(file);
                const documentType = document.querySelector("#crm-contract-upload-form [name=\"documentType\"]")?.value || "Contract";
                window.dispatchEvent(new CustomEvent("operation:busy", { detail: { active: true, kind: "upload", message: "Uploading contract PDF…" } }));
                const result = await CrmService.uploadContract({
                    ...client,
                    documentType,
                    fileName: file.name,
                    mimeType: file.type || "application/pdf",
                    base64
                });
                this.notify().success(result?.message || "PDF uploaded successfully");
                close();
            } catch (error) {
                window.dispatchEvent(new CustomEvent("operation:busy", { detail: { active: false } }));
                const message = String(error?.message || "Upload failed");
                this.showContractError(errorBox, message);
                this.notify().warning(message, 4800);
                if (submit) { submit.disabled = false; submit.textContent = "Upload PDF"; }
            }
        });
    }

    showContractError(element, message) {
        if (!element) { this.notify().error(message); return; }
        element.textContent = message;
        element.classList.remove("hidden");
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
            reader.onerror = () => reject(new Error("Could not read the selected file."));
            reader.readAsDataURL(file);
        });
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
