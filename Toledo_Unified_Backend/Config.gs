/**
 * ===========================================================
 * TOLEDO UNIFIED BACKEND — Config.gs
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
  BROKERS: '1C13-OWI5fOnqW-LO4Kb7bOq1wyE44nIbAp6jbm5OYTA'
};

const SHEET_NAMES = {
  // من SETTINGS
  users: 'User&Pass',
  passwordLog: 'Password Log',
  salesData: 'Sales Data',
  salesCompany: 'Sales Company',
  orientation: 'Orientation Sheet',

  // من DATA
  inventory: 'Layana Inventory Management',
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
  request: 'Request'
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

// أدوار النظام، موحّدة في مكان واحد
const ROLES = {
  ADMIN: ['admin', 'owner', 'ceo', 'operation', 'operations'],
  DIRECTOR: ['director'],
  MANAGER: ['manager'],
  SALES: ['sales']
};

// إعدادات عامة بتتقرأ من الفرونت إند (datalist options ثابتة)
const STATIC_LISTS = {
  governorates: ["Cairo","Alexandria","Giza","Dakahlia","Sharqia","Qalyubia","Port Said","Beheira","Monufia","Gharbia","Kafr El Sheikh","Fayoum","Damietta","Beni Suef","Minya","Assiut","Sohag","Qena","Luxor","Aswan","Red Sea","New Valley","Matrouh","North Sinai","South Sinai","Ismailia","Suez","Other"],
  nationalities: ["Egyptian", "Other"],
  paymentMethods: ["Cash", "Visa", "Cheque", "Bank Transfer"],
  sourceOptions: ["Direct", "Ambassador", "Broker"],
  sourceBreakdowns: ["Personal", "Walk In", "Social Media"],
  socialMediaOptions: ["Facebook", "Instagram", "WhatsApp", "Website", "Other"],
  interestOptions: ["Studio", "1 Bedroom", "2 Bedroom"]
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
  area: ['Total Area', 'Area', 'Unit Area', 'Area (m2)', 'Area M2', 'Area Sqm'],
  soldPrice: ['Sold Price', 'Price', 'Total Price', 'Unit Price', 'Sale Price', 'Price After Discount'],
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
  deliveryDate: ['Delivery Date', 'Contract Delivery Date'],
  cancellationDate: ['Cancellation Date'],
  holdDate: ['Hold Date'],
  contractPlace: ['Contract Place'],
  clientType: ['Client Type', 'Clint Type', 'Contract Type'],
  clientName: ['Client Name English', 'Client Name Arabic', 'Client Name'],
  gender: ['Client Gender', 'Gender', 'Sex'],
  salesTeamName: ['Sales Name', 'Sales', 'Name'],
  salesTeamManager: ['Manager', 'Sales Manager'],
  salesTeamDirector: ['Director', 'Sales Director']
};
