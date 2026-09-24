const ROUTES = Object.freeze({
    login: { title: "Login", path: "layouts/login.html", secure: false },
    overview: { title: "Overview", path: "pages/overview.html", secure: true },
    dashboard: { title: "Dashboard", path: "pages/dashboard.html", secure: true },
    inventory: { title: "Inventory", path: "pages/inventory.html", secure: true },
    payment: { title: "Payment Plans", path: "pages/payment.html", secure: true },
    crm: { title: "CRM", path: "pages/crm.html", secure: true },
    leads: { title: "Leads", path: "pages/leads.html", secure: true },
    eoi: { title: "EOI", path: "pages/eoi.html", secure: true },
    achievement: { title: "Achievement", path: "pages/achievement.html", secure: true },
    reports: { title: "Reports", path: "pages/reports.html", secure: true },
    contracts: { title: "Contracts", path: "pages/contracts.html", secure: true },
    users: { title: "Users", path: "pages/users.html", secure: true },
    settings: { title: "Settings", path: "pages/settings.html", secure: true }
});
export default ROUTES;
