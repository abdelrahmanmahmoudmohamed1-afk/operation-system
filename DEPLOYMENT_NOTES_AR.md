# تعليمات تشغيل النسخة المعدلة

تم تحديث النسخة لتستخدم:

- Layana: `1zi-I3q1wwVjLlYA1gG6Dz_O9FREZJTLSy_1VDeX07N0`
- Mersea: `13JaviUMCTKD433atOUd6-pqtHSdA6-6eAcMRw-2t-dg`
- EOI: `1k0N-63K7tpinWHmODki7eLKXnH8k9wWetBUgKPgLOwg` / `EOIS MERSEA`
- Leads: `11MRmHkPZLMITmMU6vYuFk5u9mdo3qBtvN_eqHp5Bzys` / `Feedback Leads`
- Orientation: `1uPPGfoYGSrGbWCCFGNuvd5lEwuo0aHEAYBXRZUMr_1g` / `Orientation Sheet`

السعر المستخدم في Payment هو `Price After Discount` فقط في المشروعين.

قبل النشر:

1. أضف حساب الخدمة إلى مشاركة ملفات Google Sheets بصلاحية Viewer للقراءة. مزامنة الكتابة للشيتات تحتاج endpoint كتابة ومراجعة أعمدة قبل تفعيلها؛ النسخة الحالية لا تدّعي نجاح كتابة غير منفذة.
2. أضف متغيرات `.env.example` إلى Vercel، خصوصًا Supabase وGoogle Service Account و`ALLOWED_ORIGIN`.
3. نفذ migrations من 001 إلى 007 بالترتيب في بيئة staging ثم الإنتاج.
4. أنشئ Admin أولًا عبر مسار bootstrap المؤمّن، ثم أنشئ أدوار `operations` و`sales` وحدد permissions وassigned sales name.
5. لا تضع service-role أو private key في ملفات الواجهة أو GitHub.

تم اختبار syntax/import/API parity محليًا. لم يتم نشر النسخة أو الاتصال ببيانات الإنتاج.
