OPERATION SYSTEM ENTERPRISE 1.0
===============================

هذه النسخة تحتوي على Frontend + Backend متوافقين مع بعض. أهم نقطة: لا ترفع الـ Frontend وحده.

1) GitHub / Frontend
- انسخ ملفات المشروع إلى فولدر الريبو المحلي عندك مع الحفاظ على مجلد .git الموجود عندك.
- فولدر Operation_System_Backend موجود في .gitignore عمداً لأنه Backend داخلي ولا يجب نشره Public.
- من GitHub Desktop: Commit ثم Push origin.

2) Google Apps Script / Backend — إلزامي
- افتح مشروع Apps Script الحالي الذي يستخدمه الرابط الموجود في assets/config/api.config.js.
- استبدل ملفات الـ Backend القديمة بملفات .gs الموجودة داخل Operation_System_Backend.
- لا تترك نسخة Backend قديمة تحتوي على نفس الدوال/الثوابت بجانب الملفات الجديدة.
- Deploy > Manage deployments > Edit (علامة القلم) > Version: New version > Deploy.
- لا تنشئ Deployment جديداً برابط جديد إلا لو ستغيّر baseURL في api.config.js.

3) بعد النشر
- اعمل Logout ثم Login.
- اعمل Ctrl + Shift + R مرة واحدة.
- لو Service Worker قديم عندك، النسخة الحالية Network-First وتم تغيير رقم الكاش لكي يلتقط الملفات الجديدة.

اختبار سريع بعد التركيب
-----------------------
- Global Project يجب أن يعرض Layana وMersea.
- Admin يجب أن يرى Users، وUser لا يراه.
- Achievement موجود ويحسب الحالة الحالية للوحدة مرة واحدة فقط.
- CRM يجب أن يعرض Client Phone Number وClient Phone Number 2 وResidence address.
- Upload PDF يجب أن يحفظ الملف على Google Drive. لو ظهر Unknown action: uploadClientContract فالـ Backend القديم ما زال منشوراً.
- زر PDF بجوار Log Out يستخدم طباعة المتصفح الأصلية / Save as PDF، وليس legacy canvas exporter، لتفادي خطأ modern color.
- Quick Actions والضغط على اللوجو يجب أن يعملوا؛ اللوجو يرجع Overview.

ملاحظة اختبار
-------------
تم فحص Syntax لجميع ملفات JavaScript وApps Script، ومراجعة الـ imports وأسماء الـ API actions محلياً. لا يمكن من بيئة التسليم تشغيل Google Sheets/Drive الفعلية الخاصة بك؛ لذلك اختبار البيانات الحية ورفع ملف حقيقي يتم بعد نشر الـ Backend على حسابك.
