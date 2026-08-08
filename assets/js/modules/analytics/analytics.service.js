import EnterpriseData from '../../services/enterprise.data.js';
import Container from '../../core/container.js';
class AnalyticsService{
 async load(){const live=await EnterpriseData.loadAll();const store=Container.get('enterpriseStore');return {live,targets:store.getTargets(),commissions:store.getCommissionRows(),collections:store.getCollections(),insights:EnterpriseData.buildInsights(live),savedViews:store.getSavedViews()};}
 saveTarget(x){return Container.get('enterpriseStore').saveTarget(x);} saveCommission(x){return Container.get('enterpriseStore').saveCommission(x);} saveCollection(x){return Container.get('enterpriseStore').saveCollection(x);} saveView(x){return Container.get('enterpriseStore').saveView(x);}
}
export default new AnalyticsService();
