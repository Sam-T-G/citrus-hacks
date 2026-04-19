/**
 * NotificationService — browser push notifications + in-app alert queue.
 *
 * Browser push: deduplicates by tag, fires OS notification.
 * In-app queue: ring buffer of InAppNotif, subscribers get live updates.
 *   Caregivers call acknowledge(id) to mark resolved.
 */
import type { AlertSeverity } from '../types';

const ICONS: Record<AlertSeverity, string> = {
  high:   '🚨',
  medium: '⚠️',
  low:    'ℹ️',
};

export interface InAppNotif {
  id:           string;
  severity:     AlertSeverity;
  reason:       string;
  ts:           number;
  acknowledged: boolean;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

class NotificationService {
  private permitted = false;
  private queue:     InAppNotif[] = [];
  private listeners: Array<(notifs: InAppNotif[]) => void> = [];

  async requestPermission(): Promise<void> {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') { this.permitted = true; return; }
    if (Notification.permission === 'denied')  return;
    const result = await Notification.requestPermission();
    this.permitted = result === 'granted';
  }

  // ── Browser push ──────────────────────────────────────────

  notify(severity: AlertSeverity, reason: string, tag?: string): void {
    // Always enqueue in-app first
    this._enqueue(severity, reason);

    if (!this.permitted || !('Notification' in window)) return;
    const icon = ICONS[severity];
    const title =
      severity === 'high'   ? `${icon} Immediate attention needed` :
      severity === 'medium' ? `${icon} Mira alert` :
                              `${icon} Mira note`;
    new Notification(title, {
      body:    reason,
      tag:     tag ?? `mira-${severity}`,
      silent:  severity === 'low',
      requireInteraction: severity === 'high',
    });
  }

  critical(reason: string): void {
    this.notify('high', reason, 'mira-critical');
  }

  // ── In-app queue ──────────────────────────────────────────

  acknowledge(id: string): void {
    this.queue = this.queue.map(n => n.id === id ? { ...n, acknowledged: true } : n);
    this._broadcast();
  }

  acknowledgeAll(): void {
    this.queue = this.queue.map(n => ({ ...n, acknowledged: true }));
    this._broadcast();
  }

  subscribe(cb: (notifs: InAppNotif[]) => void): () => void {
    this.listeners.push(cb);
    cb([...this.queue]);
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }

  getAll(): InAppNotif[] { return [...this.queue]; }

  getPending(): InAppNotif[] { return this.queue.filter(n => !n.acknowledged); }

  // ── Internal ──────────────────────────────────────────────

  private _enqueue(severity: AlertSeverity, reason: string): void {
    const notif: InAppNotif = { id: makeId(), severity, reason, ts: Date.now(), acknowledged: false };
    this.queue.push(notif);
    if (this.queue.length > 100) this.queue.shift();
    this._broadcast();
  }

  private _broadcast(): void {
    const snapshot = [...this.queue];
    this.listeners.forEach(cb => cb(snapshot));
  }
}

export const notificationService = new NotificationService();
