import Container from "../../core/container.js";
import ENDPOINTS from "../../constants/endpoints.js";

class LeadsService {
  api(){ return Container.get("api"); }
  token(){ return Container.get("authManager").getToken(); }
  unwrap(res){ if(!res.ok || !res.data || !res.data.ok) throw new Error((res.data&&res.data.message)||res.message||"Request failed"); return res.data.data; }
  async load(filters={}){ return this.unwrap(await this.api().post(ENDPOINTS.LEADS_DATA,{token:this.token(),filters})); }
  async importRows(rows,duplicateMode){ return this.unwrap(await this.api().post(ENDPOINTS.IMPORT_LEADS_BULK,{token:this.token(),rows,duplicateMode},{forceRefresh:true})); }
  async bulkStatus(rowNumbers,status){ return this.unwrap(await this.api().post(ENDPOINTS.BULK_UPDATE_LEAD_STATUS,{token:this.token(),rowNumbers,status},{forceRefresh:true})); }
}
export default new LeadsService();
