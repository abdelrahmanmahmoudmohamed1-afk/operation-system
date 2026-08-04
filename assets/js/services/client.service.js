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
        return this.unwrap(res);
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
        const res = await this.api().post(ENDPOINTS.UPLOAD_CLIENT_CONTRACT, { token: this.token(), data }, { forceRefresh: true });
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
