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
        const res = await api.post("runDiagnostics", { token }, { forceRefresh: true, cacheTTL: 0 });
        const latency = Math.round(performance.now() - started);
        const info = res?.data?.data || null;
        return { ok: !!res.ok, latency, info, message: res.message || res?.data?.message || "" };
    }

    async getGmailStatus() {
        const api=Container.get("api"), token=Container.get("authManager").getToken();
        const res=await api.post("getGmailStatus",{token},{forceRefresh:true,cacheTTL:0});
        if(!res.ok) throw new Error(res.message); return res.data?.data || {};
    }

    async getGmailConnectUrl() {
        const api=Container.get("api"), token=Container.get("authManager").getToken();
        const res=await api.post("getGmailConnectUrl",{token},{forceRefresh:true,cacheTTL:0});
        if(!res.ok) throw new Error(res.message); return res.data?.data?.url || "";
    }

    async sendTestGmail(to) {
        const api=Container.get("api"), token=Container.get("authManager").getToken();
        const res=await api.post("sendGmail",{token,data:{to,subject:"Operation System - Gmail Test",body:"Gmail integration test completed successfully from Operation System.",documentIds:[]}},{forceRefresh:true,cacheTTL:0});
        if(!res.ok) throw new Error(res.message || "Test email failed");
        return res.data?.data || {};
    }

}

export default new SettingsModuleService();
