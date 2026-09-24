# PDF Upload — Final Flow

1. المستخدم يختار PDF في CRM أو Digital Twin.
2. Frontend يفحص الاسم والحجم وأول 5 bytes `%PDF-`.
3. Frontend يرفع الملف مباشرة إلى private bucket `operation-documents` في Supabase Storage باستخدام access token للمستخدم.
4. بعد نجاح Storage، Frontend يرسل `storagePath` إلى Vercel `/api/ops`.
5. Vercel يسجل metadata في جدول `documents`.
6. عند العرض، Vercel ينشئ Signed URL لمدة ساعة ويعيدها للـ CRM / Digital Twin / AI.

لا يوجد Base64، ولا Apps Script، ولا `Unknown action` خاص بالرفع.

إذا فشل الرفع ستظهر رسالة أصلية من Supabase مثل Unauthorized / Bucket not found / Payload too large بدل رسالة عامة مبهمة.
