class Payment {
    constructor(data = {}) {
        this.unitCode = data.unitCode || "";
        this.ticketPrice = Number(data.ticketPrice || 0);
        this.years = Number(data.years || 0);
        this.discountedPrice = Number(data.discountedPrice || 0);
        this.downPayment = Number(data.downPayment || 0);
        this.schedule = data.schedule || [];
    }
}

export default Payment;
