import crypto from 'node:crypto';
import { google } from 'googleapis';
import { admin } from './supabase.js';

function origin(){
  const explicit=String(process.env.PUBLIC_API_ORIGIN||'').replace(/\/$/,'');
  if(explicit) return explicit;
  const host=process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'operation-system-six.vercel.app';
  return host.startsWith('http')?host:`https://${host}`;
}
function oauthConfig(){
  return {clientId:process.env.GOOGLE_GMAIL_CLIENT_ID||'',clientSecret:process.env.GOOGLE_GMAIL_CLIENT_SECRET||'',redirectUri:`${origin()}/api/google/oauth/callback`};
}
export function gmailConfigured(){const c=oauthConfig();return Boolean(c.clientId&&c.clientSecret);}
function client(){const c=oauthConfig();return new google.auth.OAuth2(c.clientId,c.clientSecret,c.redirectUri);}
function key(){return crypto.createHash('sha256').update(String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'operation-system')).digest();}
function encrypt(text){if(!text)return'';const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);const enc=Buffer.concat([cipher.update(text,'utf8'),cipher.final()]);const tag=cipher.getAuthTag();return `${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;}
function decrypt(text){if(!text)return'';const [a,b,c]=String(text).split('.');if(!a||!b||!c)return'';const decipher=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(a,'base64url'));decipher.setAuthTag(Buffer.from(b,'base64url'));return Buffer.concat([decipher.update(Buffer.from(c,'base64url')),decipher.final()]).toString('utf8');}

export async function createGmailConnectUrl(user){
  if(!gmailConfigured()) throw new Error('Gmail OAuth is not configured. Add GOOGLE_GMAIL_CLIENT_ID and GOOGLE_GMAIL_CLIENT_SECRET in Vercel.');
  const state=crypto.randomBytes(24).toString('hex');
  const expires=new Date(Date.now()+10*60*1000).toISOString();
  const {error}=await admin.from('oauth_states').insert({state,user_id:user.id,provider:'gmail',expires_at:expires});
  if(error)throw error;
  return client().generateAuthUrl({
    access_type:'offline',prompt:'consent',state,
    scope:['https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/userinfo.email','openid']
  });
}

export async function handleGmailCallback(code,state){
  if(!gmailConfigured()) throw new Error('Gmail OAuth is not configured.');
  const {data:s,error:sErr}=await admin.from('oauth_states').select('*').eq('state',state).eq('provider','gmail').maybeSingle();
  if(sErr||!s)throw new Error('Invalid or expired OAuth state.');
  if(new Date(s.expires_at).getTime()<Date.now())throw new Error('OAuth state expired. Please connect Gmail again.');
  const o=client(); const {tokens}=await o.getToken(code); o.setCredentials(tokens);
  const oauth2=google.oauth2({version:'v2',auth:o}); const me=await oauth2.userinfo.get();
  const refresh=tokens.refresh_token;
  if(!refresh){
    const {data:existing}=await admin.from('integrations').select('encrypted_refresh_token').eq('user_id',s.user_id).eq('provider','gmail').maybeSingle();
    if(!existing?.encrypted_refresh_token)throw new Error('Google did not return a refresh token. Reconnect and approve access again.');
  }
  const row={user_id:s.user_id,provider:'gmail',account_email:me.data.email||'',metadata:{scope:tokens.scope||'',connectedBy:'oauth'},updated_at:new Date().toISOString()};
  if(refresh)row.encrypted_refresh_token=encrypt(refresh);
  const {error}=await admin.from('integrations').upsert(row,{onConflict:'user_id,provider'}); if(error)throw error;
  await admin.from('oauth_states').delete().eq('state',state);
  return {email:me.data.email||''};
}

export async function gmailStatus(userId){
  const {data}=await admin.from('integrations').select('account_email,connected_at,updated_at').eq('user_id',userId).eq('provider','gmail').maybeSingle();
  return {configured:gmailConfigured(),connected:Boolean(data),accountEmail:data?.account_email||'',connectedAt:data?.connected_at||null};
}
async function gmailForUser(userId){
  if(!gmailConfigured())throw new Error('Gmail OAuth is not configured.');
  const {data,error}=await admin.from('integrations').select('*').eq('user_id',userId).eq('provider','gmail').maybeSingle(); if(error)throw error;
  if(!data?.encrypted_refresh_token)throw new Error('Gmail is not connected. Open Settings → Integrations → Connect Gmail.');
  const o=client();o.setCredentials({refresh_token:decrypt(data.encrypted_refresh_token)});return {gmail:google.gmail({version:'v1',auth:o}),accountEmail:data.account_email||''};
}
function qp(v){return String(v??'').replace(/\r?\n/g,' ').trim();}
function wrapBase64Url(buf){return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function fetchAttachments(ids=[]){
  if(!ids.length)return[];
  const {data,error}=await admin.from('documents').select('*').in('id',ids);if(error)throw error;
  const out=[];
  for(const d of data||[]){const {data:blob,error:bErr}=await admin.storage.from(d.bucket||'operation-documents').download(d.storage_path);if(bErr)throw bErr;out.push({name:d.file_name||'document.pdf',mime:d.mime_type||'application/pdf',buffer:Buffer.from(await blob.arrayBuffer())});}
  return out;
}
function buildMime({from,to,cc,bcc,subject,body,attachments=[]}){
  const boundary=`ops_${crypto.randomBytes(12).toString('hex')}`;
  const headers=[`From: ${from}`,`To: ${qp(to)}`]; if(cc)headers.push(`Cc: ${qp(cc)}`); if(bcc)headers.push(`Bcc: ${qp(bcc)}`);
  headers.push(`Subject: =?UTF-8?B?${Buffer.from(String(subject||'')).toString('base64')}?=`,`MIME-Version: 1.0`,`Content-Type: multipart/mixed; boundary="${boundary}"`);
  const parts=[`--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(String(body||''),'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n')||''}`];
  for(const a of attachments){parts.push(`--${boundary}\r\nContent-Type: ${a.mime}; name="${qp(a.name)}"\r\nContent-Disposition: attachment; filename="${qp(a.name)}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${a.buffer.toString('base64').match(/.{1,76}/g)?.join('\r\n')||''}`);}
  parts.push(`--${boundary}--`);return headers.join('\r\n')+'\r\n\r\n'+parts.join('\r\n');
}
export async function sendGmail(userId,{to,cc='',bcc='',subject='',body='',documentIds=[]}){
  if(!to)throw new Error('Recipient email is required.');
  const {gmail,accountEmail}=await gmailForUser(userId);const attachments=await fetchAttachments(documentIds);
  const raw=wrapBase64Url(buildMime({from:accountEmail||'me',to,cc,bcc,subject,body,attachments}));
  const result=await gmail.users.messages.send({userId:'me',requestBody:{raw}});
  return {sent:true,messageId:result.data.id||'',threadId:result.data.threadId||'',from:accountEmail,to,attachments:attachments.map(x=>x.name)};
}
