# Enterprise X 1.7 — Sales Intelligence

- تسريع انتقال الأبواب وتقليل زمن الحركة غير الضروري.
- Sales Organization كمصدر مركزي للسيلز / المدير / الدايريكتور.
- Active / Inactive + Join / Leave dates مع الاحتفاظ بالتاريخ.
- Monthly targets واحتساب Achievement من Reserved + Contracted + Sold.
- Leads داخل Supabase مع Excel import وLead Age / Status Age.
- Orientation module مباشر من Google Sheets.
- Dropdowns في CRM وEOI تستخدم Active Sales Master عند توفره.
- لا تغييرات destructive على Inventory / Gmail / Documents.

قبل الاستخدام: نفّذ migrations/002_sales_leads_orientation.sql في Supabase SQL Editor ثم Deploy.
Environment Variable المقترح للأوريانتيشن: GOOGLE_ORIENTATION_SPREADSHEET_ID.
