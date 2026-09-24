class User {
    constructor(data = {}) {
        this.name = data.name || "";
        this.user = data.user || "";
        this.role = data.role || "User";
        this.salesManager = data.salesManager || "";
        this.salesDirector = data.salesDirector || "";
    }

    isAdmin() { return String(this.role).toLowerCase() === "admin"; }
    isUser() { return String(this.role).toLowerCase() === "user"; }
}

export default User;
