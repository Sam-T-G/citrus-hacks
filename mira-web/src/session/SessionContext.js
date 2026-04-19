import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useRef, useState, useCallback } from 'react';
import { GeminiLiveEngine } from '../engine/GeminiLiveEngine';
import { BehaviorRouter } from '../behavior/BehaviorRouter';
import { SerialBridge } from '../arduino/SerialBridge';
import { CameraCapture } from '../vision/CameraCapture';
import { VisionPipeline } from '../vision/VisionPipeline';
import { notificationService } from '../services/NotificationService';
import { logService } from '../services/LogService';
import { GREETING_PROMPT, buildSystemPrompt, SYSTEM_PROMPT } from '../config';
import { usePatientData } from '../companion/PatientContext';
const SessionContext = createContext(null);
export function useSession() {
    const ctx = useContext(SessionContext);
    if (!ctx)
        throw new Error('useSession must be used inside SessionProvider');
    return ctx;
}
export function SessionProvider({ children }) {
    const { store } = usePatientData();
    const [engineState, setEngineState] = useState('idle');
    const [transcript, setTranscript] = useState([]);
    const [liveUser, setLiveUser] = useState('');
    const [lastCmd, setLastCmd] = useState(null);
    const [serialStatus, setSerialStatus] = useState('disconnected');
    const [trackingActive, setTrackingActive] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [geminiObservations, setGeminiObservations] = useState([]);
    const [displayedPhotoId, setDisplayedPhotoId] = useState(null);
    const engineRef = useRef(null);
    const routerRef = useRef(null);
    const serialRef = useRef(null);
    const cameraRef = useRef(null);
    const visionRef = useRef(null);
    const liveUserRef = useRef('');
    const reconnectRef = useRef(false); // true while an auto-reconnect is scheduled
    const addEntry = useCallback((role, text) => {
        if (!text.trim())
            return;
        setTranscript(prev => [...prev, { role, text, ts: Date.now() }]);
    }, []);
    const dismissAlert = useCallback((id) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);
    /**
     * Open the camera and start pan tracking immediately — independent of Gemini.
     * Called automatically when serial connects. Idempotent.
     */
    const startTracking = useCallback(async () => {
        if (cameraRef.current?.isStreaming)
            return;
        try {
            const camera = new CameraCapture();
            await camera.startVideoOnly();
            // Safety concern cooldown for pan-only mode
            let lastSafetyConcernTs = 0;
            const vision = new VisionPipeline({
                onCue: () => { },
                onStateUpdate: () => { },
                onSafetyConcern: (cue, conf) => {
                    const now = Date.now();
                    if (now - lastSafetyConcernTs < 30_000)
                        return;
                    lastSafetyConcernTs = now;
                    const isFall = cue === 'fall_suspected';
                    const severity = isFall ? 'high' : 'medium';
                    const reason = isFall
                        ? `Possible fall detected (${(conf * 100).toFixed(0)}% confidence)`
                        : cue === 'body_horizontal'
                            ? 'Patient appears to be lying down — position monitoring active'
                            : `Safety concern: ${cue.replace(/_/g, ' ')} (${(conf * 100).toFixed(0)}%)`;
                    logService.alert({ severity, reason });
                    notificationService.notify(severity, reason, `mira-safety-${cue}`);
                    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
                    setAlerts(prev => [...prev, { id, severity, reason }]);
                },
                onFacePan: (px) => serialRef.current?.sendPan(px),
            });
            // init() downloads MediaPipe models from CDN (~2–5s); non-blocking
            vision.init()
                .then(() => {
                const videoEl = camera.getVideoElement();
                if (videoEl)
                    vision.start(videoEl);
            })
                .catch(e => console.warn('[Tracking] VisionPipeline init failed:', e));
            cameraRef.current = camera;
            visionRef.current = vision;
            setTrackingActive(true);
        }
        catch (e) {
            setErrorMsg(`Camera access failed: ${String(e)}`);
        }
    }, []);
    const startSession = useCallback(async () => {
        reconnectRef.current = false;
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
                engineRef.current = null;
                routerRef.current = null;
                const isDeadline = reason?.toLowerCase().includes('deadline') ||
                    reason?.toLowerCase().includes('expired') ||
                    reason?.toLowerCase().includes('timeout');
                if (isDeadline && !reconnectRef.current) {
                    reconnectRef.current = true;
                    setTimeout(() => startSession(), 1_500);
                }
                else if (reason && !isDeadline) {
                    setErrorMsg(`Disconnected: ${reason}`);
                }
            },
            onSpeakingStart: () => {
                setEngineState('speaking');
                router.onSpeakingStart();
                const spoken = liveUserRef.current.trim();
                if (spoken) {
                    setTranscript(prev => [...prev, { role: 'user', text: spoken, ts: Date.now() }]);
                    logService.turn({ role: 'user', text: spoken });
                }
                liveUserRef.current = '';
                setLiveUser('');
            },
            onSpeakingEnd: () => {
                setEngineState('listening');
                router.onSpeakingEnd();
            },
            onAssistantText: (text) => {
                addEntry('assistant', text);
                logService.turn({ role: 'assistant', text });
            },
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
                if (severity === 'low')
                    setTimeout(() => dismissAlert(id), 30_000);
                notificationService.notify(severity, reason, `mira-alert-${severity}`);
            },
            onVisualObservation: (obs) => {
                setGeminiObservations(prev => [...prev.slice(-29), obs]);
            },
            onPhotoDisplay: (photoId) => {
                setDisplayedPhotoId(photoId);
            },
            onFacePan: (px) => {
                serialRef.current?.sendPan(px);
            },
            onAmbientCue: (cue) => {
                routerRef.current?.onAmbientGesture(cue);
            },
            onError: (e) => setErrorMsg(e.message),
        }, systemPrompt, 
        // Pass shared camera + vision so Gemini reuses the already-running stream
        cameraRef.current ?? undefined, visionRef.current ?? undefined);
        engineRef.current = engine;
        try {
            await engine.start();
        }
        catch (e) {
            setEngineState('idle');
            setErrorMsg(String(e));
        }
    }, [addEntry, dismissAlert, store]);
    const stopSession = useCallback(async () => {
        await engineRef.current?.stop();
        // engine.stop() restores pan-only callbacks — tracking continues
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
            await startTracking(); // open camera + start pan tracking immediately
        }
        catch (e) {
            setErrorMsg(String(e));
        }
    }, [startTracking]);
    const connectBridge = useCallback(async () => {
        try {
            const bridge = new SerialBridge();
            await bridge.connectWS();
            serialRef.current = bridge;
            setSerialStatus('connected');
            await startTracking();
        }
        catch (e) {
            setErrorMsg(String(e));
        }
    }, [startTracking]);
    return (_jsx(SessionContext.Provider, { value: {
            engineState, transcript, liveUser, lastCmd, serialStatus, trackingActive, errorMsg, alerts,
            geminiObservations,
            displayedPhotoId,
            sessionActive: engineState !== 'idle',
            engineRef,
            startSession, stopSession, connectSerial, connectBridge, dismissAlert,
            showPhoto: (id) => setDisplayedPhotoId(id),
            dismissPhoto: () => setDisplayedPhotoId(null),
            clearError: () => setErrorMsg(null),
        }, children: children }));
}
