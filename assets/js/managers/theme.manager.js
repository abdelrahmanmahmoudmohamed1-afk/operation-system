import THEME_CONFIG from "../../config/theme.config.js";

class ThemeManager {
    constructor() {
        this.currentTheme = THEME_CONFIG.defaultTheme || "dark";
    }

    apply(themeName = this.currentTheme) {
        const themePath = THEME_CONFIG.themes[themeName];

        if (!themePath) {
            console.warn(`Theme not found: ${themeName}`);
            return;
        }

        const oldTheme = document.getElementById("app-theme");

        if (oldTheme) {
            oldTheme.remove();
        }

        const themeLink = document.createElement("link");
        themeLink.id = "app-theme";
        themeLink.rel = "stylesheet";
        // cache-busting: بنضيف رقم وقت عشوائي عشان المتصفح ميستخدمش
        // نسخة قديمة متخزنة من ملف الثيم بعد أي تعديل عليه.
        themeLink.href = `${themePath}?v=4.0.0`;

        document.head.appendChild(themeLink);

        this.currentTheme = themeName;
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

export default new ThemeManager();