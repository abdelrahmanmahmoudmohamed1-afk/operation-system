/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: storage.service.js
 * Layer: Services
 * Responsibility:
 * - Local storage wrapper
 * ---------------------------------------------------------
 * Version: 0.2.0
 * ---------------------------------------------------------
 */

class StorageService {
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    get(key, defaultValue = null) {
        const value = localStorage.getItem(key);

        if (value === null) {
            return defaultValue;
        }

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    remove(key) {
        localStorage.removeItem(key);
    }

    clear() {
        localStorage.clear();
    }
}

export default new StorageService();