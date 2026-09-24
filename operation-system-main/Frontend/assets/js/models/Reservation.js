class Reservation {
    constructor(data = {}) {
        this.unitCode = data.unitCode || "";
        this.project = data.project || "";
        this.clientName = data.clientName || "";
        this.salesName = data.salesName || "";
        this.reservationDate = data.reservationDate || "";
        this.value = Number(data.value || 0);
    }
}

export default Reservation;
