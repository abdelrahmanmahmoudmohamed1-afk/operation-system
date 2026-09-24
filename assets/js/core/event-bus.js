/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: event-bus.js
 * Layer: Core
 * Responsibility:
 * - Global application events
 * ---------------------------------------------------------
 * Version: 0.2.0
 * ---------------------------------------------------------
 */

class EventBus {
    constructor() {
        this.events = new Map();
    }

    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }

        this.events.get(eventName).add(callback);

        return () => this.off(eventName, callback);
    }

    off(eventName, callback) {
        if (!this.events.has(eventName)) return;

        this.events.get(eventName).delete(callback);
    }

    emit(eventName, payload = null) {
        if (!this.events.has(eventName)) return;

        this.events.get(eventName).forEach((callback) => {
            try {
                callback(payload);
            } catch (error) {
                console.error(`EventBus error in ${eventName}:`, error);
            }
        });
    }

    clear(eventName = null) {
        if (eventName) {
            this.events.delete(eventName);
            return;
        }

        this.events.clear();
    }
}

export default new EventBus();