/**
 * Captures JPEG frames from the user's camera at a configurable rate and
 * delivers them as base64 strings for Gemini's video realtime input.
 *
 * The video element is hidden — callers that want to display the feed should
 * pass a visible <video> element via attachPreview().
 *
 * Usage modes:
 *   Owned     — call start(onFrame, fps); call stop() to release everything.
 *   Shared    — call startVideoOnly() once; then startFrames()/stopFrames()
 *               to add/remove the JPEG sender without closing the stream.
 *               Call stop() only when done with the stream entirely.
 */
export class CameraCapture {
    stream = null;
    canvas = null;
    intervalId = null;
    previewEl = null;
    videoEl = null;
    /** Exposes the live video element so other systems (e.g. MediaPipe) can share the stream. */
    getVideoElement() { return this.videoEl; }
    get isStreaming() { return this.stream !== null; }
    // ── Stream lifecycle ──────────────────────────────────────────────────────
    /** Open the camera and create the internal video element. No JPEG frames yet. */
    async startVideoOnly() {
        if (this.stream)
            return; // already open — idempotent
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' },
        });
        const video = document.createElement('video');
        video.srcObject = this.stream;
        video.muted = true;
        await video.play();
        this.videoEl = video;
        if (this.previewEl) {
            this.previewEl.srcObject = this.stream;
            await this.previewEl.play();
        }
        this.canvas = document.createElement('canvas');
        this.canvas.width = 640;
        this.canvas.height = 480;
    }
    /** Start delivering JPEG frames. Requires startVideoOnly() to have been called first. */
    startFrames(onFrame, fps = 1) {
        if (!this.videoEl || !this.canvas)
            return;
        this.stopFrames(); // clear any existing interval
        this.intervalId = setInterval(() => {
            const ctx = this.canvas.getContext('2d');
            ctx.drawImage(this.videoEl, 0, 0, 640, 480);
            const dataUrl = this.canvas.toDataURL('image/jpeg', 0.7);
            onFrame(dataUrl.split(',')[1]);
        }, 1000 / fps);
    }
    /** Stop delivering JPEG frames but keep the camera stream open. */
    stopFrames() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    /** Open camera, create video element, and start JPEG frame delivery in one call. */
    async start(onFrame, fps = 1) {
        await this.startVideoOnly();
        this.startFrames(onFrame, fps);
    }
    /** Attach a <video> element to show the live camera preview. */
    attachPreview(el) {
        this.previewEl = el;
        if (this.stream) {
            el.srcObject = this.stream;
            el.play();
        }
    }
    /** Stop JPEG frames and release the camera stream entirely. */
    stop() {
        this.stopFrames();
        this.stream?.getTracks().forEach(t => t.stop());
        if (this.previewEl)
            this.previewEl.srcObject = null;
        this.stream = null;
        this.canvas = null;
        this.videoEl = null;
    }
}
