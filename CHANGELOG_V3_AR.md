# Operation System Operation System — Enterprise V3

## الإصلاحات الأساسية
- إصلاح اسم شيت المخزون إلى `Layana Inventory Management` مع fallback للاسم القديم.
- منع عرض أرقام صفر مضللة عند غياب الشيت؛ الباك إند يعرض خطأ واضح.
- رفع كاش بيانات المخزون من 45 ثانية إلى 5 دقائق.
- إضافة كاش لنتائج الداشبورد حسب المستخدم والفلاتر لمدة دقيقتين.
- تقليل مهلة API إلى 20 ثانية ومحاولات الإعادة إلى محاولتين لتقليل الإحساس بالتعليق.

## الواجهة
- إضافة Route Progress Bar فعلي عند تغيير الصفحات.
- إضافة Skeleton Loading وEmpty/Error states وSpinners كانت مستخدمة في JS بدون CSS.
- تحسين المسافات داخل الكروت والفلاتر والجداول.
- تحسين ألوان وقوائم Dropdown والأسهم وFocus states.
- إضافة حركات دخول خفيفة ودعم Reduced Motion.
- توحيد جميع الثيمات بدل الثيمات الفارغة أو غير المكتملة.
- تنظيف `genius.css` وإزالة التكرار.

## التركيب
يجب رفع ملفات Frontend إلى GitHub وملفات `Operation System_Unified_Backend` إلى Google Apps Script ثم إنشاء New Version للـ Deployment.


## تحديث Cinematic Loading
- شاشة افتتاح عالمية بخلفية سينمائية وشعار Operation System يتكوّن تدريجيًا بخط مسح ضوئي وحلقات مدارية.
- Loading موحد أثناء الانتقال بين الصفحات بنفس هوية الشعار المتكوّن.
- دعم الشاشات الصغيرة وميزة Reduce Motion.
