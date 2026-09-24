# Operation System Enterprise X 1.7.8 — Stability Foundation

هذه نسخة Hotfix/Foundation وليست اكتمال التحويل إلى SaaS.

- أصلحت خطأ `relation public.chat_conversations does not exist`.
- `006_chat_collaboration.sql` أصبح ينشئ جداول الشات الأساسية إذا كانت غير موجودة ثم يضيف Collaboration features.
- أصلحت تضارب وجود migration 005 بين مجلدات migrations.
- أزلت أي Developer privilege مربوط بإيميل شخصي من password reset flow.
- أصلحت ألوان Runtime غير المتوافقة مع PDF capture.
- حسّنت Release Audit لقياس كود الإنتاج الفعلي بدل legacy artifacts.
