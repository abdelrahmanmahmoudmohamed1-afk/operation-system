# Operation System — UI Repair 1.0.2

تم تنفيذ إصلاحات Frontend فعلية على نسخة Enterprise 1.0.1:

- إلغاء الـ fixed shell الذي كان يقص زر Logout ويخفي الموديولات، واستبداله بـ sticky header/navigation ثابتين داخل تدفق الصفحة.
- تثبيت عنوان كل صفحة أسفل الهيدر وشريط الموديولات أثناء الـ scroll.
- جعل شريط الموديولات قابلًا للـ horizontal scroll مع بقاء كل الموديولات مرئية.
- استبدال شكل التنبيه القديم بمربع صغير أنيق في منتصف أعلى الشاشة، بدون اللوحة الزرقاء الكبيرة.
- استبدال شاشة البداية المزعجة بتصميم أخف: لوجو الشركة يتكوّن بمسح ضوئي هادئ + Operation System فقط.
- تحسين CRM client normalization لدعم Client Phone Number / Client Phone Number 2 / Residence address وأسماء الأعمدة البديلة.
- تمرير فلتر المشروع العام إلى CRM.
- Audit History يعمل fallback محليًا في وضع GitHub بدل إظهار Unknown action: getAuditHistory.
- Global PDF يستخدم window.print فقط، ويفتح details قبل الطباعة ويوسع مناطق الجداول في print CSS.
- رفع إصدار Service Worker لمنع استمرار CSS/JS قديم بعد Push جديد.

ملاحظة: رفع ملف PDF إلى Google Drive نفسه عملية Backend ولا يمكن أن يعمل من GitHub Pages وحده. الواجهة الآن تعرض الخطأ بشكل محترم بدل كسر الصفحة، لكن التخزين السحابي يحتاج endpoint فعّال في الخادم.
