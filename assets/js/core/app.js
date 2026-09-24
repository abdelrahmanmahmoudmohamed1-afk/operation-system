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
import SoundService from "../services/sound.service.js";
import TablePagination from "./table-pagination.js";

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
        this.registerServiceWorker();

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
            const passwordInput = document.getElementById("login-password");
            const passwordToggle = document.getElementById("login-password-toggle");
            const submitLabel = submitBtn?.querySelector(".login-submit-label");

            if (!form || !errorBox || !submitBtn || !passwordInput) throw new Error("Login form is incomplete");

            // First-time production bootstrap. This link is only shown while the central
            // Supabase auth/profile store has no users, preventing dead-end deployments.
            try {
                const api = Container.get("api");
                const bootstrap = await api.post("bootstrapStatus", {}, { forceRefresh: true, cacheTTL: 0, timeoutMs: 7000 });
                const state = bootstrap?.data?.data;
                const openBtn = document.getElementById("first-admin-open");
                const panel = document.getElementById("bootstrap-admin-panel");
                if (state && state.databaseReady === false) {
                    errorBox.textContent = state.needsMigration
                        ? "Database setup required: run supabase/migrations/001_operation_system.sql in Supabase SQL Editor, then refresh this page."
                        : (state.message || "Database connection is unavailable. Check Supabase/Vercel settings.");
                    errorBox.classList.remove("hidden");
                }
                if (state?.needsBootstrap && openBtn && panel) {
                    openBtn.classList.remove("hidden");
                    openBtn.addEventListener("click", () => panel.classList.toggle("hidden"));
                    document.getElementById("bootstrap-admin-form")?.addEventListener("submit", async (e) => {
                        e.preventDefault();
                        const err = document.getElementById("bootstrap-error");
                        const btn = e.currentTarget.querySelector("button[type='submit']");
                        const data = {
                            name: document.getElementById("bootstrap-name")?.value.trim(),
                            username: document.getElementById("bootstrap-username")?.value.trim(),
                            email: document.getElementById("bootstrap-email")?.value.trim(),
                            password: document.getElementById("bootstrap-password")?.value
                        };
                        btn.disabled = true; err?.classList.add("hidden");
                        const r = await api.post("bootstrapAdmin", { data }, { forceRefresh: true, cacheTTL: 0 });
                        btn.disabled = false;
                        if (!r.ok) { if (err) { err.textContent = r.message || "Admin setup failed"; err.classList.remove("hidden"); } return; }
                        panel.classList.add("hidden"); openBtn.classList.add("hidden");
                        document.getElementById("login-username").value = data.username;
                        document.getElementById("login-password").value = data.password;
                        Container.get("notification")?.success?.("First Admin created. You can sign in now.");
                    });
                }
            } catch (bootstrapError) { console.warn("Bootstrap status unavailable", bootstrapError); }

            if (passwordToggle) {
                passwordToggle.addEventListener("click", () => {
                    const visible = passwordInput.type === "text";
                    passwordInput.type = visible ? "password" : "text";
                    passwordToggle.classList.toggle("is-visible", !visible);
                    passwordToggle.setAttribute("aria-pressed", String(!visible));
                    passwordToggle.setAttribute("aria-label", visible ? "Show password" : "Hide password");
                    passwordInput.focus({ preventScroll: true });
                    const end = passwordInput.value.length;
                    try { passwordInput.setSelectionRange(end, end); } catch (_) { /* unsupported input type */ }
                });
            }

            form.addEventListener("submit", async (event) => {
                event.preventDefault();

                const username = document.getElementById("login-username").value.trim();
                const password = document.getElementById("login-password").value;

                if (!username || !password) {
                    errorBox.textContent = "Please enter your username and password.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.classList.add("is-loading");
                if (submitLabel) submitLabel.textContent = "Signing you in...";
                errorBox.classList.add("hidden");

                const result = await AuthService.login(username, password);

                submitBtn.disabled = false;
                submitBtn.classList.remove("is-loading");
                if (submitLabel) submitLabel.textContent = "Log In";

                if (!result.success) {
                    errorBox.textContent = result.message || "Invalid username or password.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                const loginScreen = document.querySelector(".creative-login-screen");
                if (loginScreen) {
                    loginScreen.classList.add("login-success");
                    await new Promise((resolve) => setTimeout(resolve, 650));
                }
                await this.startApp();
            });
        } catch (error) {
            console.error("Failed to load login screen:", error);
        }
    }

    /**
     * تحميل التخطيط الرئيسي + الراوتر بعد التأكد من Log In.
     */
    async startApp() {
        await this.layoutManager.loadMainLayout();
        TablePagination.start();

        this.moduleLoader = new ModuleLoader("page-content");
        this.router = new Router(this.moduleLoader);

        this.router.listen();

        const initialRoute = location.hash.replace("#", "") || "overview";

        await this.router.load(initialRoute);

        this.bindNavigation();
        this.bindMobileNavigation();
        this.bindGlobalProjectFilter();
        this.bindPdfExport();
        this.bindLogout();
        this.bindGlobalSearch();
        this.bindEnterpriseUX();
        this.bindOpsCopilot();
        this.bindLanguageSwitch();
        this.prefetchCommonModules();
        this.bindDetails();
        this.bindActionFeedback();
        this.bindConnectivityStatus();
        this.bindSessionExpiry();
        await this.checkBackendCompatibility();
        this.bindOperationBusyEvents();
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
        if (this.navigationBound) return;
        this.navigationBound = true;
        document.addEventListener("click", async (event) => {
            const button = event.target.closest("[data-route]");
            if (!button || button.disabled) return;
            const routeName = button.getAttribute("data-route");
            if (!routeName) return;
            event.preventDefault();
            // RouteLoader owns the full-page door transition.
            try {
                Container.get("audit")?.record("Open module", routeName, { route: routeName });
                await this.router.load(routeName);
                this.applyLanguageLabels();
            } catch (error) {
                Container.get("notification")?.error(error.message || "Failed to open module");
            } finally {
                // route transition closes inside ModuleLoader
            }
        });

        document.getElementById("home-logo-btn")?.addEventListener("click", async () => {
            await this.router.load("overview");
        });
    }

    bindMobileNavigation() {
        if (this.mobileNavigationBound) return;
        this.mobileNavigationBound = true;
        const sidebar = document.getElementById("app-sidebar");
        const toggle = document.getElementById("mobile-nav-toggle");
        const backdrop = document.getElementById("sidebar-backdrop");
        if (!sidebar || !toggle || !backdrop) return;
        const close = () => {
            sidebar.classList.remove("open");
            backdrop.classList.add("hidden");
            document.body.classList.remove("nav-open");
        };
        const open = () => {
            sidebar.classList.add("open");
            backdrop.classList.remove("hidden");
            document.body.classList.add("nav-open");
        };
        toggle.addEventListener("click", () => sidebar.classList.contains("open") ? close() : open());
        backdrop.addEventListener("click", close);
        document.addEventListener("click", (event) => {
            if (event.target.closest("[data-route]") && window.innerWidth <= 980) close();
        });
    }

    async bindGlobalProjectFilter() {
        const select = document.getElementById("global-project-filter");
        if (!select) return;
        const saved = sessionStorage.getItem("operation_global_project") || "ALL";
        const fallbackProjects = ["Layana", "Mersea"];
        let projects = fallbackProjects;
        try {
            const api = Container.get("api");
            const token = Container.get("authManager").getToken();
            const res = await api.post("getDashboardFilters", { token }, { forceRefresh: true });
            const remote = (res?.data?.data?.projects || []).filter((p) => p && String(p).toUpperCase() !== "ALL");
            if (remote.length) projects = Array.from(new Set([...fallbackProjects, ...remote]));
        } catch (_) {
            // GitHub-only mode: keep the known project list usable.
        }
        select.innerHTML = `<option value="ALL">All Projects</option>${projects.map((p) => `<option value="${this.escapeHTML(p)}">${this.escapeHTML(p)}</option>`).join("")}`;
        select.value = Array.from(select.options).some((o) => o.value === saved) ? saved : "ALL";
        sessionStorage.setItem("operation_global_project", select.value);
        select.addEventListener("change", async () => {
            sessionStorage.setItem("operation_global_project", select.value || "ALL");
            Container.get("api")?.clearReadCache?.();
            window.dispatchEvent(new CustomEvent("operation:project-change", { detail: { project: select.value || "ALL" } }));
            const current = this.router?.currentRoute || location.hash.replace("#", "") || "overview";
            await this.router.load(current, false);
        });
    }

    async checkBackendCompatibility() {
        try {
            const api = Container.get("api");
            const token = Container.get("authManager").getToken();
            const res = await api.post("getSystemInfo", { token }, { forceRefresh: true, cacheTTL: 0 });
            const info = res?.data?.data;
            if (res.ok && info) {
                api.setBackendInfo?.(info);
                sessionStorage.setItem("operation_backend_info", JSON.stringify(info));
                const required = ["createSystemUser","uploadUnitFloorPlan","uploadClientContract","getInventoryData","getClients","getEOIData","operationAiChat"];
                const missing = Array.isArray(info.actions) ? required.filter(x => !info.actions.includes(x)) : [];
                if (missing.length) Container.get("notification")?.warning(`Backend ${info.backendBuild || info.version || ""} is missing: ${missing.join(", ")}. Deploy the matching Enterprise X Vercel backend before using those actions.`);
                return;
            }
            Container.get("notification")?.warning("Backend health check failed. Live write actions are disabled until the matching Enterprise X backend is deployed.");
        } catch (_) {
            // Never block the shell. Individual requests keep readable errors.
        }
    }

    bindOperationBusyEvents() {
        if (this.operationBusyBound) return;
        this.operationBusyBound = true;
        window.addEventListener("operation:busy", (event) => {
            const d = event.detail || {};
            this.setBusy(Boolean(d.active), d.message || "Working...", d.kind || "default");
        });
    }

    bindPdfExport() {
        document.getElementById("global-pdf-btn")?.addEventListener("click", () => {
            const page = document.getElementById("page-content");
            if (!page) return;
            document.body.classList.add("print-current-view");
            document.documentElement.classList.add("printing-current-view");

            const restore = [];
            document.querySelectorAll(".table-wrap, .report-table-wrap, .data-table-wrap, .chart-scroll").forEach((el) => {
                restore.push([el, el.style.maxHeight, el.style.height, el.style.overflow]);
                el.style.maxHeight = "none";
                el.style.height = "auto";
                el.style.overflow = "visible";
            });
            document.querySelectorAll("details").forEach((el) => {
                el.dataset.opsWasOpen = el.open ? "1" : "0";
                el.open = true;
            });

            const cleanup = () => {
                document.body.classList.remove("print-current-view");
                document.documentElement.classList.remove("printing-current-view");
                restore.forEach(([el, maxHeight, height, overflow]) => {
                    el.style.maxHeight = maxHeight;
                    el.style.height = height;
                    el.style.overflow = overflow;
                });
                document.querySelectorAll("details[data-ops-was-open]").forEach((el) => {
                    el.open = el.dataset.opsWasOpen === "1";
                    delete el.dataset.opsWasOpen;
                });
            };
            window.addEventListener("afterprint", cleanup, { once: true });
            requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => window.print(), 120)));
        });
    }

    bindLogout() {
        document.querySelectorAll("[data-logout]").forEach((button) => {
            button.addEventListener("click", async () => {
                if (document.getElementById("logout-scene")) return;
                const scene = document.createElement("div");
                scene.id = "logout-scene";
                scene.className = "logout-scene v51";
                scene.innerHTML = `<div class="logout-room">
                    <div class="logout-light"></div>
                    <div class="logout-office-desk"></div>
                    <div class="logout-laptop"><span class="logout-laptop-screen"></span><span class="logout-laptop-base"></span></div>
                    <div class="logout-tired-person"><span class="h"></span><span class="b"></span><span class="a1"></span><span class="a2"></span><span class="l1"></span><span class="l2"></span></div>
                    <div class="logout-exit-door"><span></span></div>
                    <p><strong>Day complete.</strong>Closing workspace and signing out...</p>
                </div>`;
                document.body.appendChild(scene);
                requestAnimationFrame(() => scene.classList.add("play"));
                Container.get("audit")?.record("Logout", "Auth", {});
                await new Promise((resolve) => setTimeout(resolve, 3100));
                try { await AuthService.logout(); } catch (_) { Container.get("authManager")?.logout(); }
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
            sessionStorage.setItem("operation_global_search", JSON.stringify({ term, target, ts: Date.now() }));

            const route = target === "inventory" ? "inventory" : target === "leads" ? "leads" : target === "eoi" ? "eoi" : target === "reports" ? "reports" : "crm";
            if (location.hash.replace("#", "") !== route) {
                await this.router.load(route);
            } else {
                window.dispatchEvent(new CustomEvent("operation:global-search", { detail: { term, target } }));
            }
        };

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") runSearch();

        });
        document.addEventListener("keydown", (e) => {

        });
        clear?.addEventListener("click", () => { input.value = ""; input.focus(); });
    }

    bindLanguageSwitch() {
        const select = document.getElementById("language-switcher");
        if (!select) return;
        const saved = localStorage.getItem("operation_language") || "en";
        select.value = saved;
        document.documentElement.lang = saved;
        document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
        select.addEventListener("change", () => {
            localStorage.setItem("operation_language", select.value);
            document.documentElement.lang = select.value;
            document.documentElement.dir = select.value === "ar" ? "rtl" : "ltr";
            location.reload();
        });
    }

    registerServiceWorker() {
        if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./sw.js").then((registration) => registration.update()).catch((error) => console.warn("Service worker registration failed", error));
        }, { once: true });
    }

    prefetchCommonModules() {
        const run = () => Promise.allSettled([
            import("../modules/dashboard/dashboard.controller.js"),
            import("../modules/inventory/inventory.controller.js"),
            import("../modules/digitaltwin/digitaltwin.controller.js"),
            import("../modules/reports/reports.controller.js")
        ]);
        if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 3500 });
        else setTimeout(run, 1800);
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
        window.addEventListener("operation:session-expired", () => {
            Container.get("authManager")?.logout();
            location.reload();
        });
    }

    setBusy(active, message = "Loading...", kind = "default") {
        let overlay = document.getElementById("operation-action-loader");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "operation-action-loader";
            overlay.className = "action-loader hidden";
            overlay.innerHTML = `<div class="action-story" data-action-kind="default"><div class="action-story-scene"><span class="action-person"><i></i></span><span class="action-prop"></span><span class="action-desk"></span></div><div class="action-story-copy"><span class="eyebrow">Operation System</span><strong></strong><small>Finishing the operation safely…</small></div><div class="action-story-track"><i></i></div></div>`;
            document.body.appendChild(overlay);
        }
        const inferred = kind !== "default" ? kind : this.inferBusyKind(message);
        overlay.querySelector(".action-story")?.setAttribute("data-action-kind", inferred);
        const strong = overlay.querySelector(".action-story-copy strong");
        if (strong) strong.textContent = message;
        const wasHidden = overlay.classList.contains("hidden");
        overlay.classList.toggle("hidden", !active);
        if (active && wasHidden) {
            if (inferred === "upload") SoundService.upload();
            else if (inferred === "user" || inferred === "save" || inferred === "payment") SoundService.tone(310,.08,'triangle',.14);
        } else if (!active && !wasHidden) SoundService.success();
    }

    inferBusyKind(message = "") {
        const m = String(message).toLowerCase();
        if (/payment|plan|installment|بايمنت|سداد/.test(m)) return "payment";
        if (/upload|pdf|drawing|contract|scan|رفع|عقد|رسمة/.test(m)) return "upload";
        if (/user|account|create user|يوزر|مستخدم/.test(m)) return "user";
        if (/report|export|print|تقرير|طباعة/.test(m)) return "report";
        if (/save|saving|حفظ/.test(m)) return "save";
        return "default";
    }

    applyLanguageLabels() {
        const lang = localStorage.getItem("operation_language") || "en";
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


    bindEnterpriseUX() {
        if (this.enterpriseUxBound) return;
        this.enterpriseUxBound = true;
        const store = Container.get("enterpriseStore");
        const root = document.getElementById("enterprise-overlay-root") || document.body;

        const updateBadge = () => {
            const badge = document.getElementById("notification-count");
            if (!badge) return;
            const count = store.getNotifications().filter((x) => !x.read).length;
            badge.textContent = String(count);
            badge.classList.toggle("hidden", count === 0);
        };

        const moreBtn = document.getElementById("topbar-more-btn");
        const moreMenu = document.getElementById("topbar-more-menu");
        moreBtn?.addEventListener("click", (e) => { e.stopPropagation(); moreMenu?.classList.toggle("hidden"); });
        document.addEventListener("click", (e) => { if (moreMenu && !e.target.closest(".topbar-more-wrap")) moreMenu.classList.add("hidden"); });

        const fireReminder = (item) => {
            store.markReminderFired(item.id);
            store.notify("Reminder", item.title, "warning", { reminderId: item.id });
            updateBadge();
            try {
                if ("Notification" in window && Notification.permission === "granted") new Notification("Operation System Reminder", { body: item.title, icon: "./assets/images/favicon.ico" });
                SoundService.notification();
            } catch {}
            Container.get("notification")?.info(`Reminder: ${item.title}`);
        };
        const checkReminders = () => { const now=Date.now(); store.getReminders().filter(x=>!x.fired && x.dueAt && new Date(x.dueAt).getTime()<=now).forEach(fireReminder); };
        const syncRemoteReminders = async () => {
            try {
                const api=Container.get('api'), token=Container.get('authManager').getToken();
                if(!token)return;
                const res=await api.post('getReminders',{token},{cacheTTL:0,forceRefresh:true});
                const rows=res?.data?.data||[];
                if(Array.isArray(rows)) rows.filter(x=>!x.completed).forEach(x=>{
                    const exists=store.getReminders().some(r=>String(r.id)===String(x.id));
                    if(!exists)store.saveReminder({id:x.id,title:x.title,dueAt:x.due_at,source:'server'});
                });
            } catch (_) {}
        };
        if (!this.reminderTimer) { this.reminderTimer=setInterval(checkReminders,10000); syncRemoteReminders().finally(checkReminders); }

        const openNotifications = () => {
            const rows = store.getNotifications();
            const html = rows.length ? rows.slice(0, 40).map((x) => `
                <article class="notification-center-row ${x.read ? "" : "is-unread"}">
                    <span class="notification-type ${this.escapeHTML(x.type || "info")}"></span>
                    <div><strong>${this.escapeHTML(x.title)}</strong><p>${this.escapeHTML(x.message)}</p><small>${this.escapeHTML(new Date(x.createdAt).toLocaleString("en-GB"))}</small></div>
                </article>`).join("") : `<div class="empty-state"><strong>Inbox zero</strong><span>No notifications yet.</span></div>`;
            root.innerHTML = `<div class="enterprise-drawer-backdrop"><aside class="enterprise-drawer"><div class="enterprise-drawer-head"><div><span class="eyebrow">Notification Center</span><h2>Workspace Inbox</h2></div><button class="modal-close" id="enterprise-drawer-close">×</button></div><div class="enterprise-drawer-body">${html}</div><div class="enterprise-drawer-foot"><button class="btn btn-outline" id="notifications-mark-read">Mark all read</button><button class="btn btn-primary" data-route="commandcenter">Open Command Center</button></div></aside></div>`;
            document.getElementById("enterprise-drawer-close")?.addEventListener("click", () => root.innerHTML = "");
            document.getElementById("notifications-mark-read")?.addEventListener("click", () => { store.markNotificationsRead(); updateBadge(); root.innerHTML = ""; });
        };

        const quickCreate = (requestedType = "") => {
            root.innerHTML = `<div class="modal-backdrop"><div class="modal-box enterprise-quick-create"><div class="modal-heading"><div><span class="eyebrow">Quick Create</span><h2>Create without leaving your page</h2></div><button class="modal-close" id="qc-close">×</button></div><div class="quick-create-type-grid">
                <button class="quick-create-type ${requestedType === "task" ? "active" : ""}" data-qc-type="task"><strong>Task</strong><span>Follow-up or reminder</span></button>
                <button class="quick-create-type" data-qc-type="approval"><strong>Approval</strong><span>Request a controlled decision</span></button>
                <button class="quick-create-type" data-qc-type="note"><strong>Note</strong><span>Workspace note</span></button>
                <button class="quick-create-type" data-qc-type="view"><strong>Saved View</strong><span>Remember current route and project</span></button>
            </div><form id="qc-form"><input type="hidden" name="type" value="${this.escapeHTML(requestedType || "task")}"><div class="form-grid"><div class="field-full"><label>Title</label><input name="title" required></div><div><label>Reference</label><input name="reference" placeholder="Client, unit, lead..."></div><div><label>Due date</label><input name="dueDate" type="date"></div><div class="field-full"><label>Notes</label><textarea name="notes" rows="4"></textarea></div></div><div class="form-actions"><button type="button" class="btn btn-outline" id="qc-cancel">Cancel</button><button class="btn btn-primary">Create</button></div></form></div></div>`;
            const close = () => root.innerHTML = "";
            document.getElementById("qc-close")?.addEventListener("click", close);
            document.getElementById("qc-cancel")?.addEventListener("click", close);
            root.querySelectorAll("[data-qc-type]").forEach((btn) => btn.addEventListener("click", () => {
                root.querySelectorAll("[data-qc-type]").forEach(x => x.classList.toggle("active", x === btn));
                root.querySelector('#qc-form [name="type"]').value = btn.dataset.qcType;
            }));
            document.getElementById("qc-form")?.addEventListener("submit", (e) => {
                e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget).entries());
                if (data.type === "task") store.saveTask({ title: data.title, notes: data.notes, linkedRef: data.reference, linkedType: "General", dueDate: data.dueDate, priority: "Medium" });
                else if (data.type === "approval") store.saveApproval({ title: data.title, notes: data.notes, reference: data.reference, requestedBy: Container.get("authManager").getUser()?.name || "Current user" });
                else if (data.type === "view") store.saveView({ name: data.title, route: this.router?.currentRoute || "overview", project: sessionStorage.getItem("operation_global_project") || "ALL", note: data.notes });
                else store.addActivity("Workspace note", data.title, { note: data.notes, reference: data.reference });
                store.notify("Created", `${data.title} was added to the workspace.`, "success"); updateBadge(); close(); Container.get("notification")?.success("Created successfully");
            });
        };

        const openPalette = () => {
            const commands = [
                ["Command Center", "commandcenter", "Executive workspace"], ["Overview", "overview", "Business overview"], ["Dashboard", "dashboard", "Sales dashboard"],
                ["Inventory", "inventory", "Units and availability"], ["Digital Twin", "digitaltwin", "Live building and unit map"], ["CRM", "crm", "Clients and profiles"], ["Leads", "leads", "Lead pipeline"], ["Tasks", "tasks", "Follow-ups"],
                ["Analytics", "analytics", "Targets and finance"], ["Data Quality", "quality", "Health and data issues"], ["Reports", "reports", "Reporting center"],
                ["Contracts", "contracts", "Contract records"], ["Documents", "documents", "Client document vault"], ["Users", "users", "Users and audit"], ["Settings", "settings", "Workspace settings"]
            ].filter(([,route]) => Container.get("permissionManager").can(String(Container.get("authManager").getUser()?.role || "user").toLowerCase(), route));
            root.innerHTML = `<div class="command-palette-backdrop"><div class="command-palette"><div class="command-palette-search"><span>⌕</span><input id="command-palette-input" placeholder="Search a page, client, unit, or action…" autocomplete="off"><kbd>ESC</kbd></div><div class="command-palette-results" id="command-palette-results"></div><div class="command-palette-foot"><span>Enter to open</span><span>Type any client, mobile or unit to search CRM</span></div></div></div>`;
            const input = document.getElementById("command-palette-input"), results = document.getElementById("command-palette-results");
            const paint = () => { const q = input.value.trim().toLowerCase(); const matches = commands.filter(x => !q || `${x[0]} ${x[2]}`.toLowerCase().includes(q)); results.innerHTML = matches.map((x,i)=>`<button class="command-result ${i===0?'active':''}" data-command-route="${x[1]}"><span><strong>${x[0]}</strong><small>${x[2]}</small></span><em>Open</em></button>`).join("") + (q && !matches.length ? `<button class="command-result active" data-global-search="${this.escapeHTML(input.value)}"><span><strong>Search “${this.escapeHTML(input.value)}”</strong><small>Search CRM, inventory and leads</small></span><em>Search</em></button>` : ""); };
            paint(); input.focus(); input.addEventListener("input", paint);
            results.addEventListener("click", async (e) => { const b=e.target.closest("button"); if(!b)return; const route=b.dataset.commandRoute; const q=b.dataset.globalSearch; root.innerHTML=""; if(route) await this.router.load(route); else if(q){ sessionStorage.setItem("operation_global_search",JSON.stringify({term:q,target:"all",ts:Date.now()})); await this.router.load("crm"); } });
            input.addEventListener("keydown", async e => { if(e.key==="Escape") root.innerHTML=""; if(e.key==="Enter"){ const b=results.querySelector(".command-result"); if(b)b.click(); } });
        };

        document.getElementById("notification-center-btn")?.addEventListener("click", openNotifications);
        document.getElementById("quick-create-btn")?.addEventListener("click", () => quickCreate());
        window.addEventListener("operation:quick-create", (e) => quickCreate(e.detail?.type || "task"));
        window.addEventListener("operation:enterprise-store", updateBadge);
        document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); } if (e.key === "Escape" && root.innerHTML) root.innerHTML=""; });
        updateBadge();
    }

    bindOpsCopilot() {
        if (this.opsCopilotBound) return;
        this.opsCopilotBound = true;
        const root = document.getElementById("enterprise-overlay-root") || document.body;
        const open = async (seed = "") => {
            root.innerHTML = `<div class="copilot-backdrop"><aside class="ops-copilot agent-mode"><div class="copilot-head"><div><span class="eyebrow">Operation AI · Advanced Agent</span><h2>مساعد العمليات</h2><p>كلّمني بطبيعتك. بفهم المصري والإنجليزي، أقدر أدور في الداتا والمستندات، أفتح الأقسام، أحلل Payment Plans، وأجهز إجراءات فعلية.</p></div><div class="copilot-status"><i></i><span>Ready</span></div><button class="modal-close" id="copilot-close">×</button></div><div class="copilot-suggestions"><button data-copilot-prompt="اديني ملخص سريع عن الشركة">ملخص تنفيذي</button><button data-copilot-prompt="هات الوحدات المتاحة في ميرسي">وحدات متاحة</button><button data-copilot-prompt="فكرني بعد نص ساعة أراجع العقود">Reminder</button><button data-copilot-prompt="رأيك في Payment Plan 10% DP - 8 سنين - Monthly - 5% Discount لو سعر الوحدة 10 مليون">Payment Plan</button><button data-copilot-prompt="هاتلي PDF العقد بتاع العميل أحمد">PDF عميل</button><button data-copilot-prompt="ابعت ايميل بإجمالي EOI إلى example@company.com">Email</button></div><div id="copilot-conversation" class="copilot-conversation"><div class="copilot-message assistant"><span>AI</span><div><strong>جاهز</strong><p>قولّي اللي عايزه زي ما بتكلمني عادي. مثال: «هاتلي عقد العميل أحمد»، «افتح CRM»، «PDF الوحدة A03-G01»، أو «رأيك في Payment Plan 10% على 8 سنين؟».</p></div></div></div><div class="copilot-composer"><button id="copilot-voice" type="button" title="Voice input">◉</button><textarea id="copilot-input" rows="1" placeholder="اكتب أو اتكلم مع Operation AI…" autocomplete="off"></textarea><button id="copilot-send" type="button">Send</button></div><div class="copilot-footnote">Operation AI uses the live system as tools when the AI backend is configured. It can search clients/units/documents, open modules and PDFs, analyze plans, and keep conversation context. External sending still requires an authenticated mail connection.</div></aside></div>`;
            const close = () => root.innerHTML = "";
            document.getElementById("copilot-close")?.addEventListener("click", close);
            const input = document.getElementById("copilot-input");
            const convo = document.getElementById("copilot-conversation");
            const executeAction = async (action, button) => {
                const kind=action?.kind, payload=action?.payload||{};
                if(kind==='route'){ close(); await this.router.load(payload.route); return; }
                if(kind==='open-url'){
                    const url=String(payload.url||'');
                    if(!url){ Container.get('notification')?.warning('Document link is unavailable.'); return; }
                    window.open(url,'_blank','noopener,noreferrer');
                    button.disabled=true; button.textContent='✓ PDF opened'; return;
                }
                if(kind==='reminder'){
                    const store=Container.get('enterpriseStore'); store.saveReminder(payload);
                    if('Notification' in window && Notification.permission==='default') { try{ await Notification.requestPermission(); }catch{} }
                    button.disabled=true; button.textContent='✓ Reminder active'; Container.get('notification')?.success('Reminder scheduled'); return;
                }
                if(kind==='send-email'){
                    try {
                        const api = Container.get('api');
                        const token = Container.get('authManager').getToken();
                        if (payload.needsConnect) {
                            const connect = await api.post('getGmailConnectUrl', { token }, { cacheTTL: 0, forceRefresh: true });
                            const url = connect?.data?.data?.url || connect?.data?.url || '';
                            if (!connect?.ok || !url) throw new Error(connect?.message || 'Gmail is not connected. Configure Gmail OAuth in Vercel first.');
                            window.open(url, 'gmail-connect', 'noopener,noreferrer,width=680,height=760');
                            button.textContent='Connect Gmail';
                            Container.get('notification')?.info('Finish Google authorization, then ask me to send again.');
                            return;
                        }
                        const confirmed = window.confirm(`Send this email with your connected Gmail account?\n\nTo: ${payload.to || '-'}\nSubject: ${payload.subject || '-'}`);
                        if (!confirmed) return;
                        button.disabled = true; button.textContent = 'Sending…';
                        window.dispatchEvent(new CustomEvent('operation:busy', {detail:{active:true,kind:'email',message:'Sending with Gmail…'}}));
                        const res = await api.post('sendGmail', { token, data: { to: payload.to || '', subject: payload.subject || '', body: payload.body || '', documentIds: payload.documentIds || [] } }, { cacheTTL: 0, forceRefresh: true });
                        if (!res?.ok || res?.data?.ok === false) throw new Error(res?.data?.message || res?.message || 'Email sending failed.');
                        button.textContent='✓ Sent';
                        Container.get('notification')?.success('Email sent from your Gmail account');
                    } catch (error) {
                        button.disabled = false; button.textContent='Try again';
                        Container.get('notification')?.error(error.message || 'Email sending failed');
                    } finally {
                        window.dispatchEvent(new CustomEvent('operation:busy', {detail:{active:false,kind:'email'}}));
                    }
                    return;
                }
                if(kind==='email'){
                    const url=`mailto:${encodeURIComponent(payload.to||'')}?subject=${encodeURIComponent(payload.subject||'')}&body=${encodeURIComponent(payload.body||'')}`;
                    window.location.href=url; button.textContent='✓ Compose opened'; return;
                }
            };
            const ask = async (prompt) => {
                const q = String(prompt || input.value || "").trim(); if (!q) return;
                input.value = "";
                convo.insertAdjacentHTML("beforeend", `<div class="copilot-message user"><span>YOU</span><div><p>${this.escapeHTML(q)}</p></div></div><div class="copilot-thinking"><i></i><i></i><i></i></div>`);
                convo.scrollTop = convo.scrollHeight;
                try {
                    const mod = await import("../services/ops.copilot.service.js");
                    const result = await mod.default.ask(q);
                    convo.querySelector(".copilot-thinking")?.remove();
                    const rows = (result.rows || []).map((x) => `<button class="copilot-result-row" ${result.route ? `data-route="${this.escapeHTML(result.route)}"` : ""}><strong>${this.escapeHTML(x.label)}</strong><span>${this.escapeHTML(x.value)}</span></button>`).join("");
                    const preview=result.preview?`<div class="copilot-preview"><span>To</span><strong>${this.escapeHTML(result.preview.to||'')}</strong><span>Subject</span><strong>${this.escapeHTML(result.preview.subject||'')}</strong><p>${this.escapeHTML(result.preview.body||'').replace(/\n/g,'<br>')}</p></div>`:'';
                    const actions=(result.actions||[]).map((a,i)=>`<button class="copilot-action-btn" data-agent-action="${i}">${this.escapeHTML(a.label||'Run')}</button>`).join('');
                    const expert=result.expert?`<span class="copilot-expert">${this.escapeHTML(result.expert)}</span>`:'';
                    convo.insertAdjacentHTML("beforeend", `<div class="copilot-message assistant"><span>AI</span><div>${expert}<strong>${this.escapeHTML(result.title || "Result")}</strong><p>${this.escapeHTML(result.answer || "")}</p>${preview}${rows ? `<div class="copilot-result-list">${rows}</div>` : ""}${actions?`<div class="copilot-action-row">${actions}</div>`:''}${result.route && !actions ? `<button class="copilot-open-route" data-route="${this.escapeHTML(result.route)}">Open ${this.escapeHTML(result.route)}</button>` : ""}</div></div>`);
                    const msg=convo.lastElementChild; msg?.querySelectorAll('[data-agent-action]').forEach(btn=>btn.addEventListener('click',()=>executeAction(result.actions[Number(btn.dataset.agentAction)],btn)));
                    const autoAction=(result.actions||[]).find(a=>a?.auto===true && a?.kind==='route');
                    if(autoAction){ setTimeout(()=>{ const fake=msg?.querySelector(`[data-agent-action="${(result.actions||[]).indexOf(autoAction)}"]`)||document.createElement('button'); executeAction(autoAction,fake); },450); }
                } catch (error) {
                    convo.querySelector(".copilot-thinking")?.remove();
                    convo.insertAdjacentHTML("beforeend", `<div class="copilot-message assistant error"><span>!</span><div><strong>مقدرتش أنفذ الطلب</strong><p>${this.escapeHTML(error.message || String(error))}</p></div></div>`);
                }
                convo.scrollTop = convo.scrollHeight;
            };
            document.getElementById("copilot-send")?.addEventListener("click", () => ask());
            input?.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } if (e.key === "Escape") close(); });
            root.querySelectorAll("[data-copilot-prompt]").forEach((b) => b.addEventListener("click", () => ask(b.dataset.copilotPrompt)));
            const voice = document.getElementById("copilot-voice");
            voice?.addEventListener("click", () => {
                const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!Speech) { Container.get("notification")?.info("Voice input is not supported by this browser."); return; }
                const recognition = new Speech(); recognition.lang = /[\u0600-\u06FF]/.test(document.documentElement.innerText||'') ? "ar-EG" : "ar-EG"; recognition.interimResults = false;
                voice.classList.add("listening"); recognition.onresult = (e) => { const text = e.results?.[0]?.[0]?.transcript || ""; input.value = text; ask(text); }; recognition.onend = () => voice.classList.remove("listening"); recognition.onerror = () => voice.classList.remove("listening"); recognition.start();
            });
            if (seed) { input.value = seed; setTimeout(() => ask(seed), 50); } else input?.focus();
        };
        document.getElementById("ops-copilot-btn")?.addEventListener("click", () => open());
        document.getElementById("voice-search-btn")?.addEventListener("click", () => {
            const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!Speech) { open("اديني ملخص سريع"); return; }
            const recognition = new Speech(); recognition.lang = "ar-EG"; recognition.interimResults = false;
            recognition.onresult = (e) => open(e.results?.[0]?.[0]?.transcript || ""); recognition.start();
        });
        window.addEventListener("operation:open-copilot", (e) => open(e.detail?.prompt || ""));
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