/**
 * ===========================================================
 * OPERATION SYSTEM UNIFIED BACKEND — Config.gs
 * ===========================================================
 * كل الـ Spreadsheet IDs وأسماء الشيتات في مكان واحد فقط.
 * أي تغيير في أي ID أو اسم شيت يتم هنا فقط، باقي الملفات
 * بتستخدم القيم من هنا ومبتعرفش تفاصيل الشيتات الفعلية.
 *
 * IMPORTANT: راجع كل الـ IDs دي وتأكد إنها صح قبل ما تشغل
 * أي حاجة. دول جايين من الأكواد المنفصلة اللي بعتهالي.
 * ===========================================================
 */

const SPREADSHEETS = {
  // الداتا الرئيسية: Inventory Management, Layana Transaction, Cancelled...
  DATA: '1Dfz8g9zijDKTqEEn_t2gx3x2PvIVZ5BPDhCv_01QsCE',

  // اليوزرز + الإعدادات + Sales Data + Sales Company + Orientation Sheet
  SETTINGS: '1Q68jyPM2UgAaVSCvMa32QH91E_kzL7lKj_oXKgtnpVQ',

  // وحدات Layana المتاحة (Available Units & Payment Plans)
  AVAILABLE: '1vYgkIgP44E7vHbQ_cbtlUweuOTdqnvcH4VoT4pTh2oE',

  // EOI Mersea
  EOI: '1pbU2xflJX1s9Ts__o3MhIslJDGOc9GoNf_vPX6fQwJg',

  // All Brokers + Request (الكروبات والطلبات والزيارات)
  BROKERS: '1C13-OWI5fOnqW-LO4Kb7bOq1wyE44nIbAp6jbm5OYTA',

  // Leads
  LEADS: '1SzaCVURxxKxGcBLVtlYtH6M4u-npDfjIV1Q7BXO63ec'
};


// Unified project sources. Add future projects here without changing readers.
const PROJECT_SOURCES = [
  {
    key: 'Layana',
    spreadsheetId: '1Dfz8g9zijDKTqEEn_t2gx3x2PvIVZ5BPDhCv_01QsCE',
    inventorySheet: 'Layana Inventory Management',
    transactionSheet: 'Layana Transaction',
    cancelledSheet: 'Cancelled Contracts',
    headerRowInventory: 2,
    headerRowTransaction: 2,
    headerRowCancelled: 1
  },
  {
    key: 'Mersea',
    spreadsheetId: '1-QId0GNeIfn_jB1XdGBFbgvn9LsNFVi4d1nh_oV_ek4',
    inventorySheet: 'Mersea Inventory Management',
    transactionSheet: 'Mersea Transaction',
    cancelledSheet: '',
    headerRowInventory: 2,
    headerRowTransaction: 2,
    headerRowCancelled: 1
  }
];

const SHEET_NAMES = {
  // من SETTINGS
  users: 'User&Pass',
  passwordLog: 'Password Log',
  auditLog: 'System Audit Log',
  salesData: 'Sales Data',
  salesCompany: 'Sales Company',
  orientation: 'Orientation Sheet',

  // من DATA
  inventory: 'Layana Inventory Management',
  inventoryAliases: ['Layana Inventory Management', 'Inventory Management'],
  clientDb: 'Layana Transaction',
  cancelled: 'Cancelled Contracts',
  clientRegistration: 'Client Registration',

  // من AVAILABLE
  layanaUnits: 'Layana',

  // من EOI
  eoiForm: 'EOIS MERSEA Form',
  eoiData: 'EOIS MERSEA',
  eoiCancelled: 'Cancelled',

  // من BROKERS
  allBrokers: 'All Brokers',
  request: 'Request',
  leads: 'Feedback Leads'
};

// صف العناوين (Headers) في كل شيت — لو اتغير الصف ده بس اللي يتعدل
const HEADER_ROW = {
  inventory: 2,
  clientDb: 2,
  cancelled: 1,
  salesData: 1,
  users: 1,
  eoiForm: 1,
  orientation: 1
};

// أدوار النظام المعتمدة داخل النظام.
// Admin: صلاحيات كاملة، بما فيها إدارة المستخدمين وسجل النشاط.
// User: استخدام الموديولات التشغيلية بدون إدارة المستخدمين.
const ROLES = {
  ADMIN: ['admin'],
  USER: ['user']
};

function isSystemAdmin_(user) {
  user = user || {};
  return norm_(user.role) === 'admin';
}

// إعدادات عامة بتتقرأ من الفرونت إند (datalist options ثابتة)
const STATIC_LISTS = {
  governorates: ["Cairo","Alexandria","Giza","Dakahlia","Sharqia","Qalyubia","Port Said","Beheira","Monufia","Gharbia","Kafr El Sheikh","Fayoum","Damietta","Beni Suef","Minya","Assiut","Sohag","Qena","Luxor","Aswan","Red Sea","New Valley","Matrouh","North Sinai","South Sinai","Ismailia","Suez","Other"],
  nationalities: ["Egyptian", "Other"],
  paymentMethods: ["Cash", "Visa", "Cheque", "Bank Transfer"],
  sourceOptions: ["Direct", "Ambassador", "Broker"],
  sourceBreakdowns: ["Personal", "Walk In", "Social Media"],
  socialMediaOptions: ["Facebook", "Instagram", "WhatsApp", "Website", "Other"],
  interestOptions: ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom"],
  housingOptions: ["Housing", "Investment", "Second Home", "Other"],
  projectOptions: ["Layana", "Mersea"]
};

// خرائط أسماء الحقول (aliases) — بتسمح إن أي عمود يتسمى بأكتر من اسم
// في الشيتات المختلفة من غير ما الكود يتكسر. مأخوذة ومجمّعة من كل
// الأكواد الأربعة اللي بعتهالي.
const FIELD_ALIASES = {
  unitCode: ['Unit Code', 'UnitCode', 'Unit No', 'Unit Number'],
  building: ['Building'],
  unitType: ['Unit Type', 'UnitType', 'Type'],
  orientation: ['Orientation', 'View', 'Direction', 'Unit Orientation'],
  project: ['Project', 'Project Name'],
  status: ['Status', 'Unit Status'],
  floor: ['Floor'],
  area: ['In Door Area', 'Indoor Area', 'Total Area', 'Area', 'Unit Area', 'Area (m2)', 'Area M2', 'Area Sqm'],
  soldPrice: ['Price After Discount', 'System Price', 'Sold Price', 'Price', 'Total Price', 'Unit Price', 'Sale Price'],
  remainingDp: ['Remaining DP', 'Remaining Down Payment', 'Remaining Deposit'],
  paymentYears: ['Instalment', 'Installment', 'Payment Years', 'Years'],
  installment: ['Instalment', 'Installment', 'Payment Years', 'Years'],
  paymentType: ['Payment', 'Payment Type'],
  salesName: ['Sales Name', 'Sales', 'Sales Agent', 'Sales Person'],
  salesManager: ['Sales Manager', 'Manager'],
  salesDirector: ['Sales Director', 'Sales Director 1', 'Director'],
  source: ['Source', 'Sourse'],
  brokerCompany: ['Broker Company', 'Broker', 'Broker Name'],
  nationality: ['Client Nationality', 'Nationality'],
  reservationDate: ['Reservition Date', 'Reservation Date'],
  contractDate: ['Contract Date', 'Cotract Date', 'Actual Contract Date'],
  soldDate: ['Sold Date', 'Sale Date'],
  deliveryDate: ['Delivery Date', 'Contract Delivery Date'],
  cancellationDate: ['Cancellation Date'],
  holdDate: ['Hold Date'],
  contractPlace: ['Contract Place'],
  clientType: ['Client Type', 'Clint Type', 'Contract Type'],
  clientName: ['Client Name English', 'Client Name Arabic', 'Client Name'],
  clientPhone: ['Client Phone Number', 'Client Phone', 'Phone', 'Mobile', 'Mobile Number', 'Primary Mobile'],
  clientPhone2: ['Client Phone Number 2', 'Client Phone 2', 'Secondary Mobile', 'Mobile 2', 'Alternate Phone'],
  clientAddress: ['Residence address', 'Residence Address', 'Client Address', 'Address', 'Full Address'],
  gender: ['Client Gender', 'Gender', 'Sex'],
  salesTeamName: ['Sales Name', 'Sales', 'Name'],
  salesTeamManager: ['Manager', 'Sales Manager'],
  salesTeamDirector: ['Director', 'Sales Director']
};


function getSystemInfo_() {
  let actions = [];
  try { if (typeof getApiActions_ === 'function') actions = getApiActions_(); } catch (e) {}
  return {
    name: 'Operation System',
    version: 'Enterprise 5.7 Stable',
    apiVersion: '2026.08.09.1',
    backendBuild: '5.7.0',
    projects: (PROJECT_SOURCES || []).map(function(x){ return x.key; }),
    features: ['unified-projects','users','audit','leads','contract-pdf','achievement','housing-eoi','architectural-drawings','document-coverage','ai-agent','api-manifest','stable-inventory-path'],
    actions: actions
  };
}
