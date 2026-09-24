# Operation System Enterprise 5.9 — Advanced AI Agent

## أهم تغيير
تم تحويل Operation AI من Chat/Keyword Assistant إلى Agent فعلي يستخدم OpenAI Responses API مع Function Calling على بيانات النظام الحقيقية.

### يقدر يعمل إيه؟
- يفهم العربي المصري والإنجليزي والمحادثات المختلطة والأخطاء الإملائية بصورة طبيعية.
- يحافظ على سياق آخر المحادثة بدل التعامل مع كل رسالة كسؤال منفصل.
- يبحث في Inventory وCRM مباشرة عند الحاجة بدل تخمين الأرقام.
- يبحث عن PDF عقد عميل بالاسم أو Unit Code ويظهر زر فتح/تحميل المستند داخل الشات.
- يبحث عن الرسمة الهندسية للوحدة ويعرض زر فتحها، أو يحولك لـ Digital Twin إذا الرسمة غير موجودة.
- يحولك تلقائياً لأي Module لما تطلب: CRM / Inventory / Reports / Digital Twin / Payment / EOI / ...
- يجيب تفاصيل العميل أو الوحدة من الداتا الحية.
- يجيب EOI summary وDocument Coverage.
- يعمل Payment Plan simulation ويشرح مميزات ومخاطر الـ plan وافتراضاته.
- يجهز Email وReminder كـ actions قابلة للتنفيذ من الواجهة.
- لو الطلب غير منطقي أو ناقصه معلومة، يشرح المشكلة ويطلب أقل clarification ممكن بدل رد آلي غلط.

## الإعداد
في Apps Script > Project Settings > Script Properties:
- OPENAI_API_KEY = مفتاح OpenAI API
- OPENAI_MODEL = gpt-5.6 (اختياري؛ ده الـ default في النسخة)

لا تضع المفتاح داخل GitHub أو أي ملف Frontend.

## ملاحظة المستندات
الـ AI لا يخمن وجود PDF. هو يقرأ Client Documents / Unit Floor Plans فعلياً. لو المستند موجود يظهر Action لفتحه. لو غير موجود يوضح ده ويقترح مكان الرفع المناسب.
