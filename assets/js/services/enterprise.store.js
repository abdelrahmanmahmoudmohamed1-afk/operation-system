class EnterpriseStore {
    constructor() {
        this.prefix = 'ops_enterprise_';
        this.ensureSeeds();
    }

    key(name) { return `${this.prefix}${name}`; }
    read(name, fallback = []) {
        try { return JSON.parse(localStorage.getItem(this.key(name))) ?? fallback; }
        catch { return fallback; }
    }
    write(name, value) {
        localStorage.setItem(this.key(name), JSON.stringify(value));
        window.dispatchEvent(new CustomEvent('operation:enterprise-store', { detail: { name, value } }));
        return value;
    }
    uid(prefix = 'ID') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase(); }
    now() { return new Date().toISOString(); }

    ensureSeeds() {
        if (!localStorage.getItem(this.key('targets'))) {
            this.write('targets', [
                { id: this.uid('TGT'), project: 'Layana', owner: 'Sales Team', month: new Date().toISOString().slice(0,7), reserved: 12, contracted: 8, sold: 5, value: 45000000 },
                { id: this.uid('TGT'), project: 'Mersea', owner: 'Sales Team', month: new Date().toISOString().slice(0,7), reserved: 10, contracted: 7, sold: 4, value: 38000000 }
            ]);
        }
        if (!localStorage.getItem(this.key('automationRules'))) {
            this.write('automationRules', [
                { id: this.uid('RULE'), name: 'Lead inactivity', enabled: true, trigger: 'lead_stale_3d', action: 'create_task' },
                { id: this.uid('RULE'), name: 'Missing contract scan', enabled: true, trigger: 'contract_no_scan_48h', action: 'notify' },
                { id: this.uid('RULE'), name: 'Missing client mobile', enabled: true, trigger: 'client_missing_mobile', action: 'quality_alert' }
            ]);
        }
    }

    getTasks() { return this.read('tasks', []); }
    saveTask(task) {
        const rows = this.getTasks();
        const item = { id: task.id || this.uid('TSK'), createdAt: task.createdAt || this.now(), status: 'Open', priority: 'Medium', ...task, updatedAt: this.now() };
        const idx = rows.findIndex(x => x.id === item.id);
        if (idx >= 0) rows[idx] = item; else rows.unshift(item);
        this.write('tasks', rows); this.addActivity('Task saved', item.title || item.id, { taskId: item.id });
        return item;
    }
    toggleTask(id) {
        const rows = this.getTasks();
        const item = rows.find(x => x.id === id); if (!item) return null;
        item.status = item.status === 'Done' ? 'Open' : 'Done'; item.completedAt = item.status === 'Done' ? this.now() : '';
        this.write('tasks', rows); this.addActivity('Task status changed', item.title || id, { status: item.status }); return item;
    }
    deleteTask(id) { this.write('tasks', this.getTasks().filter(x => x.id !== id)); }

    getNotifications() { return this.read('notifications', []); }
    notify(title, message, type = 'info', meta = {}) {
        const rows = this.getNotifications();
        const item = { id: this.uid('NTF'), title, message, type, read: false, createdAt: this.now(), ...meta };
        rows.unshift(item); this.write('notifications', rows.slice(0, 200)); return item;
    }
    markNotificationsRead() { this.write('notifications', this.getNotifications().map(x => ({ ...x, read: true }))); }

    getActivities() { return this.read('activity', []); }
    addActivity(action, subject = '', details = {}) {
        const rows = this.getActivities();
        const user = (() => { try { return JSON.parse(sessionStorage.getItem('operation_session_user') || '{}'); } catch { return {}; } })();
        rows.unshift({ id: this.uid('ACT'), action, subject, details, user: user.name || user.user || 'Current user', createdAt: this.now() });
        this.write('activity', rows.slice(0, 500));
    }

    getTargets() { return this.read('targets', []); }
    saveTarget(target) { const rows = this.getTargets(); const item = { id: target.id || this.uid('TGT'), ...target }; const i = rows.findIndex(x=>x.id===item.id); if(i>=0) rows[i]=item; else rows.unshift(item); return this.write('targets', rows); }

    getApprovals() { return this.read('approvals', []); }
    saveApproval(item) { const rows = this.getApprovals(); const row={ id:item.id||this.uid('APR'), status:'Pending', createdAt:this.now(), ...item }; const i=rows.findIndex(x=>x.id===row.id); if(i>=0) rows[i]=row; else rows.unshift(row); this.write('approvals',rows); return row; }
    updateApproval(id,status){ const rows=this.getApprovals(); const item=rows.find(x=>x.id===id); if(item){ item.status=status; item.updatedAt=this.now(); this.write('approvals',rows); this.notify('Approval updated', `${item.title || item.type}: ${status}`, status==='Approved'?'success':'warning'); } return item; }

    getSavedViews() { return this.read('savedViews', []); }
    saveView(view) { const rows=this.getSavedViews(); const item={id:view.id||this.uid('VIEW'),createdAt:this.now(),...view}; rows.unshift(item); this.write('savedViews',rows.slice(0,100)); return item; }

    getAutomationRules(){ return this.read('automationRules',[]); }
    saveAutomationRule(rule){ const rows=this.getAutomationRules(); const item={id:rule.id||this.uid('RULE'),enabled:true,...rule}; const i=rows.findIndex(x=>x.id===item.id); if(i>=0) rows[i]=item; else rows.unshift(item); return this.write('automationRules',rows); }

    getCommissionRows(){ return this.read('commissions',[]); }
    saveCommission(row){ const rows=this.getCommissionRows(); const item={id:row.id||this.uid('COM'),status:'Due',createdAt:this.now(),...row}; const i=rows.findIndex(x=>x.id===item.id); if(i>=0) rows[i]=item; else rows.unshift(item); return this.write('commissions',rows); }

    getCollections(){ return this.read('collections',[]); }
    saveCollection(row){ const rows=this.getCollections(); const item={id:row.id||this.uid('COL'),createdAt:this.now(),...row}; rows.unshift(item); return this.write('collections',rows); }
}

export default new EnterpriseStore();
