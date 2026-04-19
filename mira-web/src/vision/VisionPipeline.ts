/**
 * VisionPipeline — MediaPipe-powered structured gesture and safety detection.
 *
 * Runs FaceLandmarker + PoseLandmarker + HandLandmarker on the same
 * HTMLVideoElement that CameraCapture uses, so we don't open a second
 * camera stream. Outputs:
 *
 *  onCue(cue, confidence)      — individual detected gesture/state (~1.5s debounced)
 *  onSafetyConcern(cue, conf)  — IMMEDIATE: fall_suspected or body_horizontal detected
 *  onStateUpdate(state, block) — every 8s: interpreted social state + formatted cue block
 *
 * The formatted cue block is suitable for injecting directly into Gemini prompts
 * to give the model structured context alongside the raw camera feed.
 */
import {
  FaceLandmarker,
  PoseLandmarker,
  HandLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import { GestureDetector } from './GestureDetector';
import { CUE_NAMES, SAFETY_CUES } from './vision-constants';
import type { SocialState } from './vision-constants';

/** Raw per-frame landmark data — used by the CV overlay renderer. */
export interface RawVisionFrame {
  face:  { x: number; y: number; z: number }[] | null;
  pose:  { x: number; y: number; z: number }[] | null;
  hands: { x: number; y: number; z: number }[][] | null;
  blendshapes: { categoryName: string; score: number }[];
  detectedCue: string | null;
  cueScore:    number;
}

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
const MODEL_BASE = 'https://storage.googleapis.com/mediapipe-models';
const FLUSH_INTERVAL_MS = 8_000;

export interface VisionCallbacks {
  onCue:           (cue: string, confidence: number) => void;
  onSafetyConcern: (cue: string, confidence: number) => void;
  onStateUpdate:   (state: SocialState, cueBlock: string) => void;
  onFacePan?:      (pixelX: number) => void; // 0–320, for Arduino pan servo
}

export class VisionPipeline {
  private faceLandmarker: FaceLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private detector = new GestureDetector();

  private running    = false;
  private rafId      = 0;
  private lastTime   = -1;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private cueBuffer: Array<{ ts: number; cue: string; conf: number }> = [];

  private calibrating = 0;
  private initialized = false;
  private renderCallback: ((frame: RawVisionFrame) => void) | null = null;

  // Pan tracking state — mirrors script.py smoothing logic
  private panSmooth = 160; // start centered (320/2)
  private panPrev   = -1;
  private readonly PAN_ALPHA    = 0.2;
  private readonly PAN_DEADZONE = 5;

  get isInitialized(): boolean { return this.initialized; }
  get isRunning():     boolean { return this.running; }

  /**
   * Swap the callback set at runtime.
   * Used when a Gemini session starts/stops to add or remove conversation handlers
   * without restarting the detection loop.
   */
  setCallbacks(cb: VisionCallbacks): void {
    this.cb = cb;
  }

  constructor(private cb: VisionCallbacks) {}

  // ── Lifecycle ──────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.initialized) return;
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

    this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${MODEL_BASE}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });

    this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${MODEL_BASE}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      outputFaceBlendshapes: true,
    });

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${MODEL_BASE}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
    });

    this.initialized = true;
  }

  /** Start the detection loop on the given video element. */
  start(video: HTMLVideoElement): void {
    if (this.running || !this.initialized) return;
    this.running = true;

    // Auto-calibrate neutral baseline after 30 frames (~1s at 30fps)
    this.calibrating = 30;

    // Periodic state + cue-block flush to Gemini prompts
    this.flushTimer = setInterval(() => {
      if (!this.running) return;
      const { state } = this.detector.getInterpretedState();
      const block = this._buildCueBlock();
      this.cueBuffer = [];
      this.cb.onStateUpdate(state, block);
    }, FLUSH_INTERVAL_MS);

    this._loop(video);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    if (this.flushTimer !== null) { clearInterval(this.flushTimer); this.flushTimer = null; }
  }

  /** Returns a formatted snapshot of recent cues and clears the buffer. */
  flushCueBlock(): string {
    const block = this._buildCueBlock();
    this.cueBuffer = [];
    return block;
  }

  /** Returns the current interpreted social state without consuming the buffer. */
  getSocialState(): SocialState {
    return this.detector.getInterpretedState().state;
  }

  /** Register a callback to receive raw landmark data every frame for overlay rendering. */
  setRenderCallback(cb: ((frame: RawVisionFrame) => void) | null): void {
    this.renderCallback = cb;
  }

  // ── Detection loop ─────────────────────────────────────────

  private _loop(video: HTMLVideoElement): void {
    if (!this.running) return;

    const nowMs = performance.now();
    if (video.currentTime !== this.lastTime && !video.paused && video.readyState >= 2) {
      this.lastTime = video.currentTime;

      const faceResult = this.faceLandmarker!.detectForVideo(video, nowMs);
      const poseResult = this.poseLandmarker!.detectForVideo(video, nowMs);
      const handResult = this.handLandmarker!.detectForVideo(video, nowMs);

      const face  = faceResult.faceLandmarks[0]  ?? null;
      const pose  = poseResult.landmarks[0]       ?? null;
      const hands = handResult.landmarks.length ? handResult.landmarks : null;
      const shapes = faceResult.faceBlendshapes?.[0]?.categories ?? [];

      // Auto-calibration: capture neutral baseline in first frames
      if (this.calibrating > 0 && shapes.length > 0) {
        this.calibrating--;
        if (this.calibrating === 0) this.detector.setBaseline(shapes);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = this.detector.process(face as any, pose as any, hands as any, shapes);

      if (this.renderCallback) {
        this.renderCallback({
          face:        face  as { x: number; y: number; z: number }[] | null,
          pose:        pose  as { x: number; y: number; z: number }[] | null,
          hands:       hands as { x: number; y: number; z: number }[][] | null,
          blendshapes: shapes,
          detectedCue: result?.cue ?? null,
          cueScore:    result?.score ?? 0,
        });
      }

      // Pan tracking — nose tip x (landmark 4), normalized 0–1 → pixel 0–320
      if (face && face.length > 4 && this.cb.onFacePan) {
        const rawX    = face[4].x * 320;
        this.panSmooth = this.PAN_ALPHA * rawX + (1 - this.PAN_ALPHA) * this.panSmooth;
        const px = Math.round(this.panSmooth);
        if (Math.abs(px - this.panPrev) > this.PAN_DEADZONE) {
          this.panPrev = px;
          this.cb.onFacePan(px);
        }
      } else if (!face) {
        this.panPrev = -1; // reset on face loss so next detect emits immediately
      }

      if (result) {
        const { cue, score } = result;
        if (cue === 'person_detected') {
          // Person is present but idle — notify engine so it knows someone is in frame
          this.cb.onCue(cue, score);
        } else {
          const ts = Date.now();
          this.cueBuffer.push({ ts, cue, conf: score });
          if (SAFETY_CUES.has(cue)) {
            this.cb.onSafetyConcern(cue, score);
          } else {
            this.cb.onCue(cue, score);
          }
        }
      }
    }

    this.rafId = requestAnimationFrame(() => this._loop(video));
  }

  // ── Formatting ────────────────────────────────────────────

  private _buildCueBlock(): string {
    if (this.cueBuffer.length === 0) return '[No visual cues detected]';
    const { state } = this.detector.getInterpretedState();
    let out = `--- MEDIAPIPE VISUAL CUE STREAM ---\n`;
    out += `Interpreted state: ${state}\n`;
    for (const e of this.cueBuffer) {
      const t = new Date(e.ts).toISOString().substring(11, 23);
      const name = CUE_NAMES[e.cue] ?? e.cue;
      out += `[${t}] ${name} (conf: ${e.conf.toFixed(2)})\n`;
    }
    out += `-----------------------------------`;
    return out;
  }
}
