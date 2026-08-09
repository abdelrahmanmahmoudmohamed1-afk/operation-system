import EnterpriseData from '../../services/enterprise.data.js';
import ClientService from '../../services/client.service.js';

function norm(v){ return String(v ?? '').trim().toLowerCase(); }

class DigitalTwinService {
  async load(){
    const live = await EnterpriseData.loadAll();
    const units = EnterpriseData.normalizeUnits(live.inventory || []);
    return { live, units, summary: this.summarize(units) };
  }

  async getFloorPlan(unit){ return ClientService.getFloorPlan({project:unit.project,unitCode:unit.unitCode}); }
  async uploadFloorPlan(unit,data){ return ClientService.uploadFloorPlan({...data,project:unit.project,unitCode:unit.unitCode}); }
  async floorPlanCoverage(){ const project=sessionStorage.getItem('operation_global_project')||'ALL'; return ClientService.getFloorPlanCoverage({project}); }

  summarize(units){
    const buildings = {};
    const statuses = {};
    let value = 0;
    units.forEach((u) => {
      const project = u.project || 'Unknown';
      const building = u.building || 'Unassigned';
      const key = `${project}::${building}`;
      if(!buildings[key]) buildings[key] = { project, building, units:0, value:0, closed:0, available:0 };
      buildings[key].units += 1;
      buildings[key].value += Number(u.price || 0);
      value += Number(u.price || 0);
      const st = norm(u.status) || 'blank';
      statuses[st] = (statuses[st] || 0) + 1;
      if(['reserved','contracted','sold'].includes(st)) buildings[key].closed += 1;
      if(st === 'available') buildings[key].available += 1;
    });
    return {
      units: units.length,
      value,
      statuses,
      buildings: Object.values(buildings).map((b)=>({ ...b, occupancy: b.units ? Math.round((b.closed/b.units)*100) : 0 }))
        .sort((a,b)=> b.occupancy-a.occupancy || b.value-a.value)
    };
  }
}
export default new DigitalTwinService();
