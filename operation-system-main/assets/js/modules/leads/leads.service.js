import Container from "../../core/container.js";
import ENDPOINTS from "../../constants/endpoints.js";

class LeadsService {
    api(){ return Container.get("api"); }
    token(){ return Container.get("authManager").getToken(); }
    store(){ return Container.get("storage"); }
    localRows(){ return this.store().get("operation_local_leads", []); }
    saveLocal(rows){ this.store().set("operation_local_leads", rows); return rows; }
    unwrap(res){ if(!res.ok || !res.data || !res.data.ok) throw new Error(res.data?.message || res.message || "Request failed"); return res.data.data; }

    normalizeLocalRow(row, idx=0){
        const get=(keys)=>{for(const k of keys){if(row?.[k]!==undefined&&row[k]!==null&&row[k]!=="")return row[k];}return "";};
        return {
            ...row,
            rowNumber: Number(get(["rowNumber","Row Number"])) || (idx + 1),
            date: get(["date","Date","Lead Date","Created Date"]),
            clientName: get(["clientName","Client Name","Full Name","Name"]),
            phone: String(get(["phone","Client Phone Number","Client Phone","Mobile","Phone"]) || ""),
            project: get(["project","Project","Project Name"]),
            salesName: get(["salesName","Sales Name","Assigned To","Sales"]),
            status: get(["status","Lead Status","Status"]) || "Not Contacted",
            stage: get(["stage","Lead Stage","Stage"]) || "New",
            source: get(["source","Lead Source","Source","Campaign Name"]),
            lastComment: get(["lastComment","Last Comment","Comment","Comments"])
        };
    }

    filterLocal(rows, filters={}){
        const q=String(filters.search||"").toLowerCase().trim();
        const status=String(filters.status||"ALL");
        const project=String(filters.project||"ALL");
        return rows.filter(r => (status==="ALL"||r.status===status) && (project==="ALL"||r.project===project) && (!q||JSON.stringify(r).toLowerCase().includes(q)));
    }

    async load(filters={}){
        try { return this.unwrap(await this.api().post(ENDPOINTS.LEADS_DATA,{token:this.token(),filters})); }
        catch (_) {
            const all=this.localRows().map((r,i)=>this.normalizeLocalRow(r,i));
            const rows=this.filterLocal(all,filters);
            return { rows, statuses:Array.from(new Set(all.map(x=>x.status).filter(Boolean))).sort(), meta:{ total:rows.length, mode:"local" } };
        }
    }

    async bulkStatus(rowNumbers,status){
        try { return this.unwrap(await this.api().post(ENDPOINTS.BULK_UPDATE_LEAD_STATUS,{token:this.token(),data:{rowNumbers,status}},{cacheTTL:0})); }
        catch (_) {
            const set=new Set((rowNumbers||[]).map(Number));
            const rows=this.localRows().map((r,i)=>{const n=Number(r.rowNumber)||(i+1); return set.has(n)?{...r,rowNumber:n,status,"Lead Status":status}:r;});
            this.saveLocal(rows); return {updated:set.size,mode:"local"};
        }
    }

    async importRows(rows){
        try { return this.unwrap(await this.api().post(ENDPOINTS.IMPORT_LEADS,{token:this.token(),data:{rows}},{cacheTTL:0})); }
        catch (_) {
            const current=this.localRows();
            const start=current.length;
            const normalized=(rows||[]).map((r,i)=>({...r,rowNumber:start+i+1}));
            this.saveLocal([...current,...normalized]);
            return {imported:normalized.length,updated:0,skipped:0,mode:"local"};
        }
    }
}
export default new LeadsService();
