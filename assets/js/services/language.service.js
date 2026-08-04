import APP_CONFIG from "../../config/app.config.js";
import EN from "../../localization/en.js";
import AR from "../../localization/ar.js";

const DICTS = { en: EN, ar: AR };
const STORAGE_KEY = "operation_system_language";

class LanguageService {
    constructor() {
        this.language = localStorage.getItem(STORAGE_KEY) || APP_CONFIG.defaultLanguage || "en";
        if (!DICTS[this.language]) this.language = "en";
    }

    getLanguage() { return this.language; }
    isArabic() { return this.language === "ar"; }

    setLanguage(language) {
        if (!DICTS[language]) language = "en";
        this.language = language;
        localStorage.setItem(STORAGE_KEY, language);
        document.documentElement.lang = language;
        document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
        window.dispatchEvent(new CustomEvent("operation-system:language-changed", { detail: { language } }));
    }

    init() {
        this.setLanguage(this.language);
    }

    t(key, fallback = "") {
        return DICTS[this.language]?.[key] || DICTS.en?.[key] || fallback || key;
    }

    status(value) {
        const raw = String(value || "").trim();
        const key = `status_${raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
        return this.t(key, raw || "-");
    }
}

export default new LanguageService();
