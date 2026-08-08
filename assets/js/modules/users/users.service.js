import ApiService from "../../services/api.service.js";
import AuthManager from "../../managers/auth.manager.js";
import ENDPOINTS from "../../constants/endpoints.js";
import AuditService from "../../services/audit.service.js";

class UsersService {
    token() { return AuthManager.getToken(); }

    async loadUsers(forceRefresh = false) {
        const result = await ApiService.post(ENDPOINTS.USERS_DATA, { token: this.token() }, { forceRefresh });
        if (!result.ok) throw new Error(result.message);
        return result.data?.data || result.data || { users: [], summary: {} };
    }

    async createUser(data) {
        const result = await ApiService.post(ENDPOINTS.CREATE_SYSTEM_USER, { token: this.token(), data }, { forceRefresh: true });
        if (!result.ok) throw new Error(result.message);
        return result.data?.data || result.data;
    }

    async loadHistory(filters = {}, forceRefresh = false) {
        try {
            const result = await ApiService.post(ENDPOINTS.AUDIT_HISTORY, {
                token: this.token(), filters
            }, { forceRefresh });
            if (!result.ok) throw new Error(result.message || 'Audit service unavailable');
            return result.data?.data || result.data || [];
        } catch (error) {
            // GitHub/front-end mode: do not throw an ugly Unknown action alert.
            // Show the locally recorded activity until the server audit endpoint is available.
            return AuditService.list(500).map((x) => ({
                action: x.action,
                module: x.module,
                user: x.user,
                role: x.role,
                details: x.details,
                success: true,
                createdAt: x.createdAt
            }));
        }
    }
}

export default new UsersService();
