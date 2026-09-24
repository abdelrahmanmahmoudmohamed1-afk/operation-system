class User {
    constructor(data = {}) {
        this.name = data.name || "";
        this.user = data.user || "";
        this.role = data.role || "";
        this.salesManager = data.salesManager || "";
        this.salesDirector = data.salesDirector || "";
    }

    isAdmin() { return this.role === "Admin"; }
    isDirector() { return this.role === "Director"; }
    isManager() { return this.role === "Manager"; }
    isSales() { return this.role === "Sales"; }
}

export default User;
