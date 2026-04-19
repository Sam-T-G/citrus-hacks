// Ported and extended from visual-cue-tracker/src/lib/gesture-logic.ts
// Additions: fall_suspected + body_horizontal + approach_detected + looking_around_confused
import { STATE_WEIGHTS } from './vision-constants';
export class GestureDetector {
    headYHistory = [];
    headXHistory = [];
    wristXHistory = [];
    faceWidthHistory = [];
    lastEventTime = 0;
    currentEvent = null;
    HISTORY_LIMIT = 15;
    COOLDOWN = 1500;
    cueLog = [];
    WINDOW_LONG = 8000;
    baseline = {};
    prevHadFace = false;
    setBaseline(blendshapes) {
        this.baseline = {};
        blendshapes.forEach(b => { this.baseline[b.categoryName] = b.score; });
    }
    process(faceLandmarks, poseLandmarks, handLandmarks, blendshapes = []) {
        const result = this._detect(faceLandmarks, poseLandmarks, handLandmarks, blendshapes);
        if (result) {
            this.cueLog.push({ timestamp: Date.now(), cue: result.cue, confidence: result.score });
            const now = Date.now();
            this.cueLog = this.cueLog.filter(e => now - e.timestamp < this.WINDOW_LONG);
        }
        return result;
    }
    // ── Core detection ─────────────────────────────────────────
    _detect(faceLandmarks, poseLandmarks, handLandmarks, blendshapes) {
        // ── Head-movement history (always accumulate — must run before any early returns) ──
        // This feeds nod, shake, and looking_around_confused which need a rolling window.
        if (faceLandmarks && faceLandmarks.length > 400) {
            const nose = faceLandmarks[4];
            this.headYHistory.push(nose.y);
            this.headXHistory.push(nose.x);
            if (this.headYHistory.length > this.HISTORY_LIMIT)
                this.headYHistory.shift();
            if (this.headXHistory.length > this.HISTORY_LIMIT)
                this.headXHistory.shift();
        }
        else {
            // Face lost — clear histories so stale data doesn't misfire
            this.headYHistory = [];
            this.headXHistory = [];
        }
        // ── Safety: Fall heuristics (highest priority — fires immediately) ─────────
        if (poseLandmarks && poseLandmarks.length >= 25) {
            const nose = poseLandmarks[0];
            const lShoulder = poseLandmarks[11];
            const rShoulder = poseLandmarks[12];
            const lHip = poseLandmarks[23];
            const rHip = poseLandmarks[24];
            const shoulderAvgY = (lShoulder.y + rShoulder.y) / 2;
            const hipAvgY = (lHip.y + rHip.y) / 2;
            // Body horizontal: shoulder–hip vertical gap collapses (< 0.10)
            const bodyVertical = Math.abs(hipAvgY - shoulderAvgY);
            if (bodyVertical < 0.10) {
                return this._emit('body_horizontal', Math.max(0.75, 1.0 - bodyVertical * 4));
            }
            // Nose very low — person may have fallen forward or collapsed
            if (nose.y > 0.85) {
                return this._emit('fall_suspected', Math.min(1.0, (nose.y - 0.85) * 8 + 0.65));
            }
        }
        // ── Approach detection ────────────────────────────────────────────────────
        // Fires when a face appears after being absent, or grows significantly in frame.
        if (faceLandmarks && faceLandmarks.length > 400) {
            // Landmarks 234 (left cheek) and 454 (right cheek) give stable face width
            const faceWidth = Math.abs(faceLandmarks[454].x - faceLandmarks[234].x);
            this.faceWidthHistory.push(faceWidth);
            if (this.faceWidthHistory.length > this.HISTORY_LIMIT)
                this.faceWidthHistory.shift();
            const appeared = !this.prevHadFace; // face just entered frame
            const oldest = this.faceWidthHistory[0] ?? faceWidth;
            const growing = this.faceWidthHistory.length >= 8 && faceWidth > oldest * 1.10; // 10% growth
            const avgWidth = this.faceWidthHistory.reduce((a, b) => a + b, 0) / this.faceWidthHistory.length;
            if ((appeared || (growing && avgWidth > 0.14)) && faceWidth > 0.12) {
                this.prevHadFace = true;
                return this._emit('approach_detected', Math.min(1.0, faceWidth * 3.0));
            }
            this.prevHadFace = true;
        }
        else {
            this.prevHadFace = false;
            this.faceWidthHistory = [];
        }
        // ── Oscillation patterns (nod / shake / confused scan) ───────────────────
        // Evaluated from the rolling history accumulated at the top of _detect.
        if (this.headYHistory.length === this.HISTORY_LIMIT) {
            const minY = Math.min(...this.headYHistory), maxY = Math.max(...this.headYHistory);
            if (maxY - minY > 0.028)
                return this._emit('nod_yes', 0.9);
            const minX = Math.min(...this.headXHistory), maxX = Math.max(...this.headXHistory);
            if (maxX - minX > 0.038)
                return this._emit('shake_no', 0.9);
            // Slower left-right scan with smaller amplitude → disoriented looking around
            if (maxX - minX > 0.016)
                return this._emit('looking_around_confused', 0.78);
        }
        // ── Priority 1: Blendshapes (most reliable expression read) ──────────────
        if (blendshapes.length > 0) {
            const raw = (name) => blendshapes.find(b => b.categoryName === name || b.categoryName.includes(name))?.score ?? 0;
            const rel = (name) => Math.max(0, raw(name) - (this.baseline[name] ?? 0));
            const smile = (rel('mouthSmileLeft') + rel('mouthSmileRight')) / 2;
            const frown = (rel('mouthFrownLeft') + rel('mouthFrownRight')) / 2;
            const browsRaised = (rel('browOuterUpLeft') + rel('browOuterUpRight') + rel('browInnerUp')) / 3;
            const browsDown = (rel('browDownLeft') + rel('browDownRight')) / 2;
            const blink = (raw('eyeBlinkLeft') + raw('eyeBlinkRight')) / 2;
            const gazeUp = (raw('eyeLookUpLeft') + raw('eyeLookUpRight')) / 2;
            const gazeDown = (raw('eyeLookDownLeft') + raw('eyeLookDownRight')) / 2;
            if (blink > 0.40)
                return this._emit('blinking', blink);
            if (smile > 0.08)
                return this._emit('smiling', smile);
            if (frown > 0.06)
                return this._emit('frowning', frown);
            if (browsRaised > 0.07)
                return this._emit('brows_raised', browsRaised);
            if (browsDown > 0.08)
                return this._emit('brows_furrowed', browsDown);
            if (gazeUp > 0.22)
                return this._emit('looking_up', gazeUp);
            if (gazeDown > 0.22)
                return this._emit('looking_down', gazeDown);
        }
        // ── Priority 2: Hand signals ──────────────────────────────────────────────
        if (handLandmarks?.length) {
            for (const hand of handLandmarks) {
                const thumbTip = hand[4];
                const wrist = hand[0];
                const indexTip = hand[8];
                const indexKnuckle = hand[5];
                const isFist = Math.abs(indexTip.y - indexKnuckle.y) < 0.06;
                if (isFist) {
                    if (thumbTip.y < wrist.y - 0.08)
                        return this._emit('thumbs_up', 1.0);
                    if (thumbTip.y > wrist.y + 0.08)
                        return this._emit('thumbs_down', 1.0);
                }
            }
        }
        // ── Priority 2: Body posture ──────────────────────────────────────────────
        if (poseLandmarks && poseLandmarks.length >= 33) {
            const lWrist = poseLandmarks[15];
            const rWrist = poseLandmarks[16];
            const lElbow = poseLandmarks[13];
            const rElbow = poseLandmarks[14];
            const lShoulder = poseLandmarks[11];
            const rShoulder = poseLandmarks[12];
            const nose = poseLandmarks[0];
            const distLR = Math.hypot(lWrist.x - rElbow.x, lWrist.y - rElbow.y);
            const distRL = Math.hypot(rWrist.x - lElbow.x, rWrist.y - lElbow.y);
            if (distLR < 0.12 && distRL < 0.12)
                return this._emit('crossed_arms', 0.9);
            const shoulderZ = (lShoulder.z + rShoulder.z) / 2;
            if (shoulderZ < -0.35)
                return this._emit('leaning_forward', Math.abs(shoulderZ));
            if (shoulderZ > 0.18)
                return this._emit('leaning_back', shoulderZ);
            // Non-mirrored stream: person facing camera → right shoulder (12) is on LEFT side (lower x).
            // If right shoulder crosses to the right of left shoulder, person has turned away.
            if (rShoulder.x > lShoulder.x + 0.07)
                return this._emit('facing_away', Math.min(1.0, (rShoulder.x - lShoulder.x - 0.07) * 5 + 0.55));
            const shoulderAvgY = (lShoulder.y + rShoulder.y) / 2;
            if (shoulderAvgY - nose.y > 0.22)
                return this._emit('slouching', 0.8);
        }
        // ── Priority 3: Facial geometry ───────────────────────────────────────────
        if (faceLandmarks && faceLandmarks.length > 400) {
            const nose = faceLandmarks[4];
            const headWidth = Math.abs(faceLandmarks[454].x - faceLandmarks[234].x);
            const noseOffset = headWidth > 0 ? (nose.x - faceLandmarks[234].x) / headWidth : 0.5;
            // Eye contact / gaze direction
            if (noseOffset > 0.40 && noseOffset < 0.60)
                return this._emit('facing_you', 1.0);
            if (noseOffset < 0.30 || noseOffset > 0.70)
                return this._emit('looking_away', 1.0);
            // Brow geometry — threshold raised so neutral brow position doesn't misfire
            const innerBrowL = faceLandmarks[107];
            const innerBrowR = faceLandmarks[336];
            const eyeLTop = faceLandmarks[159];
            const eyeRTop = faceLandmarks[386];
            const faceHeight = Math.abs(faceLandmarks[152].y - faceLandmarks[10].y);
            const browEyeDist = ((innerBrowL.y - eyeLTop.y) + (innerBrowR.y - eyeRTop.y)) / 2;
            const browRatio = faceHeight > 0 ? browEyeDist / faceHeight : 0;
            if (browRatio > 0.055)
                return this._emit('brows_furrowed', Math.min(1.0, browRatio * 8));
            if (browRatio < -0.07)
                return this._emit('brows_raised', Math.min(1.0, Math.abs(browRatio) * 4));
            // Mouth geometry (backup for when blendshapes are weak)
            const mouthLeft = faceLandmarks[61];
            const mouthRight = faceLandmarks[291];
            const mouthTop = faceLandmarks[13];
            const mouthBottom = faceLandmarks[14];
            const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
            const mouthCenter = (mouthTop.y + mouthBottom.y) / 2;
            const cornerAvgY = (mouthLeft.y + mouthRight.y) / 2;
            const smileScore = mouthWidth > 0 ? (mouthCenter - cornerAvgY) / mouthWidth : 0;
            if (smileScore > 0.10)
                return this._emit('smiling', Math.min(1.0, smileScore * 3.5));
            if (smileScore < -0.04)
                return this._emit('frowning', Math.min(1.0, Math.abs(smileScore) * 5));
        }
        // ── Priority 4: Wave ──────────────────────────────────────────────────────
        if (poseLandmarks && poseLandmarks.length >= 17) {
            const rWrist = poseLandmarks[16];
            const rElbow = poseLandmarks[14];
            if (rWrist && rElbow && rWrist.y < rElbow.y) {
                this.wristXHistory.push(rWrist.x);
                if (this.wristXHistory.length > this.HISTORY_LIMIT)
                    this.wristXHistory.shift();
                if (this.wristXHistory.length === this.HISTORY_LIMIT) {
                    const minX = Math.min(...this.wristXHistory), maxX = Math.max(...this.wristXHistory);
                    if (maxX - minX > 0.07)
                        return this._emit('wave_detected', 0.82);
                }
            }
            else {
                this.wristXHistory = [];
            }
        }
        return this._emit('person_detected', 0.5);
    }
    // ── State aggregation ──────────────────────────────────────────────────────
    getInterpretedState() {
        const now = Date.now();
        const recent = this.cueLog.filter(e => now - e.timestamp < this.WINDOW_LONG);
        const scores = {
            friendly: 0, engaged: 0, concerned: 0,
            confused: 0, disagreeing: 0, disengaged: 0, neutral: 0,
        };
        recent.forEach(ev => {
            const w = STATE_WEIGHTS[ev.cue];
            if (w)
                Object.entries(w).forEach(([s, wt]) => {
                    scores[s] += (wt ?? 0) * ev.confidence;
                });
        });
        let topState = 'neutral';
        let maxScore = 1.5; // lower threshold so states register sooner
        Object.entries(scores).forEach(([s, sc]) => {
            if (sc > maxScore) {
                maxScore = sc;
                topState = s;
            }
        });
        return { state: topState, scores };
    }
    getRecentCues(windowMs = 8000) {
        const now = Date.now();
        return this.cueLog.filter(e => now - e.timestamp < windowMs);
    }
    // ── Emit with cooldown ────────────────────────────────────────────────────
    _emit(cue, score = 1.0) {
        const now = Date.now();
        if (cue !== this.currentEvent || now - this.lastEventTime > this.COOLDOWN) {
            this.lastEventTime = now;
            this.currentEvent = cue;
            return { cue, score };
        }
        return null;
    }
}
