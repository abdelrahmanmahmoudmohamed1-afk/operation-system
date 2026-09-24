# صلاحيات Admin و User

## Admin
- يشاهد كل الموديولات.
- يشاهد موديول Users.
- ينشئ مستخدمين جدد.
- يشاهد Audit History لكل المستخدمين.
- يدخل Settings ويستخدم كل وظائف الإدارة.

## User
- يشاهد: Overview, Dashboard, Inventory, Payment, CRM, EOI, Reports, Contracts, Settings.
- لا يشاهد موديول Users.
- لا يستطيع فتح `#users` يدويًا؛ سيتم تحويله إلى Overview.
- لا يستطيع استدعاء API إدارة المستخدمين؛ الـ Backend يعيد FORBIDDEN.

## المطلوب في شيت User&Pass
استخدم في عمود Role واحدة من القيمتين فقط:

- Admin
- User

بعد تغيير الدور، سجل خروج ثم دخول من جديد حتى تتحدث الجلسة.
