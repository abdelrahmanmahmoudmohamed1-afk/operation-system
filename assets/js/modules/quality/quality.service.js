import EnterpriseData from '../../services/enterprise.data.js';
import Container from '../../core/container.js';
class QualityService{
 async load(){const live=await EnterpriseData.loadAll();const store=Container.get('enterpriseStore');return {live,issues:EnterpriseData.buildQuality(live),rules:store.getAutomationRules(),activity:store.getActivities()};}
 saveRule(x){return Container.get('enterpriseStore').saveAutomationRule(x);}
}
export default new QualityService();
