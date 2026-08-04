class Sidebar {
    constructor(menuItems = []) {
        this.menuItems = menuItems;
    }

    render() {
        return `
            <div class="sidebar sidebar-horizontal premium-nav">
                <div class="sidebar-brand">
                    <img class="sidebar-brand-logo" src="https://i.ibb.co/FLnH6Fw2/1cf98fc6-5c25-4af8-8af0-1e556340272f.jpg" alt="Toledo">
                    <span>TOLEDO</span>
                </div>

                <div class="sidebar-nav sidebar-nav-horizontal">
                    ${this.menuItems.map((item) => `
                        <button class="sidebar-link" data-route="${item.route}" type="button">
                            <span class="sidebar-icon">${item.icon || ""}</span>
                            <span class="sidebar-label">${item.label}</span>
                        </button>
                    `).join("")}
                </div>
            </div>
        `;
    }
}

export default Sidebar;
