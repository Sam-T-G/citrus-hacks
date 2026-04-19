/**
 * Standalone panel for testing each piece of the audio pipeline in isolation
 * before running a full session.
 *
 * Section 1 — Microphone: starts mic capture and shows a live level meter.
 * Section 2 — Speaker:    plays a generated sine-wave tone at selectable pitch.
 * Section 3 — Gemini:     opens a minimal Gemini Live session (audio only, no
 *              camera) so you can confirm the full round-trip works.
 */
import { useState, useRef } from 'react';
import { useMicLevel }       from '../hooks/useMicLevel';
import { AudioPlayer }       from '../audio/AudioPlayer';
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
    setGeminiLog(prev => [...prev.slice(-6), msg]);
  }

  async function startGeminiTest() {
    setGeminiState('connecting');
    setGeminiLog([]);
    const engine = new GeminiLiveEngine({
      onConnected:      () => { setGeminiState('listening'); log('✓ Connected to Gemini'); engine.injectGreeting('Say exactly: "Audio test successful."'); },
      onDisconnected:   () => { setGeminiState('idle'); log('Disconnected'); },
      onSpeakingStart:  () => { setGeminiState('speaking'); log('▶ Mira speaking…'); },
      onSpeakingEnd:    () => { setGeminiState('listening'); log('◉ Listening…'); },
      onAssistantText:  (t) => log(`Mira: ${t.slice(0, 60)}`),
      onUserTranscript: (t) => log(`You: ${t.slice(0, 60)}`),
      onError:          (e) => { setGeminiState('idle'); log(`✗ ${e.message}`); },
    });
    engineRef.current = engine;
    try { await engine.start(); }
    catch (e) { setGeminiState('idle'); log(`✗ ${String(e)}`); }
  }

  async function stopGeminiTest() {
    await engineRef.current?.stop();
    engineRef.current = null;
    setGeminiState('idle');
    log('Session stopped');
  }

  const playerRef = useRef<AudioPlayer | null>(null);
  if (!playerRef.current) playerRef.current = new AudioPlayer();

  return (
    <div className="voice-test">

      {/* ── Mic ────────────────────────────────────────────── */}
      <div className="card test-section">
        <div className="card__label">1 — Microphone</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
          Verify your mic is captured. Speak and watch the level bar respond.
        </p>
        <button type="button" className={`btn btn--sm ${micActive ? 'btn--danger' : 'btn--ghost'}`} onClick={toggleMic}>
          {micActive ? 'Stop Mic' : 'Start Mic'}
        </button>
        <div className="mic-meter">
          <div className="mic-meter__bar" style={{ width: `${level * 100}%` }} />
        </div>
        <p className="test-status">{micActive ? 'Mic active — speak to see level' : 'Mic off'}</p>
      </div>

      {/* ── Speaker ────────────────────────────────────────── */}
      <div className="card test-section">
        <div className="card__label">2 — Speaker</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
          Play a tone to confirm audio output is working.
        </p>
        <div className="tone-row">
          {([220, 440, 880] as const).map(f => (
            <button type="button" key={f} className="btn btn--sm btn--ghost" onClick={() => playTone(f)} disabled={tonesPlaying}>
              {f} Hz
            </button>
          ))}
        </div>
        <p className="test-status">{tonesPlaying ? '▶ Playing tone…' : 'Press a button to play'}</p>
      </div>

      {/* ── Gemini round-trip ──────────────────────────────── */}
      <div className="card test-section">
        <div className="card__label">3 — Gemini Live Round-Trip</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
          Opens a minimal Gemini session (audio only). Mira will say a test phrase,
          then you can speak to confirm the full pipeline.
        </p>
        {geminiState === 'idle'
          ? <button type="button" className="btn btn--sm btn--primary" onClick={startGeminiTest}>Start Test</button>
          : <button type="button" className="btn btn--sm btn--danger"  onClick={stopGeminiTest}>Stop</button>
        }
        <p className="test-status">
          {geminiState !== 'idle' && <span className={`pill pill--${geminiState}`} style={{ marginRight: 8 }}><span className="dot dot--pulse" />{geminiState}</span>}
        </p>
        {geminiLog.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {geminiLog.map((line, i) => (
              <div key={i} style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{line}</div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
