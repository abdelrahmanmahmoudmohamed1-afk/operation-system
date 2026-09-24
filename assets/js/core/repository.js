/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: repository.js
 * Layer: Core
 * Responsibility:
 * - Base repository class
 * - Standardize data access layer
 * ---------------------------------------------------------
 * Version: 0.2.0
 * ---------------------------------------------------------
 */

import Container from "./container.js";

class Repository {
    constructor(name) {
        this.name = name;
        this.api = Container.get("api");
        this.logger = Container.get("logger");
        this.notification = Container.get("notification");
    }

    async get(action, params = {}) {
        this.logger.info(`${this.name} repository GET`, { action, params });

        return this.api.get(action, params);
    }

    async post(action, payload = {}) {
        this.logger.info(`${this.name} repository POST`, { action, payload });

        return this.api.post(action, payload);
    }
}

export default Repository;