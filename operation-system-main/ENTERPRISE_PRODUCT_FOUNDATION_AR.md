# Operation System — Commercial Product Foundation

## ما تم في 1.7.8
- إصلاح Migration الشات لتكون Bootstrap-safe حتى لو 005 لم تُشغّل.
- توحيد وجود 005 داخل مساري migrations.
- إزالة امتياز Developer المرتبط بإيميل شخصي من إدارة كلمات المرور.
- إظهار Temporary Password فقط عند توليده صراحةً بواسطة Admin، مع إجبار المستخدم على تغييره حسب الإعداد.
- إزالة color-mix من ملفات Runtime النشطة التي تؤثر على PDF/Print.
- جعل Release Audit يفحص Runtime الفعلي بدل legacy/docs المؤرشفة.

## المرحلة التجارية التالية (ليست مكتملة بعد)
1. Multi-tenancy: organizations + tenant_id وعزل بيانات كامل.
2. Roles/Permissions مؤسسية: owner/admin/manager/user + granular permissions.
3. Licensing & Plans: plan, seats, modules, expiry, feature flags.
4. Company onboarding: إنشاء شركة، Admin أول، branding، projects، imports.
5. Observability: structured logs, error tracking, health checks, backups.
6. Security hardening: RLS policies tenant-aware، rate limiting، session controls، MFA-ready.
7. Data layer: تقليل الاعتماد التشغيلي على Google Sheets وجعل Supabase مصدر البيانات الأساسي.
8. Deployment model: SaaS shared أو dedicated tenant deployments حسب الباقة.

> لا يجب تسويق النظام كـ multi-tenant SaaS قبل تنفيذ عزل الشركات فعليًا في الـschema والـbackend.
