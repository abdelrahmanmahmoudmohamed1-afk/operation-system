/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: module-loader.js
 * Layer: Core
 * Responsibility:
 * - Dynamically load application modules
 * - Manage module lifecycle
 * ---------------------------------------------------------
 * Version: 0.3.0
 * ---------------------------------------------------------
 */

import MODULES from "../../config/modules.config.js";
import Container from "./container.js";

class ModuleLoader {
    constructor(containerId = "page-content") {
        this.container = document.getElementById(containerId);
        this.currentModule = null;
        this.currentController = null;
        this.progressTimer = null;
    }

    async load(moduleName) {
        const moduleConfig = MODULES[moduleName];

        if (!moduleConfig) {
            this.showError(`Module not found: ${moduleName}`);
            return;
        }

        this.showProgress();

        try {
            await this.destroyCurrentModule();

            const controllerPath = this.buildControllerPath(moduleConfig);
            const controllerModule = await import(controllerPath);
            const controller = controllerModule.default;

            if (!controller || typeof controller.init !== "function") {
                throw new Error(`Invalid controller for module: ${moduleName}`);
            }

            this.currentModule = moduleName;
            this.currentController = controller;

            await controller.init({
                container: this.container,
                config: moduleConfig
            });

            this.eventBus().emit("module:loaded", {
                name: moduleName,
                config: moduleConfig
            });

            this.logger().info(`Module loaded: ${moduleName}`);
        } catch (error) {
            this.logger().error(`Failed to load module: ${moduleName}`, error);
            this.showError(`Failed to load module: ${moduleName}`);
        } finally {
            this.hideProgress();
        }
    }

    showProgress() {
        clearTimeout(this.progressTimer);
        this.progressTimer = setTimeout(() => {
            let bar = document.getElementById("route-progress");
            let overlay = document.getElementById("route-loader");
            if (!bar) {
                bar = document.createElement("div");
                bar.id = "route-progress";
                document.body.appendChild(bar);
            }
            if (!overlay) {
                overlay = document.createElement("div");
                overlay.id = "route-loader";
                overlay.setAttribute("role", "status");
                overlay.setAttribute("aria-live", "polite");
                overlay.innerHTML = `
                    <div class="route-loader-card">
                        <div class="route-logo-build">
                            <span class="route-logo-orbit"></span>
                            <span class="route-logo-orbit route-logo-orbit-2"></span>
                            <div class="route-logo-mask"><img src="https://i.ibb.co/FLnH6Fw2/1cf98fc6-5c25-4af8-8af0-1e556340272f.jpg" alt="Toledo"></div>
                        </div>
                        <div class="route-loader-copy"><strong>TOLEDO</strong><span>Preparing your page…</span></div>
                        <div class="route-loader-line"><i></i></div>
                    </div>`;
                document.body.appendChild(overlay);
            }
            bar.classList.remove("done");
            overlay.classList.remove("leaving");
            void bar.offsetWidth;
            bar.classList.add("active");
            overlay.classList.add("show");
        }, 140);
    }

    hideProgress() {
        clearTimeout(this.progressTimer);
        const bar = document.getElementById("route-progress");
        const overlay = document.getElementById("route-loader");
        if (!bar && !overlay) return;
        if (bar) bar.classList.add("done");
        if (overlay) overlay.classList.add("leaving");
        setTimeout(() => {
            if (bar) bar.classList.remove("active", "done");
            if (overlay) overlay.classList.remove("show", "leaving");
        }, 320);
    }

    buildControllerPath(moduleConfig) {
        return `../modules/${moduleConfig.folder}/${moduleConfig.controller}`;
    }

    async destroyCurrentModule() {
        if (
            this.currentController &&
            typeof this.currentController.destroy === "function"
        ) {
            await this.currentController.destroy();

            this.eventBus().emit("module:destroyed", {
                name: this.currentModule
            });

            this.logger().info(`Module destroyed: ${this.currentModule}`);
        }

        this.currentController = null;
        this.currentModule = null;
    }

    showError(message) {
        if (!this.container) return;

        this.container.innerHTML = `
            <section>
                <h1>${message}</h1>
            </section>
        `;
    }

    logger() {
        return Container.get("logger");
    }

    eventBus() {
        return Container.get("eventBus");
    }
}

export default ModuleLoader;