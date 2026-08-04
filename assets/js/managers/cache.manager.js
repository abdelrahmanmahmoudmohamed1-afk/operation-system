/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: cache.manager.js
 * Layer: Managers
 * Responsibility:
 * - Runtime memory cache
 * ---------------------------------------------------------
 * Version: 0.3.0
 * ---------------------------------------------------------
 */

class CacheManager {
    constructor() {
        this.cache = new Map();
    }

    set(key, value, ttl = null) {
        const expiresAt = ttl ? Date.now() + ttl : null;

        this.cache.set(key, {
            value,
            expiresAt
        });
    }

    get(key, defaultValue = null) {
        if (!this.cache.has(key)) {
            return defaultValue;
        }

        const item = this.cache.get(key);

        if (item.expiresAt && Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return defaultValue;
        }

        return item.value;
    }

    has(key) {
        return this.cache.has(key) && this.get(key) !== null;
    }

    remove(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }
}

export default new CacheManager();