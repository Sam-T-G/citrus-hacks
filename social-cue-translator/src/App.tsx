import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  FaceLandmarker, 
  PoseLandmarker, 
  HandLandmarker,
  FilesetResolver, 
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import { GestureDetector } from './lib/gesture-logic';
import { CUE_NAMES } from './constants';
import { StatusIndicator, LogViewer } from './ui/components';
import { 
  AlertCircle, 
  Settings,
  Camera,
  Video,
  Grid
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [status, setStatus] = useState<string>('Initializing CV Engine...');
  const [history, setHistory] = useState<{ time: string, cue: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [showMesh, setShowMesh] = useState<boolean>(true);
  const [calibrationCounter, setCalibrationCounter] = useState<number>(0);
  
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
      setStatus('CV CORE ACTIVE');
    } catch (err) {
      console.error(err);
      setError('Initialization failed. Check permissions.');
    }
  };

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        renderLoop();
      };
    } catch (err) {
      setError('Camera access denied.');
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
    setCalibrationCounter(30); 
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
        drawingUtils.drawLandmarks(detectedPose, { color: 'rgba(139, 139, 106, 0.8)', radius: 2 });
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

    if (calibrationCounter > 0) {
      if (faceResult.faceBlendshapes?.[0]) {
        detectorRef.current.setBaseline(faceResult.faceBlendshapes[0].categories);
        setCalibrationCounter(prev => prev - 1);
        setStatus(`CALIBRATING... ${calibrationCounter}`);
      }
    } else if (status.startsWith('CALIBRATING')) {
      setStatus('CV CORE ACTIVE');
    }

    const result = detectorRef.current.process(
      detectedFace as any, 
      detectedPose as any, 
      detectedHands as any, 
      faceResult.faceBlendshapes?.[0]?.categories || []
    );
    if (result && result.cue !== 'none') {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      setHistory(prev => [{ time, cue: result.cue }, ...prev].slice(0, 50));
    }

    requestRef.current = requestAnimationFrame(renderLoop);
  }, [isCameraOn, showMesh, calibrationCounter, status]);

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
    <div className="flex flex-col h-screen bg-[#F5F2ED] text-[#2D2926] font-sans selection:bg-[#B07D62] selection:text-white">
      {/* Precision Header */}
      <header className="flex items-center justify-between px-8 h-16 bg-white border-b border-[#E6E0D4] shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-[#5A5A40] rounded flex items-center justify-center text-white">
            <Video size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-[#5A5A40]">GestureInsight v4.5</span>
            <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest leading-none">High-Fidelity Input Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <StatusIndicator error={error} status={status} />
          
          <div className="flex items-center gap-1.5 p-1 bg-[#F5F2ED] rounded-lg border border-[#E6E0D4]">
            <button 
              onClick={() => setIsCameraOn(!isCameraOn)}
              title="Toggle Camera"
              className={`p-2 rounded-md transition-all ${isCameraOn ? 'bg-white shadow-sm text-[#5A5A40]' : 'text-[#5A5A40]/40'}`}
            >
              <Camera size={16} />
            </button>
            <button 
              onClick={() => setShowMesh(!showMesh)}
              title="Toggle Landmark Mesh"
              className={`p-2 rounded-md transition-all ${showMesh ? 'bg-white shadow-sm text-[#5A5A40]' : 'text-[#5A5A40]/40'}`}
            >
              <Grid size={16} />
            </button>
          </div>

          <button 
            onClick={calibrateBaseline}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5A5A40] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#4a4a35] transition-all shadow-md active:scale-95"
          >
            <Settings size={14} />
            Calibrate Neutral
          </button>
        </div>
      </header>

      {/* Focused Workspace */}
      <main className="flex-1 overflow-hidden flex gap-0 p-0">
        {/* Left: Monitor (Primary Input) */}
        <section className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full max-w-[1280px] max-h-[720px] aspect-video">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-contain opacity-50" playsInline muted />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain" width={1280} height={720} />
            
            {/* On-Canvas Telemetry */}
            <div className="absolute top-8 left-8 font-mono text-[10px] tracking-tight text-white/40 pointer-events-none">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-500 uppercase font-bold">Live Stream Active</span>
              </div>
              <p>RESOLUTION: 1280x720</p>
              <p>LATENCY_MS: 18ms</p>
              <p>CUES_LOGGED: {history.length}</p>
            </div>

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
                <div className="card max-w-sm text-center bg-white p-8">
                  <AlertCircle size={40} className="mx-auto mb-4 text-[#B07D62]" />
                  <h2 className="text-lg font-serif italic mb-2">Hardware Error</h2>
                  <p className="text-xs opacity-60 leading-relaxed font-mono uppercase tracking-widest">{error}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: Data Stream (Logical Mirror) */}
        <aside className="w-[380px] bg-white border-l border-[#E6E0D4] flex flex-col shrink-0">
          <div className="p-6 border-b border-[#E6E0D4] bg-[#F5F2ED]">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5A5A40] opacity-60 mb-1 leading-none">Current Visual Cue</h2>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-serif italic tracking-tighter capitalize transition-all duration-300">
                {history[0] ? CUE_NAMES[history[0].cue] : 'Waiting...'}
              </span>
              <div className="w-12 h-0.5 bg-[#5A5A40] mb-2 scale-x-100 origin-right" />
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden p-6 flex flex-col">
            <LogViewer history={history} />
            <p className="mt-4 text-[9px] uppercase tracking-widest text-[#5A5A40]/40 font-bold text-center leading-relaxed">
              Temporal stream ready for Gemini integration.<br/>
              Precise landmark-to-state mapping active.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
