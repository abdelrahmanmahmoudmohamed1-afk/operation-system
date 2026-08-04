/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: app.js
 * Layer: Core
 * Responsibility:
 * - Bootstrap Application
 * - Initialize Engine
 * - Register Providers
 * - Initialize Layout
 * - Initialize Router
 * - Start Application
 * ---------------------------------------------------------
 * Version: 0.3.0
 * ---------------------------------------------------------
 */

import APP_CONFIG from "../../config/app.config.js";

import Router from "./router.js";
import ModuleLoader from "./module-loader.js";
import LayoutManager from "./layout-manager.js";
import Engine from "./engine.js";
import EventBus from "./event-bus.js";
import Container from "./container.js";

import ServiceProvider from "../providers/service-provider.js";
import AuthService from "../services/auth.service.js";

class App {
    constructor() {
        this.name = APP_CONFIG.name;
        this.version = APP_CONFIG.version;
        this.theme = APP_CONFIG.defaultTheme;

        this.layoutManager = new LayoutManager("app");

        this.router = null;
        this.moduleLoader = null;
    }

    async init() {
        this.setDocumentTitle();

        await Engine.start();

        ServiceProvider.register();

        this.applyTheme();

        const authManager = Container.get("authManager");

        if (!authManager.isLoggedIn()) {
            await this.showLogin();
            this.hideBootLoader();
            return;
        }

        await this.startApp();
        this.hideBootLoader();
    }

    hideBootLoader() {
        const loader = document.getElementById("bootLoader");
        if (!loader) return;

        loader.classList.add("hidden");
        setTimeout(() => loader.remove(), 700);
    }

    /**
     * بيحمّل شاشة اللوجين (layouts/login.html) ويربط الفورم بـ AuthService.
     * لو الدخول نجح، بيكمل تحميل السيستيم العادي بدون إعادة تحميل الصفحة.
     */
    async showLogin() {
        try {
            const response = await fetch("layouts/login.html", { cache: "no-store" });
            if (!response.ok) throw new Error(`Login layout failed (${response.status})`);
            const html = await response.text();

            const appContainer = document.getElementById("app");
            appContainer.innerHTML = html;

            const form = document.getElementById("login-form");
            const errorBox = document.getElementById("login-error");
            const submitBtn = document.getElementById("login-submit");

            if (!form || !errorBox || !submitBtn) throw new Error("Login form is incomplete");

            form.addEventListener("submit", async (event) => {
                event.preventDefault();

                const username = document.getElementById("login-username").value.trim();
                const password = document.getElementById("login-password").value;

                if (!username || !password) {
                    errorBox.textContent = "من فضلك أدخل اسم المستخدم وكلمة المرور";
                    errorBox.classList.remove("hidden");
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = "جاري الدخول...";
                errorBox.classList.add("hidden");

                const result = await AuthService.login(username, password);

                submitBtn.disabled = false;
                submitBtn.textContent = "تسجيل الدخول";

                if (!result.success) {
                    errorBox.textContent = result.message || "بيانات الدخول غير صحيحة";
                    errorBox.classList.remove("hidden");
                    return;
                }

                await this.startApp();
            });
        } catch (error) {
            console.error("Failed to load login screen:", error);
        }
    }

    /**
     * تحميل التخطيط الرئيسي + الراوتر بعد التأكد من تسجيل الدخول.
     */
    async startApp() {
        await this.layoutManager.loadMainLayout();

        this.moduleLoader = new ModuleLoader("page-content");
        this.router = new Router(this.moduleLoader);

        this.router.listen();

        const initialRoute = location.hash.replace("#", "") || "overview";

        await this.router.load(initialRoute);

        this.bindNavigation();
        this.bindLogout();
        this.bindGlobalSearch();
        this.bindLanguageSwitch();
        this.bindDetails();
        this.bindActionFeedback();
        this.bindConnectivityStatus();
        this.bindSessionExpiry();
        this.applyLanguageLabels();

        EventBus.emit("app:started", {
            name: this.name,
            version: this.version
        });

        this.showStartupMessage();
    }

    setDocumentTitle() {
        document.title = `${this.name} | ${this.version}`;
    }

    applyTheme() {
        const themeManager = Container.get("themeManager");
        themeManager.apply(this.theme);
    }

    bindNavigation() {
        document
            .querySelectorAll("[data-route]")
            .forEach((button) => {
                button.addEventListener("click", async () => {
                    const routeName = button.getAttribute("data-route");
                    this.setBusy(true, `Opening ${routeName}...`);
                    try {
                        Container.get("audit")?.record("Open module", routeName, { route: routeName });
                        await this.router.load(routeName);
                        this.applyLanguageLabels();
                    } catch (error) {
                        Container.get("notification")?.error(error.message || "Failed to open module");
                        throw error;
                    } finally {
                        this.setBusy(false);
                    }
                });
            });
    }

    bindLogout() {
        document
            .querySelectorAll("[data-logout]")
            .forEach((button) => {
                button.addEventListener("click", async () => {
                    this.setBusy(true, "Logging out...");
                    Container.get("audit")?.record("Logout", "Auth", {});
                    await AuthService.logout();
                    location.reload();
                });
            });
    }

    bindGlobalSearch() {
        const input = document.getElementById("global-search-input");
        const type = document.getElementById("global-search-type");
        const clear = document.getElementById("global-search-clear");
        if (!input) return;

        const runSearch = async () => {
            const term = input.value.trim();
            if (!term) return;
            const target = type?.value || "all";
            sessionStorage.setItem("toledo_global_search", JSON.stringify({ term, target, ts: Date.now() }));

            const route = target === "inventory" ? "inventory" : target === "eoi" ? "eoi" : target === "reports" ? "reports" : "crm";
            if (location.hash.replace("#", "") !== route) {
                await this.router.load(route);
            } else {
                window.dispatchEvent(new CustomEvent("toledo:global-search", { detail: { term, target } }));
            }
        };

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") runSearch();
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                input.focus();
            }
        });
        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                input.focus();
            }
        });
        clear?.addEventListener("click", () => { input.value = ""; input.focus(); });
    }

    bindLanguageSwitch() {
        const select = document.getElementById("language-switcher");
        if (!select) return;
        const saved = localStorage.getItem("toledo_language") || "en";
        select.value = saved;
        document.documentElement.lang = saved;
        document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
        select.addEventListener("change", () => {
            localStorage.setItem("toledo_language", select.value);
            document.documentElement.lang = select.value;
            document.documentElement.dir = select.value === "ar" ? "rtl" : "ltr";
            location.reload();
        });
    }

    escapeHTML(value) {
        return String(value ?? "-").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
        })[char]);
    }

    bindDetails() {
        if (this.detailsBound) return;
        this.detailsBound = true;
        document.addEventListener("click", (event) => {
            const row = event.target.closest(".detail-row");
            const card = event.target.closest(".detail-card");
            if (!row && !card) return;

            let html = "";
            if (row?.dataset.detail) {
                try {
                    const data = JSON.parse(row.dataset.detail);
                    html = Object.entries(data).map(([k, v]) => `<div class="detail-line"><span>${this.escapeHTML(k)}</span><strong>${this.escapeHTML(v)}</strong></div>`).join("");
                } catch { html = "<p>No details available</p>"; }
            } else if (card) {
                html = `
                    <div class="detail-line"><span>Metric</span><strong>${this.escapeHTML(card.dataset.detailTitle)}</strong></div>
                    <div class="detail-line"><span>Count / Value</span><strong>${this.escapeHTML(card.dataset.detailValue)}</strong></div>
                    <div class="detail-line"><span>Total Value</span><strong>${this.escapeHTML(card.dataset.detailSub)}</strong></div>
                `;
            }
            this.openDetailsModal(html);
        });
    }

    openDetailsModal(content) {
        let modal = document.getElementById("details-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "details-modal";
            modal.className = "details-modal hidden";
            modal.innerHTML = `<div class="details-modal-box"><button class="details-close">×</button><h2>Details</h2><div class="details-content"></div></div>`;
            document.body.appendChild(modal);
            modal.addEventListener("click", (e) => { if (e.target === modal || e.target.classList.contains("details-close")) modal.classList.add("hidden"); });
        }
        modal.querySelector(".details-content").innerHTML = content;
        modal.classList.remove("hidden");
    }


    bindActionFeedback() {
        if (this.actionFeedbackBound) return;
        this.actionFeedbackBound = true;

        document.addEventListener("click", (event) => {
            const interactive = event.target.closest("button, a, .sidebar-link, .theme-option, .report-tab, .saved-report-chip, .detail-row, .detail-card");
            if (!interactive || interactive.disabled) return;
            interactive.classList.add("is-responding");
            setTimeout(() => interactive.classList.remove("is-responding"), 450);
        }, true);

        window.addEventListener("error", (event) => {
            Container.get("notification")?.error(event.message || "System error");
            Container.get("audit")?.record("Frontend error", "System", { message: event.message, file: event.filename, line: event.lineno });
        });

        window.addEventListener("unhandledrejection", (event) => {
            const message = event.reason?.message || String(event.reason || "Unexpected promise error");
            Container.get("notification")?.error(message);
            Container.get("audit")?.record("Unhandled error", "System", { message });
        });
    }

    bindConnectivityStatus() {
        if (this.connectivityBound) return;
        this.connectivityBound = true;
        const update = () => {
            let banner = document.getElementById("connectivity-banner");
            if (!banner) {
                banner = document.createElement("div");
                banner.id = "connectivity-banner";
                banner.className = "connectivity-banner hidden";
                banner.setAttribute("role", "status");
                document.body.appendChild(banner);
            }
            banner.textContent = navigator.onLine ? "Connection restored" : "You are offline. Live data is unavailable.";
            banner.classList.toggle("offline", !navigator.onLine);
            banner.classList.remove("hidden");
            if (navigator.onLine) setTimeout(() => banner.classList.add("hidden"), 2500);
        };
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        if (!navigator.onLine) update();
    }

    bindSessionExpiry() {
        if (this.sessionExpiryBound) return;
        this.sessionExpiryBound = true;
        window.addEventListener("toledo:session-expired", () => {
            Container.get("authManager")?.logout();
            location.reload();
        });
    }

    setBusy(active, message = "Loading...") {
        let overlay = document.getElementById("toledo-action-loader");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "toledo-action-loader";
            overlay.className = "action-loader hidden";
            overlay.innerHTML = `<div class="action-loader-box"><span class="action-spinner"></span><strong></strong></div>`;
            document.body.appendChild(overlay);
        }
        overlay.querySelector("strong").textContent = message;
        overlay.classList.toggle("hidden", !active);
    }

    applyLanguageLabels() {
        const lang = localStorage.getItem("toledo_language") || "en";
        const ar = lang === "ar";
        const map = ar ? {
            "Overview": "نظرة عامة", "Dashboard": "لوحة التحكم", "Inventory": "المخزون", "Payment": "خطط السداد",
            "CRM": "إدارة العملاء", "EOI": "طلبات الاهتمام", "Reports": "التقارير", "Contracts": "العقود", "Settings": "الإعدادات",
            "Logout": "تسجيل الخروج", "Log Out": "تسجيل الخروج", "Search units, clients, EOI, reports...": "ابحث عن وحدة أو عميل أو طلب أو تقرير...",
            "Run Report": "تشغيل التقرير", "Save View": "حفظ العرض", "Apply": "تطبيق", "Reset": "إعادة ضبط", "Filters": "الفلاتر", "Columns": "الأعمدة", "Saved Views": "العروض المحفوظة"
        } : {};
        document.querySelectorAll("[data-i18n]").forEach((el) => {
            const key = el.dataset.i18n;
            if (ar && map[key]) el.textContent = map[key];
        });
        document.querySelectorAll(".sidebar-label, button, h1, h2, option").forEach((el) => {
            const t = el.textContent.trim();
            if (ar && map[t]) el.textContent = map[t];
        });
        const search = document.getElementById("global-search-input");
        if (search && ar) search.placeholder = map["Search units, clients, EOI, reports..."];
    }

    showStartupMessage() {
        const logger = Container.get("logger");

        logger.info(`${this.name} v${this.version} started successfully`);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const app = new App();

    app.init().catch((error) => {
        console.error("App failed to start:", error);

        const loader = document.getElementById("bootLoader");
        if (loader) loader.remove();

        const appContainer = document.getElementById("app");
        if (appContainer) {
            appContainer.innerHTML = `
                <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0E1116;color:#fff;font-family:Arial,sans-serif;padding:24px;text-align:center;">
                    <div>
                        <h2 style="color:#F87171;margin-bottom:10px;">System failed to start</h2>
                        <p id="fatal-error-message" style="color:#8B94A3;max-width:420px;"></p>
                        <p style="color:#8B94A3;font-size:12px;margin-top:16px;">Open DevTools Console (F12) for full details.</p>
                    </div>
                </div>
            `;
            const fatalMessage = document.getElementById("fatal-error-message");
            if (fatalMessage) fatalMessage.textContent = (error && error.message) || String(error);
        }
    });
});