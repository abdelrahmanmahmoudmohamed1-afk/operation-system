/**
 * هذا الموديول غير مفعّل حالياً (غير موجود في modules.config.js).
 * تركته كهيكل جاهز لو حبيت تضيف "Sales Operations" كموديول مستقل
 * مستقبلاً (مثلاً: متابعة طلبات السيلز اليومية بشكل منفصل عن CRM).
 */
class SalesOperationsModuleService {
    async notImplemented() {
        return { message: "Sales Operations module is not wired to a route yet." };
    }
}

export default new SalesOperationsModuleService();
