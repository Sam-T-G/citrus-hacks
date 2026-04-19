import './style.css';
import { 
  FaceLandmarker, 
  PoseLandmarker, 
  HandLandmarker,
  FilesetResolver, 
  DrawingUtils 
} from '@mediapipe/tasks-vision';
import { GestureDetector } from './lib/gesture-logic';
import { GeminiBuffer } from './lib/gemini-buffer';
import { CUE_NAMES } from './lib/constants';

// Set up UI structure
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="left-panel">
    <div class="video-container">
      <video id="webcam" autoplay playsinline muted></video>
      <canvas id="output_canvas"></canvas>
    </div>
    <div class="controls">
      <button id="toggle-camera">Start Camera</button>
      <button id="toggle-mesh">Toggle Mesh</button>
      <button id="calibrate">Calibrate Neutral</button>
      <span id="status">Initializing AI Engine...</span>
    </div>
  </div>
  <div class="right-panel">
    <div class="header">
      <h1>Visual Cue Stream</h1>
      <p>Raw temporal logging for Gemini context inference</p>
    </div>
    <div class="data-log" id="data-log"></div>
    <div class="gemini-panel">
      <div class="gemini-header">
        <span>Gemini Buffer (Sync Interval: 8s)</span>
        <span id="next-sync">Sync in: 8.0s</span>
      </div>
      <div class="gemini-content" id="gemini-content">
        [Waiting for first buffer flush...]
      </div>
    </div>
  </div>
`;

const video = document.getElementById('webcam') as HTMLVideoElement;
const canvas = document.getElementById('output_canvas') as HTMLCanvasElement;
const canvasCtx = canvas.getContext('2d')!;
const statusEl = document.getElementById('status')!;
const dataLogEl = document.getElementById('data-log')!;
const geminiContentEl = document.getElementById('gemini-content')!;
const nextSyncEl = document.getElementById('next-sync')!;

let faceLandmarker: FaceLandmarker | null = null;
let poseLandmarker: PoseLandmarker | null = null;
let handLandmarker: HandLandmarker | null = null;

let isCameraOn = false;
let showMesh = true;
let calibrationCounter = 0;
let lastVideoTime = -1;
let requestRef = 0;

const detector = new GestureDetector();
const buffer = new GeminiBuffer();

// Initialize CV
async function initCV() {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );

    statusEl.innerText = 'Loading Pose Model...';
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numPoses: 1
    });

    statusEl.innerText = 'Loading Face Model...';
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      outputFaceBlendshapes: true
    });

    statusEl.innerText = 'Loading Hand Model...';
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2
    });

    statusEl.innerText = 'CV Engine Ready. Waiting for camera.';
  } catch (e: any) {
    statusEl.innerText = `Error: ${e.message}`;
    console.error(e);
  }
}

// Camera control
async function toggleCamera() {
  if (isCameraOn) {
    const stream = video.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    video.srcObject = null;
    isCameraOn = false;
    document.getElementById('toggle-camera')!.innerText = 'Start Camera';
    cancelAnimationFrame(requestRef);
    statusEl.innerText = 'Camera Off';
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      video.srcObject = stream;
      video.addEventListener("loadeddata", () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        isCameraOn = true;
        document.getElementById('toggle-camera')!.innerText = 'Stop Camera';
        statusEl.innerText = 'Streaming';
        renderLoop();
      });
    } catch (e: any) {
      statusEl.innerText = 'Camera Access Denied';
    }
  }
}

// Rendering Loop
function renderLoop() {
  if (!isCameraOn || !faceLandmarker || !poseLandmarker || !handLandmarker) return;

  const startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    
    const faceResult = faceLandmarker.detectForVideo(video, startTimeMs);
    const poseResult = poseLandmarker.detectForVideo(video, startTimeMs);
    const handResult = handLandmarker.detectForVideo(video, startTimeMs);

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    const drawingUtils = new DrawingUtils(canvasCtx);

    let detectedFace = null;
    let detectedPose = null;
    let detectedHands = null;

    if (faceResult.faceLandmarks.length > 0) {
      detectedFace = faceResult.faceLandmarks[0];
      if (showMesh) {
        drawingUtils.drawConnectors(detectedFace, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: 'rgba(56, 189, 248, 0.2)', lineWidth: 1 });
      }
    }

    if (poseResult.landmarks.length > 0) {
      detectedPose = poseResult.landmarks[0];
      if (showMesh) {
        drawingUtils.drawLandmarks(detectedPose, { color: 'rgba(56, 189, 248, 0.7)', radius: 2 });
      }
    }

    if (handResult.landmarks.length > 0) {
      detectedHands = handResult.landmarks;
      if (showMesh) {
        for (const landmarks of detectedHands) {
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: 'rgba(251, 191, 36, 0.5)', lineWidth: 2 });
        }
      }
    }
    canvasCtx.restore();

    // Calibration
    if (calibrationCounter > 0) {
      if (faceResult.faceBlendshapes?.[0]) {
        detector.setBaseline(faceResult.faceBlendshapes[0].categories);
        calibrationCounter--;
        statusEl.innerText = `Calibrating... ${calibrationCounter}`;
      }
    } else if (statusEl.innerText.startsWith('Calibrating')) {
      statusEl.innerText = 'Streaming';
    }

    // Process Cues
    const blendshapes = faceResult.faceBlendshapes?.[0]?.categories || [];
    const cueResult = detector.process(
      detectedFace as any,
      detectedPose as any,
      detectedHands as any,
      blendshapes
    );

    if (cueResult && cueResult.cue !== 'person_detected') {
      const ts = Date.now();
      buffer.add({ timestamp: ts, cue: cueResult.cue, confidence: cueResult.score });
      appendLog(cueResult.cue, cueResult.score, ts);
    }
  }

  requestRef = requestAnimationFrame(renderLoop);
}

function appendLog(cue: string, score: number, ts: number) {
  const timeStr = new Date(ts).toISOString().substring(11, 23);
  const name = CUE_NAMES[cue] || cue;
  
  const div = document.createElement('div');
  div.className = 'log-entry';
  div.innerHTML = `
    <span class="log-time">[${timeStr}]</span>
    <span class="log-content highlight">${name}</span>
    <span class="log-confidence">(score: ${(score).toFixed(2)})</span>
  `;
  
  dataLogEl.prepend(div);
  
  // Keep only last 50 logs
  if (dataLogEl.children.length > 50) {
    dataLogEl.removeChild(dataLogEl.lastChild!);
  }
}

// Gemini Sync Loop
let countdown = 8.0;
setInterval(() => {
  if (!isCameraOn) return;
  
  countdown -= 0.1;
  if (countdown <= 0) {
    countdown = 8.0;
    const block = buffer.flush();
    geminiContentEl.innerText = block;
  }
  nextSyncEl.innerText = `Sync in: ${countdown.toFixed(1)}s`;
}, 100);

// Event Listeners
document.getElementById('toggle-camera')?.addEventListener('click', toggleCamera);
document.getElementById('toggle-mesh')?.addEventListener('click', () => {
  showMesh = !showMesh;
});
document.getElementById('calibrate')?.addEventListener('click', () => {
  if (isCameraOn) {
    calibrationCounter = 30;
  }
});

// Initial startup
initCV();
