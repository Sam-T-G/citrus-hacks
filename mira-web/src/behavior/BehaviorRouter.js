const LISTENING_FACE = { face: 'plain' };
// Cues that trigger a direct Arduino physical response, independent of Gemini conversation.
// quietAfterGeminiMs=0 means fire even if Gemini just spoke; >0 enforces a quiet window.
// ignoresSpeaking=true means the cue fires even while Gemini is actively speaking.
const AMBIENT_MAP = {
    wave_detected: { cmd: { wave: 1 }, cooldownMs: 2_000, quietAfterGeminiMs: 0, ignoresSpeaking: true },
    smiling: { cmd: { wave: 1 }, cooldownMs: 8_000, quietAfterGeminiMs: 3_000 },
    nod_yes: { cmd: { wave: 1 }, cooldownMs: 8_000, quietAfterGeminiMs: 3_000 },
    thumbs_up: { cmd: { wave: 1 }, cooldownMs: 8_000, quietAfterGeminiMs: 3_000 },
    thumbs_down: { cmd: { face: 'plain' }, cooldownMs: 15_000, quietAfterGeminiMs: 3_000 },
    frowning: { cmd: { face: 'tears' }, cooldownMs: 20_000, quietAfterGeminiMs: 5_000 },
    brows_furrowed: { cmd: { face: 'dizzy' }, cooldownMs: 20_000, quietAfterGeminiMs: 5_000 },
};
export class BehaviorRouter {
    bridge;
    geminiSpeaking = false;
    lastGeminiSpoke = 0;
    cooldowns = {};
    constructor(bridge) {
        this.bridge = bridge;
    }
    /** Called when Gemini fires a set_face / wave_wing tool call. */
    async onArduinoCommand(cmd) {
        await this.send(cmd);
    }
    /** Called when Gemini starts speaking — blocks ambient face changes. */
    onSpeakingStart() {
        this.geminiSpeaking = true;
        this.lastGeminiSpoke = Date.now();
    }
    /** Called when assistant audio ends — return to neutral. */
    async onSpeakingEnd() {
        this.geminiSpeaking = false;
        await this.send(LISTENING_FACE);
    }
    async setIdle() {
        this.geminiSpeaking = false;
        await this.send(LISTENING_FACE);
    }
    /**
     * Called for every non-safety, non-Gemini-trigger cue from VisionPipeline.
     * Maps physical gestures to direct Arduino reactions with cooldown + priority gating.
     * Never fires while Gemini is speaking; face changes respect a quiet-after-speech window.
     */
    onAmbientGesture(cue) {
        const entry = AMBIENT_MAP[cue];
        if (!entry)
            return;
        if (this.geminiSpeaking && !entry.ignoresSpeaking)
            return;
        const now = Date.now();
        if (now - (this.cooldowns[cue] ?? 0) < entry.cooldownMs)
            return;
        if (entry.quietAfterGeminiMs > 0 && now - this.lastGeminiSpoke < entry.quietAfterGeminiMs)
            return;
        this.cooldowns[cue] = now;
        this.send(entry.cmd).catch(() => { });
    }
    async send(cmd) {
        if (this.bridge?.isConnected) {
            await this.bridge.send(cmd);
        }
    }
}
