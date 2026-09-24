class Sidebar {
    constructor(menuItems = []) {
        this.menuItems = menuItems;
    }

    render() {
        return `
            <div class="sidebar premium-nav">
                <div class="sidebar-section-label">Workspace</div>
                <div class="sidebar-nav">
                    ${this.menuItems.map((item) => `
                        <button class="sidebar-link" data-route="${item.route}" type="button" title="${item.label}">
                            <span class="sidebar-icon" aria-hidden="true">${item.icon || ""}</span>
                            <span class="sidebar-label">${item.label}</span>
                        </button>
                    `).join("")}
                </div>
            </div>
        `;
    }
}

export default Sidebar;
