import { STATE_WEIGHTS } from './constants';
import type { SocialState } from './constants';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface CueEvent {
  timestamp: number;
  cue: string;
  confidence: number;
}

export class GestureDetector {
  private headYHistory: number[] = [];
  private headXHistory: number[] = [];
  private wristXHistory: number[] = [];
  private lastEventTime: number = 0;
  private currentEvent: string | null = null;
  private readonly HISTORY_LIMIT = 15;
  private readonly COOLDOWN = 1500; 
  
  private cueLog: CueEvent[] = [];
  // private readonly WINDOW_SHORT = 3000;
  private readonly WINDOW_LONG = 8000;

  private baseline: Record<string, number> = {};
  // private isCalibrated: boolean = false;

  setBaseline(blendshapes: { categoryName: string, score: number }[]) {
    this.baseline = {};
    blendshapes.forEach(b => {
      this.baseline[b.categoryName] = b.score;
    });
    // this.isCalibrated = true;
  }

  process(
    faceLandmarks: Landmark[] | null, 
    poseLandmarks: Landmark[] | null, 
    handLandmarks: Landmark[][] | null,
    blendshapes: { categoryName: string, score: number }[] = []
  ): { cue: string, score: number } | null {
    const result = this.rawProcess(faceLandmarks, poseLandmarks, handLandmarks, blendshapes);
    if (result) {
      this.addToLog(result.cue, result.score);
    }
    return result;
  }

  private rawProcess(
    faceLandmarks: Landmark[] | null, 
    poseLandmarks: Landmark[] | null, 
    handLandmarks: Landmark[][] | null,
    blendshapes: { categoryName: string, score: number }[] = []
  ): { cue: string, score: number } | null {
    
    // Priority 1: High-Accuracy Face Blendshapes (MediaPipe native)
    if (blendshapes && blendshapes.length > 0) {
      const getRawScore = (name: string) => {
        const shape = blendshapes.find(b => b.categoryName === name || b.categoryName.includes(name));
        return shape ? shape.score : 0;
      };

      // Relative scores based on baseline (calibration)
      const getScore = (name: string) => {
        const raw = getRawScore(name);
        const base = this.baseline[name] || 0;
        return Math.max(0, raw - base);
      };
      
      const smile = (getScore('mouthSmileLeft') + getScore('mouthSmileRight')) / 2;
      const frown = (getScore('mouthFrownLeft') + getScore('mouthFrownRight')) / 2;
      const browsRaised = (getScore('browOuterUpLeft') + getScore('browOuterUpRight') + getScore('browInnerUp')) / 3;
      const browsDown = (getScore('browDownLeft') + getScore('browDownRight')) / 2;
      
      const blink = (getRawScore('eyeBlinkLeft') + getRawScore('eyeBlinkRight')) / 2;
      
      // Eye Gaze Tracking
      // const gazeLeft = getRawScore('eyeLookOutLeft') || getRawScore('eyeLookInRight');
      // const gazeRight = getRawScore('eyeLookInLeft') || getRawScore('eyeLookOutRight');
      const gazeUp = (getRawScore('eyeLookUpLeft') + getRawScore('eyeLookUpRight')) / 2;
      const gazeDown = (getRawScore('eyeLookDownLeft') + getRawScore('eyeLookDownRight')) / 2;

      // Thresholds
      if (blink > 0.6) return this.emit('blinking', blink);
      
      if (smile > 0.25) return this.emit('smiling', smile);
      if (frown > 0.15) return this.emit('frowning', frown);
      if (browsRaised > 0.2) return this.emit('brows_raised', browsRaised);
      if (browsDown > 0.25) return this.emit('brows_furrowed', browsDown);
      
      if (gazeUp > 0.4) return this.emit('looking_up', gazeUp);
      if (gazeDown > 0.4) return this.emit('looking_down', gazeDown);
    }

    // Priority 2: Hand Signals (Thumbs up/down)
    if (handLandmarks && handLandmarks.length > 0) {
      for (const hand of handLandmarks) {
        const thumbTip = hand[4];
        const wrist = hand[0];
        const indexTip = hand[8];
        const indexKnuckle = hand[5];

        // Check if fingers are closed (fist-like)
        const isFist = Math.abs(indexTip.y - indexKnuckle.y) < 0.05;

        if (isFist) {
          if (thumbTip.y < wrist.y - 0.1) return this.emit('thumbs_up', 1.0);
          if (thumbTip.y > wrist.y + 0.1) return this.emit('thumbs_down', 1.0);
        }
      }
    }

    // Priority 2: Body Language (Posture)
    if (poseLandmarks && poseLandmarks.length >= 33) {
      const lWrist = poseLandmarks[15];
      const rWrist = poseLandmarks[16];
      const lElbow = poseLandmarks[13];
      const rElbow = poseLandmarks[14];
      const lShoulder = poseLandmarks[11];
      const rShoulder = poseLandmarks[12];
      const nose = poseLandmarks[0];

      // Crossed Arms
      const distLR = Math.sqrt(Math.pow(lWrist.x - rElbow.x, 2) + Math.pow(lWrist.y - rElbow.y, 2));
      const distRL = Math.sqrt(Math.pow(rWrist.x - lElbow.x, 2) + Math.pow(rWrist.y - lElbow.y, 2));
      if (distLR < 0.1 && distRL < 0.1) return this.emit('crossed_arms', 0.9);

      // Leaning Forward / Backward (Z-depth of shoulders relative to hips/nose)
      const shoulderZ = (lShoulder.z + rShoulder.z) / 2;
      if (shoulderZ < -0.4) return this.emit('leaning_forward', Math.abs(shoulderZ));
      if (shoulderZ > 0.2) return this.emit('leaning_back', shoulderZ);

      // Facing Away (Shoulders swapped or too close)
      if (rShoulder.x < lShoulder.x || Math.abs(rShoulder.x - lShoulder.x) < 0.05) return this.emit('facing_away', 1.0);

      // Slouching (Shoulders significantly lower than usual relative to nose)
      const shoulderAvgY = (lShoulder.y + rShoulder.y) / 2;
      if (shoulderAvgY - nose.y > 0.25) return this.emit('slouching', 0.8);
    }

    // Priority 3: Facial Cues
    if (faceLandmarks && faceLandmarks.length > 400) {
      const nose = faceLandmarks[4];
      const mouthTop = faceLandmarks[13];
      const mouthBottom = faceLandmarks[14];
      const mouthLeft = faceLandmarks[61];
      const mouthRight = faceLandmarks[291];
      
      const innerBrowL = faceLandmarks[107];
      const innerBrowR = faceLandmarks[336];
      const eyeLTop = faceLandmarks[159];
      const eyeRTop = faceLandmarks[386];
      
      // 1. Brows: Improved detection using vertical distance relative to face height
      const faceHeight = Math.abs(faceLandmarks[152].y - faceLandmarks[10].y);
      const browEyeDist = ((innerBrowL.y - eyeLTop.y) + (innerBrowR.y - eyeRTop.y)) / 2;
      const browRatio = browEyeDist / faceHeight;

      if (browRatio > 0.02) return this.emit('brows_furrowed', Math.min(1.0, browRatio * 10));
      if (browRatio < -0.05) return this.emit('brows_raised', Math.min(1.0, Math.abs(browRatio) * 5));

      // 2. Mouth: Smiling vs Frowning (using curvature/angle of corners)
      const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
      const mouthVerticalCenter = (mouthTop.y + mouthBottom.y) / 2;
      const cornerAvgY = (mouthLeft.y + mouthRight.y) / 2;
      
      const smileScore = (mouthVerticalCenter - cornerAvgY) / mouthWidth;

      if (smileScore > 0.15) return this.emit('smiling', Math.min(1.0, smileScore * 4));
      if (smileScore < -0.05) return this.emit('frowning', Math.min(1.0, Math.abs(smileScore) * 6));

      // 3. Eye Contact / Facing You (Using nose position and yaw proxy)
      const headWidth = Math.abs(faceLandmarks[454].x - faceLandmarks[234].x);
      const noseOffset = (nose.x - faceLandmarks[234].x) / headWidth;
      
      if (noseOffset > 0.42 && noseOffset < 0.58) return this.emit('facing_you', 1.0);
      if (noseOffset < 0.35 || noseOffset > 0.65) return this.emit('looking_away', 1.0);
      
      // 4. Nod/Shake History (remains the same but lower thresholds for sensitivity)
      this.headYHistory.push(nose.y);
      this.headXHistory.push(nose.x);
      if (this.headYHistory.length > this.HISTORY_LIMIT) this.headYHistory.shift();
      if (this.headXHistory.length > this.HISTORY_LIMIT) this.headXHistory.shift();

      if (this.headYHistory.length === this.HISTORY_LIMIT) {
        const minY = Math.min(...this.headYHistory);
        const maxY = Math.max(...this.headYHistory);
        if (maxY - minY > 0.035) return this.emit('nod_yes', 0.9);

        const minX = Math.min(...this.headXHistory);
        const maxX = Math.max(...this.headXHistory);
        if (maxX - minX > 0.045) return this.emit('shake_no', 0.9);
      }
    }

    // Priority 4: Dynamic Gestures (Wave)
    if (poseLandmarks && poseLandmarks.length >= 17) {
      const rWrist = poseLandmarks[16];
      const rElbow = poseLandmarks[14];
      if (rWrist && rElbow && rWrist.y < rElbow.y) {
        this.wristXHistory.push(rWrist.x);
        if (this.wristXHistory.length > this.HISTORY_LIMIT) this.wristXHistory.shift();
        if (this.wristXHistory.length === this.HISTORY_LIMIT) {
          const minX = Math.min(...this.wristXHistory);
          const maxX = Math.max(...this.wristXHistory);
          if (maxX - minX > 0.08) return this.emit('wave_detected', 0.82);
        }
      } else {
        this.wristXHistory = [];
      }
    }

    return this.emit('person_detected', 0.5);
  }

  private addToLog(cue: string, confidence: number = 1.0) {
    this.cueLog.push({ timestamp: Date.now(), cue, confidence });
    const now = Date.now();
    this.cueLog = this.cueLog.filter(e => now - e.timestamp < this.WINDOW_LONG);
  }

  getInterpretedState(): { state: SocialState, scores: Record<SocialState, number> } {
    const now = Date.now();
    const recentEvents = this.cueLog.filter(e => now - e.timestamp < this.WINDOW_LONG);
    
    const scores: Record<SocialState, number> = {
      friendly: 0,
      engaged: 0,
      concerned: 0,
      confused: 0,
      disagreeing: 0,
      disengaged: 0,
      neutral: 0
    };

    recentEvents.forEach(event => {
      const weights = STATE_WEIGHTS[event.cue];
      if (weights) {
        Object.entries(weights).forEach(([state, weight]) => {
          scores[state as SocialState] += (weight || 0) * event.confidence;
        });
      }
    });

    // Pick top state
    let topState: SocialState = 'neutral';
    let maxScore = 2; // Threshold for significance

    Object.entries(scores).forEach(([state, score]) => {
      if (score > maxScore) {
        maxScore = score;
        topState = state as SocialState;
      }
    });

    return { state: topState, scores };
  }

  private emit(event: string, score: number = 1.0): { cue: string, score: number } | null {
    const now = Date.now();
    if (event !== this.currentEvent || (now - this.lastEventTime > this.COOLDOWN)) {
      this.lastEventTime = now;
      this.currentEvent = event;
      return { cue: event, score };
    }
    return null;
  }
}
