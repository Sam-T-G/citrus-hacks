import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { OwlGlyph, OwlQuote, Card, SectionHeader, Pill, Placeholder, Chips } from './ui';
import { usePatientData, usePronouns } from './PatientContext';
import { cap } from './pronouns';
import { useSession } from '../session/SessionContext';
import { ProfileEditModal } from './ProfileEditModal';
import { CameraPreview } from '../ui/CameraPreview';
import { LiveTranscript } from './LiveTranscript';
import { SessionLog } from '../ui/SessionLog';
import { PhotoOverlay } from '../ui/PhotoOverlay';
import { logService } from '../services/LogService';
import { notificationService } from '../services/NotificationService';
const MOOD_COLORS = [
    'var(--rose-deep)', 'var(--rose)', 'var(--clay)', 'var(--sage)', 'var(--sage-deep)',
];
/* ── Sidebar ─────────────────────────────────────────────── */
function Sidebar({ nav, onNav, onAlert }) {
    const { store } = usePatientData();
    const pr = usePronouns();
    const { alerts } = useSession();
    const [notifs, setNotifs] = useState([]);
    useEffect(() => notificationService.subscribe(setNotifs), []);
    const highAlerts = alerts.filter(a => a.severity === 'high').length;
    const mediumAlerts = alerts.filter(a => a.severity === 'medium').length;
    const alertCount = highAlerts + mediumAlerts;
    const pendingNotifs = notifs.filter(n => !n.acknowledged).length;
    const items = [
        { id: 'today', label: 'Today', hint: "What's happening now" },
        { id: 'profile', label: store?.patient.preferred ?? 'Patient', hint: `${cap(pr.possAdj)} story & routine` },
        { id: 'memories', label: 'Memories', hint: 'Photos, video, audio' },
        { id: 'voices', label: 'Voices', hint: 'Family recordings' },
        { id: 'team', label: 'Care team', hint: 'People & settings' },
    ];
    const patientName = store ? `${store.patient.preferred} ${store.patient.last}` : '…';
    const room = store?.patient.home.split('·')[1]?.trim() ?? '';
    return (_jsxs("div", { className: "d-sidebar", children: [_jsxs("div", { className: "d-sidebar-patient", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }, children: [_jsx(Placeholder, { w: 40, h: 40, tint: "clay", label: "", radius: 20 }), _jsxs("div", { children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 2 }, children: "With" }), _jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1, color: 'var(--ink)' }, children: patientName })] })] }), _jsxs("div", { className: "d-online-badge", children: [_jsx("span", { className: "d-heartbeat-dot" }), _jsxs("span", { style: { fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500 }, children: ["Owl online", room ? ` · ${room}` : ''] })] })] }), _jsxs("div", { style: { padding: '14px 10px', flex: 1 }, children: [_jsx("div", { className: "c-eyebrow", style: { padding: '0 10px 8px' }, children: "Navigate" }), items.map(it => {
                        const active = nav === it.id;
                        return (_jsxs("button", { onClick: () => onNav(it.id), className: `d-nav-item${active ? ' active' : ''}`, children: [_jsxs("div", { style: { flex: 1, minWidth: 0, textAlign: 'left' }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em' }, children: it.label }), _jsx("div", { style: { fontSize: 10.5, marginTop: 1, letterSpacing: '-0.005em', opacity: active ? 0.55 : 0.7 }, children: it.hint })] }), it.id === 'today' && (_jsx("span", { className: `d-live-badge${active ? ' active' : ''}`, children: "LIVE" })), it.id === 'team' && pendingNotifs > 0 && (_jsx("span", { style: {
                                        minWidth: 18, height: 18, borderRadius: 9, background: 'var(--rose-deep)',
                                        color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', padding: '0 5px', fontFamily: 'var(--csans)',
                                    }, children: pendingNotifs }))] }, it.id));
                    })] }), _jsxs("div", { className: "d-sidebar-footer", children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 10 }, children: "On now" }), (store?.caregivers ?? []).filter(c => c.online).map(c => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }, children: [_jsxs("div", { style: { position: 'relative', width: 22, height: 22, flexShrink: 0 }, children: [_jsx(Placeholder, { w: 22, h: 22, tint: c.tint, label: "", radius: 11 }), _jsx("span", { className: "d-online-dot" })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 11.5, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.2 }, children: c.name }), _jsx("div", { style: { fontSize: 10, color: 'var(--ink-3)' }, children: c.role })] })] }, c.id))), _jsxs("button", { onClick: onAlert, className: `d-alert-preview-btn${highAlerts > 0 ? ' d-alert-preview-btn--active' : ''}`, children: [_jsx("span", { style: {
                                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                                    background: highAlerts > 0 ? 'var(--rose-deep)' : mediumAlerts > 0 ? 'var(--clay-deep)' : 'var(--ink-4)',
                                } }), alertCount > 0 ? `${alertCount} alert${alertCount > 1 ? 's' : ''} active` : 'Alerts', alertCount > 0 && (_jsx("span", { style: {
                                    marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9,
                                    background: highAlerts > 0 ? 'var(--rose-deep)' : 'var(--clay-deep)',
                                    color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                                }, children: alertCount }))] })] })] }));
}
/* ── State pill colours ──────────────────────────────────── */
const STATE_LABEL = {
    idle: 'Mira offline', connecting: 'Connecting…',
    listening: 'Listening', speaking: 'Speaking',
};
const STATE_COLOR = {
    idle: 'var(--ink-4)', connecting: 'oklch(0.6 0.12 250)',
    listening: 'var(--sage-deep)', speaking: 'var(--clay-deep)',
};
/* ── Today (3-pane) ──────────────────────────────────────── */
function DesktopToday({ onAlert }) {
    const { engineState, transcript, liveUser, lastCmd, serialStatus, sessionActive, engineRef, startSession, stopSession, connectSerial, connectBridge, errorMsg, clearError, showPhoto, } = useSession();
    const { store, currentCaregiver } = usePatientData();
    const pr = usePronouns();
    // engineRef is a ref — changes to it don't trigger re-renders.
    // Sync visionPipeline into state so CameraPreview gets the live instance after session starts.
    const [visionPipeline, setVisionPipeline] = useState(null);
    useEffect(() => {
        setVisionPipeline(sessionActive ? (engineRef.current?.visionPipeline ?? null) : null);
    }, [sessionActive, engineRef]);
    const [logEvents, setLogEvents] = useState([]);
    useEffect(() => logService.subscribe(setLogEvents), []);
    const lastMiraQuote = logEvents
        .filter(e => e.type === 'conversation_turn' && e.data.role === 'assistant')
        .slice(-1)[0];
    const lastQuoteText = lastMiraQuote ? lastMiraQuote.data.text : '';
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    const hour = now.getHours();
    const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const firstName = currentCaregiver?.name.split(' ')[0] ?? store?.caregivers[0]?.name.split(' ')[0] ?? 'Caregiver';
    const patientPreferred = store?.patient.preferred ?? 'Nana';
    const stateColor = STATE_COLOR[engineState] ?? 'var(--ink-4)';
    return (_jsxs("div", { style: { display: 'flex', flex: 1, minHeight: 0 }, children: [_jsxs("div", { className: "d-panel", style: { width: 360, flexShrink: 0, borderRight: '0.5px solid var(--hair)', overflowY: 'auto' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, children: [_jsxs("div", { className: "c-eyebrow", style: { marginBottom: 0 }, children: ["Right now \u00B7 ", timeStr] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("span", { style: { width: 6, height: 6, borderRadius: '50%', background: stateColor } }), _jsx("span", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: stateColor }, children: STATE_LABEL[engineState] })] })] }), _jsx("div", { style: { borderRadius: 14, overflow: 'hidden', marginBottom: 18, background: 'var(--paper-3)' }, children: _jsx(CameraPreview, { camera: engineRef.current?.cameraCapture ?? null, vision: visionPipeline, lastCmd: lastCmd, active: sessionActive, engineState: engineState }) }), _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }, children: [_jsx("div", { style: { width: 44, height: 44, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, children: _jsx(OwlGlyph, { size: 30, color: "var(--paper)", breathing: sessionActive }) }), _jsxs("div", { children: [_jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.2, color: 'var(--ink)' }, children: sessionActive ? `Mira is with ${patientPreferred}.` : 'Mira is offline.' }), _jsx("div", { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 }, children: sessionActive
                                            ? `${store?.patient.home.split('·').pop()?.trim() ?? 'Room'} · Listening actively.`
                                            : 'Start a session to connect the owl.' })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }, children: [!sessionActive
                                ? _jsx(Pill, { tone: "ink", onClick: startSession, style: { justifyContent: 'center', padding: '11px 14px' }, children: "Start session" })
                                : _jsx(Pill, { tone: "rose", onClick: stopSession, style: { justifyContent: 'center', padding: '11px 14px' }, children: "End session" }), serialStatus === 'disconnected' && (_jsxs(_Fragment, { children: [_jsx(Pill, { tone: "default", onClick: connectSerial, style: { justifyContent: 'center' }, children: "Connect Serial" }), _jsx(Pill, { tone: "default", onClick: connectBridge, style: { justifyContent: 'center' }, children: "Connect Bridge" })] }))] }), errorMsg && (_jsxs("div", { style: {
                            padding: '10px 12px', borderRadius: 10, background: 'oklch(0.94 0.04 25)',
                            fontSize: 12, color: 'var(--rose-deep)', lineHeight: 1.5, marginBottom: 16,
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
                        }, children: [_jsx("span", { children: errorMsg }), _jsx("button", { onClick: clearError, style: { color: 'var(--rose-deep)', fontSize: 14, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }, children: "\u00D7" })] })), _jsx("div", { className: "c-eyebrow", style: { marginBottom: 10 }, children: "Sensors" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }, children: [
                            { l: 'Heart', v: '72', u: 'bpm', tone: 'sage' },
                            { l: 'Voice', v: 'calm', tone: 'sage' },
                            { l: 'Motion', v: 'still', tone: 'sage' },
                            { l: 'Ambient', v: '68°', tone: 'default' },
                        ].map((s, i) => (_jsxs("div", { style: {
                                padding: '10px 12px', borderRadius: 10,
                                background: s.tone === 'sage' ? 'oklch(0.96 0.02 150)' : 'var(--paper-2)',
                            }, children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 4 }, children: s.l }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 3 }, children: [_jsx("span", { style: { fontFamily: 'var(--serif)', fontSize: 18, color: s.tone === 'sage' ? 'var(--sage-deep)' : 'var(--ink)', lineHeight: 1 }, children: s.v }), s.u && _jsx("span", { style: { fontSize: 10, color: 'var(--ink-3)' }, children: s.u })] })] }, i))) }), _jsxs("button", { onClick: onAlert, style: {
                            marginTop: 16, width: '100%', padding: '10px 12px', borderRadius: 10,
                            background: 'oklch(0.96 0.03 25)', color: 'var(--rose-deep)',
                            border: '0.5px solid oklch(0.85 0.08 25)', fontSize: 12, fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--csans)',
                        }, children: [_jsx("span", { style: { width: 6, height: 6, borderRadius: '50%', background: 'var(--rose-deep)' } }), "Preview a distress alert"] })] }), _jsxs("div", { className: "d-panel", style: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }, children: [_jsxs("div", { style: { marginBottom: 20, flexShrink: 0 }, children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 6 }, children: dateStr }), _jsxs("div", { style: { fontFamily: 'var(--serif)', fontSize: 32, lineHeight: 1, color: 'var(--ink)', marginBottom: 6 }, children: ["Good ", tod, ", ", firstName, "."] }), _jsx("div", { style: { fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }, children: sessionActive
                                    ? `Mira is with ${patientPreferred} now — conversation is live.`
                                    : 'Here is what Mira said today.' })] }), sessionActive ? (_jsx(LiveTranscript, { entries: transcript, liveUser: liveUser, active: sessionActive })) : (
                    /* Idle: show real session log timeline */
                    _jsxs("div", { style: { flex: 1, overflowY: 'auto' }, children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 16 }, children: "Today's session log" }), logEvents.length === 0 ? (_jsx("div", { style: { fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }, children: "No events logged yet. Start a session to begin." })) : (_jsxs("div", { style: { position: 'relative', paddingLeft: 12 }, children: [_jsx("div", { style: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 1, background: 'var(--hair)' } }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 18 }, children: [...logEvents].reverse().map((e) => {
                                            const time = new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            let label = '';
                                            let body = null;
                                            let dotColor = 'var(--ink-3)';
                                            if (e.type === 'conversation_turn') {
                                                const d = e.data;
                                                label = d.role === 'assistant' ? 'Mira' : 'Patient';
                                                const snippet = d.text.length > 140 ? d.text.slice(0, 137) + '…' : d.text;
                                                body = _jsxs("div", { style: { fontStyle: 'italic', color: 'var(--ink)', fontSize: 14, lineHeight: 1.5 }, children: ["\"", snippet, "\""] });
                                            }
                                            else if (e.type === 'mood_observation') {
                                                label = 'Mood observed';
                                                dotColor = 'var(--sage-deep)';
                                                const d = e.data;
                                                body = _jsxs("div", { style: { fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }, children: [d.mood, " \u00B7 ", d.intensity, d.notes ? ` — ${d.notes}` : ''] });
                                            }
                                            else if (e.type === 'behavior_event') {
                                                label = 'Behaviour';
                                                dotColor = 'var(--clay-deep)';
                                                const d = e.data;
                                                body = _jsxs("div", { style: { fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }, children: [d.event_type.replace(/_/g, ' '), d.notes ? ` — ${d.notes}` : ''] });
                                            }
                                            else if (e.type === 'caregiver_alert') {
                                                label = 'Alert';
                                                dotColor = 'var(--rose-deep)';
                                                const d = e.data;
                                                body = _jsxs("div", { style: { fontSize: 13, color: 'var(--rose-deep)', lineHeight: 1.5 }, children: [d.severity.toUpperCase(), " \u2014 ", d.reason] });
                                            }
                                            else if (e.type === 'visual_observation') {
                                                label = 'Visual check';
                                                dotColor = 'oklch(0.65 0.12 150)';
                                                const d = e.data;
                                                body = _jsxs("div", { style: { fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }, children: [d.emotion_hint, " \u2014 ", d.description] });
                                            }
                                            else if (e.type === 'session_start' || e.type === 'session_end') {
                                                label = e.type === 'session_start' ? 'Session started' : 'Session ended';
                                                body = null;
                                            }
                                            else {
                                                return null;
                                            }
                                            return (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '52px 1fr', gap: 16, alignItems: 'flex-start', position: 'relative' }, children: [_jsx("div", { style: {
                                                            position: 'absolute', left: -16, top: 5, width: 8, height: 8,
                                                            borderRadius: '50%', background: 'var(--paper)', border: `1.5px solid ${dotColor}`,
                                                        } }), _jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.02em', paddingTop: 3 }, children: time }), _jsxs("div", { children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 3, color: dotColor }, children: label }), body] })] }, e.id));
                                        }) })] })), lastQuoteText && (_jsx("div", { style: { marginTop: 36, paddingTop: 24, borderTop: '0.5px solid var(--hair)' }, children: _jsx(OwlQuote, { size: "lg", children: lastQuoteText.length > 200 ? lastQuoteText.slice(0, 197) + '…' : lastQuoteText }) }))] }))] }), _jsxs("div", { className: "d-panel", style: { width: 260, flexShrink: 0, borderLeft: '0.5px solid var(--hair)', background: 'var(--paper-2)', overflowY: 'auto' }, children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 14 }, children: "This week" }), _jsxs("div", { style: { fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', marginBottom: 16 }, children: [cap(pr.possAdj), " mood"] }), _jsxs(Card, { children: [_jsx("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }, children: (store?.moods ?? []).map((m, i) => {
                                    const moods = store?.moods ?? [];
                                    const h = (m.mood / 5) * 68 + 8;
                                    return (_jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }, children: [_jsx("div", { style: {
                                                    width: '100%', height: h, borderRadius: 4,
                                                    background: MOOD_COLORS[Math.min(4, Math.max(0, m.mood - 1))],
                                                    opacity: i === moods.length - 1 ? 1 : 0.5,
                                                } }), _jsx("span", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, color: 'var(--ink-3)' }, children: m.d })] }, i));
                                }) }), (() => {
                                const moods = store?.moods ?? [];
                                const today = moods[moods.length - 1];
                                const worst = [...moods].sort((a, b) => a.mood - b.mood)[0];
                                const parts = [];
                                if (worst && worst.note && worst.d !== today?.d)
                                    parts.push(`${worst.d} was harder — ${worst.note.toLowerCase()}.`);
                                if (today?.note)
                                    parts.push(`Today: ${today.note.toLowerCase()}.`);
                                return parts.length ? (_jsx("div", { style: { fontSize: 12.5, color: 'var(--ink-2)', marginTop: 12, lineHeight: 1.5 }, children: parts.join(' ') })) : null;
                            })()] }), _jsx("div", { className: "c-eyebrow", style: { marginTop: 28, marginBottom: 12 }, children: "Coming up" }), _jsx(Card, { pad: 0, style: { overflow: 'hidden' }, children: (store?.patient.routine ?? []).slice(2, 6).map((r, i) => (_jsxs("div", { style: {
                                padding: '12px 14px', display: 'grid', gridTemplateColumns: '66px 1fr', gap: 10,
                                borderTop: i > 0 ? '0.5px solid var(--hair-2)' : 'none',
                            }, children: [_jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 11, color: 'var(--ink-3)' }, children: r.time }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, color: 'var(--ink)', fontWeight: 500 }, children: r.what }), r.owl && _jsxs("div", { style: { fontFamily: 'var(--cmono)', fontSize: 11, color: 'var(--sage-deep)', marginTop: 3 }, children: ["\"", r.owl, "\""] })] })] }, i))) }), _jsx("div", { className: "c-eyebrow", style: { marginTop: 28, marginBottom: 12 }, children: "Quick send" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }, children: (store?.memories ?? []).filter(m => m.kind === 'photo').slice(0, 4).map(m => (_jsxs("button", { onClick: () => showPhoto(m.id), style: {
                                padding: 0, borderRadius: 8, overflow: 'hidden',
                                border: '0.5px solid var(--hair-2)', background: 'var(--paper)', textAlign: 'left', cursor: 'pointer',
                                transition: 'box-shadow 140ms',
                            }, children: [m.imageUrl
                                    ? _jsx("img", { src: m.imageUrl, alt: m.title, style: { width: '100%', height: 60, objectFit: 'cover', display: 'block' } })
                                    : _jsx(Placeholder, { h: 60, tint: m.tint, label: m.kind, radius: 0 }), _jsx("div", { style: { padding: '7px 9px' }, children: _jsx("div", { style: { fontSize: 11, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.2 }, children: m.title }) })] }, m.id))) }), _jsx("div", { className: "c-eyebrow", style: { marginTop: 28, marginBottom: 12 }, children: "Live care log" }), _jsx(SessionLog, {})] })] }));
}
/* ── Profile (2-col) ─────────────────────────────────────── */
function DesktopProfile() {
    const { store, saving, updateStore } = usePatientData();
    const pr = usePronouns();
    const [editing, setEditing] = useState(false);
    if (!store)
        return null;
    const p = store.patient;
    return (_jsxs("div", { className: "d-panel", style: { flex: 1, overflowY: 'auto', position: 'relative' }, children: [editing && (_jsx(ProfileEditModal, { store: store, saving: saving, onSave: updateStore, onClose: () => setEditing(false) })), _jsxs("div", { style: { marginBottom: 28 }, children: [_jsxs("div", { className: "c-eyebrow", style: { marginBottom: 6 }, children: [cap(pr.possAdj), " story"] }), _jsxs("div", { style: { fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1, color: 'var(--ink)', letterSpacing: '-0.01em' }, children: [p.preferred, "."] }), _jsxs("div", { style: { fontSize: 13.5, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.5 }, children: ["Who ", p.preferred, " is \u2014 before what's wrong. The owl uses everything here to keep ", pr.obj, " company."] }), _jsx("div", { style: { marginTop: 14 }, children: _jsx(Pill, { tone: "ghost", onClick: () => setEditing(true), children: "Edit profile" }) })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: 32, alignItems: 'flex-start' }, children: [_jsxs("div", { children: [_jsxs("div", { style: { position: 'relative' }, children: [_jsx(Placeholder, { h: 340, tint: "clay", label: "portrait \u00B7 2023", radius: 14 }), _jsxs("div", { style: {
                                            position: 'absolute', left: 14, bottom: 14, background: 'rgba(250,247,242,0.92)',
                                            padding: '8px 12px', borderRadius: 10, backdropFilter: 'blur(6px)', border: '0.5px solid var(--hair)',
                                        }, children: [_jsxs("div", { className: "c-eyebrow", style: { marginBottom: 2 }, children: ["Call ", pr.obj] }), _jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1, color: 'var(--ink)' }, children: p.preferred })] })] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }, children: [
                                    { k: 'Born', v: p.birth },
                                    { k: 'Stage', v: p.stage },
                                    { k: 'Home', v: p.home },
                                    { k: 'Diagnosed', v: p.diagnosed },
                                ].map((f, i) => (_jsxs("div", { style: { padding: '10px 12px', background: 'var(--paper-2)', borderRadius: 10 }, children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 4 }, children: f.k }), _jsx("div", { style: { fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }, children: f.v })] }, i))) })] }), _jsxs("div", { children: [_jsx(SectionHeader, { kicker: `What ${pr.subj} loves`, children: "A few things" }), _jsx(Card, { children: _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }, children: p.likes.map((l, i) => (_jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }, children: [_jsx("span", { style: { color: 'var(--clay-deep)', fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 0.5 }, children: "\u00B7" }), _jsx("span", { children: l })] }, i))) }) }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }, children: [_jsxs(Card, { pad: 16, children: [_jsxs("div", { style: { fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sage-deep)', marginBottom: 8 }, children: ["Calms ", pr.obj] }), p.calmers.map((l, i) => _jsxs("div", { style: { fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4, marginBottom: 4 }, children: ["\u00B7 ", l] }, i))] }), _jsxs(Card, { pad: 16, children: [_jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--rose-deep)', marginBottom: 8 }, children: "Gently avoid" }), p.triggers.map((l, i) => _jsxs("div", { style: { fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4, marginBottom: 4 }, children: ["\u00B7 ", l] }, i))] })] }), _jsx(SectionHeader, { kicker: "For the owl", children: `Topics ${pr.subj} loves` }), _jsx(Card, { pad: 0, children: store.topics.map((t, i) => (_jsxs("div", { style: {
                                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                                        borderTop: i > 0 ? '0.5px solid var(--hair-2)' : 'none',
                                    }, children: [_jsx("div", { style: { width: 8, height: 8, borderRadius: 2, background: t.warm ? 'var(--clay)' : 'var(--rose)', flexShrink: 0 } }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }, children: t.title }), _jsx("div", { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }, children: t.primer })] }), !t.warm && _jsx("span", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--rose-deep)' }, children: "handle gently" })] }, t.id))) })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 36 }, children: [_jsxs("div", { children: [_jsxs(SectionHeader, { kicker: "Daily shape", action: _jsx(Pill, { tone: "ghost", children: "Edit" }), children: [cap(pr.possAdj), " routine"] }), p.routine.map((r, i) => (_jsxs("div", { style: {
                                    display: 'grid', gridTemplateColumns: '80px 1fr', gap: 14, padding: '12px 0',
                                    borderBottom: i < p.routine.length - 1 ? '0.5px solid var(--hair-2)' : 'none',
                                }, children: [_jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.02em' }, children: r.time }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 14, color: 'var(--ink)', fontWeight: 500 }, children: r.what }), r.owl && _jsxs("div", { style: { fontFamily: 'var(--cmono)', fontSize: 11.5, color: 'var(--sage-deep)', marginTop: 3 }, children: ["\"", r.owl, "\""] })] })] }, i)))] }), _jsxs("div", { children: [_jsx(SectionHeader, { kicker: "Her people", action: _jsx(Pill, { tone: "ghost", children: "+ Add" }), children: "Family" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }, children: store.people.map(pr => (_jsxs(Card, { pad: 12, children: [_jsx(Placeholder, { h: 80, tint: pr.tint, label: pr.name.split(' ')[0].toLowerCase(), radius: 8 }), _jsx("div", { className: "c-eyebrow", style: { marginTop: 10, marginBottom: 2 }, children: pr.rel }), _jsx("div", { style: { fontSize: 13, fontWeight: 500, color: 'var(--ink)' }, children: pr.name }), _jsx("div", { style: { fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.4 }, children: pr.note })] }, pr.id))) })] })] })] }));
}
/* ── Memories (master-detail) ────────────────────────────── */
function DesktopMemories() {
    const { store } = usePatientData();
    const memories = store?.memories ?? [];
    const [selectedId, setSelected] = useState(null);
    const [filter, setFilter] = useState('all');
    const items = memories.filter(m => filter === 'all' || m.kind === filter);
    const activeId = selectedId ?? memories[0]?.id ?? null;
    const selected = memories.find(m => m.id === activeId) ?? memories[0] ?? null;
    return (_jsxs("div", { style: { display: 'flex', flex: 1, minHeight: 0 }, children: [_jsxs("div", { className: "d-panel", style: { flex: 1, overflowY: 'auto' }, children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsxs("div", { className: "c-eyebrow", style: { marginBottom: 6 }, children: ["Library \u00B7 ", memories.length, " items"] }), _jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 10 }, children: "Memories." }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx(Pill, { tone: "ghost", children: "Import" }), _jsx(Pill, { tone: "ink", icon: _jsx("span", { style: { fontSize: 14 }, children: "+" }), children: "New memory" })] })] }), _jsx("div", { style: { display: 'flex', gap: 6, marginBottom: 18 }, children: ['all', 'photo', 'video', 'audio'].map(f => (_jsx("button", { onClick: () => setFilter(f), style: {
                                fontSize: 12, padding: '7px 14px', borderRadius: 999, fontWeight: 500, border: 'none', cursor: 'pointer',
                                background: filter === f ? 'var(--ink)' : 'var(--paper-2)',
                                color: filter === f ? 'var(--paper)' : 'var(--ink-2)',
                                fontFamily: 'var(--csans)',
                            }, children: f.charAt(0).toUpperCase() + f.slice(1) }, f))) }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }, children: items.map(m => {
                            const active = m.id === selectedId;
                            return (_jsxs("button", { onClick: () => setSelected(m.id), style: {
                                    padding: 0, borderRadius: 14, overflow: 'hidden', textAlign: 'left', cursor: 'pointer',
                                    background: active ? '#FFFDF8' : 'var(--paper)',
                                    border: active ? '1.5px solid var(--ink)' : '0.5px solid var(--hair)',
                                    boxShadow: active ? '0 6px 18px rgba(26,25,21,0.1)' : '0 1px 2px rgba(26,25,21,0.04)',
                                    transition: 'all 140ms',
                                }, children: [_jsxs("div", { style: { position: 'relative' }, children: [_jsx(Placeholder, { h: 140, tint: m.tint, label: m.kind, radius: 0 }), 'duration' in m && m.kind !== 'photo' && (_jsxs("div", { style: {
                                                    position: 'absolute', left: 10, bottom: 10, background: 'rgba(26,25,21,0.78)',
                                                    padding: '3px 8px', borderRadius: 4, fontFamily: 'var(--cmono)', fontSize: 10, color: 'var(--paper)',
                                                }, children: [m.kind === 'audio' ? '♪' : '▶', " ", m.duration] }))] }), _jsxs("div", { style: { padding: 14 }, children: [_jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)', lineHeight: 1.15 }, children: m.title }), _jsxs("div", { style: { fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 4 }, children: [m.tag, " \u00B7 ", m.plays, " plays"] }), _jsx("div", { style: { marginTop: 8 }, children: _jsx(Chips, { items: m.tags.slice(0, 3) }) })] })] }, m.id));
                        }) })] }), _jsx("div", { className: "d-panel", style: { width: 360, flexShrink: 0, borderLeft: '0.5px solid var(--hair)', background: 'var(--paper-2)', overflowY: 'auto', padding: 0 }, children: !selected ? null : (_jsxs(_Fragment, { children: [_jsxs("div", { style: { position: 'relative' }, children: [_jsx(Placeholder, { h: 240, tint: selected.tint, label: selected.kind, radius: 0 }), selected.kind !== 'photo' && (_jsx("button", { style: {
                                        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                                        width: 60, height: 60, borderRadius: '50%', background: 'rgba(250,247,242,0.95)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        border: 'none', cursor: 'pointer',
                                    }, children: _jsx("svg", { width: "18", height: "20", viewBox: "0 0 18 20", children: _jsx("path", { d: "M2 1 L17 10 L2 19 Z", fill: "var(--ink)" }) }) }))] }), _jsxs("div", { style: { padding: '24px 24px 32px' }, children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 6 }, children: selected.tag }), _jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 26, lineHeight: 1.1, color: 'var(--ink)', marginBottom: 12 }, children: selected.title }), _jsx("div", { style: { fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }, children: selected.desc }), _jsx("div", { className: "c-eyebrow", style: { marginTop: 20, marginBottom: 8 }, children: "Tags" }), _jsx(Chips, { items: selected.tags }), _jsxs("div", { style: { marginTop: 20, padding: 14, background: 'var(--paper)', borderRadius: 10, border: '0.5px solid var(--hair-2)' }, children: [_jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sage-deep)', marginBottom: 6 }, children: "Owl's note" }), _jsxs("div", { style: { fontFamily: 'var(--cmono)', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }, children: ["\"", selected.desc || 'She was still for a long time, then smiled.', "\""] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }, children: [_jsx(Pill, { tone: "ink", style: { justifyContent: 'center' }, children: "Send to owl now" }), _jsx(Pill, { tone: "default", style: { justifyContent: 'center' }, children: "Edit details" })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 20 }, children: [_jsxs("div", { style: { padding: '10px 12px', background: 'var(--paper)', borderRadius: 8 }, children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 4 }, children: "Played" }), _jsxs("div", { style: { fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }, children: [selected.plays, "\u00D7"] })] }), _jsxs("div", { style: { padding: '10px 12px', background: 'var(--paper)', borderRadius: 8 }, children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 4 }, children: "Last shown" }), _jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }, children: selected.id === 'm1' ? 'Tuesday' : '3 days ago' })] })] })] })] })) })] }));
}
/* ── Voices ──────────────────────────────────────────────── */
function DesktopVoices() {
    const { store } = usePatientData();
    const [playing, setPlaying] = useState('v2');
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const mm = Math.floor(seconds / 60);
    const ss = String(seconds % 60).padStart(2, '0');
    return (_jsxs("div", { style: { display: 'flex', flex: 1, minHeight: 0 }, children: [_jsxs("div", { className: "d-panel", style: { flex: 1, overflowY: 'auto' }, children: [_jsxs("div", { style: { marginBottom: 28 }, children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 6 }, children: "Voices of her people" }), _jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 8 }, children: "Voices." }), _jsx(OwlQuote, { size: "sm", children: "When she can't place my voice, yours still lands." })] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: (store?.voices ?? []).map(v => {
                            const on = playing === v.id;
                            return (_jsxs("div", { style: {
                                    padding: 18, background: '#FFFDF8', borderRadius: 14,
                                    border: on ? '1px solid var(--ink)' : '0.5px solid var(--hair)',
                                    display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 18, alignItems: 'center',
                                }, children: [_jsx("button", { onClick: () => setPlaying(on ? null : v.id), style: {
                                            width: 48, height: 48, borderRadius: '50%',
                                            background: on ? 'var(--ink)' : 'var(--paper-2)',
                                            color: on ? 'var(--paper)' : 'var(--ink)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer',
                                        }, children: on
                                            ? _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 14 14", children: [_jsx("rect", { x: "2", y: "1", width: "3.5", height: "12", rx: "0.5", fill: "currentColor" }), _jsx("rect", { x: "8.5", y: "1", width: "3.5", height: "12", rx: "0.5", fill: "currentColor" })] })
                                            : _jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", children: _jsx("path", { d: "M2 1 L12 7 L2 13 Z", fill: "currentColor" }) }) }), _jsxs("div", { children: [_jsxs("div", { style: { fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }, children: [v.person, " \u00B7 ", _jsxs("span", { style: { color: 'var(--sage-deep)' }, children: ["Used in ", v.usedIn] })] }), _jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)', lineHeight: 1.1, marginBottom: 10 }, children: v.title }), _jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 2, height: 28 }, children: v.waves.map((h, i) => (_jsx("div", { style: {
                                                        flex: 1, height: `${h * 10}%`, minHeight: 3, borderRadius: 1,
                                                        background: on && i < v.waves.length * 0.45 ? 'var(--ink)' : 'var(--ink-4)',
                                                        opacity: on ? 1 : 0.5,
                                                    } }, i))) })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }, children: [_jsx("span", { style: { fontFamily: 'var(--cmono)', fontSize: 12, color: 'var(--ink-3)' }, children: v.duration }), _jsx("button", { style: { fontSize: 11, fontFamily: 'var(--cmono)', letterSpacing: '0.05em', color: 'var(--sage-deep)', border: 'none', background: 'none', cursor: 'pointer' }, children: "Send to owl \u2192" })] })] }, v.id));
                        }) }), _jsx(SectionHeader, { kicker: "Voice archive", children: "Archived recordings" }), _jsxs(Card, { pad: 20, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 14 }, children: [_jsx("div", { style: { width: 44, height: 44, borderRadius: '50%', background: 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("svg", { width: "20", height: "20", viewBox: "0 0 20 20", children: [_jsx("circle", { cx: "10", cy: "10", r: "8", stroke: "var(--clay-deep)", strokeWidth: "1.3", fill: "none" }), _jsx("path", { d: "M10 5v5l3 3", stroke: "var(--clay-deep)", strokeWidth: "1.3", fill: "none", strokeLinecap: "round" })] }) }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)', lineHeight: 1.15 }, children: "Archive recordings" }), _jsx("div", { style: { fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }, children: "From voicemails and old recordings" })] }), _jsx(Pill, { tone: "ink", children: "Review" })] }), _jsxs("div", { style: { marginTop: 14, padding: '12px 14px', background: 'oklch(0.94 0.04 25)', borderRadius: 10, fontSize: 13, color: 'var(--rose-deep)', lineHeight: 1.5 }, children: ["The owl will ", _jsx("strong", { children: "never impersonate" }), " loved ones who have passed. These recordings play as themselves \u2014 real voices, real words."] })] })] }), _jsxs("div", { style: { width: 340, flexShrink: 0, background: 'var(--ink)', padding: 32, display: 'flex', flexDirection: 'column', overflowY: 'auto' }, children: [_jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,242,0.55)', marginBottom: 12 }, children: "Record a voice" }), _jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.1, color: 'var(--paper)', marginBottom: 28 }, children: "Say something simple." }), _jsx("div", { style: {
                            width: '100%', aspectRatio: '1/1', borderRadius: 14,
                            background: 'rgba(250,247,242,0.05)', border: '0.5px solid rgba(250,247,242,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 22,
                        }, children: _jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 4, height: 80 }, children: Array.from({ length: 22 }).map((_, i) => (_jsx("div", { style: {
                                    width: 4, height: recording ? Math.sin(i * 0.5) * 36 + 40 : 12,
                                    borderRadius: 2, background: recording ? 'var(--paper)' : 'rgba(250,247,242,0.3)', transition: 'height 220ms',
                                } }, i))) }) }), _jsxs("div", { style: { textAlign: 'center', fontFamily: 'var(--cmono)', fontSize: 14, color: 'var(--paper)', marginBottom: 22 }, children: [mm, ":", ss] }), _jsxs("button", { onClick: () => { setRecording(!recording); if (!recording)
                            setSeconds(0); }, style: {
                            width: '100%', padding: 14, borderRadius: 12,
                            background: recording ? 'var(--rose)' : 'var(--paper)',
                            color: recording ? 'var(--paper)' : 'var(--ink)',
                            fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            border: 'none', cursor: 'pointer', fontFamily: 'var(--csans)',
                        }, children: [_jsx("span", { style: { width: 10, height: 10, borderRadius: recording ? 2 : '50%', background: recording ? 'var(--paper)' : 'var(--rose)' } }), recording ? 'Stop recording' : 'Start recording'] }), _jsxs("div", { style: { marginTop: 24, padding: 16, borderRadius: 12, background: 'rgba(250,247,242,0.06)', border: '0.5px solid rgba(250,247,242,0.1)' }, children: [_jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,242,0.55)', marginBottom: 8 }, children: "Try saying" }), _jsxs("div", { style: { fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.35, color: 'var(--paper)' }, children: ["\"Hi ", store?.patient.preferred ?? 'sweetheart', ", it's me. I'm thinking of you today.\""] })] })] })] }));
}
/* ── Caregiver edit modal ────────────────────────────────── */
const TINT_OPTIONS = ['clay', 'sage', 'rose', 'paper'];
function CaregiverEditModal({ caregiver, saving, onSave, onDelete, onClose }) {
    const isNew = caregiver === null;
    const [form, setForm] = useState({
        id: caregiver?.id ?? `cg_${Date.now()}`,
        name: caregiver?.name ?? '',
        role: caregiver?.role ?? '',
        online: caregiver?.online ?? false,
        tint: (caregiver?.tint ?? 'clay'),
    });
    const INPUT = {
        width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
        border: '0.5px solid var(--hair)', background: 'var(--paper)',
        color: 'var(--ink)', fontFamily: 'var(--csans)', outline: 'none', boxSizing: 'border-box',
    };
    const LABEL = {
        fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: 5,
    };
    return (_jsx("div", { style: { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(26,25,21,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsxs("div", { style: { width: 440, background: 'var(--paper)', borderRadius: 18, boxShadow: '0 30px 80px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(26,25,21,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }, children: [_jsxs("div", { style: { padding: '18px 24px', borderBottom: '0.5px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)' }, children: isNew ? 'Add person' : 'Edit caregiver' }), _jsx("button", { onClick: onClose, style: { color: 'var(--ink-3)', fontSize: 22, lineHeight: 1, border: 'none', background: 'none', cursor: 'pointer' }, children: "\u00D7" })] }), _jsxs("div", { style: { padding: '24px 24px 8px' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }, children: [_jsxs("div", { children: [_jsx("label", { style: LABEL, children: "Full name" }), _jsx("input", { style: INPUT, value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { style: LABEL, children: "Role" }), _jsx("input", { style: INPUT, value: form.role, onChange: e => setForm(f => ({ ...f, role: e.target.value })) })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }, children: [_jsxs("div", { children: [_jsx("label", { style: LABEL, children: "Avatar colour" }), _jsx("div", { style: { display: 'flex', gap: 8, marginTop: 6 }, children: TINT_OPTIONS.map(t => (_jsx("button", { onClick: () => setForm(f => ({ ...f, tint: t })), style: {
                                                    width: 28, height: 28, borderRadius: '50%', border: form.tint === t ? '2.5px solid var(--ink)' : '2px solid transparent',
                                                    background: `var(--${t})`, cursor: 'pointer', padding: 0,
                                                } }, t))) })] }), _jsxs("div", { children: [_jsx("label", { style: LABEL, children: "Status" }), _jsx("button", { onClick: () => setForm(f => ({ ...f, online: !f.online })), style: {
                                                marginTop: 6, padding: '8px 14px', borderRadius: 8, border: '0.5px solid var(--hair)',
                                                background: form.online ? 'var(--sage-deep)' : 'var(--paper-2)', cursor: 'pointer',
                                                color: form.online ? '#fff' : 'var(--ink-2)', fontFamily: 'var(--csans)', fontSize: 13,
                                            }, children: form.online ? 'On now' : 'Not on shift' })] })] })] }), _jsxs("div", { style: { padding: '16px 24px', borderTop: '0.5px solid var(--hair)', display: 'flex', gap: 10, justifyContent: 'space-between' }, children: [_jsx("div", { children: !isNew && (_jsx("button", { onClick: () => onDelete(form.id), style: { padding: '10px 18px', borderRadius: 10, background: 'var(--rose)', color: 'var(--rose-deep)', fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'var(--csans)' }, children: "Remove" })) }), _jsxs("div", { style: { display: 'flex', gap: 10 }, children: [_jsx("button", { onClick: onClose, style: { padding: '10px 20px', borderRadius: 10, background: 'var(--paper-2)', color: 'var(--ink-2)', fontSize: 13, border: '0.5px solid var(--hair)', cursor: 'pointer', fontFamily: 'var(--csans)' }, children: "Cancel" }), _jsx("button", { onClick: () => onSave({ ...form }), disabled: saving || !form.name.trim(), style: { padding: '10px 24px', borderRadius: 10, background: 'var(--ink)', color: 'var(--paper)', fontSize: 13, fontWeight: 500, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--csans)', opacity: saving ? 0.6 : 1 }, children: saving ? 'Saving…' : isNew ? 'Add' : 'Save' })] })] })] }) }));
}
/* ── Team & settings ─────────────────────────────────────── */
const SEVERITY_DOT = {
    high: 'var(--rose-deep)',
    medium: 'var(--clay-deep)',
    low: 'var(--ink-3)',
};
const SEVERITY_BG = {
    high: 'oklch(0.95 0.04 25)',
    medium: 'oklch(0.96 0.04 55)',
    low: 'var(--paper-2)',
};
function AlertFeed() {
    const [notifs, setNotifs] = useState([]);
    useEffect(() => notificationService.subscribe(setNotifs), []);
    const pending = notifs.filter(n => !n.acknowledged);
    const acked = notifs.filter(n => n.acknowledged);
    return (_jsxs("div", { children: [pending.length === 0 ? (_jsxs("div", { style: {
                    padding: '18px 20px', borderRadius: 12, background: 'oklch(0.96 0.02 150)',
                    border: '0.5px solid oklch(0.88 0.04 150)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
                }, children: [_jsx("span", { style: { width: 8, height: 8, borderRadius: '50%', background: 'var(--sage-deep)', flexShrink: 0 } }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 14, fontWeight: 500, color: 'var(--sage-deep)' }, children: "All clear" }), _jsx("div", { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }, children: "No unacknowledged alerts at this time." })] })] })) : (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }, children: [[...pending].reverse().map(n => (_jsx("div", { style: {
                            padding: '14px 16px', borderRadius: 12, background: SEVERITY_BG[n.severity],
                            border: `0.5px solid ${n.severity === 'high' ? 'oklch(0.85 0.08 25)' : 'var(--hair)'}`,
                        }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10 }, children: [_jsx("span", { style: { width: 8, height: 8, borderRadius: '50%', background: SEVERITY_DOT[n.severity], flexShrink: 0, marginTop: 4 } }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }, children: [_jsx("span", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: SEVERITY_DOT[n.severity], fontWeight: 600 }, children: n.severity }), _jsx("span", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, color: 'var(--ink-4)' }, children: new Date(n.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })] }), _jsx("div", { style: { fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.4 }, children: n.reason })] }), _jsx("button", { onClick: () => notificationService.acknowledge(n.id), style: {
                                        flexShrink: 0, padding: '5px 10px', borderRadius: 7, fontSize: 11.5,
                                        background: 'var(--ink)', color: 'var(--paper)', border: 'none',
                                        cursor: 'pointer', fontFamily: 'var(--csans)', fontWeight: 500,
                                    }, children: "Acknowledge" })] }) }, n.id))), pending.length > 1 && (_jsxs("button", { onClick: () => notificationService.acknowledgeAll(), style: { alignSelf: 'flex-end', padding: '6px 12px', borderRadius: 8, fontSize: 12, background: 'none', border: '0.5px solid var(--hair)', color: 'var(--ink-3)', cursor: 'pointer', fontFamily: 'var(--csans)' }, children: ["Acknowledge all (", pending.length, ")"] }))] })), acked.length > 0 && (_jsxs("div", { children: [_jsx("div", { className: "c-eyebrow", style: { marginTop: 20, marginBottom: 10 }, children: "Acknowledged" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 0 }, children: [...acked].reverse().map((n, i) => (_jsxs("div", { style: {
                                display: 'grid', gridTemplateColumns: '8px 1fr auto', gap: 10, alignItems: 'flex-start',
                                padding: '10px 0', borderBottom: i < acked.length - 1 ? '0.5px solid var(--hair-2)' : 'none',
                                opacity: 0.55,
                            }, children: [_jsx("span", { style: { width: 6, height: 6, borderRadius: '50%', background: SEVERITY_DOT[n.severity], marginTop: 4, flexShrink: 0 } }), _jsx("div", { style: { fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }, children: n.reason }), _jsx("span", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, color: 'var(--ink-4)', whiteSpace: 'nowrap' }, children: new Date(n.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })] }, n.id))) })] }))] }));
}
function DesktopTeam() {
    const { store, saving, updateStore } = usePatientData();
    const pr = usePronouns();
    const [notifs, setNotifs] = useState([]);
    const [editTarget, setEditTarget] = useState(null);
    const [modalMode, setModalMode] = useState(null);
    useEffect(() => notificationService.subscribe(setNotifs), []);
    const pendingCount = notifs.filter(n => !n.acknowledged).length;
    const openEdit = (c) => { setEditTarget(c); setModalMode('edit'); };
    const openNew = () => { setEditTarget(null); setModalMode('new'); };
    const closeModal = () => setModalMode(null);
    const handleSaveCaregiver = async (updated) => {
        if (!store)
            return;
        const list = store.caregivers;
        const idx = list.findIndex(c => c.id === updated.id);
        const next = idx >= 0 ? list.map(c => c.id === updated.id ? updated : c) : [...list, updated];
        await updateStore({ caregivers: next });
        closeModal();
    };
    const handleDeleteCaregiver = async (id) => {
        if (!store)
            return;
        await updateStore({ caregivers: store.caregivers.filter(c => c.id !== id) });
        closeModal();
    };
    return (_jsxs("div", { className: "d-panel", style: { flex: 1, overflowY: 'auto' }, children: [modalMode !== null && (_jsx(CaregiverEditModal, { caregiver: editTarget, saving: saving, onSave: handleSaveCaregiver, onDelete: handleDeleteCaregiver, onClose: closeModal })), _jsxs("div", { style: { marginBottom: 28 }, children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 6 }, children: "Care coordination" }), _jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 8 }, children: "Team & alerts." }), _jsx("div", { style: { display: 'flex', gap: 8 }, children: _jsx(Pill, { tone: "ink", onClick: openNew, children: "+ Add person" }) })] }), _jsxs("div", { style: { marginBottom: 36 }, children: [_jsx(SectionHeader, { kicker: "Notifications", action: pendingCount > 0 ? (_jsx("span", { style: {
                                minWidth: 20, height: 20, borderRadius: 10, background: 'var(--rose-deep)',
                                color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', padding: '0 6px', fontFamily: 'var(--csans)',
                            }, children: pendingCount })) : null, children: "Alert feed" }), _jsx(AlertFeed, {})] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }, children: [_jsxs("div", { children: [_jsx(SectionHeader, { kicker: "On the team", children: "Caregivers" }), _jsx(Card, { pad: 0, children: (store?.caregivers ?? []).map((c, i) => (_jsxs("div", { style: {
                                        display: 'grid', gridTemplateColumns: '44px 1fr auto auto', gap: 12, alignItems: 'center',
                                        padding: '16px 18px', borderTop: i > 0 ? '0.5px solid var(--hair-2)' : 'none',
                                    }, children: [_jsxs("div", { style: { position: 'relative', width: 44, height: 44 }, children: [_jsx(Placeholder, { w: 44, h: 44, tint: c.tint, label: "", radius: 22 }), c.online && _jsx("span", { style: { position: 'absolute', right: -2, bottom: -2, width: 12, height: 12, borderRadius: '50%', background: 'var(--sage-deep)', border: '2px solid #FFFDF8' } })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 14, fontWeight: 500, color: 'var(--ink)' }, children: c.name }), _jsx("div", { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }, children: c.role })] }), _jsx("span", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.online ? 'var(--sage-deep)' : 'var(--ink-4)' }, children: c.online ? 'On now' : 'Quiet' }), _jsx("button", { onClick: () => openEdit(c), style: { fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--csans)', padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap' }, children: "Edit" })] }, c.id))) }), _jsx(SectionHeader, { kicker: "For hard moments", children: "Grounding library" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: (store?.grounding ?? []).map(g => (_jsxs(Card, { pad: 16, style: { display: 'flex', alignItems: 'center', gap: 14 }, children: [_jsx("div", { style: { width: 38, height: 38, borderRadius: 8, background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', flexShrink: 0 }, children: g.name[0] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)', lineHeight: 1.15 }, children: g.name }), _jsxs("div", { style: { fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 3 }, children: [g.duration, " \u00B7 for ", g.use.toLowerCase()] })] }), _jsx(Pill, { tone: "default", children: "Start" })] }, g.id))) })] }), _jsxs("div", { children: [_jsx(SectionHeader, { kicker: "Owl settings", children: `How ${pr.subj} sounds` }), _jsx(Card, { pad: 0, children: [
                                    { l: 'Voice', v: 'Calm · warm, low register' },
                                    { l: 'Wake word', v: 'Hey, owl' },
                                    { l: 'Night light', v: 'Soft amber, 2%' },
                                    { l: 'Privacy', v: 'Audio never leaves the room' },
                                    { l: 'Firmware', v: 'v3.2.1 — up to date' },
                                    { l: 'Notifications', v: 'Alerts + daily digest' },
                                ].map((s, i) => (_jsxs("div", { style: {
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '15px 18px', borderTop: i > 0 ? '0.5px solid var(--hair-2)' : 'none',
                                    }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 14, color: 'var(--ink)', fontWeight: 500 }, children: s.l }), _jsx("div", { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }, children: s.v })] }), _jsx(Pill, { tone: "ghost", children: "Edit" })] }, i))) })] })] })] }));
}
const ALERT_SEVERITY_LABELS = {
    high: 'Immediate attention',
    medium: 'Needs attention',
    low: 'Note',
};
const ALERT_BG = {
    high: 'oklch(0.94 0.05 25)',
    medium: 'oklch(0.95 0.04 55)',
    low: 'var(--paper-2)',
};
/* ── Alert modal ─────────────────────────────────────────── */
function DesktopAlertModal({ onClose }) {
    const [responded, setResponded] = useState(null);
    const { store, currentCaregiver } = usePatientData();
    const pr = usePronouns();
    const { alerts, dismissAlert } = useSession();
    const preferred = store?.patient.preferred ?? 'Patient';
    const room = store?.patient.home.split('·').pop()?.trim() ?? '';
    const calmer = store?.patient.calmers[0] ?? 'some music';
    const primaryId = store?.currentCaregiverId;
    const firstVoice = store?.voices[0];
    const firstPhoto = store?.memories.find(m => m.kind === 'photo');
    const firstGround = store?.grounding[0];
    const onShift = store?.caregivers.find(c => c.online && c.id !== primaryId);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Most severe active alert drives the header
    const topAlert = alerts.find(a => a.severity === 'high') ?? alerts.find(a => a.severity === 'medium') ?? alerts[0];
    const hasLiveAlerts = alerts.length > 0;
    const actions = [];
    if (firstVoice)
        actions.push({ id: 'voice', primary: true, title: `Play ${firstVoice.person.split(' ')[0]}'s voice`, detail: `${firstVoice.title} · ${firstVoice.duration}` });
    if (firstPhoto)
        actions.push({ id: 'photo', title: `Show: ${firstPhoto.title}`, detail: firstPhoto.desc });
    if (firstGround)
        actions.push({ id: 'ground', title: `Start grounding: ${firstGround.name}`, detail: `${firstGround.duration} · for ${firstGround.use.toLowerCase()}` });
    if (onShift)
        actions.push({ id: 'call', title: `Call ${onShift.name}`, detail: `${onShift.role}${room ? ` · ${room}` : ''} · On shift now` });
    const headerBg = topAlert ? ALERT_BG[topAlert.severity] : 'oklch(0.96 0.03 25)';
    const headerBorder = topAlert?.severity === 'high' ? '0.5px solid oklch(0.85 0.08 25)' : '0.5px solid var(--hair)';
    return (_jsx("div", { style: {
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(26,25,21,0.4)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'c-fadeUp 240ms ease-out',
        }, children: _jsxs("div", { style: {
                width: 600, maxHeight: '88%', background: 'var(--paper)', borderRadius: 18,
                boxShadow: '0 30px 80px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(26,25,21,0.2)',
                overflow: 'auto', display: 'flex', flexDirection: 'column',
            }, children: [_jsxs("div", { style: {
                        padding: '18px 24px', background: headerBg, borderBottom: headerBorder,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsxs("span", { style: { position: 'relative', width: 10, height: 10 }, children: [_jsx("span", { style: { position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--rose-deep)' } }), _jsx("span", { style: { position: 'absolute', inset: -6, borderRadius: '50%', border: '1px solid var(--rose)', animation: 'c-pulseRing 1.8s ease-out infinite' } })] }), _jsxs("span", { className: "c-eyebrow", style: { color: 'var(--rose-deep)', marginBottom: 0 }, children: [hasLiveAlerts ? `${ALERT_SEVERITY_LABELS[topAlert.severity]} · ${timeStr}` : `Alert log · ${timeStr}`, room ? ` · ${room}` : ''] })] }), _jsx("button", { onClick: onClose, style: { color: 'var(--ink-3)', fontSize: 20, lineHeight: 1, border: 'none', background: 'none', cursor: 'pointer', padding: 4 }, children: "\u00D7" })] }), _jsxs("div", { style: { padding: '28px 28px 24px' }, children: [hasLiveAlerts && (_jsx("div", { style: { marginBottom: 22 }, children: alerts.map(a => (_jsxs("div", { style: {
                                    display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10,
                                    padding: '14px 16px', borderRadius: 12, background: ALERT_BG[a.severity],
                                    border: `0.5px solid ${a.severity === 'high' ? 'oklch(0.82 0.1 25)' : 'var(--hair)'}`,
                                }, children: [_jsx("div", { style: { width: 42, height: 42, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, children: _jsx(OwlGlyph, { size: 26, color: "var(--paper)" }) }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: a.severity === 'high' ? 'var(--rose-deep)' : 'var(--clay-deep)', marginBottom: 4 }, children: ALERT_SEVERITY_LABELS[a.severity] }), _jsx(OwlQuote, { size: "sm", style: { borderLeft: 'none', paddingLeft: 0 }, children: a.reason })] }), _jsx("button", { onClick: () => dismissAlert(a.id), style: { color: 'var(--ink-3)', fontSize: 16, border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }, children: "\u00D7" })] }, a.id))) })), !hasLiveAlerts && (_jsxs("div", { style: { fontFamily: 'var(--serif)', fontSize: 30, lineHeight: 1.1, color: 'var(--ink)', marginBottom: 18 }, children: [cap(pr.possAdj), " owl is watching."] })), !hasLiveAlerts && (_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }, children: [_jsx("div", { style: { width: 42, height: 42, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, children: _jsx(OwlGlyph, { size: 26, color: "var(--paper)" }) }), _jsxs(OwlQuote, { size: "sm", style: { flex: 1 }, children: ["No active alerts. I'm watching ", preferred, " closely and will notify you immediately if anything changes. I tried ", calmer, " earlier and ", pr.subj, " ", pr.isAre, " calm."] })] })), _jsx("div", { className: "c-eyebrow", style: { marginBottom: 10 }, children: "What should I do?" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: actions.map(a => (_jsxs("button", { onClick: () => setResponded(a.id), style: {
                                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                                    background: responded === a.id ? 'var(--ink)' : a.primary ? '#FFFDF8' : 'var(--paper-2)',
                                    color: responded === a.id ? 'var(--paper)' : 'var(--ink)',
                                    border: a.primary && responded !== a.id ? '1px solid var(--ink)' : '0.5px solid var(--hair)',
                                    fontFamily: 'var(--csans)',
                                }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 500 }, children: a.title }), _jsx("div", { style: { fontSize: 12, color: responded === a.id ? 'rgba(250,247,242,0.6)' : 'var(--ink-3)', marginTop: 3 }, children: a.detail })] }), _jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", style: { opacity: 0.4 }, children: _jsx("path", { d: "M4 2l5 5-5 5", stroke: "currentColor", strokeWidth: "1.6", fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }) })] }, a.id))) }), _jsxs("div", { style: { display: 'flex', gap: 10, marginTop: 22 }, children: [_jsx("button", { onClick: onClose, style: { flex: 2, padding: 13, borderRadius: 12, background: 'var(--ink)', color: 'var(--paper)', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--csans)' }, children: "I'll come in person" }), _jsx("button", { onClick: onClose, style: { flex: 1, padding: 13, borderRadius: 12, background: 'var(--paper-2)', color: 'var(--ink-2)', fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'var(--csans)' }, children: "Let the owl handle it" })] }), currentCaregiver && (_jsxs("div", { style: { marginTop: 16, padding: '10px 14px', background: 'var(--paper-2)', borderRadius: 10, fontSize: 12, color: 'var(--ink-3)' }, children: ["Notifying: ", store?.caregivers.filter(c => c.id !== currentCaregiver.id).map(c => c.name).join(' · ')] }))] })] }) }));
}
/* ── Desktop shell ───────────────────────────────────────── */
export function DesktopCompanionShell() {
    const [nav, setNav] = useState('today');
    const [showAlert, setShowAlert] = useState(false);
    const { alerts, displayedPhotoId, dismissPhoto } = useSession();
    const { store } = usePatientData();
    // Auto-open the alert panel when a high-severity alert arrives
    useEffect(() => {
        if (alerts.some(a => a.severity === 'high'))
            setShowAlert(true);
    }, [alerts]);
    const displayedMemory = displayedPhotoId
        ? (store?.memories.find(m => m.id === displayedPhotoId) ?? null)
        : null;
    let content;
    switch (nav) {
        case 'today':
            content = _jsx(DesktopToday, { onAlert: () => setShowAlert(true) });
            break;
        case 'profile':
            content = _jsx(DesktopProfile, {});
            break;
        case 'memories':
            content = _jsx(DesktopMemories, {});
            break;
        case 'voices':
            content = _jsx(DesktopVoices, {});
            break;
        case 'team':
            content = _jsx(DesktopTeam, {});
            break;
    }
    return (_jsxs("div", { className: "companion", style: { display: 'flex', height: '100%', minHeight: 0, position: 'relative' }, children: [_jsx(Sidebar, { nav: nav, onNav: setNav, onAlert: () => setShowAlert(true) }), _jsxs("div", { style: { flex: 1, display: 'flex', minHeight: 0, position: 'relative', overflow: 'hidden' }, children: [content, showAlert && _jsx(DesktopAlertModal, { onClose: () => setShowAlert(false) }), displayedMemory && _jsx(PhotoOverlay, { memory: displayedMemory, onDismiss: dismissPhoto })] })] }));
}
