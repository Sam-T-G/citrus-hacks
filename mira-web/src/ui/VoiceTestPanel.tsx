import { useState, useRef } from 'react';
import { useMicLevel }       from '../hooks/useMicLevel';
import { GeminiLiveEngine }  from '../engine/GeminiLiveEngine';
import type { EngineState }  from '../types';

export function VoiceTestPanel() {
  // ── Mic ──────────────────────────────────────────────────────
  const { level, start: startMic, stop: stopMic } = useMicLevel();
  const [micActive, setMicActive] = useState(false);

  async function toggleMic() {
    if (micActive) { stopMic(); setMicActive(false); }
    else           { await startMic(); setMicActive(true); }
  }

  // ── Speaker ──────────────────────────────────────────────────
  const [tonesPlaying, setTonesPlaying] = useState(false);

  function playTone(freq: number) {
    if (tonesPlaying) return;
    setTonesPlaying(true);
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
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
  const [geminiState, setGeminiState] = useState<EngineState>('idle');
  const [geminiLog,   setGeminiLog]   = useState<string[]>([]);
  const engineRef = useRef<GeminiLiveEngine | null>(null);

  function log(msg: string) {
    setGeminiLog(prev => [...prev.slice(-7), msg]);
  }

  async function startGeminiTest() {
    setGeminiState('connecting');
    setGeminiLog([]);
    const engine = new GeminiLiveEngine({
      onConnected:      () => { setGeminiState('listening'); log('Connected to Gemini'); engine.injectGreeting('Say exactly: "Audio test successful."'); },
      onDisconnected:   () => { setGeminiState('idle'); log('Disconnected'); },
      onSpeakingStart:  () => { setGeminiState('speaking'); log('Mira speaking…'); },
      onSpeakingEnd:    () => { setGeminiState('listening'); log('Listening…'); },
      onAssistantText:   (t) => log(`Mira: ${t.slice(0, 60)}`),
      onUserTranscript:  (t) => log(`You: ${t.slice(0, 60)}`),
      onArduinoCommand:  (cmd) => log(`face: ${cmd.face ?? ''}${cmd.wave ? ' + wave' : ''}`),
      onCaregiverAlert:  (s, r) => log(`alert[${s}]: ${r}`),
      onError:           (e) => { setGeminiState('idle'); log(`Error: ${e.message}`); },
    });
    engineRef.current = engine;
    try { await engine.start(); }
    catch (e) { setGeminiState('idle'); log(`Failed: ${String(e)}`); }
  }

  async function stopGeminiTest() {
    await engineRef.current?.stop();
    engineRef.current = null;
    setGeminiState('idle');
    log('Session stopped');
  }

  return (
    <div className="voice-test">

      {/* ── Mic ────────────────────────────────────────────── */}
      <div className="card">
        <div className="card__label">01 — Microphone</div>
        <div className="card__title">Input Capture</div>
        <div className="card__desc">Verify your mic is captured. Speak and watch the level meter respond.</div>
        <button
          type="button"
          className={`btn btn--sm ${micActive ? 'btn--danger' : 'btn--ghost'}`}
          onClick={toggleMic}
        >
          {micActive ? 'Stop Mic' : 'Start Mic'}
        </button>
        <div className="mic-meter">
          <div className="mic-meter__bar" style={{ width: `${level * 100}%` }} />
        </div>
        <div className="test-status">
          {micActive ? (
            <>
              <span className="dot dot--pulse" style={{ color: 'var(--green)' }} />
              Mic active — speak to see level
            </>
          ) : (
            'Mic off'
          )}
        </div>
      </div>

      {/* ── Speaker ────────────────────────────────────────── */}
      <div className="card">
        <div className="card__label">02 — Speaker</div>
        <div className="card__title">Audio Output</div>
        <div className="card__desc">Play a tone to confirm audio output is working through your speakers.</div>
        <div className="tone-row">
          {([220, 440, 880] as const).map(f => (
            <button
              type="button"
              key={f}
              className="btn btn--sm btn--ghost"
              onClick={() => playTone(f)}
              disabled={tonesPlaying}
            >
              {f} Hz
            </button>
          ))}
        </div>
        <div className="test-status">
          {tonesPlaying ? (
            <>
              <span className="dot dot--pulse" style={{ color: 'var(--amber)' }} />
              Playing tone…
            </>
          ) : (
            'Select a frequency to play'
          )}
        </div>
      </div>

      {/* ── Gemini round-trip ──────────────────────────────── */}
      <div className="card">
        <div className="card__label">03 — Gemini Live</div>
        <div className="card__title">Full Round-Trip</div>
        <div className="card__desc">
          Opens a minimal Gemini session with audio only. Mira will speak a test phrase,
          then you can talk to verify the full pipeline.
        </div>
        {geminiState === 'idle'
          ? <button type="button" className="btn btn--sm btn--primary" onClick={startGeminiTest}>Start Test</button>
          : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className={`pill pill--${geminiState}`}>
                <span className="dot dot--pulse" />
                {geminiState === 'speaking' ? 'Speaking' : geminiState === 'connecting' ? 'Connecting' : 'Listening'}
              </span>
              <button type="button" className="btn btn--sm btn--danger" onClick={stopGeminiTest}>Stop</button>
            </div>
          )
        }
        {geminiLog.length > 0 && (
          <div className="gemini-log">
            {geminiLog.map((line, i) => (
              <div key={i} className="gemini-log__line">{line}</div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
