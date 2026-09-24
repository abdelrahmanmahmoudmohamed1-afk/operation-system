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
        let bar = document.getElementById("route-progress");

        if (!bar) {
            bar = document.createElement("div");
            bar.id = "route-progress";
            document.body.appendChild(bar);
        }

        bar.classList.remove("done");
        // إعادة فرض reflow عشان الـ transition يشتغل من أول وجديد كل مرة
        void bar.offsetWidth;
        bar.classList.add("active");
    }

    hideProgress() {
        const bar = document.getElementById("route-progress");
        if (!bar) return;

        bar.classList.add("done");

        setTimeout(() => {
            bar.classList.remove("active", "done");
        }, 250);
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