class Sidebar {
    constructor(menuItems = []) {
        this.menuItems = menuItems;
    }

    render() {
        return `
            <div class="sidebar sidebar-horizontal premium-nav">
                <button class="sidebar-brand sidebar-brand-button" type="button" data-home aria-label="Go to Overview">
                    <img class="sidebar-brand-logo" src="https://i.ibb.co/FLnH6Fw2/1cf98fc6-5c25-4af8-8af0-1e556340272f.jpg" alt="Company logo">
                    <span>Operation System</span>
                </button>

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
