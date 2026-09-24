# Operation System Enterprise 3.0

هذه النسخة مبنية فوق Enterprise 2.0 وتضيف طبقة تشغيلية كاملة على الواجهة مع الحفاظ على الموديولات الحالية.

## أهم الإضافات

- Command Center تنفيذي وشخصي يجمع KPIs والمهام والتنبيهات والـ Approvals والـ Activity والـ Insights.
- Tasks & Follow-ups مع Priority وDue Date وربط بالعميل أو الليد أو الوحدة وحالات Open / In Progress / Done.
- Notification Center داخل الهيدر مع عداد للرسائل غير المقروءة.
- Quick Create من أي صفحة لإنشاء Task أو Approval أو Note أو Saved View.
- Command Palette باختصار Ctrl+K لفتح أي موديول أو البحث من أي مكان.
- Analytics & Finance:
  - Target vs Achievement.
  - Collections.
  - Commission Center.
  - Cancellation Analysis.
  - Broker Portal.
  - Saved Views.
  - Rules-based Management Insights.
- Data Quality & System Health:
  - Missing mobile/address.
  - Duplicate mobile detection.
  - Contracted client without contract date.
  - Closed unit without value.
  - Health status for data sources, browser, network, Service Worker and local storage.
  - Automation Rules editor.
- Client 360 داخل CRM.
- Unit 360 داخل Inventory.
- Document Center موحد للعقود والـ IDs والإيصالات والملفات المحلية أو المرتبطة برابط.
- Leads Kanban بالإضافة إلى Table View.
- Leads Import Excel/CSV يحتفظ بنسخة Local Fallback إذا كانت خدمة الـ API غير متاحة.
- Approval workflow بسيط مع Approve / Reject من Command Center.
- Local enterprise state للمهام والتنبيهات والـ targets والـ commissions والـ collections والـ saved views والـ automations.
- تحديث Service Worker إلى Enterprise V3.

## الموديولات

Command Center / Overview / Dashboard / Inventory / Payment / CRM / Leads / EOI / Achievement / Reports / Tasks / Analytics / Data Quality / Contracts / Documents / Users / Settings

## الصلاحيات

Admin: كل الموديولات بما فيها Users.
User: كل موديولات التشغيل ما عدا Users.

## تشغيل النسخة

1. انسخ محتويات المشروع إلى فولدر GitHub المحلي الخاص بك.
2. لا تحذف مجلد `.git` الموجود عندك.
3. افتح المشروع من VS Code وجربه محلياً.
4. من GitHub Desktop اعمل Commit ثم Push.
5. بعد النشر اعمل Ctrl + Shift + R مرة واحدة لضمان تحديث Service Worker والملفات المخزنة.

## ملاحظة مهمة

المزايا الجديدة مثل Tasks وNotifications وApprovals وTargets وSaved Views تعمل Local-first من المتصفح، لذلك تظل قابلة للاستخدام على GitHub Pages. الموديولات التي تعتمد على بيانات المصدر الأصلية (مثل Inventory/CRM/Dashboard) ستستمر في استخدام طبقة البيانات الموجودة في المشروع، وعند عدم توفر بعض المصادر ستظهر حالة المصدر بوضوح داخل Data Quality & System Health بدلاً من كسر الواجهة.
