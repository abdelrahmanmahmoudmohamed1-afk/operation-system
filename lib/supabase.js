import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret || !publishable) console.warn('Supabase environment variables are incomplete.');

export const admin = createClient(url || 'http://localhost', secret || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false }
});
export const publicClient = createClient(url || 'http://localhost', publishable || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function getUserFromToken(token) {
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: profile } = await admin.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  return { ...data.user, profile: profile || null };
}

export async function requireUser(token) {
  const user = await getUserFromToken(token);
  if (!user) { const e = new Error('SESSION_EXPIRED'); e.status = 401; throw e; }
  if (user.profile && user.profile.is_active === false) { const e = new Error('USER_DISABLED'); e.status = 403; throw e; }
  return user;
}

export async function requireAdmin(token) {
  const user = await requireUser(token);
  if (String(user.profile?.role || '').toLowerCase() !== 'admin') { const e = new Error('ADMIN_REQUIRED'); e.status = 403; throw e; }
  return user;
}
