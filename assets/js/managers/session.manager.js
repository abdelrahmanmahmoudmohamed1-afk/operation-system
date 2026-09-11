/**
 * Session storage intentionally keeps the authentication token only for the
 * current browser session. A one-time migration clears legacy persistent data.
 */
class SessionManager {
    constructor() {
        this.tokenKey = "auth_token";
        this.userKey = "auth_user";
        this.refreshKey = "auth_refresh_token";
        this.migrateLegacySession();
    }

    migrateLegacySession() {
        const legacyToken = localStorage.getItem(this.tokenKey);
        const legacyUser = localStorage.getItem(this.userKey);
        if (legacyToken && !sessionStorage.getItem(this.tokenKey)) {
            sessionStorage.setItem(this.tokenKey, legacyToken);
        }
        if (legacyUser && !sessionStorage.getItem(this.userKey)) {
            sessionStorage.setItem(this.userKey, legacyUser);
        }
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }

    setSession(token, user, refreshToken = "") {
        sessionStorage.setItem(this.tokenKey, token);
        sessionStorage.setItem(this.userKey, JSON.stringify(user));
        if (refreshToken) sessionStorage.setItem(this.refreshKey, refreshToken);
        else sessionStorage.removeItem(this.refreshKey);
    }

    getToken() {
        return sessionStorage.getItem(this.tokenKey);
    }

    getRefreshToken() {
        return sessionStorage.getItem(this.refreshKey);
    }

    getUser() {
        const user = sessionStorage.getItem(this.userKey);
        if (!user) return null;
        try { return JSON.parse(user); } catch { return null; }
    }

    isAuthenticated() {
        return Boolean(this.getToken() && this.getUser());
    }

    clearSession() {
        sessionStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.userKey);
        sessionStorage.removeItem(this.refreshKey);
    }
}

export default new SessionManager();
