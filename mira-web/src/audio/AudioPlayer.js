/**
 * Gapless streaming audio playback using the Web Audio API scheduler.
 *
 * Each incoming PCM chunk is decoded into an AudioBuffer and scheduled to
 * start exactly where the previous one ended. This produces continuous,
 * gap-free playback regardless of network jitter — the browser's audio
 * clock drives timing, not JavaScript.
 *
 * interrupt() closes the AudioContext (stopping all sound immediately) and
 * creates a fresh one, resetting the schedule.
 */
export class AudioPlayer {
    ctx;
    nextStartTime = 0;
    constructor() {
        this.ctx = new AudioContext({ sampleRate: 24000 });
    }
    /** Must be called from a user gesture to satisfy browser autoplay policy. */
    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    /** Decode and schedule a base64-encoded PCM16 chunk for playback. */
    playChunk(base64) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(console.error);
        }
        if (this.ctx.state === 'closed') {
            this.ctx = new AudioContext({ sampleRate: 24000 });
            this.nextStartTime = 0;
        }
        const raw = atob(base64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++)
            bytes[i] = raw.charCodeAt(i);
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++)
            float32[i] = pcm16[i] / 32767;
        console.debug('[AudioPlayer] playChunk samples:', float32.length, 'ctx state:', this.ctx.state);
        const buffer = this.ctx.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        const startAt = Math.max(now, this.nextStartTime);
        source.start(startAt);
        this.nextStartTime = startAt + buffer.duration;
    }
    /** Stop all audio immediately and reset the schedule. */
    interrupt() {
        this.ctx.close();
        this.ctx = new AudioContext({ sampleRate: 24000 });
        this.nextStartTime = 0;
    }
}
