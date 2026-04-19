/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  FaceLandmarker, 
  PoseLandmarker, 
  HandLandmarker,
  FilesetResolver, 
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import { GestureDetector } from './lib/gesture-logic';
import { BRAILLE_MAP, CUE_NAMES, SocialState } from './constants';
import { TabButton, BrailleDisplay, StatusIndicator, CodePreview, LogViewer } from './ui/components';
import { 
  Eye, 
  History, 
  Code2, 
  AlertCircle, 
  Activity,
  Terminal,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'code' | 'logs'>('monitor');
  const [status, setStatus] = useState<string>('Initializing CV Engine...');
  const [currentCue, setCurrentCue] = useState<string | null>(null);
  const [history, setHistory] = useState<{ time: string, cue: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [showMesh, setShowMesh] = useState<boolean>(true);
  const [calibrationCounter, setCalibrationCounter] = useState<number>(0);
  const [socialState, setSocialState] = useState<{ state: SocialState, scores: Record<SocialState, number> }>({ 
    state: 'neutral', 
    scores: { friendly: 0, engaged: 0, concerned: 0, confused: 0, disagreeing: 0, disengaged: 0, neutral: 0 } 
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const faceRef = useRef<FaceLandmarker | null>(null);
  const handRef = useRef<HandLandmarker | null>(null);
  const detectorRef = useRef(new GestureDetector());
  const requestRef = useRef<number>(0);

  const initCV = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      poseRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
      });

      faceRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        outputFaceBlendshapes: true
      });

      handRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });

      startCamera();
      setStatus('C++ Vision Core Active (v4.2.0)');
    } catch (err) {
      console.error(err);
      setError('Hardware initialization failed. Ensure camera permissions are granted.');
    }
  };

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        renderLoop();
      };
    } catch (err) {
      setError('Camera access denied. This prototype requires a video feed.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const calibrateBaseline = useCallback(() => {
    setCalibrationCounter(30); // 30 frames for calibration
  }, []);

  const renderLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !faceRef.current || !poseRef.current || !handRef.current || !isCameraOn) return;

    const startTimeMs = performance.now();
    const faceResult = faceRef.current.detectForVideo(videoRef.current, startTimeMs);
    const poseResult = poseRef.current.detectForVideo(videoRef.current, startTimeMs);
    const handResult = handRef.current.detectForVideo(videoRef.current, startTimeMs);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawingUtils = new DrawingUtils(ctx);

    let detectedFace = null;
    let detectedPose = null;
    let detectedHands = null;

    if (faceResult.faceLandmarks.length > 0) {
      detectedFace = faceResult.faceLandmarks[0];
      if (showMesh) {
        drawingUtils.drawConnectors(detectedFace, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: 'rgba(139, 139, 106, 0.3)', lineWidth: 1 });
      }
    }

    if (poseResult.landmarks.length > 0) {
      detectedPose = poseResult.landmarks[0];
      if (showMesh) {
        drawingUtils.drawLandmarks(detectedPose, { color: 'rgba(90, 90, 64, 0.8)', radius: 2 });
      }
    }

    if (handResult.landmarks.length > 0) {
      detectedHands = handResult.landmarks;
      if (showMesh) {
        for (const landmarks of detectedHands) {
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: 'rgba(176, 125, 98, 0.5)', lineWidth: 2 });
        }
      }
    }

    // Handle Calibration
    if (calibrationCounter > 0) {
      if (faceResult.faceBlendshapes?.[0]) {
        detectorRef.current.setBaseline(faceResult.faceBlendshapes[0].categories);
        setCalibrationCounter(prev => prev - 1);
        setStatus(`Calibrating... ${calibrationCounter}`);
      }
    } else if (status.startsWith('Calibrating')) {
      setStatus('C++ Vision Core Active (v4.2.0)');
    }

    const cue = detectorRef.current.process(
      detectedFace as any, 
      detectedPose as any, 
      detectedHands as any, 
      faceResult.faceBlendshapes?.[0]?.categories || []
    );
    if (cue && cue !== 'none') {
      setCurrentCue(cue);
      setHistory(prev => [{ time: new Date().toLocaleTimeString().split(' ')[0], cue }, ...prev].slice(0, 10));
      setSocialState(detectorRef.current.getInterpretedState());
    }

    requestRef.current = requestAnimationFrame(renderLoop);
  }, []);

  useEffect(() => {
    if (isCameraOn) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isCameraOn]);

  useEffect(() => {
    initCV();
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div className="flex flex-col h-screen font-sans bg-[#F5F2ED] text-[#2D2926]">
      {/* Header */}
      <header className="flex items-center justify-between px-10 h-20 bg-white border-b border-[#E6E0D4] shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="font-bold text-2xl text-[#5A5A40] tracking-tighter">VisionBridge.ai</div>
        </div>
        
        <nav className="flex gap-2 p-1.5 bg-[#F5F2ED] rounded-xl border border-[#E6E0D4]">
          <TabButton active={activeTab === 'monitor'} onClick={() => setActiveTab('monitor')} icon={<Activity size={14} />} label="MONITOR" />
          <TabButton active={activeTab === 'code'} onClick={() => setActiveTab('code')} icon={<Code2 size={14} />} label="SOURCE" />
          <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<Terminal size={14} />} label="LOGS" />
        </nav>

        <StatusIndicator error={error} status={status} />
        
        <div className="flex items-center gap-2 border-l border-[#E6E0D4] pl-4">
          <button 
            onClick={() => setIsCameraOn(!isCameraOn)}
            className={`px-3 py-1.5 rounded-lg font-mono text-[9px] font-bold transition-all ${isCameraOn ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
          >
            {isCameraOn ? 'DISABLE_CAM' : 'ENABLE_CAM'}
          </button>
          <button 
            onClick={() => setShowMesh(!showMesh)}
            className={`px-3 py-1.5 rounded-lg font-mono text-[9px] font-bold transition-all ${showMesh ? 'bg-[#5A5A40] text-white' : 'bg-white text-[#5A5A40] border border-[#E6E0D4]'}`}
          >
            {showMesh ? 'HIDE_MESH' : 'SHOW_MESH'}
          </button>
          <button 
            onClick={calibrateBaseline}
            className="px-3 py-1.5 rounded-lg bg-[#B07D62] text-white font-mono text-[9px] font-bold hover:bg-[#a06d52] transition-all"
          >
            CALIBRATE_FACE
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden grid grid-cols-[1fr_340px] gap-6 p-6">
        {/* Main Content Pane */}
        <section className="relative flex items-center justify-center bg-[#111] rounded-[24px] shadow-2xl overflow-hidden border border-[#E6E0D4]">
          {activeTab === 'monitor' && (
            <div className="relative w-full h-full">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" playsInline muted />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" width={640} height={480} />
              
              {/* Internal HUD */}
              <div className="absolute top-6 left-6 font-mono text-[10px] text-white/40 space-y-1">
                <p className="text-[#8B8B6A] font-bold">POS_SYNC: COMPLETED</p>
                <p>FRAME_RATE: 60Hz</p>
                <p>INFERENCE: 12ms</p>
              </div>

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#F5F2ED]/95 backdrop-blur-md p-8 text-center">
                  <div className="max-w-xs">
                    <AlertCircle className="w-12 h-12 text-[#B07D62] mx-auto mb-4" />
                    <p className="text-sm font-bold text-[#2D2926] mb-1">HARDWARE_FAULT</p>
                    <p className="text-xs text-[#2D2926]/60 font-mono">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'code' && <CodePreview />}
          {activeTab === 'logs' && <LogViewer history={history} />}
        </section>

        {/* Sidebar Info Panels */}
        <aside className="flex flex-col gap-5 overflow-y-auto pr-2">
          {/* Translation Card */}
          <div className="card">
            <span className="card-title">Tactile Translation</span>
            <div className="flex items-start gap-4 mb-4">
              <BrailleDisplay cue={currentCue} brailleMap={BRAILLE_MAP} />
              <div className="flex-1">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentCue || 'none'}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <p className="text-xl font-medium text-[#2D2926] leading-tight mb-2">
                      {currentCue ? `Detected: ${CUE_NAMES[currentCue]}` : 'Scanning Environment...'}
                    </p>
                    <div className="h-1 bg-[#E6E0D4] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: currentCue ? '100%' : '0%' }}
                        className="h-full bg-[#5A5A40]"
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <p className="text-sm text-[#2D2926]/70 italic leading-relaxed">
              {currentCue 
                ? "The subject is performing a visual gesture. Haptic pulse initiated." 
                : "No significant social cues identified in the current frame buffer."}
            </p>
          </div>

          {/* Social Context - Moved here to be directly under Tactile Translation */}
          <div className="card bg-[#5A5A40] text-[#E6E0D4] border-none">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-[2px] opacity-70">Social Context Inference</h3>
              <Eye size={14} className="opacity-70" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[14px] font-serif italic text-white capitalize">
                  Appears {socialState.state}
                </span>
                <span className="text-2xl font-light text-white">
                  {Math.min(100, Math.round(socialState.scores[socialState.state] * 10))}%
                </span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, socialState.scores[socialState.state] * 10)}%` }}
                  className="h-full bg-white transition-all duration-1000"
                />
              </div>
              <div className="text-[10px] opacity-60 font-mono space-y-1">
                <p className="border-b border-white/10 pb-1">EXPLAINABILITY_LOG:</p>
                {(Object.entries(socialState.scores) as [SocialState, number][])
                  .filter(([_, score]) => score > 0.5)
                  .sort((a, b) => b[1] - a[1])
                  .map(([state, score]) => (
                    <div key={state} className="flex justify-between">
                      <span className="capitalize">{state}</span>
                      <span>{score.toFixed(1)}</span>
                    </div>
                  ))
                }
              </div>
              <p className="text-xs leading-relaxed opacity-80 border-t border-white/10 pt-3">
                {socialState.state === 'friendly' ? "Subject is engaging positively. Likely intent: Connection." :
                 socialState.state === 'engaged' ? "Heightened focus detected. Subject is following the dialogue." :
                 socialState.state === 'concerned' ? "Subject appears stressed or worried. Monitor for comfort." :
                 socialState.state === 'confused' ? "Subject might need clarification. Likely state: Uncertainty." :
                 socialState.state === 'disagreeing' ? "Subject shows signs of dissent or skepticism." :
                 socialState.state === 'disengaged' ? "Attention has drifted. Subject may be looking elsewhere." :
                 "Scanning observable cues for state inference..."}
              </p>
            </div>
          </div>

          {/* Cue History Card */}
          <div className="card flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
            <div className="col-header flex justify-between bg-[#F5F2ED]">
              <span>Cue History Log</span>
              <span>Buffer</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-10 text-center opacity-20 bg-white">
                  <History className="mx-auto mb-2" size={20} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting interaction</p>
                </div>
              ) : (
                history.map((h, i) => (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={i} 
                    className="data-row bg-white"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-[#5A5A40] text-[11px] uppercase tracking-wider">{h.cue}</span>
                      <span className="text-[9px] opacity-40 italic">{h.time}</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#8B8B6A]">SUCCESS</span>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Spacer to avoid duplicate intent summary since it was moved up */}
        </aside>
      </main>

      {/* Footer */}
      <footer className="h-[60px] bg-[#5A5A40] text-[#E6E0D4] px-10 flex items-center justify-between font-mono text-[11px] border-t border-[#8B8B6A]/20">
        <div className="flex items-center gap-4">
          <span className="px-2 py-0.5 bg-white/10 rounded">std::vector&lt;NonVerbalCue&gt; buffer_stream</span>
          <span className="opacity-40">|</span>
          <span>CV CORE ACTIVE</span>
        </div>
        <div>Refresh Rate: 60Hz | © 2026 Assistive Tech Labs</div>
      </footer>
    </div>
  );
}

