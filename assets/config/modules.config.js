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


    digitaltwin: {
        name: "Digital Twin",
        route: "digitaltwin",
        folder: "digitaltwin",
        controller: "digitaltwin.controller.js",
        service: "digitaltwin.service.js",
        view: "digitaltwin.view.js",
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

    eoi: {
        name: "EOI",
        route: "eoi",
        folder: "eoi",
        controller: "eoi.controller.js",
        service: "eoi.service.js",
        view: "eoi.view.js",
        permissions: []
    },

    achievement: {
        name: "Achievement",
        route: "achievement",
        folder: "achievement",
        controller: "achievement.controller.js",
        service: "achievement.service.js",
        view: "achievement.view.js",
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


    leads: {
        name: "Leads",
        route: "leads",
        folder: "leads",
        controller: "leads.controller.js",
        service: "leads.service.js",
        view: "leads.view.js",
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


    documents: {
        name: "Documents", route: "documents", folder: "documents",
        controller: "documents.controller.js", service: "documents.service.js", view: "documents.view.js", permissions: []
    },

    users: {
        name: "Users",
        route: "users",
        folder: "users",
        controller: "users.controller.js",
        service: "users.service.js",
        view: "users.view.js",
        permissions: ["admin"]
    },


    commandcenter: {
        name: "Command Center", route: "commandcenter", folder: "commandcenter",
        controller: "commandcenter.controller.js", service: "commandcenter.service.js", view: "commandcenter.view.js", permissions: []
    },

    tasks: {
        name: "Tasks", route: "tasks", folder: "tasks",
        controller: "tasks.controller.js", service: "tasks.service.js", view: "tasks.view.js", permissions: []
    },

    analytics: {
        name: "Analytics", route: "analytics", folder: "analytics",
        controller: "analytics.controller.js", service: "analytics.service.js", view: "analytics.view.js", permissions: []
    },

    quality: {
        name: "Data Quality", route: "quality", folder: "quality",
        controller: "quality.controller.js", service: "quality.service.js", view: "quality.view.js", permissions: []
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