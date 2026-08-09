import AuthService from "../../services/auth.service.js";
import Container from "../../core/container.js";

class SettingsModuleService {
    getCurrentUser() {
        return Container.get("authManager").getUser();
    }

    changePassword(oldPassword, newPassword) {
        return AuthService.changePassword(oldPassword, newPassword);
    }

    getTheme() {
        return Container.get("themeManager").getCurrentTheme();
    }

    setTheme(theme) {
        Container.get("themeManager").apply(theme);
    }
    async getSystemDiagnostics() {
        const api = Container.get("api");
        const token = Container.get("authManager").getToken();
        const started = performance.now();
        const res = await api.post("getSystemInfo", { token }, { forceRefresh: true, cacheTTL: 0 });
        const latency = Math.round(performance.now() - started);
        const info = res?.data?.data || null;
        if (res.ok && info) api.setBackendInfo?.(info);
        return { ok: !!res.ok, latency, info, message: res.message || res?.data?.message || "" };
    }

}

export default new SettingsModuleService();
