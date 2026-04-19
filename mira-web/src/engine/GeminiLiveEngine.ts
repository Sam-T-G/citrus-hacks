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
import type { Tool } from '@google/genai';
import { AudioPlayer }    from '../audio/AudioPlayer';
import { MicCapture }     from '../audio/MicCapture';
import { CameraCapture }  from '../vision/CameraCapture';
import { VisionPipeline } from '../vision/VisionPipeline';
import { logService }     from '../services/LogService';
import { GEMINI_API_KEY, GEMINI_MODEL, GEMINI_VOICE, SYSTEM_PROMPT } from '../config';
import type {
  ArduinoCommand, FaceType,
  MoodType, MoodIntensity, BehaviorEventType, AlertSeverity,
} from '../types';

const VALID_FACES = new Set<string>(['happy', 'plain', 'wink', 'tears', 'dizzy', 'robot', 'dead']);

// ── Prompt builders (use MediaPipe cue block to enrich Gemini context) ────────

function _buildEnrichedSafetyPrompt(cueBlock: string, triggeredCue: string, conf: number): string {
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

function _buildEnrichedVisualCheck(cueBlock: string): string {
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

function sundowingRisk(): 'low' | 'medium' | 'high' {
  const h = new Date().getHours();
  if (h >= 15 && h < 20) return 'high';
  if (h >= 20 || h < 7)  return 'medium';
  return 'low';
}

function timeContextPayload() {
  const now = new Date();
  return {
    time:            now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date:            now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    hour:            now.getHours(),
    sundowning_risk: sundowingRisk(),
  };
}

const TOOLS: Tool[] = [{
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
      description: 'Wave the servo wing. Use for greetings or excitement.',
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
          reason:   { type: Type.STRING, description: 'Clear reason for the alert' },
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
          notes:  { type: Type.STRING },
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
  ],
}];

export interface GeminiObservation {
  ts:          number;
  description: string;
  emotionHint: string;
}

export interface EngineCallbacks {
  onConnected:          ()                         => void;
  onDisconnected:       (reason?: string)          => void;
  onSpeakingStart:      ()                         => void;
  onSpeakingEnd:        ()                         => void;
  onAssistantText:      (text: string)             => void;
  onUserTranscript:     (text: string)             => void;
  onArduinoCommand:     (cmd: ArduinoCommand)      => void;
  onCaregiverAlert:     (severity: AlertSeverity, reason: string) => void;
  onVisualObservation?: (obs: GeminiObservation)   => void;
  onError:              (error: Error)             => void;
}

// How long of silence before Mira considers proactive engagement
const VISUAL_CHECK_SILENCE_MS  = 20_000;
// How often to poll for the silence check
const VISUAL_CHECK_POLL_MS     = 6_000;
// Minimum gap between proactive engagements so Mira isn't chatty
const VISUAL_CHECK_COOLDOWN_MS = 45_000;
// How often the background safety scan fires
const SAFETY_SCAN_INTERVAL_MS  = 30_000;
// Minimum time between repeated safety alerts
const SAFETY_ALERT_COOLDOWN_MS = 30_000;
// Minimum gap between ANY injected text turn — prevents overriding live audio input
const MIN_PROMPT_GAP_MS        = 12_000;
// Don't inject text turns if user spoke within this window
const USER_ACTIVE_WINDOW_MS    = 8_000;

// Proactive engagement — fires after sustained silence.
// Context is prepended automatically by _sendSystemPrompt.
const VISUAL_CHECK_PROMPT = `\
[SYSTEM: COMPANION CHECK]
Some time has passed. Look at the camera now and call report_visual_state with what you see.

Based on the session context above and what you observe right now, decide:
- If she looks happy or engaged — acknowledge it warmly, one sentence.
- If she looks calm but quiet — offer a gentle conversational opener, one sentence.
- If she looks confused or unsettled — orient softly, log_mood_observation, one sentence.
- If she looks distressed — respond with immediate warmth, log_mood_observation + alert_caregiver(medium).
- If you see wandering signals (coat on, near the door, keys) — redirect, log_behavior_event(wandering_attempt) + alert_caregiver(high).
- If she appears to have fallen — respond immediately per your training.

Default to gentle engagement. Silence is worse than a brief warm check-in.
Always set_face before speaking.`.trim();

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
const TRIGGER_FLOOR = (cue: string, conf: number) => `\
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
  private ai:      GoogleGenAI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private session: any = null;
  private player:  AudioPlayer;
  private mic:     MicCapture;
  private camera:  CameraCapture;
  private vision:  VisionPipeline;
  private systemPrompt: string;

  private transcriptBuf:    string[] = [];
  private userSpeechBuf:    string[] = [];
  private speaking          = false;
  private running           = false;
  private lastActivityTime  = Date.now();
  private lastUserSpeech    = 0;
  private lastTextPrompt    = 0;
  private lastSafetyAlert   = 0;
  private lastEngagement    = 0;
  private lastCueBlock      = '[No visual cues yet]';
  private visualCheckTimer: ReturnType<typeof setInterval> | null = null;
  private safetyTimer:      ReturnType<typeof setInterval> | null = null;
  private observations:     GeminiObservation[] = [];
  private triggerCooldowns: Record<string, number> = {};

  // Rolling session context — feeds continuity into every injected prompt
  private contextLog: Array<{ ts: number; tag: string; content: string }> = [];
  private readonly CTX_WINDOW_MS  = 150_000; // 2.5 min rolling window
  private readonly CTX_MAX        = 18;

  constructor(private cb: EngineCallbacks, systemPrompt?: string) {
    this.ai           = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    this.player       = new AudioPlayer();
    this.mic          = new MicCapture();
    this.camera       = new CameraCapture();
    this.vision       = new VisionPipeline({
      onCue: (cue, conf) => {
        if (!this.session || !this.running) return;
        this._handleTriggerCue(cue, conf);
      },
      onSafetyConcern: (cue, conf) => {
        if ((Date.now() - this.lastSafetyAlert) < SAFETY_ALERT_COOLDOWN_MS) return;
        this.lastSafetyAlert = Date.now();
        if (cue === 'fall_suspected' || cue === 'body_horizontal') {
          // Priority=true — fall alerts bypass the normal prompt gap
          this._sendSystemPrompt(TRIGGER_FLOOR(cue, conf), true);
          return;
        }
        const block = this.vision.flushCueBlock();
        this.lastCueBlock = block;
        this._sendSystemPrompt(_buildEnrichedSafetyPrompt(block, cue, conf), true);
      },
      onStateUpdate: (state, block) => {
        this.lastCueBlock = block;
        // Log the social state snapshot to context for continuity
        if (state !== 'neutral') {
          this._addContext('MediaPipe state', state);
        }
        // Nudge Gemini for concerning states (gated by _sendSystemPrompt)
        if (state === 'concerned' || state === 'disengaged') {
          this._sendSystemPrompt(_buildEnrichedVisualCheck(block));
        }
      },
    });
    this.systemPrompt = systemPrompt ?? SYSTEM_PROMPT;
  }

  get cameraCapture(): CameraCapture { return this.camera; }
  get visionPipeline(): VisionPipeline { return this.vision; }
  get recentObservations(): GeminiObservation[] { return this.observations; }
  get isRunning():     boolean       { return this.running; }

  private _addContext(tag: string, content: string): void {
    const now = Date.now();
    this.contextLog.push({ ts: now, tag, content });
    // Prune to window and max entries
    this.contextLog = this.contextLog
      .filter(e => now - e.ts < this.CTX_WINDOW_MS)
      .slice(-this.CTX_MAX);
  }

  private _buildSessionContext(): string {
    if (this.contextLog.length === 0) return '';
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
  private _sendSystemPrompt(text: string, priority = false): boolean {
    if (!this.session || !this.running) return false;
    if (this.speaking) return false;
    const now = Date.now();
    if (!priority && now - this.lastUserSpeech < USER_ACTIVE_WINDOW_MS) return false;
    if (!priority && now - this.lastTextPrompt  < MIN_PROMPT_GAP_MS)    return false;
    this.lastTextPrompt = now;
    const fullText = this._buildSessionContext() + text;
    this.session.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: fullText }] }],
      turnComplete: true,
    });
    return true;
  }

  private _sendTrigger(prompt: string): void {
    if (this._sendSystemPrompt(prompt)) {
      this.lastEngagement  = Date.now();
      this.lastActivityTime = Date.now();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _handleTriggerCue(cue: string, _conf: number): void {
    const now = Date.now();
    const COOLDOWNS: Record<string, number> = {
      approach_detected:       60_000, // greet at most once per minute
      looking_around_confused: 30_000, // confusion check at most every 30s
    };
    const cooldownMs = COOLDOWNS[cue];
    if (!cooldownMs) return; // not a trigger cue
    const lastFired = this.triggerCooldowns[cue] ?? 0;
    if (now - lastFired < cooldownMs) return;
    this.triggerCooldowns[cue] = now;

    if (cue === 'approach_detected') {
      if (this.speaking) return; // never interrupt Gemini mid-sentence
      this._sendTrigger(TRIGGER_APPROACH);
    } else if (cue === 'looking_around_confused') {
      if (this.speaking) return;
      this._sendTrigger(TRIGGER_CONFUSED_SCAN);
    }
  }

  async start(): Promise<void> {
    this.running = true;
    this.player.resume();
    logService.startSession();

    // Initialize MediaPipe vision models (loads from CDN, non-blocking for Gemini connect)
    this.vision.init().catch(e => console.warn('[VisionPipeline] init failed:', e));

    this.session = await this.ai.live.connect({
      model:  GEMINI_MODEL,
      config: {
        responseModalities:       [Modality.AUDIO],
        outputAudioTranscription: {},
        inputAudioTranscription:  {},
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: GEMINI_VOICE },
          },
        },
        systemInstruction: this.systemPrompt,
        tools: TOOLS,
      },
      callbacks: {
        onopen:    () => { this.cb.onConnected(); this._startStreaming(); },
        onmessage: (msg: unknown) => this._handleMessage(msg),
        onerror:   (e: unknown)   => this.cb.onError(new Error(String(e))),
        onclose:   (e: unknown)   => {
          this.running = false;
          logService.endSession();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.cb.onDisconnected((e as any)?.reason ?? '');
        },
      },
    });
  }

  async injectGreeting(text: string): Promise<void> {
    if (!this.session) return;
    await this.session.sendClientContent({
      turns: [{ role: 'user', parts: [{ text }] }],
      turnComplete: true,
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.visualCheckTimer !== null) {
      clearInterval(this.visualCheckTimer);
      this.visualCheckTimer = null;
    }
    if (this.safetyTimer !== null) {
      clearInterval(this.safetyTimer);
      this.safetyTimer = null;
    }
    this.vision.stop();
    this.mic.stop();
    this.camera.stop();
    this.player.interrupt();
    this.session?.close();
    this.session = null;
  }

  private _startStreaming(): void {
    this.lastActivityTime = Date.now();

    this.mic.start((base64pcm) => {
      if (!this.session || !this.running) return;
      this.session.sendRealtimeInput({
        audio: { data: base64pcm, mimeType: 'audio/pcm;rate=16000' },
      });
    });

    this.camera.start((base64jpeg) => {
      if (!this.session || !this.running) return;
      this.session.sendRealtimeInput({
        video: { data: base64jpeg, mimeType: 'image/jpeg' },
      });
    }, 1);

    // Start MediaPipe pipeline on the same video element (share the stream, no second camera open)
    const videoEl = this.camera.getVideoElement();
    if (videoEl) {
      this.vision.start(videoEl);
    } else {
      // Camera may not be ready yet — wait for next tick
      setTimeout(() => {
        const el = this.camera.getVideoElement();
        if (el) this.vision.start(el);
      }, 500);
    }

    // Proactive engagement: fires after sustained silence.
    this.visualCheckTimer = setInterval(() => {
      const silentMs   = Date.now() - this.lastActivityTime;
      const cooldownOk = (Date.now() - this.lastEngagement) > VISUAL_CHECK_COOLDOWN_MS;
      if (silentMs < VISUAL_CHECK_SILENCE_MS || !cooldownOk) return;
      const block = this.vision.flushCueBlock();
      this.lastCueBlock = block;
      const text = block === '[No visual cues detected]'
        ? VISUAL_CHECK_PROMPT
        : _buildEnrichedVisualCheck(block);
      if (this._sendSystemPrompt(text)) {
        this.lastEngagement  = Date.now();
        this.lastActivityTime = Date.now();
      }
    }, VISUAL_CHECK_POLL_MS);

    // Background safety scan: much less frequent than before.
    // Real-time falls are caught by VisionPipeline.onSafetyConcern — this is a periodic backup.
    this.safetyTimer = setInterval(() => {
      if ((Date.now() - this.lastSafetyAlert) < SAFETY_ALERT_COOLDOWN_MS) return;
      const cueBlock = this.lastCueBlock;
      const text = cueBlock === '[No visual cues yet]' || cueBlock === '[No visual cues detected]'
        ? SAFETY_SCAN_PROMPT
        : `${SAFETY_SCAN_PROMPT}\n\nMediaPipe context:\n${cueBlock}`;
      this._sendSystemPrompt(text);
    }, SAFETY_SCAN_INTERVAL_MS);
  }

  private _handleMessage(msg: unknown): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = msg as any;

    // ── Tool calls ────────────────────────────────────────────
    const toolCall = m?.toolCall;
    if (toolCall?.functionCalls?.length) {
      const responses: { id: string; response: { output: unknown } }[] = [];

      for (const call of toolCall.functionCalls) {
        const args = call.args ?? {};
        let output: unknown = 'done';

        switch (call.name) {
          // Owl body
          case 'set_face': {
            const face = args.face;
            if (typeof face === 'string' && VALID_FACES.has(face)) {
              this.cb.onArduinoCommand({ face: face as FaceType });
            }
            break;
          }
          case 'wave_wing':
            this.cb.onArduinoCommand({ wave: 1 });
            break;

          // Dementia care — observation & logging
          case 'log_mood_observation': {
            const mood = args.mood as MoodType;
            const intensity = args.intensity as MoodIntensity;
            logService.mood({ mood, intensity, notes: args.notes });
            this._addContext('Mood', `${mood} (${intensity})${args.notes ? ' — ' + args.notes : ''}`);
            break;
          }

          case 'log_behavior_event': {
            const evt = args.event_type as BehaviorEventType;
            logService.behavior({ event_type: evt, notes: args.notes ?? '' });
            this._addContext('Behavior', `${evt}${args.notes ? ': ' + args.notes : ''}`);
            break;
          }

          case 'alert_caregiver': {
            const severity = args.severity as AlertSeverity;
            const reason   = args.reason   ?? '';
            logService.alert({ severity, reason });
            this.cb.onCaregiverAlert(severity, reason);
            if (severity === 'high') this.lastSafetyAlert = Date.now();
            this._addContext('Alert', `${severity.toUpperCase()} — ${reason}`);
            break;
          }

          case 'log_medication_event':
            logService.medication({ action: args.action, notes: args.notes });
            this._addContext('Medication', `${args.action}${args.notes ? ': ' + args.notes : ''}`);
            break;

          case 'get_time_context':
            output = timeContextPayload();
            break;

          case 'report_visual_state': {
            const obs: GeminiObservation = {
              ts:          Date.now(),
              description: String(args.description ?? ''),
              emotionHint: String(args.emotion_hint ?? 'unknown'),
            };
            this.observations = [...this.observations.slice(-29), obs];
            this.cb.onVisualObservation?.(obs);
            this._addContext('Visual', `${obs.emotionHint} — ${obs.description}`);
            break;
          }
        }

        responses.push({ id: call.id, response: { output } });
      }

      this.session?.sendToolResponse({ functionResponses: responses });
      return;
    }

    const sc = m?.serverContent;
    if (!sc) return;

    // ── Interrupted ───────────────────────────────────────────
    if (sc.interrupted) {
      this.player.interrupt();
      this.transcriptBuf = [];
      if (this.speaking) { this.speaking = false; this.cb.onSpeakingEnd(); }
      return;
    }

    // ── Audio chunks ──────────────────────────────────────────
    const parts: unknown[] = sc.modelTurn?.parts ?? [];
    for (const part of parts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (part as any)?.inlineData?.data;
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
    const outText: string | undefined = sc.outputTranscription?.text;
    if (outText) this.transcriptBuf.push(outText);

    const inText: string | undefined = sc.inputTranscription?.text;
    if (inText) {
      this.lastActivityTime = Date.now();
      this.lastUserSpeech   = Date.now();
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
        }
      }
      if (this.speaking) { this.speaking = false; this.cb.onSpeakingEnd(); }
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
