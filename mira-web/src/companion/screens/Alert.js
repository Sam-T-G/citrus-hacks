import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { OwlGlyph, OwlQuote } from '../ui';
import { usePatientData, usePronouns } from '../PatientContext';
import { cap } from '../pronouns';
function ReadingTile({ label, val, unit, tone = 'paper', trend }) {
    return (_jsxs("div", { className: `reading-tile reading-tile-${tone}`, children: [_jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }, children: label }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 4 }, children: [_jsx("span", { style: { fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1 }, children: val }), unit && _jsx("span", { style: { fontSize: 11, opacity: 0.6 }, children: unit }), trend === 'up' && _jsx("span", { style: { fontSize: 11 }, children: "\u2191" })] })] }));
}
function ActionRow({ title, detail, onClick, active, primary }) {
    const cls = active ? 'action-row action-row-active' : primary ? 'action-row action-row-primary' : 'action-row action-row-default';
    return (_jsxs("button", { className: cls, onClick: onClick, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 500, lineHeight: 1.2, marginBottom: 3 }, children: title }), _jsx("div", { style: { fontSize: 12, lineHeight: 1.4, opacity: active ? 0.6 : undefined, color: active ? undefined : 'var(--ink-3)' }, children: detail })] }), _jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", style: { opacity: 0.4, flexShrink: 0 }, children: _jsx("path", { d: "M4 2l5 5-5 5", stroke: "currentColor", strokeWidth: "1.6", fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }) })] }));
}
export function AlertScreen({ onBack }) {
    const [responded, setResponded] = useState(null);
    const { store, currentCaregiver } = usePatientData();
    const pr = usePronouns();
    const preferred = store?.patient.preferred ?? 'She';
    const room = store?.patient.home.split('·').pop()?.trim() ?? '';
    // First voice in library
    const firstVoice = store?.voices[0];
    // First photo memory
    const firstPhoto = store?.memories.find(m => m.kind === 'photo');
    // First grounding exercise
    const firstGround = store?.grounding[0];
    // On-shift caregiver (first online non-primary)
    const primaryId = store?.currentCaregiverId;
    const onShift = store?.caregivers.find(c => c.online && c.id !== primaryId);
    // Other caregivers to notify (online, not current user)
    const toNotify = store?.caregivers.filter(c => c.id !== currentCaregiver?.id).slice(0, 2) ?? [];
    // Calmer to reference in narration
    const calmer = store?.patient.calmers[0] ?? 'some music';
    const actions = [];
    if (firstVoice) {
        actions.push({
            id: 'voice', primary: true,
            title: `Play ${firstVoice.person.split(' ')[0]}'s voice`,
            detail: `${firstVoice.title} · ${firstVoice.duration}`,
        });
    }
    if (firstPhoto) {
        actions.push({
            id: 'photo',
            title: `Show: ${firstPhoto.title}`,
            detail: firstPhoto.desc,
        });
    }
    if (firstGround) {
        actions.push({
            id: 'ground',
            title: `Start grounding: ${firstGround.name}`,
            detail: `${firstGround.duration} · for ${firstGround.use.toLowerCase()}`,
        });
    }
    if (onShift) {
        actions.push({
            id: 'call',
            title: `Call ${onShift.name}`,
            detail: `${onShift.role}${room ? ` · ${room} · On shift now` : ' · On shift now'}`,
        });
    }
    return (_jsxs("div", { children: [_jsxs("button", { onClick: onBack, style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, fontFamily: 'var(--csans)' }, children: [_jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", children: _jsx("path", { d: "M10 3L5 8l5 5", stroke: "currentColor", strokeWidth: "1.6", fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }) }), "Back to today"] }), _jsxs("div", { className: "c-eyebrow", style: { color: 'var(--rose-deep)', marginBottom: 4 }, children: ["Live alert \u00B7 ", new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })] }), _jsxs("div", { className: "c-title", style: { marginBottom: 18 }, children: [cap(pr.subj), " seems upset."] }), _jsx("div", { className: "alert-screen-card", children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 14 }, children: [_jsxs("div", { style: { position: 'relative', flexShrink: 0 }, children: [_jsx("div", { className: "c-pulse-ring-fast", style: {
                                        position: 'absolute', inset: -4, borderRadius: '50%',
                                        border: '1px solid var(--rose)', opacity: 0.6,
                                    } }), _jsx("div", { style: { width: 44, height: 44, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(OwlGlyph, { size: 28, color: "var(--paper)" }) })] }), _jsxs(OwlQuote, { size: "sm", style: { borderLeft: 'none', paddingLeft: 0, flex: 1 }, children: [preferred, " seems distressed. ", cap(pr.possAdj), " voice rose and ", pr.subj, " ", pr.isAre, " restless. I said \"I'm right here\" and tried ", calmer, ". ", cap(pr.subj), " ", pr.isAre, " still unsettled."] })] }) }), _jsxs("div", { className: "c-grid-3", style: { marginTop: 14 }, children: [_jsx(ReadingTile, { label: "Heart", val: "94", unit: "bpm", tone: "rose", trend: "up" }), _jsx(ReadingTile, { label: "Voice", val: "tense", tone: "rose" }), _jsx(ReadingTile, { label: "Motion", val: "pacing", tone: "clay" })] }), _jsxs("div", { style: { marginTop: 28, marginBottom: 14 }, children: [_jsx("div", { className: "c-section-kicker", style: { marginBottom: 8 }, children: "What should I do?" }), _jsxs("div", { className: "c-section-title", children: ["Help me help ", pr.obj] })] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }, children: actions.map(a => (_jsx(ActionRow, { primary: a.primary, title: a.title, detail: a.detail, onClick: () => setResponded(a.id), active: responded === a.id }, a.id))) }), _jsx("button", { onClick: onBack, style: {
                    width: '100%', padding: 14, borderRadius: 12, border: 'none',
                    background: 'var(--ink)', color: 'var(--paper)', fontSize: 14, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'var(--csans)', marginBottom: 8,
                }, children: "I'll come in person" }), _jsx("button", { onClick: onBack, style: {
                    width: '100%', padding: 12, fontSize: 13, color: 'var(--ink-3)',
                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--csans)',
                }, children: "Let the owl handle it" }), toNotify.length > 0 && (_jsxs("div", { style: { padding: '12px 14px', background: 'var(--paper-2)', borderRadius: 10, marginTop: 8 }, children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 4 }, children: "Notifying" }), _jsx("div", { style: { fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }, children: toNotify.map(c => c.name).join(' · ') })] }))] }));
}
