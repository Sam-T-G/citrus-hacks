/**
 * Captures microphone audio and streams PCM16 chunks at 16 kHz.
 *
 * AudioContext is created at 16000 Hz so the browser resamples hardware audio
 * internally. ScriptProcessorNode converts float32 samples to Int16 and
 * delivers them as base64 strings ready for Gemini's send_realtime_input.
 *
 * The processor is connected through a zero-gain node so it stays active
 * without feeding mic audio to the speaker.
 */
export class MicCapture {
    ctx = null;
    stream = null;
    processor = null;
    async start(onChunk) {
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        this.ctx = new AudioContext({ sampleRate: 16000 });
        const source = this.ctx.createMediaStreamSource(this.stream);
        this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
        this.processor.onaudioprocess = (e) => {
            const float32 = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
                int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32767));
            }
            // Convert ArrayBuffer → base64
            const bytes = new Uint8Array(int16.buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++)
                binary += String.fromCharCode(bytes[i]);
            onChunk(btoa(binary));
        };
        // Silent sink keeps the processor active without loopback
        const sink = this.ctx.createGain();
        sink.gain.value = 0;
        source.connect(this.processor);
        this.processor.connect(sink);
        sink.connect(this.ctx.destination);
    }
    stop() {
        this.processor?.disconnect();
        this.ctx?.close();
        this.stream?.getTracks().forEach(t => t.stop());
        this.processor = null;
        this.ctx = null;
        this.stream = null;
    }
}
