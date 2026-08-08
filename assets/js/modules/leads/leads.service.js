import Container from "../../core/container.js";
import ENDPOINTS from "../../constants/endpoints.js";

class LeadsService {
    api(){ return Container.get("api"); }
    token(){ return Container.get("authManager").getToken(); }
    unwrap(res){ if(!res.ok || !res.data || !res.data.ok) throw new Error(res.data?.message || res.message || "Request failed"); return res.data.data; }
    async load(filters={}){ return this.unwrap(await this.api().post(ENDPOINTS.LEADS_DATA,{token:this.token(),filters})); }
    async bulkStatus(rowNumbers,status){ return this.unwrap(await this.api().post(ENDPOINTS.BULK_UPDATE_LEAD_STATUS,{token:this.token(),data:{rowNumbers,status}},{cacheTTL:0})); }
    async importRows(rows){ return this.unwrap(await this.api().post(ENDPOINTS.IMPORT_LEADS,{token:this.token(),data:{rows}},{cacheTTL:0})); }
}
export default new LeadsService();
