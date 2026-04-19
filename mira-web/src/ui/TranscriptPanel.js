import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect } from 'react';
function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
export function TranscriptPanel({ entries, liveUser }) {
    const scrollRef = useRef(null);
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [entries, liveUser]);
    const isEmpty = entries.length === 0 && !liveUser;
    return (_jsxs("div", { className: "transcript-panel", children: [_jsx("div", { className: "transcript-header", children: _jsx("div", { className: "transcript-header__title", children: "Conversation" }) }), _jsxs("div", { className: "transcript", ref: scrollRef, children: [isEmpty && (_jsxs("div", { className: "transcript__empty", children: [_jsx("div", { className: "transcript__empty-icon", children: "\uD83D\uDCAC" }), _jsx("p", { children: "Start a session to begin your conversation with Mira." })] })), entries.map(e => (_jsxs("div", { className: `message message--${e.role}`, children: [_jsx("span", { className: "message__role", children: e.role === 'user' ? 'You' : 'Mira' }), _jsx("div", { className: "message__bubble", children: e.text }), _jsx("span", { className: "message__time", children: formatTime(e.ts) })] }, e.ts))), liveUser && (_jsxs("div", { className: "message message--user", children: [_jsx("span", { className: "message__role", children: "You" }), _jsxs("div", { className: "message__bubble message__bubble--live", children: [liveUser, _jsx("span", { className: "transcript__cursor" })] })] }))] })] }));
}
