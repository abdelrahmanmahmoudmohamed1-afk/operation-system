const read = (key, fallback='') => {
  try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
};
const SUPABASE_CONFIG = Object.freeze({
  url: String(window.OPERATION_SUPABASE_URL || read('operation_supabase_url') || 'https://YOUR_PROJECT.supabase.co'),
  publishableKey: String(window.OPERATION_SUPABASE_PUBLISHABLE_KEY || read('operation_supabase_publishable_key') || 'YOUR_SUPABASE_PUBLISHABLE_KEY'),
  bucket: 'operation-documents'
});
export default SUPABASE_CONFIG;
