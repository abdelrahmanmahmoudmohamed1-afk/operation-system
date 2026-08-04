class Contract {
    constructor(data = {}) {
        this.unitCode = data.unitCode || "";
        this.project = data.project || "";
        this.clientName = data.clientName || "";
        this.salesName = data.salesName || "";
        this.contractDate = data.contractDate || "";
        this.value = Number(data.value || 0);
        this.contractPlace = data.contractPlace || "";
    }
}

export default Contract;
