# Operation System — Integrated Update V7

## تم إصلاح حقول العملاء حسب أسماء الأعمدة الفعلية
- `Client Phone Number`
- `Client Phone Number 2`
- `Residence address`
- `Contract Date`
- `Sold Date`
- `Reservition Date`

تظهر أرقام الموبايل والعنوان وتواريخ الحجز والعقد والبيع داخل CRM والبحث.

## Users & Audit
- موديول Users موجود فعليًا في القائمة للمالك فقط.
- إنشاء مستخدمين من داخل النظام وربطهم بشيت `User&Pass`.
- سجل مركزي لكل مستخدم: العملية، الموديول، التاريخ، الساعة، النجاح/الفشل ومدة التنفيذ.
- حماية Frontend وBackend معًا؛ كتابة رابط `#users` يدويًا لا تتجاوز الصلاحية.

## Leads
- موديول Leads جديد.
- قراءة الليدز من `Feedback Leads`.
- بحث بالأسماء والموبايلات والعناوين والمشروع والسيلز والحالة.
- تحديد عدة Leads وتحديث الحالة دفعة واحدة.
- استيراد Excel / XLSX / XLS / CSV مع Preview.
- خيارات المكرر: Skip / Update / Import as New.
- تقرير بعد الاستيراد بعدد المضاف والمحدث والمتخطى.

## CRM & Contracts
- إظهار الموبايل الأساسي والثاني والعنوان والحالة وتاريخ العقد وتاريخ البيع.
- رفع Scan عقد PDF من صف العميل مباشرة.
- الملفات تحفظ في Google Drive داخل `Operation System Contracts`.
- سجل الملفات يحفظ في شيت `Client Documents`.
- الحد الأقصى للملف 8 MB وPDF فقط.

## Reports
- الحالة الحالية وحالة العقد موجودتان بجانب الوحدة في التقرير.
- توسيع قراءة أرقام الموبايل لتشمل أسماء الأعمدة الفعلية.

## الهوية
- إزالة اسم الشركة المكتوب من النصوص والملفات والإعدادات الداخلية.
- الاسم الظاهر والموحد: `Operation System`.
- الاحتفاظ بلوجو الشركة فقط.
- Credit هادئ في الفوتر: `Developed by Abdelrahman Mahmoud`.

## ملفات Apps Script الجديدة
- `Leads.gs`
- `Documents.gs`

يجب رفع كل ملفات مجلد `Operation_System_Backend` وإنشاء New Version للـ Deployment.
