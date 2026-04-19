import { useEffect, useState } from 'react';
import { logService } from '../services/LogService';
import type {
  SessionEvent, MoodObservationData,
  BehaviorEventData, CaregiverAlertData, MedicationEventData,
} from '../types';

const EVENT_META: Record<string, { icon: string; label: string; color: string }> = {
  mood_observation: { icon: '◉', label: 'Mood',      color: 'var(--blue)'  },
  behavior_event:   { icon: '⚑', label: 'Behaviour', color: 'var(--amber)' },
  caregiver_alert:  { icon: '⚠', label: 'Alert',     color: 'var(--red)'   },
  medication_event: { icon: '⬡', label: 'Medication', color: 'var(--violet)' },
  session_start:    { icon: '▶', label: 'Session',   color: 'var(--green)' },
  session_end:      { icon: '■', label: 'Session',   color: 'var(--text-muted)' },
};

function eventSummary(e: SessionEvent): string {
  switch (e.type) {
    case 'mood_observation': {
      const d = e.data as MoodObservationData;
      return `${d.mood} · ${d.intensity}${d.notes ? ` — ${d.notes}` : ''}`;
    }
    case 'behavior_event': {
      const d = e.data as BehaviorEventData;
      return `${d.event_type.replace(/_/g, ' ')} — ${d.notes}`;
    }
    case 'caregiver_alert': {
      const d = e.data as CaregiverAlertData;
      return `[${d.severity.toUpperCase()}] ${d.reason}`;
    }
    case 'medication_event': {
      const d = e.data as MedicationEventData;
      return `${d.action}${d.notes ? ` — ${d.notes}` : ''}`;
    }
    case 'session_start': return 'Session started';
    case 'session_end':   return 'Session ended';
    default:              return JSON.stringify(e.data).slice(0, 80);
  }
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function SessionLog() {
  const [events, setEvents] = useState<SessionEvent[]>([]);

  useEffect(() => logService.subscribe(setEvents), []);

  return (
    <div className="session-log">
      <div className="session-log__header">
        <span className="session-log__title">Care Log</span>
        <span className="session-log__count">{events.length}</span>
      </div>

      <div className="session-log__body">
        {events.length === 0 && (
          <div className="session-log__empty">No observations yet</div>
        )}
        {[...events].reverse().map(e => {
          const meta = EVENT_META[e.type] ?? { icon: '·', label: e.type, color: 'var(--text-muted)' };
          return (
            <div key={e.id} className={`log-entry log-entry--${e.type}`}>
              <span className="log-entry__icon" style={{ color: meta.color }}>{meta.icon}</span>
              <div className="log-entry__body">
                <span className="log-entry__label" style={{ color: meta.color }}>{meta.label}</span>
                <span className="log-entry__summary">{eventSummary(e)}</span>
              </div>
              <span className="log-entry__time">{formatTs(e.ts)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
