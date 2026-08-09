/**
 * Operation System — Module Loader v5.8
 * Door-to-door route choreography synchronized with real module loading.
 *
 * Sequence:
 * 1) source door opens
 * 2) worker exits
 * 3) source door closes
 * 4) worker keeps walking in the hallway while controller/data load
 * 5) only when the target is ready, target door opens
 * 6) worker enters
 * 7) target door closes, then the new module is revealed
 */

import MODULES from "../../config/modules.config.js";
import Container from "./container.js";

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
            // Start the exit animation first, but do not block data loading.
            const exitSequence = transition.exit();

            await this.destroyCurrentModule();

            const controllerPath = this.buildControllerPath(moduleConfig);
            const controllerModule = await import(controllerPath);
            const controller = controllerModule.default;

            if (!controller || typeof controller.init !== "function") {
                throw new Error(`Invalid controller for module: ${moduleName}`);
            }

            this.currentModule = moduleName;
            this.currentController = controller;

            // Real module HTML + API/data loading runs while the worker is moving.
            await controller.init({
                container: this.container,
                config: moduleConfig
            });

            this.eventBus().emit("module:loaded", {
                name: moduleName,
                config: moduleConfig
            });

            this.logger().info(`Module loaded: ${moduleName}`);

            // Do not approach the destination door before both conditions are true:
            // the source-door exit choreography finished AND target data is ready.
            await exitSequence;
            await transition.enter();
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
                        <span class="door door-left"><i class="door-sign"></i></span>
                    </div>
                    <div class="module-hallway">
                        <span class="hall-light"></span>
                        <span class="hall-depth hall-depth-a"></span>
                        <span class="hall-depth hall-depth-b"></span>
                        <span class="hall-progress"><i></i></span>
                    </div>
                    <div class="route-worker">
                        <span class="worker-head"></span>
                        <span class="worker-body"></span>
                        <span class="worker-arm arm-a"></span>
                        <span class="worker-arm arm-b"></span>
                        <span class="worker-leg leg-a"></span>
                        <span class="worker-leg leg-b"></span>
                        <span class="worker-bag"></span>
                    </div>
                    <div class="module-room room-to">
                        <span class="room-label"></span>
                        <span class="door door-right"><i class="door-sign"></i></span>
                    </div>
                    <div class="route-copy">
                        <strong>Moving workspace</strong>
                        <span class="route-copy-line"></span>
                        <small class="route-copy-status">Leaving the current module…</small>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
        }

        const fromLabel = this.prettyName(from);
        const toLabel = this.prettyName(to);
        overlay.querySelector(".room-from .room-label").textContent = fromLabel;
        overlay.querySelector(".room-to .room-label").textContent = toLabel;
        overlay.querySelector(".room-from .door-sign").textContent = fromLabel;
        overlay.querySelector(".room-to .door-sign").textContent = toLabel;
        overlay.querySelector(".route-copy-line").textContent = `${fromLabel}  →  ${toLabel}`;

        overlay.dataset.from = from;
        overlay.dataset.to = to;
        this.resetTransitionClasses(overlay);
        bar.classList.remove("done");
        void overlay.offsetWidth;
        overlay.classList.add("show", "stage-source-open");
        bar.classList.add("active");

        const status = overlay.querySelector(".route-copy-status");
        let exitPromise = null;
        let finished = false;

        const valid = () => token === this.transitionToken;
        const setStage = (stage, text) => {
            if (!valid()) return;
            this.resetStageClasses(overlay);
            overlay.classList.add(stage);
            if (status && text) status.textContent = text;
        };

        return {
            exit: () => {
                if (exitPromise) return exitPromise;
                exitPromise = (async () => {
                    // Door visibly opens before the worker moves.
                    setStage("stage-source-open", `Opening ${fromLabel}…`);
                    await this.sleep(300);
                    if (!valid()) return;

                    setStage("stage-source-exit", `Leaving ${fromLabel}…`);
                    await this.sleep(470);
                    if (!valid()) return;

                    // Worker has cleared the door; close it fully behind them.
                    setStage("stage-source-close", `Closing ${fromLabel} behind you…`);
                    await this.sleep(300);
                    if (!valid()) return;

                    // Continuous walking loop. The user never appears frozen at a door.
                    setStage("stage-hallway", `Loading ${toLabel} while you walk…`);
                })();
                return exitPromise;
            },

            enter: async () => {
                if (finished || !valid()) return;
                finished = true;
                if (exitPromise) await exitPromise;
                if (!valid()) return;

                bar?.classList.add("done");
                setStage("stage-target-open", `${toLabel} is ready · opening the door…`);
                await this.sleep(300);
                if (!valid()) return;

                setStage("stage-target-enter", `Entering ${toLabel}…`);
                await this.sleep(470);
                if (!valid()) return;

                setStage("stage-target-close", `Closing ${toLabel}…`);
                await this.sleep(300);
                if (!valid()) return;

                setStage("stage-done", `${toLabel} ready`);
                await this.sleep(100);
            },

            fail: (error) => {
                if (!valid()) return;
                this.resetStageClasses(overlay);
                overlay.classList.add("failed");
                if (status) status.textContent = error?.message || `Could not open ${toLabel}`;
            },

            hide: async () => {
                if (!valid()) return;
                overlay.classList.add("leaving");
                await this.sleep(180);
                if (!valid()) return;
                this.resetTransitionClasses(overlay);
                overlay.classList.remove("show", "leaving", "failed");
                bar?.classList.remove("active", "done");
            }
        };
    }

    resetStageClasses(overlay) {
        [
            "stage-source-open", "stage-source-exit", "stage-source-close",
            "stage-hallway", "stage-target-open", "stage-target-enter",
            "stage-target-close", "stage-done"
        ].forEach(c => overlay.classList.remove(c));
    }

    resetTransitionClasses(overlay) {
        this.resetStageClasses(overlay);
        overlay.classList.remove("loading", "ready", "failed", "leaving");
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
