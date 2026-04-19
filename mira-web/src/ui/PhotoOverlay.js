import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PhotoOverlay — full-screen soft display when Mira shows a memory photo.
 * Appears over the camera view; dismissed by tap or after 60s of inactivity.
 */
import { useEffect, useRef } from 'react';
const TINT_BG = {
    clay: 'oklch(0.88 0.06 55)',
    sage: 'oklch(0.88 0.05 150)',
    rose: 'oklch(0.88 0.05 25)',
    paper: 'oklch(0.92 0.01 80)',
};
export function PhotoOverlay({ memory, onDismiss }) {
    const timerRef = useRef(null);
    // Auto-dismiss after 60s
    useEffect(() => {
        timerRef.current = setTimeout(onDismiss, 60_000);
        return () => { if (timerRef.current)
            clearTimeout(timerRef.current); };
    }, [onDismiss]);
    const bg = TINT_BG[memory.tint] ?? TINT_BG.paper;
    return (_jsx("div", { onClick: onDismiss, style: {
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(26,25,21,0.75)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'c-fadeUp 300ms ease-out',
            cursor: 'pointer',
        }, children: _jsxs("div", { onClick: e => e.stopPropagation(), style: {
                width: 520, maxWidth: '90vw',
                background: 'var(--paper)',
                borderRadius: 20,
                boxShadow: '0 40px 100px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(26,25,21,0.15)',
                overflow: 'hidden',
                cursor: 'default',
            }, children: [_jsxs("div", { style: {
                        height: 320,
                        background: memory.imageUrl ? 'var(--paper-3)' : bg,
                        position: 'relative',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                    }, children: [memory.imageUrl ? (_jsx("img", { src: memory.imageUrl, alt: memory.title, style: { width: '100%', height: '100%', objectFit: 'cover' } })) : (_jsxs("div", { style: { textAlign: 'center', padding: 32 }, children: [_jsx("div", { style: {
                                        fontFamily: 'var(--serif)', fontSize: 56, lineHeight: 1,
                                        color: 'var(--ink)', opacity: 0.15, marginBottom: 16,
                                    }, children: "\u25FB" }), _jsx("div", { style: {
                                        fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)',
                                        opacity: 0.5, lineHeight: 1.3,
                                    }, children: memory.title })] })), _jsx("div", { style: {
                                position: 'absolute', top: 16, left: 16,
                                padding: '5px 12px', borderRadius: 999,
                                background: 'rgba(250,247,242,0.92)',
                                fontFamily: 'var(--cmono)', fontSize: 10,
                                letterSpacing: '0.14em', textTransform: 'uppercase',
                                color: 'var(--ink-2)',
                            }, children: memory.tag }), _jsx("button", { onClick: onDismiss, style: {
                                position: 'absolute', top: 12, right: 12,
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'rgba(26,25,21,0.5)',
                                color: 'var(--paper)', border: 'none',
                                fontSize: 18, lineHeight: 1, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }, children: "\u00D7" })] }), _jsxs("div", { style: { padding: '24px 28px 28px' }, children: [_jsx("div", { style: {
                                fontFamily: 'var(--serif)', fontSize: 26, lineHeight: 1.1,
                                color: 'var(--ink)', marginBottom: 10,
                            }, children: memory.title }), _jsx("div", { style: {
                                fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6,
                                marginBottom: 16,
                            }, children: memory.desc }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: memory.tags.map(t => (_jsx("span", { style: {
                                    padding: '4px 10px', borderRadius: 999,
                                    background: 'var(--paper-2)', border: '0.5px solid var(--hair)',
                                    fontFamily: 'var(--cmono)', fontSize: 10.5,
                                    letterSpacing: '0.08em', color: 'var(--ink-3)',
                                }, children: t }, t))) })] })] }) }));
}
