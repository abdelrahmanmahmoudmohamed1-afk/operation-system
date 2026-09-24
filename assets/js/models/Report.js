class Report {
    constructor(data = {}) {
        this.title = data.title || "";
        this.generatedAt = data.generatedAt || "";
        this.rows = data.rows || [];
    }
}

export default Report;
