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
}

export default new SettingsModuleService();
