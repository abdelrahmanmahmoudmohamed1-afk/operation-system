import Container from "../core/container.js";
import ENDPOINTS from "../constants/endpoints.js";

class AuthService {
    api() { return Container.get("api"); }
    authManager() { return Container.get("authManager"); }

    async login(username, password) {
        const res = await this.api().post(ENDPOINTS.LOGIN, { username, password });
        if (!res.ok || !res.data || !res.data.ok) {
            return { success: false, message: (res.data && res.data.message) || res.message || "Login failed" };
        }
        const data = res.data.data || {};
        if (!data.success) return { success: false, message: data.message || "Invalid username or password" };
        this.authManager().login(data.token, data.user, data.refreshToken || "");
        return { success: true, token: data.token, refreshToken: data.refreshToken || "", user: data.user };
    }

    async changePassword(oldPassword, newPassword) {
        const token = this.authManager().getToken();
        const res = await this.api().post(ENDPOINTS.CHANGE_PASSWORD, {
            token,
            oldPassword,
            newPassword
        });

        if (!res.ok || !res.data || !res.data.ok) {
            return {
                success: false,
                message: (res.data && res.data.message) || res.message || "Password update failed"
            };
        }

        const data = res.data.data || {};
        return {
            success: Boolean(data.success),
            message: data.message || (data.success ? "Password updated" : "Password update failed")
        };
    }

    async logout() {
        const token = this.authManager().getToken();
        try { await this.api().post(ENDPOINTS.LOGOUT, { token }); } catch (e) { /* ignore */ }
        this.authManager().logout();
    }
}

export default new AuthService();
