/**
 * أسماء الـ actions اللي الباك إند (Apps Script unified backend)
 * بيفهمها. أي service جديد المفروض يستخدم القيم من هنا بدل ما
 * يكتب اسم الـ action كنص حر، عشان لو الباك إند اتغير اسم
 * action فيه، نعدّل هنا بس.
 */
const ENDPOINTS = Object.freeze({
    LOGIN: "login",
    LOGOUT: "logout",
    CHANGE_PASSWORD: "changeOwnPassword",
    SYSTEM_INFO: "getSystemInfo",
    RECORD_ACTIVITY: "recordUserActivity",

    DASHBOARD_FILTERS: "getDashboardFilters",
    DASHBOARD_DATA: "getDashboardData",
    ACHIEVEMENT_DATA: "getAchievementData",

    CLIENT_FORM_BOOTSTRAP: "getClientFormBootstrap",
    SALES_LIST: "getSales",
    COMPANIES: "getCompanies",
    MANAGER_DIRECTOR: "getManagerDirector",
    SAVE_CLIENT: "saveClientRegistration",
    CLIENTS_LIST: "getClients",
    UPLOAD_CLIENT_CONTRACT: "uploadClientContract",
    CLIENT_DOCUMENTS: "getClientDocuments",

    INVENTORY_DATA: "getInventoryData",
    INVENTORY_PROJECTS: "getInventoryProjects",
    AVAILABLE_UNITS_BY_PROJECT: "getAvailableUnitsByProject",
    AVAILABLE_LAYANA_UNITS: "getAvailableLayanaUnits",
    REFRESH_LAYANA_UNITS: "refreshAvailableLayanaUnits",

    EOI_FORM_BOOTSTRAP: "getEOIFormBootstrap",
    SAVE_EOI: "saveEOI",
    EOI_DATA: "getEOIData",

    LEADS_DATA: "getLeadsData",
    BULK_UPDATE_LEAD_STATUS: "bulkUpdateLeadStatus",
    IMPORT_LEADS: "importLeads",

    USERS_DATA: "getUsersData",
    CREATE_SYSTEM_USER: "createSystemUser",
    AUDIT_HISTORY: "getAuditHistory"
});

export default ENDPOINTS;
