/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: service-provider.js
 * Layer: Providers
 * Responsibility:
 * - Register all application services, managers and repositories
 * ---------------------------------------------------------
 * Version: 0.3.0
 * ---------------------------------------------------------
 */

import Container from "../core/container.js";

import EventBus from "../core/event-bus.js";

import StorageService from "../services/storage.service.js";
import LoggerService from "../services/logger.service.js";
import NotificationService from "../services/notification.service.js";
import ApiService from "../services/api.service.js";
import AuditService from "../services/audit.service.js";

import ThemeManager from "../managers/theme.manager.js";
import SessionManager from "../managers/session.manager.js";
import AuthManager from "../managers/auth.manager.js";
import PermissionManager from "../managers/permission.manager.js";
import CacheManager from "../managers/cache.manager.js";
import ConfigManager from "../managers/config.manager.js";

import DashboardRepository from "../repositories/dashboard.repository.js";

class ServiceProvider {
    register() {
        this.registerCore();
        this.registerServices();
        this.registerManagers();
        this.registerRepositories();

        LoggerService.info("Application providers registered successfully");
    }

    registerCore() {
        Container.register("eventBus", EventBus);
    }

    registerServices() {
        Container.register("storage", StorageService);
        Container.register("logger", LoggerService);
        Container.register("notification", NotificationService);
        Container.register("api", ApiService);
        Container.register("audit", AuditService);
    }

    registerManagers() {
        Container.register("themeManager", ThemeManager);
        Container.register("sessionManager", SessionManager);
        Container.register("authManager", AuthManager);
        Container.register("permissionManager", PermissionManager);
        Container.register("cacheManager", CacheManager);
        Container.register("configManager", ConfigManager);
    }

    registerRepositories() {
        Container.register(
            "dashboardRepository",
            new DashboardRepository()
        );
    }
}

export default new ServiceProvider();