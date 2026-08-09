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

        this.showProgress(moduleName);

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

    showProgress(targetModule = null) {
        clearTimeout(this.progressTimer);
        const from = this.currentModule || "Workspace";
        const to = targetModule || "Workspace";
        this.progressTimer = setTimeout(() => {
            let bar = document.getElementById("route-progress");
            let overlay = document.getElementById("route-loader");
            if (!bar) { bar = document.createElement("div"); bar.id = "route-progress"; document.body.appendChild(bar); }
            if (!overlay) {
                overlay = document.createElement("div");
                overlay.id = "route-loader";
                overlay.setAttribute("role", "status");
                overlay.setAttribute("aria-live", "polite");
                overlay.innerHTML = `<div class="module-door-scene"><div class="module-room room-from"><span class="room-label"></span><span class="door door-left"></span></div><div class="route-worker"><span class="worker-head"></span><span class="worker-body"></span><span class="worker-bag"></span></div><div class="module-hallway"><span class="hall-light"></span></div><div class="module-room room-to"><span class="room-label"></span><span class="door door-right"></span></div><div class="route-copy"><strong>Moving workspace</strong><span></span></div></div>`;
                document.body.appendChild(overlay);
            }
            overlay.querySelector(".room-from .room-label").textContent = from;
            overlay.querySelector(".room-to .room-label").textContent = to;
            overlay.querySelector(".route-copy span").textContent = `Leaving ${from} · entering ${to}`;
            overlay.dataset.from = from; overlay.dataset.to = to;
            bar.classList.remove("done"); overlay.classList.remove("leaving");
            void bar.offsetWidth; bar.classList.add("active"); overlay.classList.add("show");
        }, 90);
    }

    hideProgress() {
        clearTimeout(this.progressTimer);
        const bar = document.getElementById("route-progress");
        const overlay = document.getElementById("route-loader");
        if (!bar && !overlay) return;
        if (bar) bar.classList.add("done");
        if (overlay) overlay.classList.add("leaving");
        setTimeout(() => { if (bar) bar.classList.remove("active", "done"); if (overlay) overlay.classList.remove("show", "leaving"); }, 420);
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