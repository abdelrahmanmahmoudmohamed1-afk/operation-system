import Container from "../core/container.js";
import ENDPOINTS from "../constants/endpoints.js";

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
        const pick = (...keys) => {
            for (const key of keys) {
                const value = row?.[key];
                if (value !== undefined && value !== null && String(value).trim() !== '') return value;
            }
            return '';
        };
        const phone = (value) => {
            if (value === undefined || value === null) return '';
            // Preserve leading zero when the API already sent text; repair common numeric sheet values.
            let text = String(value).trim().replace(/\.0$/, '').replace(/[^0-9+]/g, '');
            if (/^1\d{9}$/.test(text)) text = '0' + text;
            return text;
        };
        return {
            ...row,
            unitCode: pick('unitCode', 'Unit Code', 'UnitCode'),
            project: pick('project', 'Project', 'Project Name'),
            clientName: pick('clientName', 'Client Name English', 'Client Name Arabic', 'Client Name'),
            clientPhone: phone(pick('clientPhone', 'Client Phone Number', 'Client Phone', 'Phone', 'Mobile', 'Primary Mobile')),
            clientPhone2: phone(pick('clientPhone2', 'Client Phone Number 2', 'Client Phone 2', 'Secondary Mobile', 'Mobile 2')),
            clientAddress: pick('clientAddress', 'Residence address', 'Residence Address', 'Client Address', 'Address'),
            salesName: pick('salesName', 'Sales Name', 'Sales'),
            status: pick('status', 'Status', 'Unit Status'),
            soldPrice: pick('soldPrice', 'Price After Discount', 'Contract Price', 'Sold Price', 'Value'),
            contractDate: pick('contractDate', 'Contract Date', 'Actual Contract Date'),
            reservationDate: pick('reservationDate', 'Reservition Date', 'Reservation Date'),
            soldDate: pick('soldDate', 'Sold Date', 'Sale Date')
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
        const res = await this.api().post(ENDPOINTS.UPLOAD_CLIENT_CONTRACT, { token: this.token(), data }, { cacheTTL: 0 });
        const msg = res?.data?.message || res?.message || "";
        if (!res.ok && /Unknown action:\s*uploadClientContract/i.test(msg)) {
            throw new Error("Contract upload service is not available in this build. Your selected file was not uploaded.");
        }
        return this.unwrap(res);
    }

    async getDocuments(filters = {}) {
        const res = await this.api().post(ENDPOINTS.CLIENT_DOCUMENTS, { token: this.token(), filters });
        return this.unwrap(res);
    }

    unwrap(res) {
        if (!res.ok || !res.data || !res.data.ok) {
            throw new Error((res.data && res.data.message) || res.message || "Request failed");
        }
        return res.data.data;
    }
}

export default new ClientService();
