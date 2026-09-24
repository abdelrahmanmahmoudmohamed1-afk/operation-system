/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: utils/storage.js
 * Layer: Utils
 * Responsibility:
 * - Thin localStorage helper used by code outside the DI
 *   container (e.g. before services are registered).
 *   For normal module code, prefer services/storage.service.js
 *   via Container.get("storage").
 * ---------------------------------------------------------
 * Version: 0.1.0
 * ---------------------------------------------------------
 */

export function setItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn("storage.setItem failed", e);
    }
}

export function getItem(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

export function removeItem(key) {
    localStorage.removeItem(key);
}
