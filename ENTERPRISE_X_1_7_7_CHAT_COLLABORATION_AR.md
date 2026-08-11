# Operation System Enterprise X 1.7.7 — Chat Collaboration

- مرفقات آمنة داخل الشات: PDF / Images / Excel / Word / TXT / CSV حتى 15MB للملف، بحد أقصى 5 ملفات للرسالة.
- رفع مباشر إلى Supabase Storage من Signed Upload URL ثم عرض الملفات بروابط Signed مؤقتة.
- @mentions مع autocomplete لأعضاء المحادثة وتنبيه صوتي مختلف.
- Reply على الرسائل مع preview للرسالة الأصلية.
- Admin Announcements لكل المستخدمين أو للمحادثة الحالية، مع قناة إعلانات تلقائية و Seen count.
- أصوات مختلفة للرسالة العادية / mention / announcement مع زر Sound On/Off.
- حماية الـ backend: membership check، Admin-only announcements، private attachment bucket، validation للنوع والحجم والمسار.
- إصلاح permission whitelist ليشمل chat في Permission Matrix.

## Setup
شغّل مرة واحدة: `supabase/migrations/006_chat_collaboration.sql` في Supabase SQL Editor، ثم اعمل Redeploy.
