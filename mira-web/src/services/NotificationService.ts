/**
 * NotificationService — browser push notifications for caregiver alerts.
 *
 * Uses the Web Notifications API. Deduplicates by tag so repeated alerts
 * for the same concern don't spam. Silently no-ops when permission is denied.
 */
import type { AlertSeverity } from '../types';

const ICONS: Record<AlertSeverity, string> = {
  high:   '🚨',
  medium: '⚠️',
  low:    'ℹ️',
};

class NotificationService {
  private permitted = false;

  async requestPermission(): Promise<void> {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') { this.permitted = true; return; }
    if (Notification.permission === 'denied')  return;
    const result = await Notification.requestPermission();
    this.permitted = result === 'granted';
  }

  notify(severity: AlertSeverity, reason: string, tag?: string): void {
    if (!this.permitted || !('Notification' in window)) return;
    const icon = ICONS[severity];
    const title =
      severity === 'high'   ? `${icon} Immediate attention needed` :
      severity === 'medium' ? `${icon} Mira alert` :
                              `${icon} Mira note`;
    new Notification(title, {
      body:    reason,
      tag:     tag ?? `mira-${severity}`,   // deduplicates same-tag notifications
      silent:  severity === 'low',
      requireInteraction: severity === 'high',
    });
  }

  // Fires only for fall / frantic / unresponsive — plays system alert sound
  critical(reason: string): void {
    this.notify('high', reason, 'mira-critical');
  }
}

export const notificationService = new NotificationService();
