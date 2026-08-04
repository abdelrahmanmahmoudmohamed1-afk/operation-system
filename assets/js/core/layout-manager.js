import Sidebar from "../components/Sidebar.js";
import MENU from "../constants/menu.js";
import Container from "./container.js";
import APP_CONFIG from "../../config/app.config.js";

class LayoutManager {
    constructor(appContainerId = "app") {
        this.appContainer = document.getElementById(appContainerId);
    }

    async loadMainLayout() {
        try {
            const response = await fetch("layouts/main.html", { cache: "force-cache" });

            if (!response.ok) {
                throw new Error("Failed to load main layout");
            }

            const html = await response.text();
            this.appContainer.innerHTML = html;

            this.renderSidebar();
            this.renderTopbarUser();
            this.renderFooter();
            this.bindRouteTitleUpdates();
            this.startClock();
        } catch (error) {
            console.error(error);
            this.appContainer.innerHTML = `
                <section>
                    <h1>Failed to load system layout</h1>
                </section>
            `;
        }
    }

    startClock() {
        const clockEl = document.getElementById("topbar-clock");
        if (!clockEl) return;

        const update = () => {
            const now = new Date();
            const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            clockEl.textContent = `${date} — ${time}`;
        };

        update();
        setInterval(update, 1000);
    }

    renderSidebar() {
        const sidebarContainer = document.getElementById("sidebar-container");

        if (!sidebarContainer) {
            console.warn("Sidebar container not found");
            return;
        }

        const authManager = Container.get("authManager");
        const permissionManager = Container.get("permissionManager");
        const role = String(authManager.getUser()?.role || "user").toLowerCase();
        const visibleMenu = MENU.filter((item) => permissionManager.can(role, item.route));
        const sidebar = new Sidebar(visibleMenu);
        sidebarContainer.innerHTML = sidebar.render();
    }

    renderTopbarUser() {
        const authManager = Container.get("authManager");
        const user = authManager.getUser();

        const nameEl = document.getElementById("topbar-user-name");
        const roleEl = document.getElementById("topbar-user-role");

        if (nameEl) nameEl.textContent = user && user.name ? user.name : "";
        if (roleEl) roleEl.textContent = user && user.role ? user.role : "";
    }

    renderFooter() {
        const versionEl = document.getElementById("footer-version");
        if (versionEl) versionEl.textContent = "v" + (APP_CONFIG.version || "1.0.0");
    }

    bindRouteTitleUpdates() {
        const eventBus = Container.get("eventBus");

        eventBus.on("route:after-change", ({ config }) => {
            const titleEl = document.getElementById("page-title");
            if (titleEl && config) titleEl.textContent = config.name;
        });
    }
}

export default LayoutManager;