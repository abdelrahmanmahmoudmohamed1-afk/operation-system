/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: formatter.js
 * Layer: Utils
 * Responsibility:
 * - Shared display formatting (money, numbers, dates)
 * ---------------------------------------------------------
 * Version: 0.1.0
 * ---------------------------------------------------------
 */

const Formatter = {
    money(value) {
        return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }) + " EGP";
    },

    number(value) {
        return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
    },

    percent(value) {
        return Number(value || 0).toFixed(1) + "%";
    },

    date(value) {
        if (!value) return "-";
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    },

    truncate(text, length = 40) {
        const s = String(text || "");
        return s.length > length ? s.slice(0, length) + "..." : s;
    }
};

export default Formatter;
