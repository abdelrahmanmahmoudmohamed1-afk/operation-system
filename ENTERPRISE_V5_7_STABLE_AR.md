# Operation System Enterprise 5.7 Stable

هذه النسخة مبنية على 5.6 مع التركيز على استقرار الداتا وعدم إظهار أرقام صفرية وهمية، وتحسين انتقال الموديولات.

## أهم الإصلاحات

- إلغاء Fast Inventory Path الذي أضيف في 5.6 وإرجاع مسار Inventory الموحّد المجرب من 5.5، لأن Dashboard وCRM وReports يعتمدون على نفس الـ merged data contract.
- إصلاح خطأ syntax زائد في Inventory.gs كان موجوداً بعد getInventoryProjects في 5.6.
- Inventory الآن يستخدم readInventory_ الموحد مرة أخرى، مع Cache لمدة 5 دقائق في Apps Script وrequest coalescing في الواجهة.
- تحديث aliases لتدعم الأعمدة الفعلية `In Door Area` و`System Price` إلى جانب `Price After Discount`.
- لو Inventory أو Overview لم يرجع داتا، النظام لا يعرض 0 على أنه رقم حقيقي؛ يعرض Data Source Error / — حتى يتم إصلاح مصدر البيانات.
- تغيير cache namespace إلى v5.7 حتى لا يتم إعادة استخدام نتائج فارغة قديمة من 5.6.
- تحديث Service Worker cache إلى v5.7.

## انتقال الموديولات

التحميل يحدث أثناء حركة الشخص في الممر:
1. باب الموديول الحالي يفتح.
2. الشخص يخرج.
3. الباب يتقفل وراءه.
4. الشخص يظل يتحرك في الممر بينما Controller + API + data للموديول التالي يتم تحميلهم.
5. لا يقترب من باب الموديول الجديد إلا بعد اكتمال `controller.init()`.
6. يفتح الباب الجديد، يدخل، والباب يتقفل.
7. بعدها تختفي شاشة الانتقال.

لو تحميل الداتا أبطأ من المعتاد، الشخص يظل في منتصف الممر بدل الوقوف أمام الباب منتظراً.

## فحوصات تمت قبل التسليم

- JavaScript syntax: PASS
- Apps Script files syntax (V8-compatible parse): PASS
- Frontend imports: 0 missing
- Frontend API endpoints: 35
- Backend routed actions: 35
- Missing API actions: 0
- Extra API actions: 0

## مهم عند النشر

استخدم Frontend وOperation_System_Backend الموجودين داخل نفس ZIP معاً. لا تخلط Frontend 5.7 مع Backend أقدم.
