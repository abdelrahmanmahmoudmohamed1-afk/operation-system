# Operation System Enterprise 2.0

هذه النسخة مبنية على `Operation_System_Enterprise_1_0_2_UI_Repair` وتركّز على الـ Frontend الذي يعمل على GitHub Pages / VS Code.

## التغييرات المنفذة فعليًا

- إعادة بناء الـ navigation إلى Sidebar ثابتة واحترافية بدل الشريط الأفقي المزدحم.
- جميع الموديولات المسجلة ظاهرة حسب الصلاحية؛ Admin يرى Users، وUser لا يراه.
- Header علوي Sticky مستقل عن Scroll محتوى الصفحات.
- Page Header ثابت أسفل الـ Header على الشاشات الكبيرة.
- Navigation Drawer للموبايل والتابلت.
- الضغط على لوجو النظام يرجع إلى Overview عبر `data-route="overview"`.
- Project Filter عالمي مع fallback ثابت لمشروعي Layana وMersea حتى إذا تعذر تحميل قائمة المشاريع من الـ API.
- Dashboard / Overview يمران تلقائيًا على Project Filter العالمي.
- Inventory يبدأ على المشروع المختار عالميًا، ويحدّث الفلتر العالمي عند تغيير المشروع محليًا.
- CRM / Leads / EOI / Achievement / Reports / Payment / Contracts تستخدم المشروع العالمي.
- تحسين CRM phone/address normalization لقراءة صيغ متعددة، بما فيها:
  - Client Phone Number
  - Client Phone Number 2
  - Residence address
  - Mobile / Mobile Number / Primary Mobile / Secondary Mobile
- إصلاح colspan في حالات CRM الفارغة والأخطاء.
- إضافة Document Vault محلي داخل IndexedDB كـ fallback عند عدم توفر endpoint رفع العقود.
- CRM يدعم View / Upload للمستندات، وتنزيل ملفات PDF المخزنة محليًا.
- زر PDF العام يستخدم Native Browser Print فقط، بدون html2canvas أو html2pdf، مع Print CSS كامل لكل الصفوف والجداول.
- لا يوجد `oklab()` / `oklch()` / `color-mix()` في الواجهة الجديدة.
- Report engine أصبح يبني fallback data من Inventory + CRM إذا فشل مصدر Dashboard أو رجع فارغًا، لتقليل ظاهرة التقارير الصفرية.
- Service Worker جديد Network-first مع cache version جديد لتقليل مشكلة ظهور ملفات CSS/JS قديمة بعد Push.
- تحميل layouts أصبح `no-store` بدل `force-cache`.
- تقليل Fonts الخارجية إلى Inter فقط لتحسين الأداء.
- Notifications أصبحت Card صغيرة في منتصف أعلى الشاشة بدل Panels ضخمة.
- Logout animation أصبح مشهد غرفة بسيط: الشخص يتحرك للباب، الباب يفتح، والإضاءة تنخفض.
- إزالة أي نص باسم الشركة من الواجهة، مع الاحتفاظ باللوجو واسم Operation System فقط.
- Credit صغير داخل الـ Sidebar: `Developed by Abdelrahman Mahmoud`.

## PDF على GitHub Pages

زر `PDF` يفتح Print Dialog الخاص بالمتصفح. اختر `Save as PDF`. هذه الطريقة مقصودة لأنها أكثر استقرارًا مع CSS الحديثة وتطبع الجداول الطويلة عبر عدة صفحات.

## Contract PDF في GitHub-only mode

إذا endpoint رفع العقود غير متاح، الملف يُخزّن في IndexedDB على نفس المتصفح والجهاز، ويظهر من زر View في CRM. هذا التخزين محلي وليس Cloud Storage ولا ينتقل تلقائيًا بين الأجهزة.

## النشر على GitHub

1. انسخ محتويات المشروع فوق نسخة `operation-system` المحلية المرتبطة بـ GitHub Desktop.
2. لا تحذف مجلد `.git`.
3. Commit ثم Push origin.
4. افتح الموقع واعمل `Ctrl + Shift + R` مرة واحدة بعد أول Push لهذه النسخة.

## فحوصات تمت

- فحص Syntax لكل ملفات JavaScript: ناجح.
- فحص جميع import paths: لا توجد ملفات مفقودة.
- فحص الموديولات الـ 12 المسجلة ومسارات controller/service/view: مكتملة.
- فحص `oklab/oklch/color-mix`: لا توجد استخدامات.
- فحص Branding النصي: لا توجد كلمة Toledo في ملفات المشروع.
