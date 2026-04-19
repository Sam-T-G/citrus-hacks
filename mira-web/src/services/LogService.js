const RING_SIZE = 200;
function makeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
class LogService {
    sessionId = makeId();
    ring = [];
    listeners = [];
    /** Begin a new session ID (call at session start). */
    startSession() {
        this.sessionId = makeId();
        this._emit({ type: 'session_start', data: {} });
    }
    endSession() {
        this._emit({ type: 'session_end', data: {} });
    }
    // ── Typed helpers ─────────────────────────────────────────
    mood(data) {
        this._emit({ type: 'mood_observation', data });
    }
    behavior(data) {
        this._emit({ type: 'behavior_event', data });
    }
    alert(data) {
        this._emit({ type: 'caregiver_alert', data });
        // High/medium alerts also go to the dedicated alert log for caregiver polling
        if (data.severity === 'high' || data.severity === 'medium') {
            fetch('/api/alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ts: Date.now(), sessionId: this.sessionId, ...data }),
            }).catch(() => { });
        }
    }
    medication(data) {
        this._emit({ type: 'medication_event', data });
    }
    turn(data) {
        this._emit({ type: 'conversation_turn', data });
    }
    visual(data) {
        this._emit({ type: 'visual_observation', data });
    }
    // ── Ring buffer subscribe ─────────────────────────────────
    subscribe(cb) {
        this.listeners.push(cb);
        cb([...this.ring]);
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }
    getAll() { return [...this.ring]; }
    // ── Internal ──────────────────────────────────────────────
    _emit(partial) {
        const event = {
            id: makeId(),
            ts: Date.now(),
            sessionId: this.sessionId,
            ...partial,
        };
        // Append to ring buffer
        this.ring.push(event);
        if (this.ring.length > RING_SIZE)
            this.ring.shift();
        this.listeners.forEach(cb => cb([...this.ring]));
        // Fire-and-forget POST to Vite middleware → disk
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
        }).catch(() => { });
    }
}
export const logService = new LogService();
