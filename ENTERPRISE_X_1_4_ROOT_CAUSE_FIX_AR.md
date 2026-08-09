# Enterprise X 1.4 — Root Cause Performance Fix

الإصلاح الرئيسي في هذا الإصدار ليس زيادة timeout.

## السبب الذي تم اكتشافه
- `/api/ops` كان يشغل `ensureSchema()` (DDL كامل) في بداية **كل** API request على cold start.
- `rows()` كان يقرأ Google Sheets ثم ينتظر Supabase DB **بشكل تسلسلي** حتى في Inventory، رغم أن Inventory مصدره الأساسي Google Sheets.
- بالتالي فتح Inventory كان يستطيع الانتظار Google + PostgreSQL/Supabase + schema setup قبل أن يرجع أي صف.

## ما تغير
- إزالة schema DDL من المسار العادي لكل API request.
- إضافة action مستقل `initializeDatabase` فقط عند الحاجة للتهيئة.
- Inventory يرجع من Google Sheets مباشرة بدون انتظار Supabase.
- CRM/EOI/Leads تستخدم Google Sheets أولاً، وتدمج overrides من Supabase فقط إذا استجاب خلال 5 ثوانٍ.
- Google Sheets request timeout أصبح 10 ثوانٍ لكي يظهر سبب واضح سريعاً بدل شاشة متجمدة.
- نطاق القراءة أصبح A:DZ بدلاً من A:ZZ لتقليل payload مع الاحتفاظ بأكثر من 100 عمود.
- Frontend timeout أصبح 25 ثانية كحد أمان، وليس كحل للبطء.

## ملاحظة مهمة
Supabase schema يجب تهيئته مرة واحدة فقط (SQL migration أو initializeDatabase) وليس مع كل request.
