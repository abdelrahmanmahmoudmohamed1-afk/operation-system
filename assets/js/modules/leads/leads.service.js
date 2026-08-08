import Container from "../../core/container.js";
import ENDPOINTS from "../../constants/endpoints.js";
class LeadsService {
  api(){return Container.get("api");}
  token(){return Container.get("authManager").getToken();}
  unwrap(r){if(!r.ok||!r.data||!r.data.ok) throw new Error(r.data?.message||r.message||"Request failed"); return r.data.data;}
  async load(filters={}){return this.unwrap(await this.api().post(ENDPOINTS.LEADS_DATA,{token:this.token(),filters}));}
  async bulkStatus(ids,status){return this.unwrap(await this.api().post(ENDPOINTS.LEADS_BULK_STATUS,{token:this.token(),data:{ids,status}},{forceRefresh:true}));}
  async importRows(rows,mode="skip"){return this.unwrap(await this.api().post(ENDPOINTS.LEADS_IMPORT,{token:this.token(),data:{rows,mode}},{forceRefresh:true}));}
}
export default new LeadsService();
