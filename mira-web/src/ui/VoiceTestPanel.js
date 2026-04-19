import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { useMicLevel } from '../hooks/useMicLevel';
import { GeminiLiveEngine } from '../engine/GeminiLiveEngine';
export function VoiceTestPanel() {
    // ── Mic ──────────────────────────────────────────────────────
    const { level, start: startMic, stop: stopMic } = useMicLevel();
    const [micActive, setMicActive] = useState(false);
    async function toggleMic() {
        if (micActive) {
            stopMic();
            setMicActive(false);
        }
        else {
            await startMic();
            setMicActive(true);
        }
    }
    // ── Speaker ──────────────────────────────────────────────────
    const [tonesPlaying, setTonesPlaying] = useState(false);
    function playTone(freq) {
        if (tonesPlaying)
            return;
        setTonesPlaying(true);
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
        osc.onended = () => { ctx.close(); setTonesPlaying(false); };
    }
    // ── Gemini round-trip ─────────────────────────────────────────
    const [geminiState, setGeminiState] = useState('idle');
    const [geminiLog, setGeminiLog] = useState([]);
    const engineRef = useRef(null);
    function log(msg) {
        setGeminiLog(prev => [...prev.slice(-7), msg]);
    }
    async function startGeminiTest() {
        setGeminiState('connecting');
        setGeminiLog([]);
        const engine = new GeminiLiveEngine({
            onConnected: () => { setGeminiState('listening'); log('Connected to Gemini'); engine.injectGreeting('Say exactly: "Audio test successful."'); },
            onDisconnected: () => { setGeminiState('idle'); log('Disconnected'); },
            onSpeakingStart: () => { setGeminiState('speaking'); log('Mira speaking…'); },
            onSpeakingEnd: () => { setGeminiState('listening'); log('Listening…'); },
            onAssistantText: (t) => log(`Mira: ${t.slice(0, 60)}`),
            onUserTranscript: (t) => log(`You: ${t.slice(0, 60)}`),
            onArduinoCommand: (cmd) => log(`face: ${cmd.face ?? ''}${cmd.wave ? ' + wave' : ''}`),
            onCaregiverAlert: (s, r) => log(`alert[${s}]: ${r}`),
            onError: (e) => { setGeminiState('idle'); log(`Error: ${e.message}`); },
        });
        engineRef.current = engine;
        try {
            await engine.start();
        }
        catch (e) {
            setGeminiState('idle');
            log(`Failed: ${String(e)}`);
        }
    }
    async function stopGeminiTest() {
        await engineRef.current?.stop();
        engineRef.current = null;
        setGeminiState('idle');
        log('Session stopped');
    }
    return (_jsxs("div", { className: "voice-test", children: [_jsxs("div", { className: "card", children: [_jsx("div", { className: "card__label", children: "01 \u2014 Microphone" }), _jsx("div", { className: "card__title", children: "Input Capture" }), _jsx("div", { className: "card__desc", children: "Verify your mic is captured. Speak and watch the level meter respond." }), _jsx("button", { type: "button", className: `btn btn--sm ${micActive ? 'btn--danger' : 'btn--ghost'}`, onClick: toggleMic, children: micActive ? 'Stop Mic' : 'Start Mic' }), _jsx("div", { className: "mic-meter", children: _jsx("div", { className: "mic-meter__bar", style: { width: `${level * 100}%` } }) }), _jsx("div", { className: "test-status", children: micActive ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "dot dot--pulse", style: { color: 'var(--green)' } }), "Mic active \u2014 speak to see level"] })) : ('Mic off') })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card__label", children: "02 \u2014 Speaker" }), _jsx("div", { className: "card__title", children: "Audio Output" }), _jsx("div", { className: "card__desc", children: "Play a tone to confirm audio output is working through your speakers." }), _jsx("div", { className: "tone-row", children: [220, 440, 880].map(f => (_jsxs("button", { type: "button", className: "btn btn--sm btn--ghost", onClick: () => playTone(f), disabled: tonesPlaying, children: [f, " Hz"] }, f))) }), _jsx("div", { className: "test-status", children: tonesPlaying ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "dot dot--pulse", style: { color: 'var(--amber)' } }), "Playing tone\u2026"] })) : ('Select a frequency to play') })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card__label", children: "03 \u2014 Gemini Live" }), _jsx("div", { className: "card__title", children: "Full Round-Trip" }), _jsx("div", { className: "card__desc", children: "Opens a minimal Gemini session with audio only. Mira will speak a test phrase, then you can talk to verify the full pipeline." }), geminiState === 'idle'
                        ? _jsx("button", { type: "button", className: "btn btn--sm btn--primary", onClick: startGeminiTest, children: "Start Test" })
                        : (_jsxs("div", { style: { display: 'flex', gap: 10, alignItems: 'center' }, children: [_jsxs("span", { className: `pill pill--${geminiState}`, children: [_jsx("span", { className: "dot dot--pulse" }), geminiState === 'speaking' ? 'Speaking' : geminiState === 'connecting' ? 'Connecting' : 'Listening'] }), _jsx("button", { type: "button", className: "btn btn--sm btn--danger", onClick: stopGeminiTest, children: "Stop" })] })), geminiLog.length > 0 && (_jsx("div", { className: "gemini-log", children: geminiLog.map((line, i) => (_jsx("div", { className: "gemini-log__line", children: line }, i))) }))] })] }));
}
