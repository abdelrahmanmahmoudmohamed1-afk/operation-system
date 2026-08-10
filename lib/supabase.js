import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseEnv = { url:Boolean(url), publishable:Boolean(publishable), secret:Boolean(secret) };
if (!url || !secret || !publishable) console.warn('Supabase environment variables are incomplete.', supabaseEnv);

export const admin = createClient(url || 'http://localhost', secret || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl:false }
});
export const publicClient = createClient(url || 'http://localhost', publishable || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl:false }
});

async function withTimeout(promise, ms, label = 'operation') {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const e = new Error(`${label} timed out after ${ms}ms`);
          e.code = 'UPSTREAM_TIMEOUT';
          reject(e);
        }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function getUserFromToken(token) {
  if (!token) return null;
  let authResult;
  try {
    authResult = await withTimeout(admin.auth.getUser(token), 8000, 'Supabase auth check');
  } catch (e) {
    const err = new Error(`Authentication service timeout. Check the Supabase connection and environment variables. (${e.message})`);
    err.status = 503;
    err.code = 'AUTH_TIMEOUT';
    throw err;
  }
  const { data, error } = authResult || {};
  if (error || !data?.user) return null;
  let profile = null;
  try {
    const profileResult = await withTimeout(
      admin.from('profiles').select('*').eq('id', data.user.id).maybeSingle(),
      5000,
      'Profile lookup'
    );
    profile = profileResult?.data || null;
  } catch (e) {
    console.warn('Profile lookup timed out', e.message);
  }
  return { ...data.user, profile };
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
