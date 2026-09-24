# Enterprise V6 — No Apps Script

- حذف Operation_System_Backend بالكامل.
- Vercel API موحد بنفس action contract الحالي حتى لا تتكسر الموديولات.
- Supabase Auth للمستخدمين والجلسات مع refresh token تلقائي.
- Supabase Storage private bucket للعقود والرسومات الهندسية.
- رفع PDF مباشر من المتصفح إلى Storage، بدون Base64 وبدون المرور داخل Vercel Function.
- تسجيل metadata في PostgreSQL بعد نجاح الرفع.
- Signed URLs لفتح الملفات داخل CRM / Digital Twin / AI.
- AI Agent على Vercel + OpenAI Responses API مع tools للبحث في العملاء والوحدات والمستندات والتنقل وتحليل Payment Plans.
- Google Sheets API adapter اختياري للحفاظ على الداتا الحالية بدون Apps Script.
- Health endpoint: `/api/health`.
- Runtime config منفصل للـ GitHub Pages.
