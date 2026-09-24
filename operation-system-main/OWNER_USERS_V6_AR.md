# موديول Users — Owner Only

- موديول Users لا يظهر ولا يفتح إلا لحساب Abdelrahman Mahmoud المحدد في `SYSTEM_OWNER` داخل `Config.gs`.
- إنشاء المستخدمين يتم من داخل السيستم ويُضاف مباشرة إلى شيت `User&Pass`.
- لا يستطيع أي Admin أو Operation أو CEO الوصول إلى الموديول ما لم يكن هو الحساب المالك المحدد.
- كل محاولة وصول أو إنشاء مستخدم تُسجل في `System Audit Log`.
- يفضل إضافة Username الدقيق داخل `SYSTEM_OWNER.ownerUsernames` بعد معرفة اسم الدخول الفعلي.
