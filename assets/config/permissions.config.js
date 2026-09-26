const PERMISSIONS = Object.freeze({
    admin: ["commandcenter", "overview", "dashboard", "inventory", "digitaltwin", "payment", "crm", "salesoperations", "leads", "orientation", "eoi", "achievement", "reports", "contracts", "documents", "tasks", "analytics", "quality", "chat", "users", "settings"],
    user: ["commandcenter", "overview", "dashboard", "inventory", "digitaltwin", "payment", "crm", "salesoperations", "leads", "orientation", "eoi", "achievement", "reports", "contracts", "documents", "tasks", "analytics", "quality", "chat", "settings"],
    operations: ["commandcenter", "overview", "dashboard", "inventory", "digitaltwin", "payment", "crm", "salesoperations", "leads", "orientation", "eoi", "achievement", "reports", "contracts", "documents", "tasks", "analytics", "quality", "chat", "settings"],
    sales: ["commandcenter", "overview", "dashboard", "inventory", "payment", "crm", "leads", "eoi", "achievement", "reports", "contracts", "documents", "tasks", "chat", "settings"]
});
export default PERMISSIONS;
