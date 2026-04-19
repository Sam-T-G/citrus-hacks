import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// ── Owl glyph ─────────────────────────────────────────────
export function OwlGlyph({ size = 24, color = 'currentColor', breathing = false }) {
    const eye = size * 0.085;
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 40 40", fill: "none", className: breathing ? 'c-breathe' : undefined, style: { display: 'block' }, children: [_jsx("path", { d: "M10 9 L13 5 L15 9 Z", fill: color, opacity: "0.9" }), _jsx("path", { d: "M25 9 L27 5 L30 9 Z", fill: color, opacity: "0.9" }), _jsx("path", { d: "M8 14 Q8 8 14 8 L26 8 Q32 8 32 14 L32 26 Q32 34 20 34 Q8 34 8 26 Z", fill: color }), _jsx("circle", { cx: "15", cy: "19", r: "3.5", fill: "#FAF7F2" }), _jsx("circle", { cx: "25", cy: "19", r: "3.5", fill: "#FAF7F2" }), _jsx("circle", { cx: "15", cy: "19", r: eye * 1.8, fill: color }), _jsx("circle", { cx: "25", cy: "19", r: eye * 1.8, fill: color }), _jsx("circle", { cx: "15.8", cy: "18.3", r: eye * 0.6, fill: "#FAF7F2" }), _jsx("circle", { cx: "25.8", cy: "18.3", r: eye * 0.6, fill: "#FAF7F2" }), _jsx("path", { d: "M20 22 L18 25 L22 25 Z", fill: "#FAF7F2", opacity: "0.9" })] }));
}
// ── Heartbeat dot ─────────────────────────────────────────
export function Heartbeat({ color = 'var(--sage-deep)', size = 8 }) {
    return (_jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size * 2, height: size * 2, position: 'relative' }, children: [_jsx("span", { style: { position: 'absolute', width: size * 2, height: size * 2, borderRadius: '50%', background: color, opacity: 0.25, animation: 'c-heartbeat 2.4s ease-out infinite' } }), _jsx("span", { style: { position: 'relative', width: size, height: size, borderRadius: '50%', background: color, boxShadow: '0 0 0 2px rgba(255,255,255,0.8)' } })] }));
}
// ── Card ──────────────────────────────────────────────────
export function Card({ children, style, pad = 16, onClick }) {
    return (_jsx("div", { className: "c-card", onClick: onClick, style: { padding: pad, cursor: onClick ? 'pointer' : undefined, ...style }, children: children }));
}
// ── Owl voice pull quote ──────────────────────────────────
export function OwlQuote({ children, size = 'md', style }) {
    const fs = size === 'lg' ? 20 : size === 'sm' ? 13 : 15.5;
    return (_jsxs("div", { className: "c-owl-quote", style: { fontSize: fs, ...style }, children: [_jsxs("span", { className: "c-quote-text", children: ["\"", children, "\""] }), _jsx("div", { className: "c-quote-attr", children: "\u2014 Owl" })] }));
}
// ── Section header ────────────────────────────────────────
export function SectionHeader({ kicker, children, action }) {
    return (_jsxs("div", { className: "c-section-header", children: [_jsxs("div", { children: [kicker && _jsx("div", { className: "c-section-kicker", children: kicker }), _jsx("div", { className: "c-section-title", children: children })] }), action] }));
}
export function Pill({ children, tone = 'default', onClick, icon, style }) {
    return (_jsxs("button", { className: `c-pill c-pill-${tone}`, onClick: onClick, style: style, children: [icon, children] }));
}
const TINTS = {
    sage: ['#DCE6D8', '#C4D4BF'],
    clay: ['#EADFCF', '#D7C6AE'],
    rose: ['#EBD7D0', '#D7B9AE'],
    paper: ['#EEE7D6', '#DED3BA'],
};
export function Placeholder({ w = '100%', h = 120, label = 'photo', tint = 'sage', radius = 8, style }) {
    const [a, b] = TINTS[tint] ?? TINTS.paper;
    return (_jsx("div", { className: "c-placeholder", style: {
            width: w, height: h, borderRadius: radius,
            background: `repeating-linear-gradient(135deg, ${a} 0 14px, ${b} 14px 28px)`,
            ...style,
        }, children: _jsx("span", { children: label }) }));
}
// ── Chips ─────────────────────────────────────────────────
export function Chips({ items }) {
    return (_jsx("div", { className: "c-chips", children: items.map((t, i) => _jsx("span", { className: "c-chip", children: t }, i)) }));
}
// ── Fact line ─────────────────────────────────────────────
export function FactLine({ kicker, val }) {
    return (_jsxs("div", { style: { padding: '10px 12px', background: 'var(--paper-2)', borderRadius: 10 }, children: [_jsx("div", { className: "c-eyebrow", style: { marginBottom: 4 }, children: kicker }), _jsx("div", { style: { fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }, children: val })] }));
}
