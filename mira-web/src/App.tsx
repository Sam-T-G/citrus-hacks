import { useRef, useState, useCallback } from 'react';
import { GeminiLiveEngine }  from './engine/GeminiLiveEngine';
import { BehaviorRouter }    from './behavior/BehaviorRouter';
import { SerialBridge }      from './arduino/SerialBridge';
import { parseResponse }     from './behavior/CommandParser';
import { GREETING_PROMPT }   from './config';
import { StatusBar }         from './ui/StatusBar';
import { CameraPreview }     from './ui/CameraPreview';
import { TranscriptPanel }   from './ui/TranscriptPanel';
import { VoiceTestPanel }    from './ui/VoiceTestPanel';
import './ui/styles.css';
import type { TranscriptEntry, EngineState, ArduinoCommand } from './types';

type Tab = 'session' | 'test';

export default function App() {
  const [tab,          setTab]          = useState<Tab>('session');
  const [engineState,  setEngineState]  = useState<EngineState>('idle');
  const [transcript,   setTranscript]   = useState<TranscriptEntry[]>([]);
  const [lastCmd,      setLastCmd]      = useState<ArduinoCommand | null>(null);
  const [serialStatus, setSerialStatus] = useState<'disconnected' | 'connected'>('disconnected');
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);

  const engineRef = useRef<GeminiLiveEngine | null>(null);
  const routerRef = useRef<BehaviorRouter   | null>(null);
  const serialRef = useRef<SerialBridge     | null>(null);

  const addEntry = useCallback((role: 'user' | 'assistant', text: string) => {
    if (!text.trim()) return;
    setTranscript(prev => [...prev, { role, text, ts: Date.now() }]);
  }, []);

  const startSession = useCallback(async () => {
    setErrorMsg(null);
    setEngineState('connecting');

    const router = new BehaviorRouter(serialRef.current);
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
      onSpeakingStart: () => { setEngineState('speaking'); router.onSpeakingStart(); },
      onSpeakingEnd:   () => { setEngineState('listening'); router.onSpeakingEnd(); },
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
    try { await engine.start(); }
    catch (e) { setEngineState('idle'); setErrorMsg(String(e)); }
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
      setErrorMsg('Web Serial requires Chrome or Edge.');
      return;
    }
    try {
      const bridge = new SerialBridge();
      await bridge.connect();
      serialRef.current = bridge;
      setSerialStatus('connected');
    } catch (e) { setErrorMsg(String(e)); }
  }, []);

  const sessionActive = engineState !== 'idle';

  return (
    <div className="app">
      <StatusBar engineState={engineState} serialStatus={serialStatus} />

      <div className="tabs">
        <button type="button" className={`tab${tab === 'session' ? ' tab--active' : ''}`} onClick={() => setTab('session')}>Session</button>
        <button type="button" className={`tab${tab === 'test'    ? ' tab--active' : ''}`} onClick={() => setTab('test')}>Voice Test</button>
      </div>

      {tab === 'session' && (
        <div className="app__body">
          <div className="app__left">
            <CameraPreview
              camera={engineRef.current?.cameraCapture ?? null}
              lastCmd={lastCmd}
              active={sessionActive}
            />
          </div>
          <div className="app__right">
            <TranscriptPanel entries={transcript} />
          </div>
        </div>
      )}

      {tab === 'test' && <VoiceTestPanel />}

      {errorMsg && (
        <div className="error-banner">
          <span>{errorMsg}</span>
          <button type="button" className="error-banner__close" onClick={() => setErrorMsg(null)}>✕</button>
        </div>
      )}

      <div className="controls">
        {!sessionActive
          ? <button type="button" className="btn btn--primary" onClick={startSession}>Start Session</button>
          : <button type="button" className="btn btn--danger"  onClick={stopSession}>Stop Session</button>
        }
        {serialStatus === 'disconnected' && (
          <button type="button" className="btn btn--ghost" onClick={connectSerial}>Connect Arduino</button>
        )}
      </div>
    </div>
  );
}
