/**
 * GeminiLiveEngine — multimodal conversation engine.
 *
 * Owl body controls (silent — not spoken):
 *   set_face(face)             → LCD expression
 *   wave_wing()                → servo sweep
 *
 * Dementia care observation tools (fire-and-forget, write to log):
 *   log_mood_observation()     → mood + intensity + optional notes
 *   log_behavior_event()       → behavioural pattern (wandering, repetition…)
 *   alert_caregiver()          → escalation with severity
 *   log_medication_event()     → medication interaction observed
 *   get_time_context()         → returns current time/date/sundowning risk to Gemini
 */
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { AudioPlayer } from '../audio/AudioPlayer';
import { MicCapture } from '../audio/MicCapture';
import { CameraCapture } from '../vision/CameraCapture';
import { VisionPipeline } from '../vision/VisionPipeline';
import { logService } from '../services/LogService';
import { notificationService } from '../services/NotificationService';
import { GEMINI_API_KEY, GEMINI_MODEL, GEMINI_VOICE, SYSTEM_PROMPT } from '../config';
const VALID_FACES = new Set(['happy', 'plain', 'wink', 'tears', 'dizzy', 'robot', 'dead']);
// ── Prompt builders (use MediaPipe cue block to enrich Gemini context) ────────
function _buildEnrichedSafetyPrompt(cueBlock, triggeredCue, conf) {
    return `\
[SYSTEM: SAFETY FLAG — MediaPipe detected "${triggeredCue}" (${(conf * 100).toFixed(0)}% confidence)]
Sensor data:
${cueBlock}

Look at the camera now. Confirm or rule out a real safety concern.
- False positive (she looks fine): log_mood_observation only. No audio.
- Fall confirmed: log_behavior_event(fall_detected) + alert_caregiver(high) + set_face(tears) + one calm sentence.
- Frantic movement: log_behavior_event(frantic_movement, what you see) + alert_caregiver(high) + set_face(tears) + one slow calm sentence.
- Unresponsive: log_behavior_event(unresponsive) + alert_caregiver(high) + speak clearly to check responsiveness.`.trim();
}
function _buildEnrichedVisualCheck(cueBlock) {
    return `\
[SYSTEM: COMPANION CHECK — sensor-triggered]
MediaPipe signals (supplemental — verify visually):
${cueBlock}

Look at the camera now and call report_visual_state. Use the session context and what you see to decide:
- Calm/settled → one warm conversational sentence.
- Confused → orient softly, log_mood_observation(confused).
- Distressed → respond with warmth, log_mood_observation + alert_caregiver(medium).
- Wandering signals → redirect, log_behavior_event(wandering_attempt) + alert_caregiver(high).
- Fall → act immediately per your training.
Default to gentle engagement. set_face before speaking.`.trim();
}
function sundowingRisk() {
    const h = new Date().getHours();
    if (h >= 15 && h < 20)
        return 'high';
    if (h >= 20 || h < 7)
        return 'medium';
    return 'low';
}
function timeContextPayload() {
    const now = new Date();
    return {
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        hour: now.getHours(),
        sundowning_risk: sundowingRisk(),
    };
}
const TOOLS = [{
        functionDeclarations: [
            // ── Owl body ──────────────────────────────────────────────
            {
                name: 'set_face',
                description: 'Change the owl LCD face expression. Call at the start of every response.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        face: {
                            type: Type.STRING,
                            enum: ['happy', 'plain', 'wink', 'tears', 'dizzy', 'robot', 'dead'],
                            description: 'happy=joy, plain=calm, wink=playful, tears=empathy, dizzy=thinking, robot=focused, dead=dramatic',
                        },
                    },
                    required: ['face'],
                },
            },
            {
                name: 'wave_wing',
                description: 'Wave the servo wing. Wave often and freely — every hello, good morning, goodbye. Also: she laughs, smiles, shares a memory, good news, encouragement, any warm or playful moment. When uncertain, wave anyway. Pair with set_face(happy) or set_face(wink).',
            },
            // ── Dementia care observation ─────────────────────────────
            {
                name: 'log_mood_observation',
                description: 'Record the person\'s observed emotional state. Call whenever you notice a meaningful mood, at session start, and on any shift.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        mood: {
                            type: Type.STRING,
                            enum: ['calm', 'happy', 'confused', 'agitated', 'distressed', 'sad', 'fearful', 'lucid'],
                        },
                        intensity: {
                            type: Type.STRING,
                            enum: ['mild', 'moderate', 'severe'],
                        },
                        notes: { type: Type.STRING, description: 'Optional brief observation note' },
                    },
                    required: ['mood', 'intensity'],
                },
            },
            {
                name: 'log_behavior_event',
                description: 'Record a specific behavioural pattern you have observed.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        event_type: {
                            type: Type.STRING,
                            enum: ['repetitive_question', 'wandering_attempt', 'refused_medication', 'did_not_eat', 'fall_risk', 'fall_detected', 'frantic_movement', 'unresponsive', 'aggression', 'lucid_moment', 'general'],
                        },
                        notes: { type: Type.STRING, description: 'What you observed' },
                    },
                    required: ['event_type', 'notes'],
                },
            },
            {
                name: 'alert_caregiver',
                description: 'Escalate a situation to the caregiver. Use high for immediate safety concerns (aggression, fall, wandering), medium for concerning patterns, low for notable observations.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                        reason: { type: Type.STRING, description: 'Clear reason for the alert' },
                    },
                    required: ['severity', 'reason'],
                },
            },
            {
                name: 'log_medication_event',
                description: 'Record a medication-related observation (pill bottle visible, patient mentions pills, etc.).',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        action: { type: Type.STRING, enum: ['prompted', 'taken', 'refused', 'uncertain'] },
                        notes: { type: Type.STRING },
                    },
                    required: ['action'],
                },
            },
            {
                name: 'get_time_context',
                description: 'Get the current time, date, and sundowning risk level. Call at session start and when orientation context is needed.',
            },
            {
                name: 'report_visual_state',
                description: 'Silently report what you observe in the camera feed. Call during every visual scan — no audio, no response. This surfaces your visual observations to the caregiver dashboard.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        description: {
                            type: Type.STRING,
                            description: 'One sentence describing what you observe (posture, expression, activity, environment)',
                        },
                        emotion_hint: {
                            type: Type.STRING,
                            enum: ['calm', 'happy', 'confused', 'drowsy', 'restless', 'distressed', 'engaged', 'absent', 'unknown'],
                            description: 'Best single-word emotional read',
                        },
                    },
                    required: ['description', 'emotion_hint'],
                },
            },
            {
                name: 'show_photo',
                description: 'Display a memory photo on screen for the person to see and talk about. Use this to spark memories, comfort them, or redirect gently. Call it naturally mid-conversation — say something warm first, then show the photo. Great for Harold, Singapore, Lucy\'s drawings, or any topic they love.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        photo_id: {
                            type: Type.STRING,
                            description: 'The id of the memory photo to display (from the available memories list in your system prompt)',
                        },
                    },
                    required: ['photo_id'],
                },
            },
        ],
    }];
// How long of silence before Mira considers proactive engagement
const VISUAL_CHECK_SILENCE_MS = 60_000; // 60s — person already tracked, don't rush
// How often to poll for the silence check
const VISUAL_CHECK_POLL_MS = 15_000;
// Minimum gap between proactive engagements so Mira isn't chatty
const VISUAL_CHECK_COOLDOWN_MS = 120_000;
// How often the background safety scan fires (only backs up real-time onSafetyConcern)
const SAFETY_SCAN_INTERVAL_MS = 120_000;
// Minimum time between repeated safety alerts
const SAFETY_ALERT_COOLDOWN_MS = 60_000;
// Minimum gap between ANY injected text turn — prevents overriding live audio input
const MIN_PROMPT_GAP_MS = 45_000;
// Don't inject text turns if user spoke within this window
const USER_ACTIVE_WINDOW_MS = 20_000;
// Buffer after Gemini finishes speaking before we can inject anything
const POST_SPEAKING_BUFFER_MS = 8_000;
// Proactive engagement — fires after sustained silence.
// Context is prepended automatically by _sendSystemPrompt.
const VISUAL_CHECK_PROMPT = `\
[SYSTEM: COMPANION CHECK — person is in view]
Someone is present. Look at the camera now and call report_visual_state with what you see.

Then engage them — do not stay silent. One warm sentence is always the right call.
Choose your response based on what you observe:
- Calm or quiet → gentle opener: ask about their day, bring up a memory, offer warmth.
- Happy or animated → match their energy, reflect their mood back.
- Confused or looking around → orient softly, log_mood_observation(confused).
- Distressed → immediate warmth, log_mood_observation + alert_caregiver(medium).
- Wandering signals (coat, door, keys) → redirect, log_behavior_event(wandering_attempt) + alert_caregiver(high).
- On the floor → act immediately per your training.

set_face before speaking. Silence when someone is present is never the right choice.`.trim();
// Background safety scan — fires every 30s. Silent unless critical.
const SAFETY_SCAN_PROMPT = `\
[SYSTEM: SAFETY SCAN — silent unless critical]
Look at the camera now. Call report_visual_state first.

Check only: is she on the floor, in distress, unresponsive, or in immediate danger?
- If safe: call log_mood_observation with your current read. No audio.
- If fallen: log_behavior_event(fall_detected) + alert_caregiver(high) + speak calmly with set_face(tears).
- If frantic: log_behavior_event(frantic_movement) + alert_caregiver(high) + one calm sentence.
- If unresponsive: log_behavior_event(unresponsive) + alert_caregiver(high) + speak loudly to check.`.trim();
// ── Targeted trigger prompts ──────────────────────────────────────────────────
// Person walks up to the camera — greet them warmly
const TRIGGER_APPROACH = `\
[SYSTEM: PRESENCE DETECTED — someone has approached]
A person has just come into view or moved close to the camera. Look at them now.
Greet them naturally and warmly, as if you just noticed them walk in.
Call set_face(happy) or set_face(wink) first, then speak one friendly welcoming sentence.
If you recognise them from prior conversation, reference that. Keep it brief and genuine.`.trim();
// Person is scanning left/right — confusion, disorientation, or searching
const TRIGGER_CONFUSED_SCAN = `\
[SYSTEM: CONFUSION SIGNAL — person appears to be looking around]
The person is scanning left and right, which often indicates confusion or disorientation.
Look at the camera now. Do they seem lost, searching, or uncertain?
Call report_visual_state with what you see.
Then respond gently: call set_face(wink), speak one calm orienting sentence.
Examples: "I'm right here — is there something you're looking for?" or "You seem like you might be looking for something. Can I help?"
Do not over-explain. One sentence, warm tone.`.trim();
// Person is on the floor — treat as likely fall, immediate concerned response
const TRIGGER_FLOOR = (cue, conf) => `\
[SYSTEM: URGENT — person may be on the floor]
MediaPipe detected "${cue}" (confidence ${(conf * 100).toFixed(0)}%). The person may have fallen.
Look at the camera RIGHT NOW.

If they are clearly on the floor or in a fallen position:
  Call log_behavior_event(fall_detected, "Patient appears to have fallen — on floor").
  Call alert_caregiver(high, "Patient has fallen — immediate response needed").
  Call set_face(tears).
  Speak immediately in a calm, reassuring voice: address them by name if you know it, tell them you're there and help is coming.

If they are sitting low, crouching, or the detection was a false positive:
  Call report_visual_state with what you see.
  Call log_mood_observation(calm, mild) only. Do not speak unless they look distressed.

Do NOT hesitate if they are on the floor. Act immediately.`.trim();
export class GeminiLiveEngine {
    cb;
    ai;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session = null;
    player;
    mic;
    camera;
    vision;
    systemPrompt;
    // Track ownership so stop() knows whether to release camera/vision or just pause them
    ownsCamera;
    ownsVision;
    transcriptBuf = [];
    userSpeechBuf = [];
    speaking = false;
    running = false;
    lastActivityTime = Date.now();
    lastUserSpeech = 0;
    lastTextPrompt = 0;
    lastSafetyAlert = 0;
    lastEngagement = 0;
    lastSpeakingEnd = 0;
    lastCueBlock = '[No visual cues yet]';
    visualCheckTimer = null;
    safetyTimer = null;
    horizontalTimer = null;
    observations = [];
    triggerCooldowns = {};
    lastKeywordAlert = 0;
    // Sustained-horizontal tracking
    horizontalStartTs = null;
    lastHorizontalSeen = 0;
    lastHorizontalEscalation = 0;
    // Rolling session context — feeds continuity into every injected prompt
    contextLog = [];
    CTX_WINDOW_MS = 120_000;
    CTX_MAX = 12;
    /**
     * @param sharedCamera  Pre-opened CameraCapture from SessionContext (for pan tracking).
     *                      If omitted, the engine opens its own camera.
     * @param sharedVision  Pre-started VisionPipeline from SessionContext.
     *                      If omitted, the engine creates its own.
     *                      When provided, Gemini callbacks are swapped in on start()
     *                      and restored to pan-only on stop().
     */
    constructor(cb, systemPrompt, sharedCamera, sharedVision) {
        this.cb = cb;
        this.ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        this.player = new AudioPlayer();
        this.mic = new MicCapture();
        this.ownsCamera = !sharedCamera;
        this.ownsVision = !sharedVision;
        this.camera = sharedCamera ?? new CameraCapture();
        this.vision = sharedVision ?? new VisionPipeline(this._buildVisionCallbacks());
        this.systemPrompt = systemPrompt ?? SYSTEM_PROMPT;
    }
    get cameraCapture() { return this.camera; }
    get visionPipeline() { return this.vision; }
    get recentObservations() { return this.observations; }
    get isRunning() { return this.running; }
    /** Builds the full set of VisionPipeline callbacks for an active Gemini session. */
    _buildVisionCallbacks() {
        return {
            onCue: (cue, conf) => {
                if (!this.session || !this.running)
                    return;
                this._handleTriggerCue(cue, conf);
            },
            onSafetyConcern: (cue, conf) => {
                this._handleSafetyConcern(cue, conf);
            },
            onStateUpdate: (state, block) => {
                this.lastCueBlock = block;
                if (state !== 'neutral')
                    this._addContext('MediaPipe state', state);
            },
            onFacePan: (px) => { this.cb.onFacePan?.(px); },
        };
    }
    /** Pan-only callbacks — used when no Gemini session is active. */
    _buildPanOnlyCallbacks() {
        return {
            onCue: () => { },
            onSafetyConcern: (cue, conf) => { this._handleSafetyConcern(cue, conf); },
            onStateUpdate: () => { },
            onFacePan: (px) => { this.cb.onFacePan?.(px); },
        };
    }
    /**
     * Deterministic safety handler — fires immediately on any safety cue,
     * independent of Gemini's response time or availability.
     *
     * Covers:
     *   fall_suspected   → high alert immediately
     *   body_horizontal  → medium alert immediately; escalates to high after 2 min sustained
     *   other safety cues → medium alert
     *
     * Also triggers Gemini visual verification (priority=true) when a session is active.
     */
    _handleSafetyConcern(cue, conf) {
        const now = Date.now();
        const isFall = cue === 'fall_suspected';
        const isHorizontal = cue === 'body_horizontal';
        // Track sustained horizontal
        if (isHorizontal) {
            this.lastHorizontalSeen = now;
            if (this.horizontalStartTs === null)
                this.horizontalStartTs = now;
        }
        else {
            // Non-horizontal safety cue — reset horizontal timer
            this.horizontalStartTs = null;
        }
        // Cooldown gate for direct alert (shorter than the Gemini prompt gate)
        if (now - this.lastSafetyAlert < 30_000)
            return;
        this.lastSafetyAlert = now;
        const severity = isFall ? 'high' : 'medium';
        const reason = isFall
            ? `Possible fall detected by motion sensor (confidence ${(conf * 100).toFixed(0)}%)`
            : isHorizontal
                ? 'Patient appears to be lying down — position monitoring active'
                : `Safety concern detected: ${cue.replace(/_/g, ' ')} (${(conf * 100).toFixed(0)}%)`;
        logService.alert({ severity, reason });
        notificationService.notify(severity, reason, `mira-safety-${cue}`);
        this.cb.onCaregiverAlert(severity, reason);
        this._addContext('Safety', `${severity.toUpperCase()} — ${reason}`);
        // Also ask Gemini to visually verify when a session is active
        if (this.session && this.running) {
            if (isFall || isHorizontal) {
                this._sendSystemPrompt(TRIGGER_FLOOR(cue, conf), true);
            }
            else {
                const block = this.vision.flushCueBlock();
                this.lastCueBlock = block;
                this._sendSystemPrompt(_buildEnrichedSafetyPrompt(block, cue, conf), true);
            }
        }
    }
    _addContext(tag, content) {
        const now = Date.now();
        this.contextLog.push({ ts: now, tag, content });
        // Prune to window and max entries
        this.contextLog = this.contextLog
            .filter(e => now - e.ts < this.CTX_WINDOW_MS)
            .slice(-this.CTX_MAX);
    }
    _buildSessionContext() {
        if (this.contextLog.length === 0)
            return '';
        const lines = this.contextLog.map(e => {
            const t = new Date(e.ts).toISOString().substring(11, 19);
            return `[${t}] ${e.tag}: ${e.content}`;
        });
        return `\n--- SESSION CONTEXT (recent ${Math.round(this.CTX_WINDOW_MS / 60000)}min) ---\n${lines.join('\n')}\n---\n`;
    }
    /**
     * Central gate for ALL injected text turns.
     * Blocks if Gemini is speaking, user recently spoke, or prompts are too frequent.
     * Prepends rolling session context so every prompt has continuity.
     * Pass priority=true only for confirmed safety emergencies.
     */
    _sendSystemPrompt(text, priority = false) {
        if (!this.session || !this.running)
            return false;
        if (this.speaking)
            return false;
        const now = Date.now();
        if (!priority && now - this.lastSpeakingEnd < POST_SPEAKING_BUFFER_MS)
            return false;
        if (!priority && now - this.lastUserSpeech < USER_ACTIVE_WINDOW_MS)
            return false;
        if (!priority && now - this.lastTextPrompt < MIN_PROMPT_GAP_MS)
            return false;
        this.lastTextPrompt = now;
        const fullText = this._buildSessionContext() + text;
        this.session.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: fullText }] }],
            turnComplete: true,
        });
        return true;
    }
    _sendTrigger(prompt) {
        if (this._sendSystemPrompt(prompt)) {
            this.lastEngagement = Date.now();
            this.lastActivityTime = Date.now();
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _handleTriggerCue(cue, _conf) {
        if (cue === 'person_detected')
            return;
        const now = Date.now();
        const COOLDOWNS = {
            approach_detected: 30_000, // greet at most once per 30s
            looking_around_confused: 30_000, // confusion check at most every 30s
        };
        const cooldownMs = COOLDOWNS[cue];
        if (!cooldownMs) {
            this.cb.onAmbientCue?.(cue, _conf);
            return;
        }
        const lastFired = this.triggerCooldowns[cue] ?? 0;
        if (now - lastFired < cooldownMs)
            return;
        this.triggerCooldowns[cue] = now;
        if (cue === 'approach_detected') {
            if (this.speaking)
                return;
            this._sendApproach();
        }
        else if (cue === 'looking_around_confused') {
            if (this.speaking)
                return;
            this._sendTrigger(TRIGGER_CONFUSED_SCAN);
        }
    }
    /** Fast-path for approach — skips MIN_PROMPT_GAP but still respects speaking buffer. */
    _sendApproach() {
        if (!this.session || !this.running || this.speaking)
            return;
        if (Date.now() - this.lastUserSpeech < 3_000)
            return;
        if (Date.now() - this.lastTextPrompt < 3_000)
            return; // don't fire if greeting just sent
        if (Date.now() - this.lastSpeakingEnd < POST_SPEAKING_BUFFER_MS)
            return;
        const fullText = this._buildSessionContext() + TRIGGER_APPROACH;
        this.session.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: fullText }] }],
            turnComplete: true,
        });
        this.lastTextPrompt = Date.now();
        this.lastEngagement = Date.now();
        this.lastActivityTime = Date.now();
        // Wave to physically greet — goes directly through Arduino command path
        this.cb.onArduinoCommand({ wave: 1 });
    }
    /**
     * Scans finalized user speech for concerning patterns as a deterministic safety
     * net — independent of Gemini AI detection. Fires a medium alert with 3min cooldown.
     * High-severity keywords (fall, chest pain, can't breathe) escalate immediately.
     */
    _scanTranscriptForConcerns(text) {
        const t = text.toLowerCase();
        const COOLDOWN_MS = 3 * 60_000;
        if (Date.now() - this.lastKeywordAlert < COOLDOWN_MS)
            return;
        const HIGH_PATTERNS = [
            { re: /\b(fell|fall(ing)?|fallen|on the floor)\b/, reason: 'Patient may have fallen' },
            { re: /\bchest (pain|hurts|tight)\b/, reason: 'Patient reports chest pain' },
            { re: /\bcan'?t breathe\b/, reason: 'Patient reports breathing difficulty' },
            { re: /\b(unresponsive|not moving)\b/, reason: 'Patient may be unresponsive' },
        ];
        const MEDIUM_PATTERNS = [
            { re: /\b(help me|someone help|i need help)\b/, reason: 'Patient is asking for help' },
            { re: /\b(hurt(ing)?|in pain|it hurts)\b/, reason: 'Patient reports pain' },
            { re: /\b(scared|frightened|i'?m afraid)\b/, reason: 'Patient reports fear or distress' },
            { re: /\b(where am i|don'?t know where|lost)\b/, reason: 'Patient appears disoriented' },
            { re: /\b(dizzy|spinning|can'?t stand)\b/, reason: 'Patient reports dizziness' },
            { re: /\b(nausea|feel sick|going to be sick)\b/, reason: 'Patient reports nausea' },
            { re: /\b(confused|don'?t (understand|know))\b/, reason: 'Patient expressing confusion' },
        ];
        for (const p of HIGH_PATTERNS) {
            if (p.re.test(t)) {
                this.lastKeywordAlert = Date.now();
                this.lastSafetyAlert = Date.now();
                logService.alert({ severity: 'high', reason: `[Transcript] ${p.reason}: "${text.slice(0, 120)}"` });
                notificationService.notify('high', `${p.reason} — heard in conversation`, 'mira-transcript-alert');
                this.cb.onCaregiverAlert('high', `${p.reason}: "${text.slice(0, 100)}"`);
                return;
            }
        }
        for (const p of MEDIUM_PATTERNS) {
            if (p.re.test(t)) {
                this.lastKeywordAlert = Date.now();
                logService.alert({ severity: 'medium', reason: `[Transcript] ${p.reason}: "${text.slice(0, 120)}"` });
                notificationService.notify('medium', `${p.reason} — heard in conversation`, 'mira-transcript-concern');
                this.cb.onCaregiverAlert('medium', `${p.reason}: "${text.slice(0, 100)}"`);
                return;
            }
        }
    }
    async start() {
        this.running = true;
        this.player.resume();
        logService.startSession();
        // If using a shared VisionPipeline, activate Gemini callbacks now.
        // The detection loop is already running — callbacks are swapped in-place.
        if (!this.ownsVision) {
            this.vision.setCallbacks(this._buildVisionCallbacks());
        }
        // Initialize MediaPipe vision models (loads from CDN, non-blocking for Gemini connect)
        this.vision.init().catch(e => console.warn('[VisionPipeline] init failed:', e));
        this.session = await this.ai.live.connect({
            model: GEMINI_MODEL,
            config: {
                responseModalities: [Modality.AUDIO],
                outputAudioTranscription: {},
                inputAudioTranscription: {},
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: GEMINI_VOICE },
                    },
                },
                systemInstruction: this.systemPrompt,
                tools: TOOLS,
            },
            callbacks: {
                onopen: () => { this.cb.onConnected(); this._startStreaming(); },
                onmessage: (msg) => this._handleMessage(msg),
                onerror: (e) => this.cb.onError(new Error(String(e))),
                onclose: (e) => {
                    this.running = false;
                    logService.endSession();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    this.cb.onDisconnected(e?.reason ?? '');
                },
            },
        });
    }
    async injectGreeting(text) {
        if (!this.session)
            return;
        this.lastTextPrompt = Date.now(); // block approach from firing alongside greeting
        this.lastEngagement = Date.now();
        await this.session.sendClientContent({
            turns: [{ role: 'user', parts: [{ text }] }],
            turnComplete: true,
        });
    }
    async stop() {
        this.running = false;
        if (this.visualCheckTimer !== null) {
            clearInterval(this.visualCheckTimer);
            this.visualCheckTimer = null;
        }
        if (this.safetyTimer !== null) {
            clearInterval(this.safetyTimer);
            this.safetyTimer = null;
        }
        if (this.horizontalTimer !== null) {
            clearInterval(this.horizontalTimer);
            this.horizontalTimer = null;
        }
        this.mic.stop();
        this.player.interrupt();
        this.session?.close();
        this.session = null;
        if (this.ownsCamera) {
            this.camera.stop();
        }
        else {
            // Shared camera: stop sending frames to Gemini but keep the stream alive for tracking
            this.camera.stopFrames();
        }
        if (this.ownsVision) {
            this.vision.stop();
        }
        else {
            // Shared vision: restore pan-only callbacks so tracking continues without a session
            this.vision.setCallbacks(this._buildPanOnlyCallbacks());
        }
    }
    _startStreaming() {
        this.lastActivityTime = Date.now();
        this.mic.start((base64pcm) => {
            if (!this.session || !this.running)
                return;
            this.session.sendRealtimeInput({
                audio: { data: base64pcm, mimeType: 'audio/pcm;rate=16000' },
            });
        });
        const frameCallback = (base64jpeg) => {
            if (!this.session || !this.running)
                return;
            this.session.sendRealtimeInput({
                video: { data: base64jpeg, mimeType: 'image/jpeg' },
            });
        };
        if (this.ownsCamera) {
            // Engine owns camera — open stream and start JPEG delivery
            this.camera.start(frameCallback, 1);
        }
        else {
            // Shared camera already streaming — just add JPEG sender on top
            this.camera.startFrames(frameCallback, 1);
        }
        // Start MediaPipe on the video element.
        // If vision is already running (shared), start() is a no-op — the loop continues.
        const videoEl = this.camera.getVideoElement();
        if (videoEl) {
            this.vision.start(videoEl);
        }
        else {
            setTimeout(() => {
                const el = this.camera.getVideoElement();
                if (el)
                    this.vision.start(el);
            }, 500);
        }
        // Proactive engagement: fires after sustained silence.
        // Threshold is shorter when someone is visibly present in frame.
        this.visualCheckTimer = setInterval(() => {
            const silentMs = Date.now() - this.lastActivityTime;
            const cooldownOk = (Date.now() - this.lastEngagement) > VISUAL_CHECK_COOLDOWN_MS;
            const silenceNeeded = VISUAL_CHECK_SILENCE_MS;
            if (silentMs < silenceNeeded || !cooldownOk)
                return;
            const block = this.vision.flushCueBlock();
            this.lastCueBlock = block;
            const text = block === '[No visual cues detected]'
                ? VISUAL_CHECK_PROMPT
                : _buildEnrichedVisualCheck(block);
            if (this._sendSystemPrompt(text)) {
                this.lastEngagement = Date.now();
                this.lastActivityTime = Date.now();
            }
        }, VISUAL_CHECK_POLL_MS);
        // Background safety scan: much less frequent than before.
        // Real-time falls are caught by VisionPipeline.onSafetyConcern — this is a periodic backup.
        this.safetyTimer = setInterval(() => {
            if ((Date.now() - this.lastSafetyAlert) < SAFETY_ALERT_COOLDOWN_MS)
                return;
            const cueBlock = this.lastCueBlock;
            const text = cueBlock === '[No visual cues yet]' || cueBlock === '[No visual cues detected]'
                ? SAFETY_SCAN_PROMPT
                : `${SAFETY_SCAN_PROMPT}\n\nMediaPipe context:\n${cueBlock}`;
            this._sendSystemPrompt(text);
        }, SAFETY_SCAN_INTERVAL_MS);
        // Sustained-horizontal escalation: if person stays horizontal for 2+ minutes, escalate to high.
        // Checks every 20s; resets start time if horizontal signal went silent > 10s ago.
        this.horizontalTimer = setInterval(() => {
            const now = Date.now();
            // Reset if we haven't seen the horizontal cue recently
            if (this.horizontalStartTs !== null && now - this.lastHorizontalSeen > 10_000) {
                this.horizontalStartTs = null;
                return;
            }
            if (this.horizontalStartTs === null)
                return;
            const sustainedMs = now - this.horizontalStartTs;
            if (sustainedMs < 120_000)
                return; // < 2 min — not yet alarming
            if (now - this.lastHorizontalEscalation < 120_000)
                return; // already escalated recently
            this.lastHorizontalEscalation = now;
            const minutes = Math.round(sustainedMs / 60_000);
            const reason = `Patient has been lying down for ${minutes} minute${minutes !== 1 ? 's' : ''} without movement`;
            logService.alert({ severity: 'high', reason });
            notificationService.notify('high', reason, 'mira-sustained-horizontal');
            this.cb.onCaregiverAlert('high', reason);
            this._addContext('Safety', `SUSTAINED HORIZONTAL ${minutes}min`);
            if (this.session && this.running) {
                this._sendSystemPrompt(TRIGGER_FLOOR('body_horizontal', 0.9), true);
            }
        }, 20_000);
    }
    _handleMessage(msg) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = msg;
        // ── Tool calls ────────────────────────────────────────────
        const toolCall = m?.toolCall;
        if (toolCall?.functionCalls?.length) {
            const responses = [];
            for (const call of toolCall.functionCalls) {
                const args = call.args ?? {};
                let output = 'done';
                switch (call.name) {
                    // Owl body
                    case 'set_face': {
                        const face = args.face;
                        console.log('[Mira] set_face →', face);
                        if (typeof face === 'string' && VALID_FACES.has(face)) {
                            this.cb.onArduinoCommand({ face: face });
                        }
                        else {
                            console.warn('[Mira] set_face received unknown face:', face);
                        }
                        break;
                    }
                    case 'wave_wing':
                        console.log('[Mira] wave_wing');
                        this.cb.onArduinoCommand({ wave: 1 });
                        break;
                    // Dementia care — observation & logging
                    case 'log_mood_observation': {
                        const mood = args.mood;
                        const intensity = args.intensity;
                        logService.mood({ mood, intensity, notes: args.notes });
                        this._addContext('Mood', `${mood} (${intensity})${args.notes ? ' — ' + args.notes : ''}`);
                        break;
                    }
                    case 'log_behavior_event': {
                        const evt = args.event_type;
                        logService.behavior({ event_type: evt, notes: args.notes ?? '' });
                        this._addContext('Behavior', `${evt}${args.notes ? ': ' + args.notes : ''}`);
                        break;
                    }
                    case 'alert_caregiver': {
                        const severity = args.severity;
                        const reason = args.reason ?? '';
                        logService.alert({ severity, reason });
                        this.cb.onCaregiverAlert(severity, reason);
                        if (severity === 'high')
                            this.lastSafetyAlert = Date.now();
                        this._addContext('Alert', `${severity.toUpperCase()} — ${reason}`);
                        break;
                    }
                    case 'log_medication_event':
                        logService.medication({ action: args.action, notes: args.notes });
                        this._addContext('Medication', `${args.action}${args.notes ? ': ' + args.notes : ''}`);
                        break;
                    case 'get_time_context':
                        output = JSON.stringify(timeContextPayload());
                        break;
                    case 'report_visual_state': {
                        const obs = {
                            ts: Date.now(),
                            description: String(args.description ?? ''),
                            emotionHint: String(args.emotion_hint ?? 'unknown'),
                        };
                        this.observations = [...this.observations.slice(-29), obs];
                        this.cb.onVisualObservation?.(obs);
                        this._addContext('Visual', `${obs.emotionHint} — ${obs.description}`);
                        logService.visual({ description: obs.description, emotion_hint: obs.emotionHint });
                        break;
                    }
                    case 'show_photo': {
                        const photoId = String(args.photo_id ?? '');
                        if (photoId) {
                            this.cb.onPhotoDisplay?.(photoId);
                            this._addContext('Photo', `Showing photo: ${photoId}`);
                        }
                        break;
                    }
                }
                const safeOutput = (output !== null && typeof output === 'object') ? JSON.stringify(output) : output;
                responses.push({ id: call.id, name: call.name, response: { output: safeOutput } });
            }
            this.session?.sendToolResponse({ functionResponses: responses });
            return;
        }
        const sc = m?.serverContent;
        if (!sc)
            return;
        // ── Interrupted ───────────────────────────────────────────
        if (sc.interrupted) {
            this.player.interrupt();
            this.transcriptBuf = [];
            if (this.speaking) {
                this.speaking = false;
                this.cb.onSpeakingEnd();
            }
            return;
        }
        // ── Audio chunks ──────────────────────────────────────────
        const parts = sc.modelTurn?.parts ?? [];
        for (const part of parts) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = part?.inlineData?.data;
            if (typeof data === 'string') {
                if (!this.speaking) {
                    this.speaking = true;
                    this.lastActivityTime = Date.now(); // reset so visual check won't interrupt
                    this.cb.onSpeakingStart();
                }
                this.player.playChunk(data);
            }
        }
        // ── Transcription ─────────────────────────────────────────
        const outText = sc.outputTranscription?.text;
        if (outText)
            this.transcriptBuf.push(outText);
        const inText = sc.inputTranscription?.text;
        if (inText) {
            this.lastActivityTime = Date.now();
            this.lastUserSpeech = Date.now();
            this.cb.onUserTranscript(inText);
            this.userSpeechBuf.push(inText);
        }
        // ── Turn complete ─────────────────────────────────────────
        if (sc.turnComplete) {
            // Flush user speech buffer to context log
            if (this.userSpeechBuf.length > 0) {
                const said = this.userSpeechBuf.join('').trim();
                this.userSpeechBuf = [];
                if (said) {
                    const snippet = said.length > 100 ? said.substring(0, 97) + '…' : said;
                    this._addContext('Patient said', snippet);
                    this._scanTranscriptForConcerns(said);
                }
            }
            if (this.speaking) {
                this.speaking = false;
                this.cb.onSpeakingEnd();
            }
            // Reset activity clock — prevents visual check from firing right after Gemini speaks
            this.lastSpeakingEnd = Date.now();
            this.lastActivityTime = Date.now();
            if (this.transcriptBuf.length > 0) {
                const full = this.transcriptBuf.join('').trim();
                this.transcriptBuf = [];
                if (full) {
                    this.cb.onAssistantText(full);
                    // Log Mira's response to context (truncated so it doesn't bloat prompts)
                    const snippet = full.length > 120 ? full.substring(0, 117) + '…' : full;
                    this._addContext('Mira said', snippet);
                }
            }
        }
    }
}
