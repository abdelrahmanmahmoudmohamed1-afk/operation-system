import Container from "../../core/container.js";
import ENDPOINTS from "../../constants/endpoints.js";

class AchievementService {
    api(){ return Container.get("api"); }
    token(){ return Container.get("authManager").getToken(); }
    async load(filters={}) {
        const res = await this.api().post(ENDPOINTS.ACHIEVEMENT_DATA,{token:this.token(),filters});
        if(!res.ok || !res.data || !res.data.ok) throw new Error(res.data?.message || res.message || "Achievement request failed");
        return res.data.data;
    }
}
export default new AchievementService();
