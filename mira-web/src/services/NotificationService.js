const ICONS = {
    high: '🚨',
    medium: '⚠️',
    low: 'ℹ️',
};
function makeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
class NotificationService {
    permitted = false;
    queue = [];
    listeners = [];
    async requestPermission() {
        if (!('Notification' in window))
            return;
        if (Notification.permission === 'granted') {
            this.permitted = true;
            return;
        }
        if (Notification.permission === 'denied')
            return;
        const result = await Notification.requestPermission();
        this.permitted = result === 'granted';
    }
    // ── Browser push ──────────────────────────────────────────
    notify(severity, reason, tag) {
        // Always enqueue in-app first
        this._enqueue(severity, reason);
        if (!this.permitted || !('Notification' in window))
            return;
        const icon = ICONS[severity];
        const title = severity === 'high' ? `${icon} Immediate attention needed` :
            severity === 'medium' ? `${icon} Mira alert` :
                `${icon} Mira note`;
        new Notification(title, {
            body: reason,
            tag: tag ?? `mira-${severity}`,
            silent: severity === 'low',
            requireInteraction: severity === 'high',
        });
    }
    critical(reason) {
        this.notify('high', reason, 'mira-critical');
    }
    // ── In-app queue ──────────────────────────────────────────
    acknowledge(id) {
        this.queue = this.queue.map(n => n.id === id ? { ...n, acknowledged: true } : n);
        this._broadcast();
    }
    acknowledgeAll() {
        this.queue = this.queue.map(n => ({ ...n, acknowledged: true }));
        this._broadcast();
    }
    subscribe(cb) {
        this.listeners.push(cb);
        cb([...this.queue]);
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }
    getAll() { return [...this.queue]; }
    getPending() { return this.queue.filter(n => !n.acknowledged); }
    // ── Internal ──────────────────────────────────────────────
    _enqueue(severity, reason) {
        const notif = { id: makeId(), severity, reason, ts: Date.now(), acknowledged: false };
        this.queue.push(notif);
        if (this.queue.length > 100)
            this.queue.shift();
        this._broadcast();
    }
    _broadcast() {
        const snapshot = [...this.queue];
        this.listeners.forEach(cb => cb(snapshot));
    }
}
export const notificationService = new NotificationService();
