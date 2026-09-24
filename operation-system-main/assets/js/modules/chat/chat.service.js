import ApiService from "../../services/api.service.js";
import AuthManager from "../../managers/auth.manager.js";
import ENDPOINTS from "../../constants/endpoints.js";
class ChatService{
  token(){return AuthManager.getToken();}
  async call(action,data={}){const r=await ApiService.post(action,{token:this.token(),data},{forceRefresh:true});if(!r.ok)throw new Error(r.message||"Chat unavailable");return r.data?.data||r.data;}
  bootstrap(){return this.call(ENDPOINTS.CHAT_BOOTSTRAP)}
  messages(id){return this.call(ENDPOINTS.CHAT_MESSAGES,{conversationId:id})}
  create(name,members,isGroup){return this.call(ENDPOINTS.CHAT_CREATE,{name,members,isGroup})}
  read(id){return this.call(ENDPOINTS.CHAT_READ,{conversationId:id})}
  announcement(text,scope='all',conversationId=''){return this.call(ENDPOINTS.CHAT_ANNOUNCEMENT,{text,scope,conversationId})}
  async prepareAttachment(conversationId,file){return this.call(ENDPOINTS.CHAT_PREPARE_ATTACHMENT,{conversationId,fileName:file.name,mimeType:file.type||'application/octet-stream',fileSize:file.size})}
  async uploadPrepared(prepared,file){if(!prepared?.signedUrl)throw new Error('Secure upload URL was not created.');const body=new FormData();body.append('cacheControl','3600');body.append('',file);const res=await fetch(prepared.signedUrl,{method:'PUT',headers:{'x-upsert':'false'},body});if(!res.ok){let msg='Attachment upload failed.';try{const x=await res.json();msg=x.message||x.error||msg}catch{}throw new Error(msg)}return{storagePath:prepared.storagePath,fileName:prepared.fileName,mimeType:prepared.mimeType,fileSize:prepared.fileSize};}
  async send(id,text,{replyToId=null,files=[]}={}){const attachments=[];for(const file of files){const prepared=await this.prepareAttachment(id,file);attachments.push(await this.uploadPrepared(prepared,file));}return this.call(ENDPOINTS.CHAT_SEND,{conversationId:id,text,replyToId,attachments});}
}
export default new ChatService();
