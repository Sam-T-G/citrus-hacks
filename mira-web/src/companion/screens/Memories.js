import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, Placeholder, Pill, SectionHeader, OwlQuote, Chips } from '../ui';
import { usePatientData } from '../PatientContext';
const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'photo', label: 'Photos' },
    { id: 'video', label: 'Video' },
    { id: 'audio', label: 'Audio' },
];
export function MemoriesScreen() {
    const { store } = usePatientData();
    const [filter, setFilter] = useState('all');
    const memories = store?.memories ?? [];
    const items = memories.filter(m => filter === 'all' || m.kind === filter);
    const favorites = [...memories].sort((a, b) => b.plays - a.plays).slice(0, 3);
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, children: [_jsxs("div", { children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 4 }, children: "For grounding & joy" }), _jsx("div", { className: "c-title", children: "Memories." })] }), _jsx(Pill, { tone: "ink", icon: _jsx("span", { style: { fontSize: 16, lineHeight: 1 }, children: "+" }), children: "Add" })] }), _jsx("div", { style: { display: 'flex', gap: 6, marginBottom: 24 }, children: FILTERS.map(f => (_jsx("button", { onClick: () => setFilter(f.id), style: {
                        fontSize: 12.5, padding: '6px 14px', borderRadius: 999,
                        background: filter === f.id ? 'var(--ink)' : 'var(--paper-2)',
                        color: filter === f.id ? 'var(--paper)' : 'var(--ink-2)',
                        fontWeight: 500, border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--csans)',
                    }, children: f.label }, f.id))) }), _jsx(SectionHeader, { kicker: "Most played", children: "Her favorites" }), _jsx("div", { className: "c-scroll-row", style: { marginBottom: 8 }, children: favorites.map((m, i) => (_jsx("div", { style: {
                        flex: '0 0 200px',
                        transform: `rotate(${i % 2 === 0 ? -1.2 : 1.2}deg)`,
                        transition: 'transform 200ms',
                    }, children: _jsxs(Card, { pad: 8, children: [_jsx(Placeholder, { h: 160, tint: m.tint, label: m.kind, radius: 6 }), _jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 18, marginTop: 10, color: 'var(--ink)', lineHeight: 1.15 }, children: m.title }), _jsxs("div", { style: { fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 4 }, children: [m.tag, " \u00B7 ", m.plays, " plays"] })] }) }, m.id))) }), _jsx(SectionHeader, { kicker: `${items.length} items`, children: "Library" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: items.map(m => (_jsx(Card, { pad: 12, children: _jsxs("div", { className: "memory-card", children: [_jsxs("div", { className: "memory-thumb", children: [_jsx(Placeholder, { w: 100, h: 100, tint: m.tint, label: m.kind, radius: 8 }), m.kind !== 'photo' && 'duration' in m && (_jsxs("div", { className: "memory-badge", children: [m.kind === 'audio' ? '♪ ' : '▶ ', m.duration] }))] }), _jsxs("div", { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', lineHeight: 1.1, marginBottom: 3 }, children: m.title }), _jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }, children: m.tag }), _jsx("div", { style: { fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45 }, children: m.desc })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }, children: [_jsx(Chips, { items: m.tags }), _jsx("button", { style: {
                                                    fontSize: 11, fontFamily: 'var(--cmono)', letterSpacing: '0.05em',
                                                    color: 'var(--sage-deep)', padding: '4px 8px', border: 'none',
                                                    background: 'none', cursor: 'pointer',
                                                }, children: "Send \u2192" })] })] })] }) }, m.id))) }), store?.todayLog.some(e => e.kind === 'memory') && (_jsx("div", { style: { margin: '28px 0 8px' }, children: _jsx(OwlQuote, { size: "sm", children: store.todayLog.filter(e => e.kind === 'memory').slice(-1)[0]?.text ?? '' }) }))] }));
}
