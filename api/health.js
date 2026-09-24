import { supabaseEnv } from '../lib/supabase.js';
import { sheetsEnabled } from '../lib/sheets.js';
import { gmailConfigured } from '../lib/gmail.js';
async function healthFetch(request){
  const origin=request.headers.get('origin')||'*';
  const headers={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
  return new Response(JSON.stringify({ok:true,service:'Operation System Enterprise X API',version:'enterprise-x-1.6.0',supabase:supabaseEnv,googleSheets:sheetsEnabled(),openai:Boolean(process.env.OPENAI_API_KEY),gmailOAuth:gmailConfigured(),note:'Health endpoint does not run database migrations.'}),{status:200,headers});
}
export default { fetch: healthFetch };
