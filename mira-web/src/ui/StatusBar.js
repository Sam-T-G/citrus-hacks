import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const LABELS = {
    idle: 'Idle',
    connecting: 'Connecting',
    listening: 'Listening',
    speaking: 'Speaking',
};
export function StatusBar({ engineState, serialStatus }) {
    const active = engineState !== 'idle';
    return (_jsxs("header", { className: "statusbar", children: [_jsxs("div", { className: "statusbar__brand", children: [_jsx("div", { className: "statusbar__logo", children: "\uD83E\uDD89" }), _jsx("span", { className: "statusbar__name", children: "MIRA" })] }), _jsx("div", { className: "statusbar__divider" }), _jsxs("span", { className: `pill pill--${engineState}`, children: [_jsx("span", { className: `dot${active ? ' dot--pulse' : ''}` }), LABELS[engineState], engineState === 'speaking' && (_jsxs("span", { className: "waveform", style: { marginLeft: 2 }, children: [_jsx("span", { className: "waveform__bar" }), _jsx("span", { className: "waveform__bar" }), _jsx("span", { className: "waveform__bar" }), _jsx("span", { className: "waveform__bar" }), _jsx("span", { className: "waveform__bar" })] }))] }), _jsx("div", { className: "statusbar__right", children: _jsxs("span", { className: `serial-badge${serialStatus === 'connected' ? ' serial-badge--on' : ''}`, children: [_jsx("span", { className: "serial-badge__dot" }), serialStatus === 'connected' ? 'Arduino' : 'No Arduino'] }) })] }));
}
