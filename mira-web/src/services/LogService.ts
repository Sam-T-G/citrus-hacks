/**
 * LogService — ships session events to the Vite log API middleware,
 * which appends them to logs/session-{date}.ndjson on disk.
 *
 * Also maintains an in-memory ring buffer (latest 200 events) so the
 * SessionLog panel can render without a network round-trip.
 */
import type {
  SessionEvent, SessionEventType,
  MoodObservationData, BehaviorEventData,
  CaregiverAlertData, MedicationEventData,
  ConversationTurnData, VisualObservationData,
} from '../types';

const RING_SIZE = 200;

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

class LogService {
  private sessionId = makeId();
  private ring: SessionEvent[] = [];
  private listeners: Array<(events: SessionEvent[]) => void> = [];

  /** Begin a new session ID (call at session start). */
  startSession(): void {
    this.sessionId = makeId();
    this._emit({ type: 'session_start', data: {} });
  }

  endSession(): void {
    this._emit({ type: 'session_end', data: {} });
  }

  // ── Typed helpers ─────────────────────────────────────────

  mood(data: MoodObservationData): void {
    this._emit({ type: 'mood_observation', data });
  }

  behavior(data: BehaviorEventData): void {
    this._emit({ type: 'behavior_event', data });
  }

  alert(data: CaregiverAlertData): void {
    this._emit({ type: 'caregiver_alert', data });
    // High/medium alerts also go to the dedicated alert log for caregiver polling
    if (data.severity === 'high' || data.severity === 'medium') {
      fetch('/api/alert', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ts: Date.now(), sessionId: this.sessionId, ...data }),
      }).catch(() => { /* non-fatal */ });
    }
  }

  medication(data: MedicationEventData): void {
    this._emit({ type: 'medication_event', data });
  }

  turn(data: ConversationTurnData): void {
    this._emit({ type: 'conversation_turn', data });
  }

  visual(data: VisualObservationData): void {
    this._emit({ type: 'visual_observation', data });
  }

  // ── Ring buffer subscribe ─────────────────────────────────

  subscribe(cb: (events: SessionEvent[]) => void): () => void {
    this.listeners.push(cb);
    cb([...this.ring]);
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }

  getAll(): SessionEvent[] { return [...this.ring]; }

  // ── Internal ──────────────────────────────────────────────

  private _emit(partial: { type: SessionEventType; data: SessionEvent['data'] }): void {
    const event: SessionEvent = {
      id:        makeId(),
      ts:        Date.now(),
      sessionId: this.sessionId,
      ...partial,
    };

    // Append to ring buffer
    this.ring.push(event);
    if (this.ring.length > RING_SIZE) this.ring.shift();
    this.listeners.forEach(cb => cb([...this.ring]));

    // Fire-and-forget POST to Vite middleware → disk
    fetch('/api/log', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(event),
    }).catch(() => { /* disk write failure is non-fatal */ });
  }
}

export const logService = new LogService();
