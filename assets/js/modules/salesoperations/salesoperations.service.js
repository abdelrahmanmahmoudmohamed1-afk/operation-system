import Container from "../../core/container.js";
import ENDPOINTS from "../../constants/endpoints.js";
class Service{api(){return Container.get('api')} token(){return Container.get('authManager').getToken()} unwrap(r){if(!r.ok||!r.data?.ok)throw new Error(r.data?.message||r.message||'Request failed');return r.data.data} async load(){return this.unwrap(await this.api().post(ENDPOINTS.SALES_ORG_DATA,{token:this.token()}))} async savePerson(data){return this.unwrap(await this.api().post(ENDPOINTS.SAVE_SALES_PERSON,{token:this.token(),data},{cacheTTL:0}))} async saveTarget(data){return this.unwrap(await this.api().post(ENDPOINTS.SAVE_SALES_TARGET,{token:this.token(),data},{cacheTTL:0}))}}
export default new Service();
