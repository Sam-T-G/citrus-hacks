import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { OwlGlyph, Heartbeat, Card, OwlQuote, SectionHeader, Pill } from '../ui';
import { LiveTranscript } from '../LiveTranscript';
import { useSession } from '../../session/SessionContext';
import { usePatientData, usePronouns } from '../PatientContext';
import { cap } from '../pronouns';
import { logService } from '../../services/LogService';
const MOOD_COLORS = [
    'var(--rose-deep)', 'var(--rose)', 'var(--clay)', 'var(--sage)', 'var(--sage-deep)',
];
function currentRoutineActivity(routine) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    let last = routine[0];
    for (const r of routine) {
        const parts = r.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!parts)
            continue;
        let h = parseInt(parts[1]);
        const m = parseInt(parts[2]);
        const pm = parts[3].toUpperCase() === 'PM';
        if (pm && h !== 12)
            h += 12;
        if (!pm && h === 12)
            h = 0;
        if (h * 60 + m <= nowMins)
            last = r;
    }
    return last?.what ?? '';
}
function moodSummary(moods) {
    if (!moods.length)
        return '';
    const today = moods[moods.length - 1];
    const worst = [...moods].sort((a, b) => a.mood - b.mood)[0];
    const todayNote = today.note;
    const worstNote = worst.note && worst.d !== today.d ? `${worst.d}: ${worst.note.toLowerCase()}.` : null;
    if (worstNote && todayNote)
        return `${worst.d} was harder — ${worstNote} Today: ${todayNote.toLowerCase()}.`;
    if (todayNote)
        return `${today.d}: ${todayNote}.`;
    if (worstNote)
        return `${worst.d} was harder — ${worstNote}`;
    return '';
}
function logEntryLine(e) {
    const time = new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    switch (e.type) {
        case 'conversation_turn': {
            const d = e.data;
            if (d.role !== 'assistant')
                return null; // only show Mira's words in journal
            const snippet = d.text.length > 120 ? d.text.slice(0, 117) + '…' : d.text;
            return { time, kind: 'quote', text: snippet };
        }
        case 'mood_observation': {
            const d = e.data;
            return { time, kind: 'mood', text: `Mood: ${d.mood} (${d.intensity})${d.notes ? ` — ${d.notes}` : ''}` };
        }
        case 'behavior_event': {
            const d = e.data;
            return { time, kind: 'behavior', text: d.event_type.replace(/_/g, ' ') + (d.notes ? ` — ${d.notes}` : '') };
        }
        case 'caregiver_alert': {
            const d = e.data;
            return { time, kind: 'alert', text: `Alert (${d.severity}): ${d.reason}` };
        }
        case 'session_start': return { time, kind: 'session', text: 'Session started' };
        case 'session_end': return { time, kind: 'session', text: 'Session ended' };
        default: return null;
    }
}
export function HomeScreen({ onAlert }) {
    const { engineState, transcript, liveUser, sessionActive, startSession, stopSession, connectSerial, connectBridge, serialStatus } = useSession();
    const { store, currentCaregiver } = usePatientData();
    const pr = usePronouns();
    const [logEvents, setLogEvents] = useState([]);
    useEffect(() => logService.subscribe(setLogEvents), []);
    const stateLabel = { idle: 'Offline', connecting: 'Connecting…', listening: 'Listening', speaking: 'Speaking' }[engineState] ?? engineState;
    const stateColor = { idle: 'var(--ink-4)', connecting: 'oklch(0.6 0.12 250)', listening: 'var(--sage-deep)', speaking: 'var(--clay-deep)' }[engineState] ?? 'var(--ink-4)';
    const preferred = store?.patient.preferred ?? '';
    const room = store?.patient.home.split('·').pop()?.trim() ?? '';
    const firstName = currentCaregiver?.name.split(' ')[0] ?? store?.caregivers[0]?.name.split(' ')[0] ?? '';
    const hour = new Date().getHours();
    const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const activity = store ? currentRoutineActivity(store.patient.routine) : '';
    const moodNote = store ? moodSummary(store.moods) : '';
    const lastMiraQuote = logEvents
        .filter(e => e.type === 'conversation_turn' && e.data.role === 'assistant')
        .slice(-1)[0];
    const lastQuoteText = lastMiraQuote ? lastMiraQuote.data.text : '';
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }, children: [_jsxs("div", { style: { position: 'relative', marginTop: 4, flexShrink: 0 }, children: [sessionActive && (_jsx("div", { className: "c-pulse-ring", style: {
                                    position: 'absolute', inset: -8, borderRadius: '50%',
                                    border: '1px solid var(--sage)', opacity: 0.35,
                                } })), _jsx("div", { style: { width: 68, height: 68, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(OwlGlyph, { size: 44, color: "var(--paper)", breathing: sessionActive }) })] }), _jsxs("div", { style: { flex: 1, paddingTop: 6 }, children: [_jsxs("div", { className: "c-eyebrow", style: { marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("span", { style: { width: 6, height: 6, borderRadius: '50%', background: stateColor } }), _jsxs("span", { style: { color: stateColor }, children: [stateLabel, room ? ` · ${room}` : ''] })] }), _jsxs("div", { style: { fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.05, color: 'var(--ink)', marginBottom: 6 }, children: ["Good ", tod, firstName ? `, ${firstName}` : '', "."] }), _jsx("div", { style: { fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }, children: sessionActive
                                    ? `Mira is with ${preferred} now.`
                                    : `Start a session to connect Mira to ${preferred}.` })] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }, children: [!sessionActive
                        ? _jsx(Pill, { tone: "ink", onClick: startSession, children: "Start session" })
                        : _jsx(Pill, { tone: "rose", onClick: stopSession, children: "End session" }), serialStatus === 'disconnected' && (_jsxs(_Fragment, { children: [_jsx(Pill, { tone: "default", onClick: connectSerial, children: "Connect Serial" }), _jsx(Pill, { tone: "default", onClick: connectBridge, children: "Connect Bridge" })] })), sessionActive && _jsx(Pill, { tone: "ghost", onClick: onAlert, children: "Simulate alert" })] }), sessionActive && (_jsx("div", { style: { marginBottom: 28 }, children: _jsx("div", { style: { height: 340, display: 'flex', flexDirection: 'column' }, children: _jsx(LiveTranscript, { entries: transcript, liveUser: liveUser, active: sessionActive }) }) })), !sessionActive && (_jsxs(Card, { pad: 0, style: { overflow: 'hidden', marginBottom: 24 }, children: [_jsx("div", { style: { height: 120, background: 'repeating-linear-gradient(135deg, #EADFCF 0 14px, #D7C6AE 14px 28px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px 14px 0 0' }, children: _jsx("span", { style: { fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', background: 'rgba(250,247,242,0.75)', color: 'rgba(26,25,21,0.45)', padding: '3px 8px', borderRadius: 4 }, children: "live view \u00B7 windowsill" }) }), _jsxs("div", { style: { padding: 18 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, children: [_jsxs("div", { className: "c-eyebrow", style: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--sage-deep)', marginBottom: 0 }, children: [_jsx(Heartbeat, { size: 6 }), " Right now"] }), _jsx("span", { style: { fontSize: 12, color: 'var(--ink-3)' }, children: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })] }), _jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1.2, color: 'var(--ink)', marginBottom: 8 }, children: activity || 'Quiet moment.' }), _jsx("div", { style: { fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }, children: "Heart rate calm \u00B7 Posture: relaxed \u00B7 Ambient 68\u00B0F" })] })] })), _jsx(SectionHeader, { kicker: "Owl's journal", action: _jsxs(Pill, { tone: "ghost", children: [logEvents.length, " events"] }), children: sessionActive ? 'Live session log' : 'Today\'s session log' }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 0 }, children: [logEvents.length === 0 && (_jsx("div", { style: { fontSize: 13, color: 'var(--ink-3)', padding: '16px 0', lineHeight: 1.5 }, children: "No events yet. Start a session to begin logging." })), [...logEvents].reverse().map((e, i) => {
                        const line = logEntryLine(e);
                        if (!line)
                            return null;
                        const isAlert = line.kind === 'alert';
                        const isQuote = line.kind === 'quote';
                        const items = logEvents.filter(x => logEntryLine(x) !== null);
                        return (_jsxs("div", { style: {
                                display: 'grid', gridTemplateColumns: '52px 1fr', gap: 14, padding: '13px 0',
                                borderBottom: i < items.length - 1 ? '0.5px solid var(--hair-2)' : 'none',
                            }, children: [_jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.02em', paddingTop: 2 }, children: line.time }), _jsx("div", { style: { fontSize: 13.5, color: isAlert ? 'var(--rose-deep)' : 'var(--ink-2)', lineHeight: 1.5 }, children: isQuote
                                        ? _jsxs("span", { style: { fontStyle: 'italic', color: 'var(--ink)' }, children: ["\"", line.text, "\""] })
                                        : _jsx("span", { children: line.text }) })] }, e.id));
                    })] }), _jsxs(SectionHeader, { kicker: "This week", children: [cap(pr.possAdj), " mood"] }), _jsxs(Card, { pad: 18, children: [_jsx("div", { className: "c-mood-chart", children: (store?.moods ?? []).map((m, i) => {
                            const moods = store?.moods ?? [];
                            const h = (m.mood / 5) * 54 + 6;
                            return (_jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }, children: [_jsx("div", { className: "c-mood-bar", style: {
                                            height: h,
                                            background: MOOD_COLORS[Math.min(4, Math.max(0, m.mood - 1))],
                                            opacity: i === moods.length - 1 ? 1 : 0.55,
                                        } }), _jsx("span", { style: { fontFamily: 'var(--cmono)', fontSize: 10, color: 'var(--ink-3)' }, children: m.d })] }, i));
                        }) }), moodNote && (_jsx("div", { style: { fontSize: 13, color: 'var(--ink-2)', marginTop: 14, lineHeight: 1.55 }, children: moodNote }))] }), lastQuoteText && (_jsx("div", { style: { margin: '28px 0 8px' }, children: _jsx(OwlQuote, { children: lastQuoteText.length > 160 ? lastQuoteText.slice(0, 157) + '…' : lastQuoteText }) }))] }));
}
