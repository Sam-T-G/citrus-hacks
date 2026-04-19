import { useRef, useState, useCallback, useEffect } from 'react';
import { GeminiLiveEngine }  from './engine/GeminiLiveEngine';
import { BehaviorRouter }    from './behavior/BehaviorRouter';
import { SerialBridge }      from './arduino/SerialBridge';
import { parseResponse }     from './behavior/CommandParser';
import { GREETING_PROMPT }   from './config';
import type { TranscriptEntry, EngineState, ArduinoCommand } from './types';

const IDLE_COLOR:      string = '#1a1a2e';
const SPEAKING_COLOR:  string = '#16213e';
const LISTENING_COLOR: string = '#0f3460';

export default function App() {
  const [engineState,   setEngineState]   = useState<EngineState>('idle');
  const [transcript,    setTranscript]    = useState<TranscriptEntry[]>([]);
  const [lastCmd,       setLastCmd]       = useState<ArduinoCommand | null>(null);
  const [serialStatus,  setSerialStatus]  = useState<'disconnected' | 'connected'>('disconnected');
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);

  const engineRef  = useRef<GeminiLiveEngine | null>(null);
  const routerRef  = useRef<BehaviorRouter   | null>(null);
  const serialRef  = useRef<SerialBridge     | null>(null);
  const videoRef   = useRef<HTMLVideoElement | null>(null);
  const scrollRef  = useRef<HTMLDivElement   | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  const addEntry = useCallback((role: 'user' | 'assistant', text: string) => {
    if (!text.trim()) return;
    setTranscript(prev => [...prev, { role, text, ts: Date.now() }]);
  }, []);

  const startSession = useCallback(async () => {
    setErrorMsg(null);
    setEngineState('connecting');

    const serial = serialRef.current ?? null;
    const router = new BehaviorRouter(serial);
    routerRef.current = router;

    const engine = new GeminiLiveEngine({
      onConnected: async () => {
        setEngineState('listening');
        await engine.injectGreeting(GREETING_PROMPT);
      },
      onDisconnected: (reason) => {
        setEngineState('idle');
        if (reason) setErrorMsg(`Disconnected: ${reason}`);
      },
      onSpeakingStart: () => {
        setEngineState('speaking');
        router.onSpeakingStart();
      },
      onSpeakingEnd: () => {
        setEngineState('listening');
        router.onSpeakingEnd();
      },
      onAssistantText: async (text) => {
        const spoken = await router.onAssistantText(text);
        addEntry('assistant', spoken || text);
        const { cmd } = parseResponse(text);
        if (Object.keys(cmd).length > 0) setLastCmd(cmd);
      },
      onUserTranscript: (text) => addEntry('user', text),
      onError: (e) => setErrorMsg(e.message),
    });

    engineRef.current = engine;

    // Attach camera preview to the <video> element
    if (videoRef.current) {
      engine.cameraCapture.attachPreview(videoRef.current);
    }

    try {
      await engine.start();
    } catch (e) {
      setEngineState('idle');
      setErrorMsg(String(e));
    }
  }, [addEntry]);

  const stopSession = useCallback(async () => {
    await engineRef.current?.stop();
    routerRef.current?.setIdle();
    engineRef.current = null;
    routerRef.current = null;
    setEngineState('idle');
    setTranscript([]);
    setLastCmd(null);
  }, []);

  const connectSerial = useCallback(async () => {
    if (!SerialBridge.isSupported()) {
      setErrorMsg('Web Serial API not supported. Use Chrome or Edge.');
      return;
    }
    try {
      const bridge = new SerialBridge();
      await bridge.connect();
      serialRef.current = bridge;
      setSerialStatus('connected');
      // If router exists, update it
      if (routerRef.current) {
        routerRef.current = new BehaviorRouter(bridge);
      }
    } catch (e) {
      setErrorMsg(String(e));
    }
  }, []);

  const bgColor = engineState === 'speaking'  ? SPEAKING_COLOR
                : engineState === 'listening' ? LISTENING_COLOR
                : IDLE_COLOR;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: bgColor, color: '#fff', fontFamily: 'system-ui, sans-serif', transition: 'background 0.4s' }}>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: 2 }}>MIRA</span>
        <StatusPill state={engineState} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ opacity: 0.6 }}>Arduino:</span>
          <span style={{ color: serialStatus === 'connected' ? '#4ade80' : '#f87171' }}>
            {serialStatus === 'connected' ? '● Connected' : '○ Disconnected'}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Camera panel */}
        <div style={{ width: 400, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ padding: '12px 16px', opacity: 0.5, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Camera</div>
          <video
            ref={videoRef}
            autoPlay muted playsInline
            style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', background: '#000' }}
          />
          {lastCmd && (
            <div style={{ padding: 16, fontSize: 13 }}>
              <div style={{ opacity: 0.5, marginBottom: 8, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Last Arduino Command</div>
              <pre style={{ margin: 0, color: '#a3e635', fontSize: 12 }}>{JSON.stringify(lastCmd, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Transcript panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', opacity: 0.5, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Conversation</div>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
            {transcript.length === 0 && (
              <div style={{ opacity: 0.3, marginTop: 40, textAlign: 'center' }}>
                Start a session to begin
              </div>
            )}
            {transcript.map((entry) => (
              <div key={entry.ts} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {entry.role === 'user' ? 'You' : 'Mira'}
                </div>
                <div style={{
                  background: entry.role === 'user' ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.2)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  lineHeight: 1.5,
                  fontSize: 15,
                }}>
                  {entry.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div style={{ background: '#7f1d1d', padding: '10px 20px', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {engineState === 'idle' ? (
          <button onClick={startSession} style={btnStyle('#4f46e5')}>Start Session</button>
        ) : (
          <button onClick={stopSession} style={btnStyle('#dc2626')}>Stop Session</button>
        )}
        {serialStatus === 'disconnected' && (
          <button onClick={connectSerial} style={btnStyle('#059669')}>Connect Arduino</button>
        )}
      </div>
    </div>
  );
}

function StatusPill({ state }: { state: EngineState }) {
  const labels: Record<EngineState, string> = {
    idle:       '○ Idle',
    connecting: '◌ Connecting…',
    listening:  '◉ Listening',
    speaking:   '▶ Speaking',
  };
  const colors: Record<EngineState, string> = {
    idle:       'rgba(255,255,255,0.2)',
    connecting: '#f59e0b',
    listening:  '#4ade80',
    speaking:   '#818cf8',
  };
  return (
    <span style={{ background: colors[state], color: '#fff', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      {labels[state]}
    </span>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
}
