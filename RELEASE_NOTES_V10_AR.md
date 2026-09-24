# Operation System V10 — Integrated Fix Release

تم تنفيذ الإصلاحات المطلوبة على نفس نسخة V9:

- إصلاح رفع PDF نهائيًا: لا يتم إنشاء FormData بعد await، ويتم إرسال Base64 إلى Apps Script وحفظ الملف في Google Drive.
- إظهار Users للمستخدم Role=Admin مع شبكة Navigation تعرض كل الموديولات.
- إضافة Leads Module: بحث، Bulk Status Update، Import Excel/CSV، Duplicate modes.
- إصلاح CRM Mobile 1 / Mobile 2 / Residence address باستخدام getDisplayValues للحفاظ على صفر بداية رقم الموبايل.
- إضافة Reservation / Contract / Sold dates في CRM.
- إعادة بناء مصدر التقارير: Transaction rows هي المصدر الأساسي للحالات Sold/Contracted/Reserved، مع Inventory لباقي الحالات ومنع تكرار الوحدة.
- إصلاح تضاعف عدادات Reports في الواجهة.
- فلتر Project موحد أعلى السيستم يطبق تلقائيًا على Dashboard, Overview, Inventory, CRM, Contracts, Reports, EOI, Leads.
- إضافة Project + Housing Topic داخل EOI.
- إصلاح Quick Actions والتنقل الديناميكي باستخدام event delegation.
- الضغط على لوجو الشركة يرجع Overview.
- Header + Navigation ثابتان أثناء Scroll.
- Logout animation: شخص يفتح الباب، الضوء يطفئ، ثم يخرج.
- Notifications في منتصف الشاشة بتصميم موحد وعدم إظهار رسالة Unknown action الخام.
- Audit History يعمل من Backend؛ ولو الواجهة أمام Backend قديم، يتم fallback محلي بدون الرسالة الخام.
- Cache version V10 لتجنب استمرار بيانات صفر قديمة.

## مهم بعد الرفع
1. ارفع Frontend كله على GitHub ثم Commit/Push.
2. ارفع كل ملفات Operation_System_Backend إلى Apps Script بما فيها Leads.gs ثم New Version Deploy.
3. نفذ Ctrl+Shift+R مرة واحدة بعد نشر GitHub.
4. Role المستخدم الإداري في User&Pass يجب أن يكون Admin.
