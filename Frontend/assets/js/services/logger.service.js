/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: logger.service.js
 * Layer: Services
 * Responsibility:
 * - Standardized application logging
 * ---------------------------------------------------------
 * Version: 0.2.0
 * ---------------------------------------------------------
 */

class LoggerService {
    constructor() {
        this.enabled = true;
    }

    log(message, data = null) {
        if (!this.enabled) return;
        console.log(`[LOG] ${message}`, data ?? "");
    }

    info(message, data = null) {
        if (!this.enabled) return;
        console.info(`[INFO] ${message}`, data ?? "");
    }

    warn(message, data = null) {
        if (!this.enabled) return;
        console.warn(`[WARN] ${message}`, data ?? "");
    }

    error(message, data = null) {
        if (!this.enabled) return;
        console.error(`[ERROR] ${message}`, data ?? "");
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }
}

export default new LoggerService();