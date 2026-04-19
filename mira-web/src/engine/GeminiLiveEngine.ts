/**
 * GeminiLiveEngine — multimodal conversation engine.
 *
 * Streams mic audio + camera frames into a single Gemini Live session.
 * Gemini sees and hears simultaneously, integrating both contexts into each
 * response. Audio output is played via the Web Audio scheduler (gapless).
 * Text transcription is buffered until turn_complete then emitted once.
 *
 * Turn sequence:
 *   1. Mic PCM16 chunks → sendRealtimeInput (continuous)
 *   2. Camera JPEG frames → sendRealtimeInput (1 fps)
 *   3. Gemini VAD fires → model starts generating
 *   4. onmessage: audio chunks → AudioPlayer.playChunk (scheduled, gapless)
 *   5. onmessage: outputTranscription tokens → buffer
 *   6. onmessage: inputTranscription → emit immediately (user spoke)
 *   7. onmessage: turnComplete → emit full transcript, reset buffer
 *   8. onmessage: interrupted → AudioPlayer.interrupt(), clear buffer
 */
import { GoogleGenAI, Modality } from '@google/genai';
import { AudioPlayer }   from '../audio/AudioPlayer';
import { MicCapture }    from '../audio/MicCapture';
import { CameraCapture } from '../vision/CameraCapture';
import { GEMINI_API_KEY, GEMINI_MODEL, GEMINI_VOICE, SYSTEM_PROMPT } from '../config';

export interface EngineCallbacks {
  onConnected:      ()                          => void;
  onDisconnected:   (reason?: string)           => void;
  onSpeakingStart:  ()                          => void;
  onSpeakingEnd:    ()                          => void;
  onAssistantText:  (text: string)              => void;
  onUserTranscript: (text: string)              => void;
  onError:          (error: Error)              => void;
}

export class GeminiLiveEngine {
  private ai:      GoogleGenAI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private session: any = null;
  private player:  AudioPlayer;
  private mic:     MicCapture;
  private camera:  CameraCapture;

  private transcriptBuf: string[] = [];
  private speaking  = false;
  private running   = false;

  constructor(private cb: EngineCallbacks) {
    this.ai     = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    this.player = new AudioPlayer();
    this.mic    = new MicCapture();
    this.camera = new CameraCapture();
  }

  get cameraCapture(): CameraCapture { return this.camera; }
  get isRunning():     boolean       { return this.running; }

  async start(): Promise<void> {
    this.running = true;
    this.player.resume();

    this.session = await this.ai.live.connect({
      model:  GEMINI_MODEL,
      config: {
        responseModalities:      [Modality.AUDIO],
        outputAudioTranscription: {},
        inputAudioTranscription:  {},
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: GEMINI_VOICE },
          },
        },
        systemInstruction: SYSTEM_PROMPT,
      },
      callbacks: {
        onopen:    () => { this.cb.onConnected(); this._startStreaming(); },
        onmessage: (msg: unknown) => this._handleMessage(msg),
        onerror:   (e: unknown)   => this.cb.onError(new Error(String(e))),
        onclose:   (e: unknown)   => {
          this.running = false;
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
    this.mic.stop();
    this.camera.stop();
    this.player.interrupt();
    this.session?.close();
    this.session = null;
  }

  private _startStreaming(): void {
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
    }, 1); // 1 fps — enough for visual context without flooding the session
  }

  private _handleMessage(msg: unknown): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sc = (msg as any)?.serverContent;
    if (!sc) return;

    // User interrupted the model mid-speech
    if (sc.interrupted) {
      this.player.interrupt();
      this.transcriptBuf = [];
      if (this.speaking) {
        this.speaking = false;
        this.cb.onSpeakingEnd();
      }
      return;
    }

    // Audio chunks — play immediately via Web Audio scheduler
    const parts: unknown[] = sc.modelTurn?.parts ?? [];
    for (const part of parts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (part as any)?.inlineData?.data;
      if (typeof data === 'string') {
        if (!this.speaking) {
          this.speaking = true;
          this.cb.onSpeakingStart();
        }
        this.player.playChunk(data);
      }
    }

    // Buffer transcription tokens — one command dispatch per turn
    const outText: string | undefined = sc.outputTranscription?.text;
    if (outText) this.transcriptBuf.push(outText);

    // User transcript — emit immediately so UI updates in real time
    const inText: string | undefined = sc.inputTranscription?.text;
    if (inText) this.cb.onUserTranscript(inText);

    // Turn complete — flush
    if (sc.turnComplete) {
      if (this.speaking) {
        this.speaking = false;
        this.cb.onSpeakingEnd();
      }
      if (this.transcriptBuf.length > 0) {
        const full = this.transcriptBuf.join('');
        this.transcriptBuf = [];
        this.cb.onAssistantText(full);
      }
    }
  }
}
