import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { logService } from '../services/LogService';
const EVENT_META = {
    mood_observation: { icon: '◉', label: 'Mood', color: 'var(--blue)' },
    behavior_event: { icon: '⚑', label: 'Behaviour', color: 'var(--amber)' },
    caregiver_alert: { icon: '⚠', label: 'Alert', color: 'var(--red)' },
    medication_event: { icon: '⬡', label: 'Medication', color: 'var(--violet)' },
    conversation_turn: { icon: '◎', label: 'Transcript', color: 'var(--ink-2)' },
    visual_observation: { icon: '◈', label: 'Visual', color: 'var(--sage-deep)' },
    session_start: { icon: '▶', label: 'Session', color: 'var(--green)' },
    session_end: { icon: '■', label: 'Session', color: 'var(--text-muted)' },
};
function eventSummary(e) {
    switch (e.type) {
        case 'mood_observation': {
            const d = e.data;
            return `${d.mood} · ${d.intensity}${d.notes ? ` — ${d.notes}` : ''}`;
        }
        case 'behavior_event': {
            const d = e.data;
            return `${d.event_type.replace(/_/g, ' ')} — ${d.notes}`;
        }
        case 'caregiver_alert': {
            const d = e.data;
            return `[${d.severity.toUpperCase()}] ${d.reason}`;
        }
        case 'medication_event': {
            const d = e.data;
            return `${d.action}${d.notes ? ` — ${d.notes}` : ''}`;
        }
        case 'conversation_turn': {
            const d = e.data;
            const who = d.role === 'assistant' ? 'Mira' : 'Patient';
            const snippet = d.text.length > 100 ? d.text.slice(0, 97) + '…' : d.text;
            return `${who}: "${snippet}"`;
        }
        case 'visual_observation': {
            const d = e.data;
            return `${d.emotion_hint} — ${d.description}`;
        }
        case 'session_start': return 'Session started';
        case 'session_end': return 'Session ended';
        default: return JSON.stringify(e.data).slice(0, 80);
    }
}
function formatTs(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
export function SessionLog() {
    const [events, setEvents] = useState([]);
    useEffect(() => logService.subscribe(setEvents), []);
    return (_jsxs("div", { className: "session-log", children: [_jsxs("div", { className: "session-log__header", children: [_jsx("span", { className: "session-log__title", children: "Care Log" }), _jsx("span", { className: "session-log__count", children: events.length })] }), _jsxs("div", { className: "session-log__body", children: [events.length === 0 && (_jsx("div", { className: "session-log__empty", children: "No observations yet" })), [...events].reverse().map(e => {
                        const meta = EVENT_META[e.type] ?? { icon: '·', label: e.type, color: 'var(--text-muted)' };
                        return (_jsxs("div", { className: `log-entry log-entry--${e.type}`, children: [_jsx("span", { className: "log-entry__icon", style: { color: meta.color }, children: meta.icon }), _jsxs("div", { className: "log-entry__body", children: [_jsx("span", { className: "log-entry__label", style: { color: meta.color }, children: meta.label }), _jsx("span", { className: "log-entry__summary", children: eventSummary(e) })] }), _jsx("span", { className: "log-entry__time", children: formatTs(e.ts) })] }, e.id));
                    })] })] }));
}
