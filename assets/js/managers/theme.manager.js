import THEME_CONFIG from "../../config/theme.config.js";

class ThemeManager {
    constructor(){ this.currentTheme = localStorage.getItem("operation_theme") || THEME_CONFIG.defaultTheme || "dark"; }
    apply(themeName=this.currentTheme){
        const themePath=THEME_CONFIG.themes[themeName]; if(!themePath){ console.warn(`Theme not found: ${themeName}`); return; }
        document.getElementById("app-theme")?.remove();
        const link=document.createElement("link"); link.id="app-theme"; link.rel="stylesheet"; link.href=`${themePath}?v=5.7.0`; document.head.appendChild(link);
        this.currentTheme=themeName; localStorage.setItem("operation_theme",themeName);
        document.documentElement.dataset.theme=themeName; document.body?.setAttribute("data-theme",themeName);
        window.dispatchEvent(new CustomEvent("operation:theme-change",{detail:{theme:themeName}}));
    }
    getCurrentTheme(){ return this.currentTheme; }
}
export default new ThemeManager();
