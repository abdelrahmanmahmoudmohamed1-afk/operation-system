import EnterpriseData from '../../services/enterprise.data.js';
import Container from '../../core/container.js';
class CommandCenterService {
  async load(){
    const live=await EnterpriseData.loadAll();
    const store=Container.get('enterpriseStore');
    return {live,tasks:store.getTasks(),notifications:store.getNotifications(),activity:store.getActivities(),targets:store.getTargets(),approvals:store.getApprovals(),insights:EnterpriseData.buildInsights(live),quality:EnterpriseData.buildQuality(live)};
  }
}
export default new CommandCenterService();
