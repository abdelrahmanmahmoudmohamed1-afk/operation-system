import ApiService from "../../services/api.service.js";
import AuthManager from "../../managers/auth.manager.js";
import ENDPOINTS from "../../constants/endpoints.js";
import AuditService from "../../services/audit.service.js";
class UsersService {
 token(){return AuthManager.getToken();}
 async loadUsers(forceRefresh=false){const r=await ApiService.post(ENDPOINTS.USERS_DATA,{token:this.token()},{forceRefresh});if(!r.ok)throw new Error(r.message);return r.data?.data||r.data||{users:[],summary:{}};}
 async createUser(data){const r=await ApiService.post(ENDPOINTS.CREATE_SYSTEM_USER,{token:this.token(),data},{forceRefresh:true});if(!r.ok)throw new Error(r.message);return r.data?.data||r.data;}
 async loadHistory(filters={},forceRefresh=false){const r=await ApiService.post(ENDPOINTS.AUDIT_HISTORY,{token:this.token(),filters},{forceRefresh});if(!r.ok){if(/backend deployment|Unknown action/i.test(r.message||""))return AuditService.list(Number(filters.limit||500));throw new Error(r.message);}return r.data?.data||r.data||[];}
}
export default new UsersService();
