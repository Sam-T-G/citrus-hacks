import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useEffect, useState, useCallback } from 'react';
import { DrawingUtils, FaceLandmarker, PoseLandmarker, HandLandmarker, } from '@mediapipe/tasks-vision';
import { CUE_NAMES, STATE_WEIGHTS, SAFETY_CUES } from '../vision/vision-constants';
import { useSession } from '../session/SessionContext';
const LCD_ROWS = {
    happy: ['(  ^  )  (  ^  )', '~~~~~~~~~~~~~~~~'],
    plain: ['(  B  )  (  B  )', '----------------'],
    wink: ['(  ^  )  (  -  )', '----------------'],
    tears: ['(  T  )  (  T  )', '   ||       ||  '],
    dizzy: ['(  @  )  (  @  )', '________________'],
    robot: ['[  o  ]  [  o  ]', '================'],
    dead: ['(  X  )  (  X  )', '________________'],
};
const STANDBY = ['(  B  )  (  B  )', '- - - - - - - - '];
const STATE_LABEL = {
    idle: 'Offline', connecting: 'Connecting', listening: 'Listening', speaking: 'Speaking',
};
// ── Owl LCD ──────────────────────────────────────────────────────────────────
function OwlLCD({ face, waving, large }) {
    const [row0, row1] = face ? LCD_ROWS[face] : STANDBY;
    const cls = `owl-lcd${!face ? ' owl-lcd--none' : ''}${large ? ' owl-lcd--large' : ''}`;
    return (_jsxs("div", { className: cls, children: [_jsx("div", { className: "owl-lcd__face", children: row0 }), _jsx("div", { className: "owl-lcd__row2", children: row1 }), _jsxs("div", { className: "owl-lcd__name", children: [face ?? 'standby', waving ? ' · waving' : ''] })] }));
}
// ── Icons ────────────────────────────────────────────────────────────────────
function ExpandIcon() {
    return (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", children: _jsx("path", { d: "M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" }) }));
}
function CollapseIcon() {
    return (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", children: _jsx("path", { d: "M5 1v4H1M9 5V1h4M9 13v-4h4M1 9h4v4" }) }));
}
// ── CV Overlay canvas — draws MediaPipe landmarks over video ─────────────────
function CVOverlay({ canvasRef }) {
    return (_jsx("canvas", { ref: canvasRef, style: {
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
        } }));
}
const EMOTION_COLOR = {
    calm: 'rgba(74,222,128,0.8)',
    happy: 'rgba(250,204,21,0.85)',
    engaged: 'rgba(96,165,250,0.85)',
    drowsy: 'rgba(167,139,250,0.8)',
    confused: 'rgba(251,191,36,0.85)',
    restless: 'rgba(251,146,60,0.85)',
    distressed: 'rgba(248,113,113,0.9)',
    absent: 'rgba(250,247,242,0.35)',
    unknown: 'rgba(250,247,242,0.35)',
};
function BehaviorPanel({ cues, alive }) {
    const { geminiObservations } = useSession();
    const recentCues = cues.slice(-20).reverse();
    const recentObs = geminiObservations.slice(-10).reverse();
    const panelStyle = {
        background: 'rgba(10,10,8,0.85)', backdropFilter: 'blur(6px)',
        borderRadius: 12, padding: '14px 16px',
        fontFamily: 'var(--cmono)', fontSize: 11,
        color: 'rgba(250,247,242,0.8)',
        maxHeight: 460, overflowY: 'auto',
        border: '0.5px solid rgba(250,247,242,0.1)',
        display: 'flex', flexDirection: 'column', gap: 14,
    };
    const sectionLabel = (label, dot) => (_jsxs("div", { style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'rgba(74,222,128,0.6)', marginBottom: 6,
        }, children: [label, dot !== undefined && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 5 }, children: [_jsx("div", { style: {
                            width: 5, height: 5, borderRadius: '50%',
                            background: alive ? 'rgba(74,222,128,0.9)' : 'rgba(250,247,242,0.2)',
                            boxShadow: alive ? '0 0 4px rgba(74,222,128,0.6)' : 'none',
                        } }), _jsx("span", { style: { color: alive ? 'rgba(74,222,128,0.6)' : 'rgba(250,247,242,0.25)' }, children: dot })] }))] }));
    const empty = (msg) => (_jsx("div", { style: { color: 'rgba(250,247,242,0.28)', fontSize: 10.5 }, children: msg }));
    return (_jsxs("div", { style: panelStyle, children: [_jsxs("div", { children: [sectionLabel('Gemini · Visual Read'), recentObs.length === 0
                        ? empty('Waiting for first scan…')
                        : recentObs.map((o, i) => {
                            const color = EMOTION_COLOR[o.emotionHint] ?? EMOTION_COLOR.unknown;
                            const time = new Date(o.ts).toISOString().substring(14, 23);
                            return (_jsxs("div", { style: { marginBottom: 7, paddingBottom: 7, borderBottom: '0.5px solid rgba(250,247,242,0.05)' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }, children: [_jsx("span", { style: {
                                                    fontSize: 9, padding: '2px 7px', borderRadius: 4,
                                                    background: `${color.replace('0.8', '0.12').replace('0.85', '0.12').replace('0.9', '0.12')}`,
                                                    color,
                                                }, children: o.emotionHint }), _jsx("span", { style: { fontSize: 9, color: 'rgba(250,247,242,0.3)' }, children: time })] }), _jsx("div", { style: { fontSize: 10.5, color: 'rgba(250,247,242,0.75)', lineHeight: 1.45 }, children: o.description })] }, i));
                        })] }), _jsxs("div", { children: [sectionLabel('MediaPipe · Gestures', alive ? 'live' : 'idle'), recentCues.length === 0
                        ? empty(alive ? 'No gestures detected yet' : 'Session not active')
                        : recentCues.map((e, i) => {
                            const name = CUE_NAMES[e.cue] ?? e.cue;
                            const weights = STATE_WEIGHTS[e.cue] ?? {};
                            const isSafe = SAFETY_CUES.has(e.cue);
                            const time = new Date(e.ts).toISOString().substring(14, 23);
                            return (_jsxs("div", { style: { marginBottom: 7, paddingBottom: 7, borderBottom: '0.5px solid rgba(250,247,242,0.05)' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }, children: [_jsxs("span", { style: { color: isSafe ? 'rgba(251,146,60,0.95)' : 'rgba(250,247,242,0.9)', fontWeight: 600 }, children: [name, isSafe ? ' ⚠' : ''] }), _jsxs("span", { style: { fontSize: 9, color: 'rgba(250,247,242,0.3)' }, children: [time, " \u00B7 ", (e.conf * 100).toFixed(0), "%"] })] }), Object.keys(weights).length > 0 && (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 3 }, children: Object.entries(weights).map(([state, w]) => (_jsxs("span", { style: {
                                                fontSize: 9, padding: '1px 5px', borderRadius: 3,
                                                background: (w ?? 0) > 0 ? 'rgba(74,222,128,0.1)' : 'rgba(251,146,60,0.1)',
                                                color: (w ?? 0) > 0 ? 'rgba(74,222,128,0.75)' : 'rgba(251,146,60,0.75)',
                                            }, children: [state, " ", (w ?? 0) > 0 ? `+${w}` : w] }, state))) }))] }, i));
                        })] })] }));
}
// ── Full-screen camera modal ───────────────────────────────────────────────────
function CameraModal({ camera, vision, lastCmd, active, engineState, onClose, }) {
    const videoRef = useRef(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvasRef = useRef(null);
    const drawRef = useRef(null);
    const [showCV, setShowCV] = useState(false);
    const [cues, setCues] = useState([]);
    const [pipeAlive, setPipeAlive] = useState(false);
    // Attach camera preview
    useEffect(() => {
        if (active && camera && videoRef.current) {
            camera.attachPreview(videoRef.current);
        }
    }, [active, camera]);
    // Sync canvas size to video
    const syncCanvas = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas)
            return;
        canvas.width = video.videoWidth || video.clientWidth;
        canvas.height = video.videoHeight || video.clientHeight;
    }, []);
    // Wire/unwire vision render callback when showCV changes
    useEffect(() => {
        if (!vision)
            return;
        if (!showCV) {
            vision.setRenderCallback(null);
            return;
        }
        const onFrame = (frame) => {
            setPipeAlive(true);
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (!canvas || !video)
                return;
            // Sync dimensions
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth || video.clientWidth;
                canvas.height = video.videoHeight || video.clientHeight;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx)
                return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!drawRef.current)
                drawRef.current = new DrawingUtils(ctx);
            const du = drawRef.current;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const anyDu = du;
            // Face tessellation (cyan)
            if (frame.face) {
                anyDu.drawConnectors(frame.face, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
                    color: 'rgba(0,255,220,0.25)', lineWidth: 0.5,
                });
                anyDu.drawConnectors(frame.face, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, {
                    color: 'rgba(0,255,220,0.55)', lineWidth: 1,
                });
            }
            // Pose (cyan dots)
            if (frame.pose) {
                anyDu.drawLandmarks(frame.pose, { color: 'rgba(0,220,255,0.8)', lineWidth: 1, radius: 3 });
                anyDu.drawConnectors(frame.pose, PoseLandmarker.POSE_CONNECTIONS, {
                    color: 'rgba(0,200,255,0.4)', lineWidth: 1.5,
                });
            }
            // Hands (yellow)
            if (frame.hands) {
                for (const hand of frame.hands) {
                    anyDu.drawLandmarks(hand, { color: 'rgba(255,220,0,0.9)', radius: 3, lineWidth: 1 });
                    anyDu.drawConnectors(hand, HandLandmarker.HAND_CONNECTIONS, {
                        color: 'rgba(255,200,0,0.6)', lineWidth: 1.5,
                    });
                }
            }
            // Log meaningful cues to panel (GestureDetector already enforces 1500ms cooldown)
            if (frame.detectedCue && frame.detectedCue !== 'person_detected') {
                setCues(prev => [...prev, { ts: Date.now(), cue: frame.detectedCue, conf: frame.cueScore }]);
            }
        };
        vision.setRenderCallback(onFrame);
        return () => { vision.setRenderCallback(null); };
    }, [showCV, vision]);
    const face = lastCmd?.face ?? null;
    const waving = lastCmd?.wave === 1;
    const stateLabel = STATE_LABEL[engineState] ?? engineState;
    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget)
            onClose();
    };
    return (_jsx("div", { onClick: handleBackdrop, style: {
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,10,8,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'c-fadeUp 200ms ease-out',
        }, children: _jsxs("div", { style: {
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
                maxWidth: showCV ? 1100 : 860, width: '92vw',
            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("span", { style: {
                                        fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em',
                                        textTransform: 'uppercase', color: 'rgba(250,247,242,0.5)',
                                    }, children: "Mira \u00B7 live feed" }), _jsx("span", { style: {
                                        fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.12em',
                                        textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5,
                                        background: engineState === 'speaking' ? 'rgba(251,146,60,0.2)' :
                                            engineState === 'listening' ? 'rgba(74,222,128,0.15)' :
                                                'rgba(255,255,255,0.07)',
                                        color: engineState === 'speaking' ? 'rgba(251,146,60,0.9)' :
                                            engineState === 'listening' ? 'rgba(74,222,128,0.9)' :
                                                'rgba(250,247,242,0.4)',
                                    }, children: stateLabel })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [vision && (_jsxs("button", { onClick: () => setShowCV(v => !v), style: {
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                                        borderRadius: 8,
                                        background: showCV ? 'rgba(74,222,128,0.15)' : 'rgba(250,247,242,0.08)',
                                        border: showCV ? '0.5px solid rgba(74,222,128,0.3)' : '0.5px solid rgba(250,247,242,0.12)',
                                        color: showCV ? 'rgba(74,222,128,0.9)' : 'rgba(250,247,242,0.6)',
                                        cursor: 'pointer', fontFamily: 'var(--csans)', fontSize: 12,
                                    }, children: [_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 12 12", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: [_jsx("circle", { cx: "6", cy: "6", r: "2.5" }), _jsx("path", { d: "M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11" })] }), showCV ? 'Hide CV' : 'Show CV'] })), _jsxs("button", { onClick: onClose, style: {
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                                        borderRadius: 8, background: 'rgba(250,247,242,0.08)',
                                        border: '0.5px solid rgba(250,247,242,0.12)',
                                        color: 'rgba(250,247,242,0.6)', cursor: 'pointer',
                                        fontFamily: 'var(--csans)', fontSize: 12,
                                    }, children: [_jsx(CollapseIcon, {}), " Collapse"] })] })] }), _jsxs("div", { style: {
                        display: 'flex', gap: 16, width: '100%', alignItems: 'flex-start',
                    }, children: [_jsxs("div", { style: {
                                flex: 1, position: 'relative', borderRadius: 18, overflow: 'hidden',
                                background: '#000', boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                            }, onLoad: syncCanvas, children: [active
                                    ? _jsx("video", { ref: videoRef, autoPlay: true, muted: true, playsInline: true, onLoadedMetadata: syncCanvas, style: { width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' } })
                                    : (_jsxs("div", { style: {
                                            width: '100%', aspectRatio: '4/3', display: 'flex',
                                            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            gap: 14, color: 'rgba(250,247,242,0.25)',
                                        }, children: [_jsx("svg", { width: "52", height: "52", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.2", children: _jsx("path", { d: "M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" }) }), _jsx("span", { style: { fontFamily: 'var(--csans)', fontSize: 14, letterSpacing: '0.06em' }, children: "Camera inactive" })] })), _jsx("div", { style: {
                                        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 18,
                                        boxShadow: engineState === 'listening' ? 'inset 0 0 0 3px rgba(74,222,128,0.4)' :
                                            engineState === 'speaking' ? 'inset 0 0 0 3px rgba(251,146,60,0.55)' :
                                                engineState === 'connecting' ? 'inset 0 0 0 3px rgba(96,165,250,0.4)' : 'none',
                                    } }), showCV && _jsx(CVOverlay, { canvasRef: canvasRef })] }), showCV && (_jsx("div", { style: { width: 280, flexShrink: 0 }, children: _jsx(BehaviorPanel, { cues: cues, alive: pipeAlive }) }))] }), _jsxs("div", { style: { width: '100%' }, children: [_jsx("div", { style: {
                                fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em',
                                textTransform: 'uppercase', color: 'rgba(74,222,128,0.4)', marginBottom: 10,
                            }, children: "Owl LCD \u00B7 16\u00D72" }), _jsx(OwlLCD, { face: face, waving: waving, large: true })] })] }) }));
}
// ── Default inline preview ─────────────────────────────────────────────────────
export function CameraPreview({ camera, vision, lastCmd, active, engineState }) {
    const videoRef = useRef(null);
    const [expanded, setExpanded] = useState(false);
    useEffect(() => {
        if (active && camera && videoRef.current) {
            camera.attachPreview(videoRef.current);
        }
    }, [active, camera]);
    const face = lastCmd?.face ?? null;
    const waving = lastCmd?.wave === 1;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "camera-panel", children: [_jsxs("div", { className: "camera-wrap", children: [active
                                ? _jsx("video", { ref: videoRef, autoPlay: true, muted: true, playsInline: true, className: "camera-feed" })
                                : (_jsxs("div", { className: "camera-feed--off", children: [_jsx("svg", { width: "36", height: "36", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: _jsx("path", { d: "M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" }) }), _jsx("span", { children: "Camera inactive" })] })), _jsx("div", { className: `camera-ring camera-ring--${active ? engineState : 'idle'}` }), _jsx("button", { onClick: () => setExpanded(true), className: "camera-expand-btn", title: "Expand to full view", children: _jsx(ExpandIcon, {}) })] }), _jsxs("div", { className: "owl-panel", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("div", { className: "owl-panel__label", children: "Owl LCD \u00B7 16\u00D72" }), _jsx("button", { onClick: () => setExpanded(true), className: "camera-expand-btn-inline", children: _jsx(ExpandIcon, {}) })] }), _jsx(OwlLCD, { face: face, waving: waving })] })] }), expanded && (_jsx(CameraModal, { camera: camera, vision: vision, lastCmd: lastCmd, active: active, engineState: engineState, onClose: () => setExpanded(false) }))] }));
}
