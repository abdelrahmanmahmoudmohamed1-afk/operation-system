class Sidebar {
    constructor(menuItems = []) {
        this.menuItems = menuItems;
    }

    render() {
        return `
            <div class="sidebar premium-nav">
                <div class="sidebar-section-label">Workspace</div>
                <div class="sidebar-project"><label for="global-project-filter">Project</label><select id="global-project-filter" aria-label="Project"><option value="ALL">All Projects</option><option value="Layana">Master Data (1)</option><option value="Mersea">Master Data (2)</option></select></div><div class="sidebar-nav">
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
