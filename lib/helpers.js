export const corsHeaders = (origin='*') => ({
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || origin || '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store'
});
export const json = (body, status=200, origin='*') => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), 'Content-Type':'application/json; charset=utf-8' } });
export const ok = (data=null, message='OK') => ({ ok:true, data, message });
export const fail = (message='Request failed', code='ERROR') => ({ ok:false, message, code });
export const n = (v) => { const x=Number(String(v ?? '').replace(/,/g,'')); return Number.isFinite(x)?x:0; };
export const txt = (v) => String(v ?? '').trim();
export const norm = (v) => txt(v).toLowerCase();
export const projectFilter = (query, project) => project && String(project).toUpperCase() !== 'ALL' ? query.eq('project', project) : query;
export const uniq = (arr=[]) => [...new Set(arr.filter(Boolean))];
