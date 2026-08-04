class EOI {
    constructor(data = {}) {
        this.clientName = data.ClientName || data.clientName || "";
        this.phone = data.Phone || data.clientPhone || "";
        this.interest = data.Interest || data.interest || "";
        this.deposit = Number(data.Deposit || data.deposit || 0);
        this.salesName = data.Sales || data.salesName || "";
        this.source = data.Source || data.source || "";
        this.date = data.Date || data.date || "";
    }
}

export default EOI;
