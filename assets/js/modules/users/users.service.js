import ApiService from "../../services/api.service.js";
import AuthManager from "../../managers/auth.manager.js";
import ENDPOINTS from "../../constants/endpoints.js";

class UsersService {
    token() { return AuthManager.getToken(); }

    async loadUsers(forceRefresh = false) {
        const result = await ApiService.post(ENDPOINTS.USERS_DATA, { token: this.token() }, { forceRefresh });
        if (!result.ok) throw new Error(result.message);
        return result.data?.data || result.data || { users: [], summary: {} };
    }

    async loadHistory(filters = {}, forceRefresh = false) {
        const result = await ApiService.post(ENDPOINTS.AUDIT_HISTORY, {
            token: this.token(), filters
        }, { forceRefresh });
        if (!result.ok) throw new Error(result.message);
        return result.data?.data || result.data || [];
    }
}

export default new UsersService();
