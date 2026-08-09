import { ensureSchema, tableCounts } from '../lib/schema.js';
import { supabaseEnv } from '../lib/supabase.js';
import { sheetsEnabled } from '../lib/sheets.js';
import { gmailConfigured } from '../lib/gmail.js';
export default async function handler(request){
  const origin=(typeof request.headers?.get==='function'?request.headers.get('origin'):(request.headers?.origin||request.headers?.Origin))||'*';const headers={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
  try{const schema=await ensureSchema();const counts=await tableCounts();return new Response(JSON.stringify({ok:true,service:'Operation System Enterprise X API',version:'enterprise-x-1.1.0',schema,supabase:supabaseEnv,googleSheets:sheetsEnabled(),openai:Boolean(process.env.OPENAI_API_KEY),gmailOAuth:gmailConfigured(),counts}),{status:200,headers});}
  catch(e){return new Response(JSON.stringify({ok:false,service:'Operation System Enterprise X API',version:'enterprise-x-1.1.0',error:e.message}),{status:503,headers});}
}
