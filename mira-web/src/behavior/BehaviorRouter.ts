import type { ArduinoCommand } from '../types';
import type { SerialBridge } from '../arduino/SerialBridge';

const LISTENING_FACE: ArduinoCommand = { face: 'plain' };

// Cues that trigger a direct Arduino physical response, independent of Gemini conversation.
// quietAfterGeminiMs=0 means fire even if Gemini just spoke; >0 enforces a quiet window.
// ignoresSpeaking=true means the cue fires even while Gemini is actively speaking.
const AMBIENT_MAP: Record<string, {
  cmd: ArduinoCommand;
  cooldownMs: number;
  quietAfterGeminiMs: number;
  ignoresSpeaking?: boolean;
}> = {
  wave_detected:  { cmd: { wave: 1 },       cooldownMs: 5_000,  quietAfterGeminiMs: 0,     ignoresSpeaking: true },
  smiling:        { cmd: { face: 'happy' },  cooldownMs: 20_000, quietAfterGeminiMs: 3_000 },
  nod_yes:        { cmd: { face: 'wink' },   cooldownMs: 15_000, quietAfterGeminiMs: 3_000 },
  thumbs_up:      { cmd: { face: 'happy' },  cooldownMs: 15_000, quietAfterGeminiMs: 3_000 },
  thumbs_down:    { cmd: { face: 'plain' },  cooldownMs: 15_000, quietAfterGeminiMs: 3_000 },
  frowning:       { cmd: { face: 'tears' },  cooldownMs: 20_000, quietAfterGeminiMs: 5_000 },
  brows_furrowed: { cmd: { face: 'dizzy' },  cooldownMs: 20_000, quietAfterGeminiMs: 5_000 },
};

export class BehaviorRouter {
  private geminiSpeaking  = false;
  private lastGeminiSpoke = 0;
  private cooldowns: Record<string, number> = {};

  constructor(private bridge: SerialBridge | null) {}

  /** Called when Gemini fires a set_face / wave_wing tool call. */
  async onArduinoCommand(cmd: ArduinoCommand): Promise<void> {
    await this.send(cmd);
  }

  /** Called when Gemini starts speaking — blocks ambient face changes. */
  onSpeakingStart(): void {
    this.geminiSpeaking  = true;
    this.lastGeminiSpoke = Date.now();
  }

  /** Called when assistant audio ends — return to neutral. */
  async onSpeakingEnd(): Promise<void> {
    this.geminiSpeaking = false;
    await this.send(LISTENING_FACE);
  }

  async setIdle(): Promise<void> {
    this.geminiSpeaking = false;
    await this.send(LISTENING_FACE);
  }

  /**
   * Called for every non-safety, non-Gemini-trigger cue from VisionPipeline.
   * Maps physical gestures to direct Arduino reactions with cooldown + priority gating.
   * Never fires while Gemini is speaking; face changes respect a quiet-after-speech window.
   */
  onAmbientGesture(cue: string): void {
    const entry = AMBIENT_MAP[cue];
    if (!entry) return;
    if (this.geminiSpeaking && !entry.ignoresSpeaking) return;

    const now = Date.now();
    if (now - (this.cooldowns[cue] ?? 0) < entry.cooldownMs) return;
    if (entry.quietAfterGeminiMs > 0 && now - this.lastGeminiSpoke < entry.quietAfterGeminiMs) return;

    this.cooldowns[cue] = now;
    this.send(entry.cmd).catch(() => {});
  }

  private async send(cmd: ArduinoCommand): Promise<void> {
    if (this.bridge?.isConnected) {
      await this.bridge.send(cmd);
    }
  }
}
