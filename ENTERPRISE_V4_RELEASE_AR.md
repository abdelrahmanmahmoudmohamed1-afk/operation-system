# Operation System Enterprise 4.0 — Mission Control Edition

هذه النسخة مبنية مباشرة فوق Enterprise 3.0 All-In-One وتضيف طبقة تشغيلية/بصرية جديدة بدون إزالة الموديولات السابقة.

## أهم الإضافات

### 1. Command Center جديد — Mission Control
- Company Pulse Score محسوب من حالة البيانات، المهام، approvals، ونسبة الـ closed pipeline.
- Project Islands لكل مشروع بقيمة المحفظة، عدد الوحدات والعملاء ونسبة الإغلاق.
- Sales League بترتيب السيلز بناءً على Sold / Contracted / Reserved / Value.
- Client Journey Funnel من Clients إلى EOI ثم Reserved وContracted وSold.
- Building Momentum Heatmap مبني على بيانات الـ inventory.
- Smart Insights + Priority Queue + Critical Alerts + Approvals + Live Activity + Notifications.
- Customize Mode: يمكن سحب Panels وترتيبها، ويتم حفظ الترتيب محليًا على الجهاز.

### 2. Digital Twin
موديول جديد بالكامل لعرض الـ inventory كخريطة تشغيلية:
- Project / Building / Status / Search filters.
- كل Building يظهر كـ live block.
- كل Unit تظهر كـ tile بلون الحالة.
- Available / Reserved / Contracted / Sold / Hold signals.
- Occupancy لكل مبنى.
- Portfolio value لكل مبنى.
- Unit Inspector.
- فتح Unit 360 من الـ Digital Twin.

### 3. Ops Copilot
مساعد ذكي يعمل على الداتا المتاحة داخل النظام بدون API ذكاء اصطناعي خارجي:
- Executive summary.
- Available units.
- Sold / Contracted / Reserved portfolios.
- Top sales.
- CRM mobile data quality.
- Client / unit workspace search.
- يدعم Layana وMersea في السؤال.
- زر AI ثابت في الـ topbar.
- Voice input عند دعم المتصفح لـ SpeechRecognition.

أمثلة:
- `available units in Mersea`
- `who is the top sales?`
- `show contracted units`
- `which clients are missing mobile numbers?`
- `give me an executive summary`

### 4. Voice Intelligence
- Voice Search من الـ topbar.
- Voice Prompt داخل Ops Copilot.
- اللغة تتبع لغة النظام (English / Arabic) عند دعم المتصفح.

### 5. Personal Workspace
- Command Center panels قابلة لإعادة الترتيب Drag & Drop.
- الترتيب محفوظ في Local Storage لكل متصفح.

### 6. UI Motion Layer
- Company Pulse animated rings.
- Project activity bars.
- Sales ranking bars.
- Building heat cells.
- Digital Twin live unit states.
- AI shimmer / thinking / listening states.
- كل الحركة تحترم `prefers-reduced-motion` الموجود بالفعل في النظام.

## الموديولات
Command Center, Overview, Dashboard, Inventory, Digital Twin, Payment, CRM, Leads, EOI, Achievement, Reports, Tasks, Analytics, Data Quality, Contracts, Documents, Users (Admin), Settings.

## GitHub / VS Code
انسخ محتويات هذا المشروع فوق فولدر الريبو الحالي مع الحفاظ على `.git` ثم:
1. افتح GitHub Desktop.
2. Commit message مقترح: `Enterprise 4 Mission Control`.
3. Push origin.
4. بعد النشر اعمل `Ctrl + Shift + R` مرة واحدة لأن Service Worker اتحدث إلى V4.

## ملاحظات
- Digital Twin وOps Copilot يعتمدان على نفس مصادر البيانات الحالية؛ لا يضيفان Database جديدة.
- Voice Search يعتمد على دعم المتصفح.
- Ops Copilot هنا Data Copilot محلي وليس LLM خارجي، لذلك لا يرسل بيانات العملاء إلى خدمة ذكاء اصطناعي خارجية.
