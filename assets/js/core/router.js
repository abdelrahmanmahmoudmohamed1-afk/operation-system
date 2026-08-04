/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: router.js
 * Layer: Core
 * Responsibility:
 * - Handle application routing
 * - Load modules through ModuleLoader
 * - Update browser history
 * - Emit route lifecycle events
 * ---------------------------------------------------------
 * Version: 0.3.0
 * ---------------------------------------------------------
 */

import MODULES from "../../config/modules.config.js";
import Container from "./container.js";

class Router {
    constructor(moduleLoader) {
        this.moduleLoader = moduleLoader;
        this.currentRoute = null;
    }

    async load(routeName, pushState = true) {
        const moduleConfig = MODULES[routeName];
        const authManager = Container.get("authManager");
        if (routeName === "users" && !authManager.getUser()?.isOwner) {
            this.logger().warn("Blocked unauthorized Users route access");
            routeName = "overview";
            return this.load(routeName, pushState);
        }

        if (!moduleConfig) {
            this.logger().warn(`Route not found: ${routeName}`);
            return;
        }

        this.eventBus().emit("route:before-change", {
            from: this.currentRoute,
            to: routeName
        });

        await this.moduleLoader.load(routeName);

        this.currentRoute = routeName;

        this.setActiveLink(routeName);
        this.updatePageTitle(moduleConfig.name);

        if (pushState) {
            history.pushState({ route: routeName }, "", `#${routeName}`);
        }

        this.eventBus().emit("route:after-change", {
            current: routeName,
            config: moduleConfig
        });

        this.logger().info(`Route changed to: ${routeName}`);
    }

    setActiveLink(routeName) {
        document.querySelectorAll("[data-route]").forEach((button) => {
            button.classList.toggle(
                "active",
                button.getAttribute("data-route") === routeName
            );
        });
    }

    updatePageTitle(pageName) {
        const appConfig = Container.get("configManager").getAppConfig();

        document.title = `${pageName} | ${appConfig.name}`;
    }

    listen() {
        window.addEventListener("popstate", (event) => {
            const route = event.state?.route || "dashboard";
            this.load(route, false);
        });
    }

    logger() {
        return Container.get("logger");
    }

    eventBus() {
        return Container.get("eventBus");
    }
}

export default Router;