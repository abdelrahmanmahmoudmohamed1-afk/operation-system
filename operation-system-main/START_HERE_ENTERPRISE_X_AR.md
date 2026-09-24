# Operation System Enterprise X — ابدأ من هنا

## البنية النهائية
- GitHub Pages: الواجهة.
- Vercel: الـ API والـ AI وGmail OAuth.
- Supabase Auth/Postgres/Storage: المستخدمون، الملفات، الـ Audit، الـ Reminders، ذاكرة الـ AI.
- Google Sheets API: المصدر الحالي الحي لـ Layana / Mersea / EOI / Leads.
- OpenAI Responses API: مخ Operation AI.

## ما تم إصلاحه في هذه النسخة
- لا يوجد Apps Script ولا `action` backend قديم.
- إنشاء المستخدمين مركزي عبر Supabase Auth، وأول Admin له First-time bootstrap آمن.
- رفع PDF مباشر إلى Supabase Storage مع فحص PDF الحقيقي، ثم تسجيل Metadata في Postgres. لا Base64.
- الرسومات الهندسية تستخدم نفس Storage المركزي وتظهر من Digital Twin.
- CRM يقرأ الأعمدة الفعلية `Client Phone Number`, `Client Phone Number 2`, `Residence address`, `Contract Date` ويحافظ على رقم الهاتف كنص.
- Document Center يفتح Signed URLs الجديدة بدل الاعتماد على Base64 القديم.
- Achievement يستخدم الحالة الحالية فقط لكل وحدة، ويستخدم Reservation/Contract/Sold Date حسب الحالة ويدعم Daily/Weekly/Monthly/Range.
- Operation AI يستخدم GPT-5.6 + Function Calling، مع أدوات حقيقية لـ CRM/Inventory/EOI/Documents/Floor Plans/Navigation/Payment Plans/Reminders/Gmail.
- ذاكرة AI مركزية في Supabase بالإضافة إلى سياق الجلسة.
- Gmail يرسل من حساب Google الذي تربطه من Settings بعد Preview/Confirmation، وليس من بريد hard-coded.
- Diagnostics يوضح بالضبط ما هو متصل وما هو ناقص، ولا يحول فشل مصدر البيانات إلى أرقام صفر مضللة.
- Light themes لها Contrast guard شامل للـ inputs/placeholders/chat/modals، وكروت الثيمات لم تعد تخفي الاسم والوصف.
- Door-to-door transition: فتح الباب الحالي → خروج → إغلاقه → مشي أثناء التحميل الحقيقي → فتح الباب الجديد بعد جاهزية الداتا → دخول → إغلاقه، مع أصوات يمكن تعطيلها من Settings.
- Print/PDF يحافظ على ألوان الثيم ويعرض الجداول الطويلة بدون قص الصفوف.

## المطلوب مرة واحدة قبل التشغيل الحي

### 1) أمان Supabase
لو أي `SUPABASE_SECRET_KEY` ظهر في شات/صورة/مكان عام، اعمل Rotate له من Supabase قبل Production. لا تضع Secret في GitHub أو runtime-config.js.

### 2) Google Sheets
في Vercel → Project → Settings → Environment Variables أضف:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

ثم شارك Google Sheets المطلوبة مع Email الـ Service Account كـ Viewer. الكود يستخدم صلاحية `spreadsheets.readonly` فقط.

الأسماء المتوقعة حاليًا:
- Layana Inventory Management (header row 2)
- Layana Transaction (header row 2)
- Mersea Inventory Management (header row 2)
- Mersea Transaction (header row 2)
- EOIS MERSEA (header row 1)
- Feedback Leads (header row 1)

### 3) OpenAI
أنشئ مفتاحًا جديدًا (لا تستخدم أي مفتاح سبق كشفه) وضع في Vercel:
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-5.6`

بدون المفتاح، النظام يظل شغال لكن Operation AI يعرض Setup message واضحة ولا يرجع لبحث Keyword مضلل.

### 4) Gmail الحقيقي
في Google Cloud لنفس المشروع:
1. Enable Gmail API.
2. أنشئ OAuth Client من نوع Web Application.
3. Authorized redirect URI:
   `https://operation-system-six.vercel.app/api/google/oauth/callback`
4. أضف في Vercel:
   - `GOOGLE_GMAIL_CLIENT_ID`
   - `GOOGLE_GMAIL_CLIENT_SECRET`
   - `PUBLIC_API_ORIGIN=https://operation-system-six.vercel.app`
5. من Operation System → Settings → Agent & Integrations → Connect Gmail، اختر حساب Gmail الذي تريد الإرسال منه ووافق على `gmail.send`.

### 5) CORS
أضف في Vercel:
`ALLOWED_ORIGIN=https://abdelrahmanmahmoudmohamed1-afk.github.io`

### 6) Redeploy
أي Environment Variable جديدة في Vercel تحتاج Deployment جديد. اعمل Redeploy أو Push commit جديد بعد إضافة المتغيرات.

## قاعدة البيانات
Enterprise X يحاول إنشاء الجداول وStorage bucket تلقائيًا على أول طلب للـ API باستخدام اتصال Postgres الذي توفره Supabase/Vercel integration. توجد أيضًا نسخة مطابقة في مجلد:
`supabase/migrations/`
لو أردت تشغيلها يدويًا من SQL Editor — شغّل كل الملفات بالترتيب الرقمي (001 حتى 006 حاليًا)، مش 001 بس، لأن sales_people/sales_targets/lead_history وباقي الجداول موزّعة على أكتر من ملف.

## أول دخول
لو قاعدة Profiles فاضية، صفحة Login تظهر `First-time setup · Create Admin`. أنشئ أول Admin مرة واحدة، وبعدها تختفي إمكانية الـ bootstrap ولا يمكن استخدامها مرة ثانية.

## فحص النظام
بعد الدخول: Settings → System Health Center → Run Full Diagnostics.
المطلوب قبل اعتبار Production جاهز:
- Vercel API: Connected
- Supabase/Postgres: Ready
- Google Sheets: Reading live data
- Storage: Ready
- OpenAI: Ready
- Gmail: Connected (لو الإرسال مطلوب)

