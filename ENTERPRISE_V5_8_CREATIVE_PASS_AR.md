# Operation System Enterprise 5.8 — Creative Pass

هذه النسخة إضافية بالكامل فوق 5.7 Stable — لم يتم حذف أو تعديل أي وظيفة أو منطق بيانات موجود، فقط إضافات بصرية وتفاعلية.

## الإضافات

1. **ثيم Night Shift** — ثيم عاشر جديد (أزرق ليلي هادئ) مسجّل في `assets/config/theme.config.js` وظاهر في الإعدادات مع Swatch خاص به.
2. **Sound Kit** (`assets/js/utils/sound.js`) — أصوات UI مُصنَّعة بـ Web Audio API بدون أي ملفات صوت خارجية أو اتصال إنترنت: تِك ناعم لباب الانتقال بين الموديولات، وخبطة "ختم" عند نجاح أي عملية حفظ. مربوط بـ toggle في الإعدادات (Sound effects) يقدر المستخدم يقفله.
3. **تأثير الختم البصري** على أيقونة إشعارات النجاح في `notification.service.js` — أنيميشن ختم بسيط بدل علامة صح ثابتة.
4. **Loader موحّد** — استبدال النقط الأربعة في `components/loader.html` بأيقونة باب مصغّرة بتتفتح، بنفس لغة انتقال الموديولات (الممر والأبواب).
5. **Empty state جديد** — رسمة مكتب فاضٍ بسيطة (`empty-office-state`)، مُطبَّقة كمثال في جدول Leads.
6. **مؤشر Data Freshness** — "Updated Xs/Xm ago" جنب عنوان الصفحة في التوب بار، بيتحدث تلقائي مع كل `module:loaded` event.
7. **شورت كت Command Center** — Ctrl+Shift+O يفتح موديول Command Center مباشرة من أي مكان.
8. **شباك ليلي في شاشة تسجيل الخروج** — قمر ونجوم متلألئة، يكمّل حدوتة شباك النهار الموجودة أصلاً في شاشة اللوجين.
9. **اقتراح ثيم حسب وقت اليوم** — بعد الساعة 8 مساءً، لو الثيم الحالي فاتح (light/sap/oracle/odoo)، تظهر رسالة صغيرة قابلة للإغلاق تقترح Night Shift، مرة واحدة يومياً كحد أقصى (بتتخزن في localStorage).

## ملفات جديدة
- `assets/themes/night-shift.css`
- `assets/js/utils/sound.js`

## ملفات معدّلة (إضافات فقط)
- `assets/config/theme.config.js`
- `assets/js/modules/settings/settings.view.js`
- `assets/js/modules/settings/settings.controller.js`
- `assets/js/services/notification.service.js`
- `assets/js/core/module-loader.js`
- `assets/js/core/app.js`
- `assets/js/modules/leads/leads.view.js`
- `components/loader.html`
- `components/navbar.html`
- `layouts/main.html`
- `assets/css/style.css` (بلوك إضافي في الآخر فقط، تحت عنوان `Creative Enhancements Pass (5.8)`)

## فحص تم قبل التسليم
- JavaScript syntax على كل ملف اتعدل: PASS (`node --check`)
- مفيش أي حذف لملف أو دالة أو منطق موجود في 5.7 — كل التعديلات إضافية.

## مهم
هذه النسخة فرونت اند فقط. استخدمها فوق نفس Backend بتاع 5.7 (لم يتغير أي API endpoint).
