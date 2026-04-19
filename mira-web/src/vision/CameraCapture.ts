/**
 * Captures JPEG frames from the user's camera at a configurable rate and
 * delivers them as base64 strings for Gemini's video realtime input.
 *
 * The video element is hidden — callers that want to display the feed should
 * pass a visible <video> element via attachPreview().
 */
export class CameraCapture {
  private stream:    MediaStream       | null = null;
  private canvas:    HTMLCanvasElement | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private previewEl:  HTMLVideoElement | null = null;

  async start(onFrame: (base64jpeg: string) => void, fps = 1): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
    });

    // Hidden video to drive the capture
    const video = document.createElement('video');
    video.srcObject = this.stream;
    video.muted     = true;
    await video.play();

    // Wire preview if already attached
    if (this.previewEl) {
      this.previewEl.srcObject = this.stream;
      this.previewEl.play();
    }

    this.canvas        = document.createElement('canvas');
    this.canvas.width  = 640;
    this.canvas.height = 480;

    this.intervalId = setInterval(() => {
      const ctx = this.canvas!.getContext('2d')!;
      ctx.drawImage(video, 0, 0, 640, 480);
      const dataUrl = this.canvas!.toDataURL('image/jpeg', 0.7);
      onFrame(dataUrl.split(',')[1]);
    }, 1000 / fps);
  }

  /** Attach a <video> element to show the live camera preview. */
  attachPreview(el: HTMLVideoElement): void {
    this.previewEl = el;
    if (this.stream) {
      el.srcObject = this.stream;
      el.play();
    }
  }

  stop(): void {
    if (this.intervalId !== null) clearInterval(this.intervalId);
    this.stream?.getTracks().forEach(t => t.stop());
    if (this.previewEl) {
      this.previewEl.srcObject = null;
    }
    this.stream     = null;
    this.canvas     = null;
    this.intervalId = null;
  }
}
