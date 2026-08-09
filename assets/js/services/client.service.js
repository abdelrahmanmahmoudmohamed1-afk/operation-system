import Container from "../core/container.js";
import ENDPOINTS from "../constants/endpoints.js";
import DocumentStorageService from "./document-storage.service.js";

class ClientService {
    api() { return Container.get("api"); }
    token() { return Container.get("authManager").getToken(); }

    async getBootstrap() {
        const res = await this.api().post(ENDPOINTS.CLIENT_FORM_BOOTSTRAP, { token: this.token() });
        return this.unwrap(res);
    }

    async getClients(filters = {}) {
        const res = await this.api().post(ENDPOINTS.CLIENTS_LIST, { token: this.token(), filters });
        const rows = this.unwrap(res);
        return Array.isArray(rows) ? rows.map((row) => this.normalizeClient(row)) : [];
    }

    normalizeClient(row = {}) {
        const normalizeKey = (key) => String(key || "").toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "");
        const flat = new Map();
        const visit = (value, prefix = "") => {
            if (!value || typeof value !== "object" || Array.isArray(value)) return;
            Object.entries(value).forEach(([key, child]) => {
                const full = prefix ? `${prefix}.${key}` : key;
                if (child && typeof child === "object" && !Array.isArray(child)) visit(child, full);
                else {
                    flat.set(normalizeKey(key), child);
                    flat.set(normalizeKey(full), child);
                }
            });
        };
        visit(row);
        const pick = (...keys) => {
            for (const key of keys) {
                const direct = row?.[key];
                if (direct !== undefined && direct !== null && String(direct).trim() !== "") return direct;
                const mapped = flat.get(normalizeKey(key));
                if (mapped !== undefined && mapped !== null && String(mapped).trim() !== "") return mapped;
            }
            return "";
        };
        const phone = (value) => {
            if (value === undefined || value === null || value === "") return "";
            let text = String(value).trim().replace(/\.0$/, "").replace(/[^0-9+]/g, "");
            if (/^1\d{9}$/.test(text)) text = "0" + text;
            if (/^20(1\d{9})$/.test(text)) text = "0" + text.slice(2);
            return text;
        };
        return {
            ...row,
            unitCode: pick("unitCode", "Unit Code", "UnitCode", "Unit No", "Unit Number"),
            project: pick("project", "Project", "Project Name"),
            clientName: pick("clientName", "Client Name English", "Client Name Arabic", "Client Name", "Full Name"),
            clientPhone: phone(pick("clientPhone", "Client Phone Number", "Client Phone Number 1", "Client Phone", "Phone", "Mobile", "Mobile Number", "Primary Mobile", "Phone 1")),
            clientPhone2: phone(pick("clientPhone2", "Client Phone Number 2", "Client Phone 2", "Secondary Mobile", "Mobile 2", "Phone 2")),
            clientAddress: pick("clientAddress", "Residence address", "Residence Address", "Client Residence Address", "Client Address", "Full Address", "Address"),
            salesName: pick("salesName", "Sales Name", "Sales", "Sales Agent"),
            status: pick("status", "Status", "Unit Status", "Contract Status"),
            soldPrice: pick("soldPrice", "Price After Discount", "Contract Price", "Sold Price", "Value", "System Price"),
            contractDate: pick("contractDate", "Contract Date", "Actual Contract Date"),
            reservationDate: pick("reservationDate", "Reservition Date", "Reservation Date"),
            soldDate: pick("soldDate", "Sold Date", "Sale Date"),
            clientEmail: pick("clientEmail", "E-mail", "Email", "Client Email"),
            nationality: pick("nationality", "Client Nationality", "Nationality"),
            residence: pick("residence", "Client Residence", "Residence")
        };
    }

    async getCompanies(salesName) {
        const res = await this.api().post(ENDPOINTS.COMPANIES, { token: this.token(), salesName });
        return this.unwrap(res);
    }

    async getManagerDirector(salesName) {
        const res = await this.api().post(ENDPOINTS.MANAGER_DIRECTOR, { token: this.token(), salesName });
        return this.unwrap(res);
    }

    async saveClient(data) {
        const res = await this.api().post(ENDPOINTS.SAVE_CLIENT, { token: this.token(), data });
        return this.unwrap(res);
    }

    async uploadContract(data) {
        return this.uploadPdfAction(
            ENDPOINTS.UPLOAD_CLIENT_CONTRACT,
            ["uploadContractPdf"],
            data,
            "Contract PDF"
        );
    }

    async getDocuments(filters = {}) {
        const res = await this.api().post(ENDPOINTS.CLIENT_DOCUMENTS, { token: this.token(), filters });
        return this.unwrap(res) || [];
    }

    async getDocumentCoverage(filters = {}) {
        const res = await this.api().post(ENDPOINTS.DOCUMENT_COVERAGE, { token: this.token(), filters });
        return this.unwrap(res);
    }

    async getFloorPlan(filters = {}) {
        const res = await this.api().post(ENDPOINTS.UNIT_FLOOR_PLAN, { token: this.token(), filters });
        return this.unwrap(res);
    }

    async uploadFloorPlan(data) {
        return this.uploadPdfAction(
            ENDPOINTS.UPLOAD_UNIT_FLOOR_PLAN,
            ["uploadFloorPlanPdf"],
            data,
            "Architectural drawing"
        );
    }

    async uploadPdfAction(primaryAction, aliases = [], data = {}, label = "PDF") {
        const file = data.file;
        if (!(file instanceof File)) throw new Error(`${label}: please select the PDF file again.`);
        const kind = primaryAction === ENDPOINTS.UPLOAD_UNIT_FLOOR_PLAN ? "floor_plan" : "contract";
        const uploaded = await DocumentStorageService.uploadPdf(file, {
            kind,
            project: data.project,
            unitCode: data.unitCode,
            clientName: data.clientName,
            maxMB: kind === "floor_plan" ? 25 : 25
        });
        const metadata = {
            ...data,
            file: undefined,
            base64: undefined,
            fileName: uploaded.fileName,
            mimeType: uploaded.mimeType,
            fileSize: uploaded.size,
            bucket: uploaded.bucket,
            storagePath: uploaded.path
        };
        const res = await this.api().post(primaryAction, { token: this.token(), data: metadata }, { cacheTTL: 0, forceRefresh: true });
        if (!res?.ok || res?.data?.ok === false) {
            throw new Error(String(res?.data?.message || res?.message || `${label} metadata registration failed.`));
        }
        return this.unwrap(res);
    }

    async getFloorPlanCoverage(filters = {}) {
        const res = await this.api().post(ENDPOINTS.FLOOR_PLAN_COVERAGE, { token: this.token(), filters });
        return this.unwrap(res);
    }

    openDocumentDb() {
        return new Promise((resolve, reject) => {
            if (!("indexedDB" in window)) return reject(new Error("Local document storage is not supported by this browser."));
            const request = indexedDB.open("operation-system-local-vault", 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains("documents")) {
                    const store = db.createObjectStore("documents", { keyPath: "id", autoIncrement: true });
                    store.createIndex("unitCode", "unitCode", { unique: false });
                    store.createIndex("project", "project", { unique: false });
                    store.createIndex("createdAt", "createdAt", { unique: false });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Could not open local document vault."));
        });
    }

    async saveLocalDocument(data = {}) {
        const db = await this.openDocumentDb();
        const record = { ...data, createdAt: new Date().toISOString(), storage: "local-browser" };
        return new Promise((resolve, reject) => {
            const tx = db.transaction("documents", "readwrite");
            const req = tx.objectStore("documents").add(record);
            req.onsuccess = () => resolve({ ...record, id: req.result, local: true });
            req.onerror = () => reject(req.error || new Error("Could not save PDF locally."));
            tx.oncomplete = () => db.close();
        });
    }

    async getLocalDocuments(filters = {}) {
        try {
            const db = await this.openDocumentDb();
            const rows = await new Promise((resolve, reject) => {
                const tx = db.transaction("documents", "readonly");
                const req = tx.objectStore("documents").getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
                tx.oncomplete = () => db.close();
            });
            return rows.filter((row) => {
                if (filters.project && filters.project !== "ALL" && String(row.project || "").toLowerCase() !== String(filters.project).toLowerCase()) return false;
                if (filters.unitCode && String(row.unitCode || "").toLowerCase() !== String(filters.unitCode).toLowerCase()) return false;
                return true;
            });
        } catch (_) { return []; }
    }

    unwrap(res) {
        if (!res.ok || !res.data || !res.data.ok) {
            throw new Error((res.data && res.data.message) || res.message || "Request failed");
        }
        return res.data.data;
    }
}

export default new ClientService();
