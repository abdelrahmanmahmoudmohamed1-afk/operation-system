import SoundKit from "../utils/sound.js";

class NotificationService {
    constructor() {
        this.container = null;
        this.defaultDuration = 3600;
    }

    init() {
        if (this.container && document.body.contains(this.container)) return;
        this.container = document.createElement('div');
        this.container.className = 'ops-alert-layer';
        this.container.setAttribute('aria-live', 'polite');
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = this.defaultDuration) {
        this.init();
        // One focused message at a time; no giant stacked panel.
        this.container.replaceChildren();
        const titles = { success: 'Done', error: 'Something needs attention', warning: 'Please check', info: 'Information' };
        const icons = { success: '✓', error: '!', warning: '!', info: 'i' };
        const card = document.createElement('div');
        card.className = `ops-alert-card ops-alert-${type}`;
        card.setAttribute('role', type === 'error' ? 'alert' : 'status');
        const iconClass = type === 'success' ? 'ops-alert-icon ops-stamp-icon' : 'ops-alert-icon';
        card.innerHTML = `
            <span class="${iconClass}" aria-hidden="true">${icons[type] || 'i'}</span>
            <div class="ops-alert-copy">
                <strong>${this.escape(titles[type] || 'Information')}</strong>
                <span>${this.escape(message || '')}</span>
            </div>
            <button class="ops-alert-close" type="button" aria-label="Close">×</button>
        `;
        card.querySelector('.ops-alert-close')?.addEventListener('click', () => this.close(card));
        this.container.appendChild(card);
        requestAnimationFrame(() => card.classList.add('show'));
        if (type === 'success') { SoundKit.stampThud(); }
        else if (type === 'error') { SoundKit.tone(220, 0.18, 'sawtooth', 0.035); }
        if (duration !== 0) setTimeout(() => this.close(card), duration);
        return card;
    }

    close(card) {
        if (!card) return;
        card.classList.remove('show');
        setTimeout(() => card.remove(), 200);
    }

    success(message, duration) { return this.show(message, 'success', duration); }
    error(message, duration = 5200) { return this.show(message, 'error', duration); }
    warning(message, duration = 4600) { return this.show(message, 'warning', duration); }
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
