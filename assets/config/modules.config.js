const MODULES = Object.freeze({

    overview: {
        name: "Overview",
        route: "overview",
        folder: "overview",
        controller: "overview.controller.js",
        service: "overview.service.js",
        view: "overview.view.js",
        permissions: []
    },

    dashboard: {
        name: "Dashboard",
        route: "dashboard",
        folder: "dashboard",
        controller: "dashboard.controller.js",
        service: "dashboard.service.js",
        view: "dashboard.view.js",
        permissions: []
    },

    inventory: {
        name: "Inventory",
        route: "inventory",
        folder: "inventory",
        controller: "inventory.controller.js",
        service: "inventory.service.js",
        view: "inventory.view.js",
        permissions: []
    },

    payment: {
        name: "Payment",
        route: "payment",
        folder: "payment",
        controller: "payment.controller.js",
        service: "payment.service.js",
        view: "payment.view.js",
        permissions: []
    },

    crm: {
        name: "CRM",
        route: "crm",
        folder: "crm",
        controller: "crm.controller.js",
        service: "crm.service.js",
        view: "crm.view.js",
        permissions: []
    },

    leads: {
        name: "Leads",
        route: "leads",
        folder: "leads",
        controller: "leads.controller.js",
        service: "leads.service.js",
        view: "leads.view.js",
        permissions: []
    },

    eoi: {
        name: "EOI",
        route: "eoi",
        folder: "eoi",
        controller: "eoi.controller.js",
        service: "eoi.service.js",
        view: "eoi.view.js",
        permissions: []
    },

    reports: {
        name: "Reports",
        route: "reports",
        folder: "reports",
        controller: "reports.controller.js",
        service: "reports.service.js",
        view: "reports.view.js",
        permissions: []
    },

    contracts: {
        name: "Contracts",
        route: "contracts",
        folder: "contracts",
        controller: "contracts.controller.js",
        service: "contracts.service.js",
        view: "contracts.view.js",
        permissions: []
    },

    users: {
        name: "Users",
        route: "users",
        folder: "users",
        controller: "users.controller.js",
        service: "users.service.js",
        view: "users.view.js",
        permissions: ["admin", "owner", "ceo", "operation", "operations"]
    },

    settings: {
        name: "Settings",
        route: "settings",
        folder: "settings",
        controller: "settings.controller.js",
        service: "settings.service.js",
        view: "settings.view.js",
        permissions: []
    }

});

export default MODULES;