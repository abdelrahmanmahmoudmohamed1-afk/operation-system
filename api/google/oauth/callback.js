import { ensureSchema } from '../../../lib/schema.js';
import { handleGmailCallback } from '../../../lib/gmail.js';
export default async function handler(request){
  try{
    await ensureSchema();const url=new URL(request.url);const code=url.searchParams.get('code');const state=url.searchParams.get('state');if(!code||!state)throw new Error('Missing OAuth code/state.');
    const result=await handleGmailCallback(code,state);
    return new Response(`<!doctype html><meta charset="utf-8"><title>Gmail connected</title><style>body{font-family:system-ui;background:#0d1522;color:#f6f1e5;display:grid;place-items:center;min-height:100vh}.c{padding:32px;border:1px solid #31425b;border-radius:22px;background:#152238;text-align:center}strong{color:#d8b85d}</style><div class="c"><h1>Gmail connected ✓</h1><p><strong>${String(result.email).replace(/[<>&]/g,'')}</strong></p><p>You can close this tab and return to Operation System.</p></div>`,{headers:{'Content-Type':'text/html; charset=utf-8'}});
  }catch(e){return new Response(`Gmail connection failed: ${e.message}`,{status:400,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
}
