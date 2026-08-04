/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: auth.manager.js
 * Layer: Managers
 * Responsibility:
 * - Manage authentication state
 * ---------------------------------------------------------
 * Version: 0.3.0
 * ---------------------------------------------------------
 */

import SessionManager from "./session.manager.js";

class AuthManager {
    isLoggedIn() {
        return SessionManager.isAuthenticated();
    }

    login(token, user) {
        SessionManager.setSession(token, user);
    }

    logout() {
        SessionManager.clearSession();
        location.hash = "login";
    }

    getUser() {
        return SessionManager.getUser();
    }

    getToken() {
        return SessionManager.getToken();
    }
}

export default new AuthManager();