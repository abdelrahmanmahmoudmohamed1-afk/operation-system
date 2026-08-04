class Client {
    constructor(data = {}) {
        this.unitCode = data.unitCode || "";
        this.project = data.project || "";
        this.unitType = data.unitType || "";
        this.status = data.status || "";
        this.clientName = data.clientName || "";
        this.salesName = data.salesName || "";
        this.salesManager = data.salesManager || "";
        this.salesDirector = data.salesDirector || "";
        this.brokerCompany = data.brokerCompany || "";
        this.soldPrice = Number(data.soldPrice || 0);
        this.area = Number(data.area || 0);
        this.contractDate = data.contractDate || "";
        this.reservationDate = data.reservationDate || "";
    }
}

export default Client;
