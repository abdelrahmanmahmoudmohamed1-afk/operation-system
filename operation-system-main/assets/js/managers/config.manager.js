import APP_CONFIG from "../../config/app.config.js";
import API_CONFIG from "../../config/api.config.js";
import ROUTES from "../../config/routes.config.js";
import MODULES from "../../config/modules.config.js";

class ConfigManager {
    getAppConfig() {
        return APP_CONFIG;
    }

    getApiConfig() {
        return API_CONFIG;
    }

    getRoutes() {
        return ROUTES;
    }

    getModules() {
        return MODULES;
    }

    get(key, defaultValue = null) {
        return APP_CONFIG[key] ?? defaultValue;
    }
}

export default new ConfigManager();