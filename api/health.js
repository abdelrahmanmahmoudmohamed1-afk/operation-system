import { supabaseEnv } from '../lib/supabase.js';
import { sheetsEnabled } from '../lib/sheets.js';
import { gmailConfigured } from '../lib/gmail.js';
export default async function handler(request){
  const origin=(typeof request.headers?.get==='function'?request.headers.get('origin'):(request.headers?.origin||request.headers?.Origin))||'*';
  const headers={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
  return new Response(JSON.stringify({ok:true,service:'Operation System Enterprise X API',version:'enterprise-x-1.5.0',supabase:supabaseEnv,googleSheets:sheetsEnabled(),openai:Boolean(process.env.OPENAI_API_KEY),gmailOAuth:gmailConfigured(),note:'Health endpoint does not run database migrations.'}),{status:200,headers});
}
