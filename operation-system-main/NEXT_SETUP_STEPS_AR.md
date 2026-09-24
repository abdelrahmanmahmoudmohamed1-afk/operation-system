# المطلوب منك بعد رفع Enterprise X على GitHub

لا تضع أي Secret داخل GitHub.

## المرحلة A — انشر الكود أولاً
1. استبدل ملفات repo `operation-system` بمحتويات المشروع مع الحفاظ على `.git`.
2. Commit + Push.
3. Vercel المتصل بالـ repo سيعمل Deployment جديد.
4. GitHub Pages سيعرض الواجهة الجديدة بعد اكتمال الـ workflow/cache.

## المرحلة B — Google Sheets Live Data
في Vercel → Settings → Environment Variables أضف لاحقًا:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

شارك كل Google Sheet المطلوبة مع Service Account Email. كود القراءة Read-only.

## المرحلة C — AI
أنشئ OpenAI API Key جديدًا ثم ضعه في Vercel فقط:
- `OPENAI_API_KEY`
- اختياري: `OPENAI_MODEL=gpt-5.6`

## المرحلة D — Gmail
عند الوصول لها سنعمل Google OAuth Web Client ونضيف:
- `GOOGLE_GMAIL_CLIENT_ID`
- `GOOGLE_GMAIL_CLIENT_SECRET`
- `PUBLIC_API_ORIGIN=https://operation-system-six.vercel.app`

Redirect URI:
`https://operation-system-six.vercel.app/api/google/oauth/callback`

## المرحلة E — الاختبار
بعد الدخول:
Settings → System Health Center → Run Full Diagnostics.
لا تعتمد على أي KPI قبل ما Google Sheets تظهر row counts حقيقية في Diagnostics.
