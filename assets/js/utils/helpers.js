/**
 * ---------------------------------------------------------
 * Abdelrahman Framework
 * File: helpers.js
 * Layer: Utils
 * Responsibility:
 * - Generic DOM / data helpers shared by module views
 * ---------------------------------------------------------
 * Version: 0.1.0
 * ---------------------------------------------------------
 */

export function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function debounce(fn, delay = 300) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export function buildTable(rows, columns) {
    if (!rows || !rows.length) {
        return `<tr><td colspan="${columns.length}" class="table-empty">No data found</td></tr>`;
    }

    return rows.map((row) => {
        const cells = columns.map((col) => `<td>${escapeHtml(row[col.key] ?? "")}</td>`).join("");
        return `<tr>${cells}</tr>`;
    }).join("");
}

export function buildTableHead(columns) {
    return columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join("");
}

export function qs(selector, scope = document) {
    return scope.querySelector(selector);
}

export function qsa(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
}
