/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: session.manager.js
 * Layer: Managers
 * Responsibility:
 * - Manage user session
 * ---------------------------------------------------------
 * Version: 0.3.0
 * ---------------------------------------------------------
 */

class SessionManager {
    constructor() {
        this.tokenKey = "auth_token";
        this.userKey = "auth_user";
    }

    setSession(token, user) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    getUser() {
        const user = localStorage.getItem(this.userKey);

        if (!user) {
            return null;
        }

        try {
            return JSON.parse(user);
        } catch {
            return null;
        }
    }

    isAuthenticated() {
        return Boolean(this.getToken());
    }

    clearSession() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }
}

export default new SessionManager();