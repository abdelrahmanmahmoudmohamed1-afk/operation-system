export function renderLoading(options = {}) {
    const rows = options.rows || 4;
    if (options.variant === "kpis") {
        return Array.from({ length: rows }).map(() => `
            <div class="kpi-card skeleton-card">
                <div class="skeleton-line skeleton-line-sm"></div>
                <div class="skeleton-line skeleton-line-lg"></div>
            </div>
        `).join("");
    }
    if (options.variant === "block") {
        return `<div class="state-box state-block"><span class="state-spinner"></span><span>Loading...</span></div>`;
    }
    return Array.from({ length: rows }).map(() => `
        <tr class="skeleton-row"><td colspan="12"><div class="skeleton-line"></div></td></tr>
    `).join("");
}

export function renderEmptyRow(colspan = 1, message = "No data") {
    return `<tr class="state-row state-empty"><td colspan="${colspan}"><div class="state-box"><span class="state-icon">i</span><span>${escapeState(message)}</span></div></td></tr>`;
}

export function renderErrorRow(colspan = 1, message = "Something went wrong") {
    return `<tr class="state-row state-error"><td colspan="${colspan}"><div class="state-box"><span class="state-icon">!</span><span>${escapeState(message)}</span></div></td></tr>`;
}

export function renderError(options = {}) {
    const message = options.message || "Something went wrong";
    const retryId = options.retryId || "retry-btn";
    return `
        <div class="state-box state-block state-error">
            <span class="state-icon">!</span>
            <span>${escapeState(message)}</span>
            <button class="btn btn-outline" id="${retryId}">Retry</button>
        </div>
    `;
}

function escapeState(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[c]));
}
