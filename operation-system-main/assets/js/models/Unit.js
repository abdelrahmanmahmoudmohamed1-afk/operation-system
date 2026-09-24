class Unit {
    constructor(data = {}) {
        this.unitCode = data.unitCode || "";
        this.project = data.project || "";
        this.unitType = data.unitType || "";
        this.status = data.status || "";
        this.floor = data.floor || "";
        this.area = Number(data.area || 0);
        this.soldPrice = Number(data.soldPrice || 0);
        this.salesName = data.salesName || "";
    }

    isAvailable() { return String(this.status).toLowerCase() === "available"; }
}

export default Unit;
