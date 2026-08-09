# Operation System Enterprise X — Release 1.1

## نتيجة مراجعة الكود
تم تشغيل `npm run audit` على المشروع قبل إنشاء الـ ZIP النهائي.

PASS:
- JavaScript syntax لكل ملفات المشروع.
- كل relative imports موجودة.
- 44 Frontend API action مقابل 44 Backend action — بدون endpoint ناقص.
- لا يوجد Apps Script runtime داخل المشروع.
- لا توجد ألوان `oklab` / `oklch` / `color-mix` التي سببت مشكلة الطباعة القديمة.
- كل ملفات الموديولات المسجلة موجودة.
- لا يوجد OpenAI/Supabase secret key hard-coded في المشروع.

## أهم إصلاحات Enterprise X 1.1

### Data Engine
- Google Sheets يظل المصدر الحي الأساسي لـ Layana / Mersea / EOI / Leads.
- التحقق من Header Row قبل اعتبار الشيت صالحًا حتى لا تتحول Sheet mapping خاطئة إلى أرقام صفر مضللة.
- CRM mapping مثبت على الأعمدة الفعلية، ومنها:
  - `Client Phone Number`
  - `Client Phone Number 2`
  - `Residence address`
  - `Contract Date`
- Inventory لا يستخدم duplicate key خاطئ بين Supabase وGoogle Sheets.
- Lead bulk status أصبح يعمل حتى لو الـ Lead موجود في Google Sheet ولم يكن له row في Supabase قبل التعديل.

### Dashboard / Overview / Achievement / EOI
- Dashboard backend يعيد كل الـ structures التي تطلبها الواجهة: KPIs, Status Mix, Project/Sales/Manager/Director/Broker Performance, Top Units, Monthly Trend.
- Overview لا يعرض Zero مزيف عند سقوط مصدر Live؛ يعرض Data Source warning واضح.
- Achievement يعتمد على Current Status فقط، ويستخدم التاريخ المناسب: Reservation / Contract / Sold.
- EOI response وBootstrap أصبحا مطابقين للواجهة، بما في ذلك Meta totals والـ lists.

### AI Agent
- Remote AI هو الـ primary brain، والـ local rules مجرد fallback.
- Fuzzy search جديد: لا يشترط تطابق كل كلمة حرفيًا، ويتحمل الأخطاء البسيطة، prefixes، اختلافات الكتابة العربية والمصطلحات العقارية.
- Prompt أقوى للمصري، الـ follow-up references، تبسيط search query قبل استخدام الأدوات، وإعادة المحاولة بسؤال أبسط بدل إرجاع 0 بسبب صياغة المستخدم.
- Tools فعلية للـ CRM / Inventory / EOI / Documents / Floor Plans / Navigation / Payment Plans / Reminders / Gmail.
- AI Memory مركزية في Supabase.

### Users / Auth
- أول Admin له First-time Bootstrap من شاشة Login.
- Create User مركزي عبر Supabase Auth + Profiles.
- فحص duplicate username/email قبل الإنشاء.
- Rollback تلقائي لمستخدم Auth لو فشل إنشاء Profile، لمنع orphan users.

### PDFs / Drawings
- PDF لا يمر Base64 عبر Vercel.
- الرفع مباشرة من Browser إلى private Supabase Storage بجلسة المستخدم.
- فحص filename/type/size وPDF magic bytes `%PDF-`.
- تسجيل Metadata في backend بعد نجاح التخزين.
- لو فشل تسجيل Metadata، يحاول النظام حذف الملف الذي تم رفعه حتى لا يترك orphan PDF.
- Storage policy تشمل Insert / Select / Update / Delete للمستخدم authenticated داخل bucket المحدد فقط.
- Signed URLs للفتح والتنزيل.

### Themes / Print
- كروت Themes أصبحت أطول ولا تقص اسم أو وصف الثيم.
- Inputs/Placeholders/Chat/Modal في Light/Odoo/Oracle/SAP تستخدم theme text/background variables؛ لا White-on-White.
- Dashboard chart labels/grid تستخدم ألوان الثيم بدل ألوان Dark ثابتة.
- Print يحافظ على Background/Text/Border colors للثيم المختار.

### Navigation / Sound
- الباب الحالي يفتح → الشخص يخرج → الباب يقفل.
- الشخصية تمشي طوال زمن `controller.init()` الحقيقي.
- لا تقترب من باب القسم الجديد إلا بعد اكتمال تحميل الموديول والداتا.
- الباب الجديد يفتح → دخول → إغلاق.
- Door open / close sounds من WebAudio ويمكن إيقافها من Settings.

### Backend Reliability
- Vercel Function يستخدم Web-standard Request/Response.
- PostgreSQL connection يفضّل `POSTGRES_URL` الذي توفره Vercel/Supabase integration، مع fallback للحقول المنفصلة.
- System Health يفحص Supabase/Postgres, Google Sheets, Storage, OpenAI, Gmail والـ latency.

## ما يحتاج إعداد حسابك وليس تعديل كود
1. Rotate لأي Supabase secret سبق كشفه.
2. `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` في Vercel، ثم Share للشيتات مع Service Account.
3. إنشاء OpenAI API key جديد وإضافة `OPENAI_API_KEY` في Vercel. المفتاح القديم الذي ظهر في المحادثة لا يستخدم.
4. Gmail OAuth credentials عند تفعيل الإرسال الحقيقي من Gmail.
5. Redeploy Vercel بعد إضافة/تغيير Environment Variables.

