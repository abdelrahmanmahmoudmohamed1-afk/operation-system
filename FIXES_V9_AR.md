# إصلاحات V9

- إصلاح ظهور موديول Users لحساب Admin.
- جعل التحقق من الـ Role غير حساس للمسافات وحالة الأحرف.
- تغيير Service Worker إلى Network First لمنع ظهور نسخة قديمة من القائمة أو الموديولات.
- إضافة رفع PDF للعقود بشكل كامل: Frontend + Endpoint + Apps Script + Google Drive + Client Documents sheet.
- إصلاح أسماء أعمدة الموبايل والعنوان: Client Phone Number / Client Phone Number 2 / Residence address.
- تحسين شريط الموديولات ليقبل التمرير الأفقي ويُظهر Users وSettings.

## مهم
ارفع Frontend إلى GitHub، وارفع كل ملفات Operation_System_Backend إلى Apps Script ثم New Version Deploy. بعد الرفع اعمل Hard Refresh مرة واحدة Ctrl+Shift+R.
