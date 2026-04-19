import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react';
import { GeminiLiveEngine }     from '../engine/GeminiLiveEngine';
import type { GeminiObservation } from '../engine/GeminiLiveEngine';
import { BehaviorRouter }       from '../behavior/BehaviorRouter';
import { SerialBridge }         from '../arduino/SerialBridge';
import { notificationService }  from '../services/NotificationService';
import { GREETING_PROMPT, buildSystemPrompt, SYSTEM_PROMPT } from '../config';
import { usePatientData }       from '../companion/PatientContext';
import type { TranscriptEntry, EngineState, ArduinoCommand, AlertSeverity } from '../types';

export interface ActiveAlert {
  id:       string;
  severity: AlertSeverity;
  reason:   string;
}

interface SessionState {
  engineState:        EngineState;
  transcript:         TranscriptEntry[];
  liveUser:           string;
  lastCmd:            ArduinoCommand | null;
  serialStatus:       'connected' | 'disconnected';
  errorMsg:           string | null;
  alerts:             ActiveAlert[];
  geminiObservations: GeminiObservation[];
  sessionActive:      boolean;
  engineRef:          React.RefObject<GeminiLiveEngine | null>;
  startSession:       () => Promise<void>;
  stopSession:        () => Promise<void>;
  connectSerial:      () => Promise<void>;
  dismissAlert:       (id: string) => void;
  clearError:         () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { store } = usePatientData();
  const [engineState,  setEngineState]  = useState<EngineState>('idle');
  const [transcript,   setTranscript]   = useState<TranscriptEntry[]>([]);
  const [liveUser,     setLiveUser]     = useState('');
  const [lastCmd,      setLastCmd]      = useState<ArduinoCommand | null>(null);
  const [serialStatus, setSerialStatus] = useState<'disconnected' | 'connected'>('disconnected');
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [alerts,             setAlerts]             = useState<ActiveAlert[]>([]);
  const [geminiObservations, setGeminiObservations] = useState<GeminiObservation[]>([]);

  const engineRef    = useRef<GeminiLiveEngine | null>(null);
  const routerRef    = useRef<BehaviorRouter   | null>(null);
  const serialRef    = useRef<SerialBridge     | null>(null);
  const liveUserRef  = useRef('');

  const addEntry = useCallback((role: 'user' | 'assistant', text: string) => {
    if (!text.trim()) return;
    setTranscript(prev => [...prev, { role, text, ts: Date.now() }]);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const startSession = useCallback(async () => {
    setErrorMsg(null);
    setEngineState('connecting');
    notificationService.requestPermission();

    const router = new BehaviorRouter(serialRef.current);
    routerRef.current = router;

    const systemPrompt = store ? buildSystemPrompt(store) : SYSTEM_PROMPT;
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
        const spoken = liveUserRef.current.trim();
        if (spoken) setTranscript(prev => [...prev, { role: 'user', text: spoken, ts: Date.now() }]);
        liveUserRef.current = '';
        setLiveUser('');
      },
      onSpeakingEnd: () => {
        setEngineState('listening');
        router.onSpeakingEnd();
      },
      onAssistantText: (text) => addEntry('assistant', text),
      onUserTranscript: (text) => {
        liveUserRef.current += text;
        setLiveUser(liveUserRef.current);
      },
      onArduinoCommand: (cmd) => {
        setLastCmd(cmd);
        router.onArduinoCommand(cmd);
      },
      onCaregiverAlert: (severity, reason) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        setAlerts(prev => [...prev, { id, severity, reason }]);
        if (severity === 'low') setTimeout(() => dismissAlert(id), 30_000);
        notificationService.notify(severity, reason, `mira-alert-${severity}`);
      },
      onVisualObservation: (obs) => {
        setGeminiObservations(prev => [...prev.slice(-29), obs]);
      },
      onError: (e) => setErrorMsg(e.message),
    }, systemPrompt);

    engineRef.current = engine;
    try { await engine.start(); }
    catch (e) { setEngineState('idle'); setErrorMsg(String(e)); }
  }, [addEntry, dismissAlert, store]);

  const stopSession = useCallback(async () => {
    await engineRef.current?.stop();
    routerRef.current?.setIdle();
    engineRef.current = null;
    routerRef.current = null;
    setEngineState('idle');
    setTranscript([]);
    setLiveUser('');
    liveUserRef.current = '';
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

  return (
    <SessionContext.Provider value={{
      engineState, transcript, liveUser, lastCmd, serialStatus, errorMsg, alerts,
      geminiObservations,
      sessionActive: engineState !== 'idle',
      engineRef,
      startSession, stopSession, connectSerial, dismissAlert,
      clearError: () => setErrorMsg(null),
    }}>
      {children}
    </SessionContext.Provider>
  );
}
