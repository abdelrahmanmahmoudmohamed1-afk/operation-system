const PERMISSIONS = Object.freeze({
    admin: ["overview", "dashboard", "inventory", "payment", "crm", "eoi", "reports", "contracts", "users", "settings"],
    owner: ["overview", "dashboard", "inventory", "payment", "crm", "eoi", "reports", "contracts", "users", "settings"],
    ceo: ["overview", "dashboard", "inventory", "payment", "crm", "eoi", "reports", "contracts", "users", "settings"],
    operation: ["overview", "dashboard", "inventory", "payment", "crm", "eoi", "reports", "contracts", "users", "settings"],
    operations: ["overview", "dashboard", "inventory", "payment", "crm", "eoi", "reports", "contracts", "users", "settings"],
    manager: ["overview", "dashboard", "inventory", "payment", "crm", "eoi", "reports", "contracts"],
    director: ["overview", "dashboard", "inventory", "payment", "crm", "eoi", "reports", "contracts"],
    sales: ["overview", "dashboard", "inventory", "payment", "crm", "eoi"],
    user: ["overview", "dashboard", "inventory", "payment", "crm", "eoi", "reports"]
});
export default PERMISSIONS;
