const stored = (() => { try { return localStorage.getItem('operation_api_base') || ''; } catch (_) { return ''; } })();
const injected = String(window.OPERATION_API_BASE || '').trim();
const API_CONFIG = Object.freeze({
    // Vercel Functions backend. Set window.OPERATION_API_BASE in index.html or use localStorage key operation_api_base.
    baseURL: injected || stored || 'https://operation-system-six.vercel.app/api/ops',
    version: 'enterprise-x',
    timeout: 50000,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    retry: { enabled: true, maxAttempts: 2, delay: 500 }
});
export default API_CONFIG;
