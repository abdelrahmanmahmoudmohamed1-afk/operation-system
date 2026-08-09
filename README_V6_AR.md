# Operation System Enterprise 6.0 — GitHub + Vercel + Supabase

هذه النسخة لا تستخدم Google Apps Script نهائيًا.

## المعمارية
- GitHub Pages: الواجهة الحالية.
- Vercel Functions: API + AI + Users + الصلاحيات + التوقيع على روابط المستندات.
- Supabase Auth: تسجيل الدخول والمستخدمين.
- Supabase PostgreSQL: Inventory / CRM / EOI / Leads / Audit.
- Supabase Storage: عقود العملاء والرسومات الهندسية PDF.
- OpenAI Responses API: Operation AI من Vercel فقط.

## لماذا رفع PDF مختلف في V6؟
الملف نفسه لا يمر داخل Vercel Function. المتصفح يرفعه مباشرة إلى Supabase Storage باستخدام جلسة المستخدم، ثم يرسل للـ API مسار الملف فقط. هذا يمنع مشكلة حدود حجم request في serverless ويمنع تحويل PDF إلى Base64 الضخم.

الحد الافتراضي في المشروع 25 MB والـ bucket يقبل `application/pdf` فقط.

## إعداد نهائي
1. أنشئ Supabase Project.
2. نفّذ `supabase/migrations/001_operation_system.sql` من SQL Editor.
3. أنشئ أول User من Supabase Authentication ثم أضف له Profile بدور `admin` كما في `supabase/README_AR.md`.
4. أنشئ Vercel Project من نفس repository وأضف Environment Variables الموجودة في `.env.example`.
5. Deploy Vercel ثم خذ رابط المشروع.
6. افتح `assets/config/runtime-config.js` وضع:
   - Vercel `/api/ops` URL
   - Supabase URL
   - Supabase **Publishable Key فقط**
7. ارفع الواجهة إلى GitHub Pages.
8. جرّب `https://YOUR-VERCEL-PROJECT.vercel.app/api/health`، يجب أن يرجع `ok: true`.

## نقل الداتا
النسخة لا تستطيع اختراع أو نقل بيانات Google Sheets من نفسها لأن بيانات الشيتات ليست داخل ZIP. انقل البيانات الفعلية إلى جداول Supabase:
- `inventory_units`
- `clients`
- `eoi_records`
- `leads`

احتفظ بالصف الأصلي في `raw_data` حتى لا تفقد أي عمود من أعمدة التشغيل الحالية.

## أسرار ممنوع رفعها إلى GitHub
- `SUPABASE_SECRET_KEY`
- `OPENAI_API_KEY`

ضعهم في Vercel Environment Variables فقط.

## الحفاظ على Google Sheets الحالية بدون Apps Script
V6 يدعم Google Sheets API مباشرة من Vercel باستخدام Service Account. لو ضفت متغيرات Google الموجودة في `.env.example` وشاركت ملفات Google Sheets مع إيميل الـ Service Account كـ Editor، النظام سيقرأ Inventory / Transactions / EOI / Leads الحالية مباشرة من الشيتات بدون Apps Script. Supabase يظل مسؤولًا عن Auth وUsers وPDF Documents وAudit، ويمكنك نقل الداتا التشغيلية تدريجيًا لاحقًا.

لو لم تضع Google credentials، الـ API يعمل من جداول Supabase فقط.
