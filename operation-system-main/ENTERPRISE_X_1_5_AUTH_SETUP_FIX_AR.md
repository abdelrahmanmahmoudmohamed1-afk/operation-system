# Enterprise X 1.5 — Auth & Setup Fix

هذا الإصدار يعالج التجمّد في صفحة تسجيل الدخول.

- `bootstrapStatus` لم يعد يشغّل DDL أو `ensureSchema()` عند فتح صفحة الدخول.
- فحوص Supabase أصبحت bounded بمهلة قصيرة ورسائل خطأ صريحة.
- تسجيل الدخول لا يعاد تلقائياً مرتين عند timeout.
- إذا لم يتم تشغيل migration سيظهر `Database setup required` بدلاً من انتظار طويل.
- `/api/health` أصبح lightweight ولا ينشئ قاعدة البيانات.

## خطوة إلزامية قبل أول Login
شغّل الملف `supabase/migrations/001_operation_system.sql` مرة واحدة داخل Supabase SQL Editor. بعد ذلك Refresh، وسيظهر إنشاء أول Admin إذا لم يكن هناك مستخدمون.
