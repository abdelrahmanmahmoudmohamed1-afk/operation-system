class NotificationService {
    constructor() {
        this.container = null;
        this.defaultDuration = 3800;
    }

    init() {
        if (this.container) return;
        this.container = document.querySelector('.toast-container, .notification-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container notification-container';
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = this.defaultDuration) {
        this.init();
        const toast = document.createElement('div');
        if (/^Unknown action:/i.test(String(message || ""))) return null;
        toast.className = `toast toast-${type} notification notification-${type}`;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '!' : type === 'warning' ? '⚠' : 'i'}</span>
            <span class="toast-copy"><strong>${type === 'success' ? 'Done' : type === 'error' ? 'Something went wrong' : type === 'warning' ? 'Attention' : 'Operation System'}</strong><span class="toast-message">${this.escape(message || '')}</span></span>
            <button class="toast-close" type="button" aria-label="Close">×</button>
        `;
        toast.querySelector('.toast-close')?.addEventListener('click', () => this.close(toast));
        this.container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        if (duration !== 0) setTimeout(() => this.close(toast), duration);
        return toast;
    }

    close(toast) {
        if (!toast) return;
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 180);
    }

    success(message, duration) { return this.show(message, 'success', duration); }
    error(message, duration = 6000) { return this.show(message, 'error', duration); }
    warning(message, duration = 5200) { return this.show(message, 'warning', duration); }
    info(message, duration) { return this.show(message, 'info', duration); }

    escape(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

export default new NotificationService();
export { NotificationService };
