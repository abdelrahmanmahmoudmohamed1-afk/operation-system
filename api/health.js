import { admin } from '../lib/supabase.js';
export default { async fetch(request) {
  const origin=request.headers.get('origin')||'*';
  const headers={'Access-Control-Allow-Origin':process.env.ALLOWED_ORIGIN||origin,'Content-Type':'application/json','Cache-Control':'no-store'};
  try {
    const { count, error } = await admin.from('inventory_units').select('*',{count:'exact',head:true});
    if(error) throw error;
    return new Response(JSON.stringify({ok:true,service:'Operation System API',version:'6.0.0',database:true,inventoryRows:count||0,ai:Boolean(process.env.OPENAI_API_KEY),storage:'operation-documents'}),{status:200,headers});
  } catch(e) {
    return new Response(JSON.stringify({ok:false,service:'Operation System API',version:'6.0.0',database:false,error:e.message}),{status:503,headers});
  }
}};
