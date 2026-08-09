import DashboardService from './dashboard.service.js';
import InventoryService from './inventory.service.js';
import ClientService from './client.service.js';
import EOIService from './eoi.service.js';

function projectFilter() {
    const p = sessionStorage.getItem('operation_global_project') || 'ALL';
    return p && p !== 'ALL' ? { project: p } : {};
}

function safeValue(row, keys, fallback='') {
    for (const key of keys) {
        if (row && row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    }
    return fallback;
}
function num(v){ const n=Number(String(v??'').replace(/,/g,'').replace(/[^0-9.-]/g,'')); return Number.isFinite(n)?n:0; }
function text(v){ return String(v??'').trim(); }
function norm(v){ return text(v).toLowerCase(); }

class EnterpriseDataService {
    async loadAll() {
        const filters = projectFilter();
        const jobs = await Promise.allSettled([
            DashboardService.getData(filters),
            InventoryService.getData(filters),
            ClientService.getClients(filters),
            EOIService.getData(filters)
        ]);
        return {
            dashboard: jobs[0].status === 'fulfilled' ? (jobs[0].value || {}) : {},
            inventory: jobs[1].status === 'fulfilled' ? (jobs[1].value || []) : [],
            clients: jobs[2].status === 'fulfilled' ? (jobs[2].value || []) : [],
            eoi: jobs[3].status === 'fulfilled' ? (jobs[3].value?.rows || jobs[3].value || []) : [],
            health: jobs.map((j, i) => ({ source: ['Dashboard','Inventory','CRM','EOI'][i], ok: j.status === 'fulfilled', error: j.status === 'rejected' ? String(j.reason?.message || j.reason) : '' }))
        };
    }

    normalizeClients(rows=[]) {
        return rows.map((r, i) => ({
            id: safeValue(r,['id','clientId'],`CL-${i+1}`),
            unitCode: text(safeValue(r,['unitCode','UnitCode','Unit Code'])),
            project: text(safeValue(r,['project','Project'])),
            clientName: text(safeValue(r,['clientName','Client','Client Name English','Client Name Arabic'])),
            mobile1: text(safeValue(r,['clientPhone','clientPhoneNumber','phone','mobile','Client Phone Number','Client Phone'])),
            mobile2: text(safeValue(r,['clientPhone2','clientPhoneNumber2','phone2','mobile2','Client Phone Number 2'])),
            address: text(safeValue(r,['clientAddress','address','residenceAddress','Residence address','Client Residence'])),
            email: text(safeValue(r,['clientEmail','email','E-mail','Email'])),
            status: text(safeValue(r,['status','Status','contractStatus','ContractStatus'])),
            sales: text(safeValue(r,['salesName','Sales','Sales Name'])),
            manager: text(safeValue(r,['manager','Manager','Sales Manager'])),
            contractDate: text(safeValue(r,['contractDate','ContractDate','Contract Date'])),
            reservationDate: text(safeValue(r,['reservationDate','ReservationDate','Reservition Date','Reservation Date'])),
            soldDate: text(safeValue(r,['soldDate','SoldDate','Sold Date'])),
            value: num(safeValue(r,['soldPrice','Value','value','Price After Discount','Contract Price','Sold Price']))
        }));
    }

    normalizeUnits(rows=[]) {
        return rows.map((r, i) => ({
            id: safeValue(r,['id'],`UN-${i+1}`),
            unitCode: text(safeValue(r,['unitCode','UnitCode','Unit Code'])),
            project: text(safeValue(r,['project','Project'])),
            status: text(safeValue(r,['status','Status'])),
            unitType: text(safeValue(r,['unitType','UnitType','Unit Type'])),
            building: text(safeValue(r,['building','Building'])),
            floor: text(safeValue(r,['floor','Floor'])),
            area: num(safeValue(r,['area','Area','totalArea','Total Area','In Door Area'])),
            price: num(safeValue(r,['soldPrice','ticketPrice','Value','value','Price After Discount','Unit Price']))
        }));
    }

    buildQuality(data) {
        const clients = this.normalizeClients(data.clients);
        const units = this.normalizeUnits(data.inventory);
        const issues=[];
        const mobileMap=new Map();
        clients.forEach(c=>{
            if (!c.mobile1) issues.push({severity:'High',type:'Missing mobile',project:c.project,ref:c.unitCode||c.clientName,owner:c.sales,detail:c.clientName||'Client'});
            if (!c.address) issues.push({severity:'Medium',type:'Missing address',project:c.project,ref:c.unitCode||c.clientName,owner:c.sales,detail:c.clientName||'Client'});
            if (norm(c.status)==='contracted' && !c.contractDate) issues.push({severity:'High',type:'Missing contract date',project:c.project,ref:c.unitCode,owner:c.sales,detail:c.clientName});
            const m=norm(c.mobile1).replace(/\D/g,''); if(m){ if(mobileMap.has(m)) issues.push({severity:'Medium',type:'Duplicate mobile',project:c.project,ref:c.unitCode,owner:c.sales,detail:`Also linked to ${mobileMap.get(m)}`}); else mobileMap.set(m,c.unitCode||c.clientName); }
        });
        units.forEach(u=>{
            if (!u.unitCode) issues.push({severity:'High',type:'Missing unit code',project:u.project,ref:'-',owner:'Operations',detail:u.unitType});
            if (!u.status) issues.push({severity:'Medium',type:'Missing unit status',project:u.project,ref:u.unitCode,owner:'Operations',detail:u.unitType});
            if (u.price<=0 && ['reserved','contracted','sold'].includes(norm(u.status))) issues.push({severity:'High',type:'Closed unit without value',project:u.project,ref:u.unitCode,owner:'Operations',detail:u.status});
        });
        return issues;
    }

    buildInsights(data) {
        const units=this.normalizeUnits(data.inventory); const clients=this.normalizeClients(data.clients);
        const insights=[];
        const byProject={};
        units.forEach(u=>{const p=u.project||'Unknown'; byProject[p]=byProject[p]||{total:0,closed:0,value:0}; byProject[p].total++; if(['reserved','contracted','sold'].includes(norm(u.status))){byProject[p].closed++;byProject[p].value+=u.price;}});
        const projects=Object.entries(byProject).map(([project,x])=>({project,...x,conversion:x.total?x.closed/x.total:0})).sort((a,b)=>b.conversion-a.conversion);
        if(projects[0]) insights.push({tone:'positive',title:`${projects[0].project} leads project conversion`,text:`${Math.round(projects[0].conversion*100)}% of visible units are in the closed pipeline.`});
        const missingMobile=clients.filter(c=>!c.mobile1).length; if(missingMobile) insights.push({tone:'warning',title:'CRM data quality needs attention',text:`${missingMobile} client record(s) are missing a primary mobile number.`});
        const noContractDate=clients.filter(c=>norm(c.status)==='contracted'&&!c.contractDate).length; if(noContractDate) insights.push({tone:'warning',title:'Contract dates incomplete',text:`${noContractDate} contracted client record(s) have no contract date.`});
        const sold=clients.filter(c=>norm(c.status)==='sold'); if(sold.length){const avg=Math.round(sold.reduce((s,c)=>s+c.value,0)/sold.length); insights.push({tone:'info',title:'Sold portfolio average',text:`Average visible sold value is ${avg.toLocaleString('en-US')}.`});}
        if(!insights.length) insights.push({tone:'positive',title:'Workspace looks healthy',text:'No major data-quality or pipeline warnings detected in the currently loaded project.'});
        return insights;
    }
}
export default new EnterpriseDataService();
