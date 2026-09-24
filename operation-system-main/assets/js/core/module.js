/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: module.js
 * Layer: Core
 * Responsibility:
 * - Base module class
 * - Standardize module lifecycle
 * - Provide service access to all modules
 * ---------------------------------------------------------
 * Version: 0.3.0
 * ---------------------------------------------------------
 */

import Container from "./container.js";

class Module {
    constructor() {
        this.container = null;
        this.config = null;
        this.initialized = false;
        this.services = Container;
        this.events = [];
    }

    async init({ container, config }) {
        this.container = container;
        this.config = config;
        this.initialized = true;

        await this.beforeRender();
        await this.render();
        this.bindEvents();
        await this.afterRender();
    }

    async beforeRender() {}

    async render() {}

    bindEvents() {}

    async afterRender() {}

    async refresh() {
        await this.render();
    }

    on(eventName, callback) {
        const eventBus = this.service("eventBus");
        const unsubscribe = eventBus.on(eventName, callback);

        this.events.push(unsubscribe);

        return unsubscribe;
    }

    unbindEvents() {
        this.events.forEach((unsubscribe) => unsubscribe());
        this.events = [];
    }

    async destroy() {
        this.unbindEvents();

        this.container = null;
        this.config = null;
        this.initialized = false;
    }

    service(name) {
        return this.services.get(name);
    }

    logger() {
        return this.service("logger");
    }

    notify() {
        return this.service("notification");
    }
}

export default Module;