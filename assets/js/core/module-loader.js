/**
 * Operation System — Module Loader
 * Stable route loading with cinematic door transitions.
 * Data/module loading happens while the worker is in the hallway; the target
 * door is only approached after the target module is ready.
 */

import MODULES from "../../config/modules.config.js";
import Container from "./container.js";
import SoundKit from "../utils/sound.js";

class ModuleLoader {
    constructor(containerId = "page-content") {
        this.container = document.getElementById(containerId);
        this.currentModule = null;
        this.currentController = null;
        this.transitionToken = 0;
    }

    async load(moduleName) {
        const moduleConfig = MODULES[moduleName];
        if (!moduleConfig) {
            this.showError(`Module not found: ${moduleName}`);
            return;
        }

        const from = this.currentModule || "Workspace";
        const transition = this.beginTransition(from, moduleName);

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

            // The expensive part (HTML rendering + API/data requests) runs while
            // the character is still crossing the hallway.
            await controller.init({
                container: this.container,
                config: moduleConfig
            });

            this.eventBus().emit("module:loaded", {
                name: moduleName,
                config: moduleConfig
            });

            this.logger().info(`Module loaded: ${moduleName}`);

            // Only now approach/open/enter/close the destination door.
            await transition.complete();
        } catch (error) {
            this.logger().error(`Failed to load module: ${moduleName}`, error);
            transition.fail(error);
            this.showError(`Failed to load module: ${moduleName}`);
        } finally {
            await transition.hide();
        }
    }

    beginTransition(from, to) {
        const token = ++this.transitionToken;
        let overlay = document.getElementById("route-loader");
        let bar = document.getElementById("route-progress");

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
                <div class="module-door-scene">
                    <div class="module-room room-from">
                        <span class="room-label"></span>
                        <span class="door door-left"></span>
                    </div>
                    <div class="module-hallway">
                        <span class="hall-light"></span>
                        <span class="hall-progress"><i></i></span>
                    </div>
                    <div class="route-worker">
                        <span class="worker-head"></span>
                        <span class="worker-body"></span>
                        <span class="worker-leg leg-a"></span>
                        <span class="worker-leg leg-b"></span>
                        <span class="worker-bag"></span>
                    </div>
                    <div class="module-room room-to">
                        <span class="room-label"></span>
                        <span class="door door-right"></span>
                    </div>
                    <div class="route-copy">
                        <strong>Moving workspace</strong>
                        <span class="route-copy-line"></span>
                        <small class="route-copy-status">Loading the next module while you walk…</small>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
        }

        const fromLabel = this.prettyName(from);
        const toLabel = this.prettyName(to);
        overlay.querySelector(".room-from .room-label").textContent = fromLabel;
        overlay.querySelector(".room-to .room-label").textContent = toLabel;
        overlay.querySelector(".route-copy-line").textContent = `Leaving ${fromLabel} · heading to ${toLabel}`;
        overlay.querySelector(".route-copy-status").textContent = `Preparing ${toLabel} in the background…`;

        overlay.dataset.from = from;
        overlay.dataset.to = to;
        overlay.classList.remove("leaving", "ready", "failed");
        bar.classList.remove("done");
        void overlay.offsetWidth;
        overlay.classList.add("show", "loading");
        bar.classList.add("active");
        SoundKit.doorTick();

        const startedAt = performance.now();
        const minimumHallwayMs = 920;
        let completed = false;

        return {
            complete: async () => {
                if (completed || token !== this.transitionToken) return;
                completed = true;
                const elapsed = performance.now() - startedAt;
                if (elapsed < minimumHallwayMs) {
                    await this.sleep(minimumHallwayMs - elapsed);
                }
                if (token !== this.transitionToken) return;
                overlay.classList.remove("loading");
                overlay.classList.add("ready");
                const status = overlay.querySelector(".route-copy-status");
                if (status) status.textContent = `${toLabel} is ready · entering now`;
                if (bar) bar.classList.add("done");
                // final approach + destination door open/enter/close
                SoundKit.doorTick();
                await this.sleep(900);
            },
            fail: (error) => {
                if (token !== this.transitionToken) return;
                overlay.classList.remove("loading", "ready");
                overlay.classList.add("failed");
                const status = overlay.querySelector(".route-copy-status");
                if (status) status.textContent = error?.message || `Could not open ${toLabel}`;
            },
            hide: async () => {
                if (token !== this.transitionToken) return;
                overlay.classList.add("leaving");
                await this.sleep(260);
                if (token !== this.transitionToken) return;
                overlay.classList.remove("show", "loading", "ready", "failed", "leaving");
                bar?.classList.remove("active", "done");
            }
        };
    }

    prettyName(value) {
        const map = {
            commandcenter: "Command Center",
            digitaltwin: "Digital Twin",
            salesoperations: "Sales Operations",
            overview: "Overview",
            dashboard: "Dashboard",
            inventory: "Inventory",
            payment: "Payment",
            crm: "CRM",
            eoi: "EOI",
            reports: "Reports",
            achievement: "Achievement",
            contracts: "Contracts",
            leads: "Leads",
            users: "Users",
            settings: "Settings",
            tasks: "Tasks",
            analytics: "Analytics",
            documents: "Documents",
            quality: "Data Quality"
        };
        const key = String(value || "").toLowerCase();
        return map[key] || String(value || "Workspace").replace(/(^|[-_])([a-z])/g, (_, a, b) => `${a ? " " : ""}${b.toUpperCase()}`);
    }

    buildControllerPath(moduleConfig) {
        return `../modules/${moduleConfig.folder}/${moduleConfig.controller}`;
    }

    async destroyCurrentModule() {
        if (this.currentController && typeof this.currentController.destroy === "function") {
            await this.currentController.destroy();
            this.eventBus().emit("module:destroyed", { name: this.currentModule });
            this.logger().info(`Module destroyed: ${this.currentModule}`);
        }
        this.currentController = null;
        this.currentModule = null;
    }

    showError(message) {
        if (!this.container) return;
        this.container.innerHTML = `
            <section class="card state-error state-block">
                <h1>${this.escapeHtml(message)}</h1>
                <p>The workspace shell is still running. Try the module again or run System Diagnostics from Settings.</p>
            </section>`;
    }

    escapeHtml(value) {
        return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[c]));
    }

    sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
    logger() { return Container.get("logger"); }
    eventBus() { return Container.get("eventBus"); }
}

export default ModuleLoader;
