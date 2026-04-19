/**
 * Serial bridge for Mira Arduino (Arduino Mira Code.ino).
 *
 * Two connection modes:
 *
 *   Web Serial (direct)  — Chrome/Edge only, no Python bridge needed.
 *     SerialBridge.connect()
 *     Waits for Arduino "Mira ready" handshake before allowing writes,
 *     so no commands are dropped during the DTR-triggered reset.
 *
 *   WebSocket (via Python bridge) — any browser, requires "Terminal Code"
 *     python script running on the same machine.
 *     SerialBridge.connectWS()
 *
 * Protocol (host → Arduino, newline-terminated):
 *   "happy" | "plain" | "robot" | "tears" | "dizzy" | "wink" | "dead"
 *   "wave"    → arm servo sweep
 *   "pan:X"   → pan servo to pixel-x position (0–320)
 *
 * Write safety:
 *   All writes are serialized via a promise chain — Web Serial rejects
 *   concurrent writes. Pan commands coalesce so only the latest queued
 *   value is sent each time the writer becomes free.
 *   writer.ready is awaited before every write to respect backpressure.
 */
import type { ArduinoCommand } from '../types';

const WS_BRIDGE_URL = 'ws://localhost:8765';
const READY_TIMEOUT_MS = 4000; // max wait for "Mira ready" before giving up

export class SerialBridge {
  private port:   SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private ws:     WebSocket | null = null;
  private enc = new TextEncoder();

  // Serialize all writes — Web Serial rejects concurrent writes
  private writeChain: Promise<void> = Promise.resolve();
  // Coalesce rapid pan updates: only the latest queued value is written
  private pendingPan: number | null = null;

  static isSupported(): boolean {
    return 'serial' in navigator;
  }

  get isConnected(): boolean {
    return this.port !== null || (this.ws !== null && this.ws.readyState === WebSocket.OPEN);
  }

  get connectionMode(): 'serial' | 'websocket' | 'none' {
    if (this.port)                                       return 'serial';
    if (this.ws?.readyState === WebSocket.OPEN)          return 'websocket';
    return 'none';
  }

  // ── Web Serial (direct) ───────────────────────────────────────────────────

  async connect(baudRate = 9600): Promise<void> {
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate });
    console.log('[SerialBridge] Port opened — waiting for Arduino ready signal…');

    // Arduino resets on DTR (port open). Wait for it to signal "Mira ready"
    // before acquiring the writer, so no commands are sent during setup().
    await this._waitForReady();

    this.writer = this.port.writable!.getWriter();
    console.log('[SerialBridge] Writer acquired — ready to send commands.');
  }

  /**
   * Reads from the serial port until "ready" appears in the stream, or until
   * READY_TIMEOUT_MS elapses. Either way releases the reader so the writer
   * can be acquired immediately after.
   */
  private async _waitForReady(): Promise<void> {
    if (!this.port?.readable) return;
    const reader  = this.port.readable.getReader();
    const decoder = new TextDecoder();
    let   buf     = '';

    try {
      await Promise.race([
        // Read chunks until we see "ready"
        (async () => {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            console.log('[SerialBridge] Arduino →', buf.trim());
            if (buf.toLowerCase().includes('ready')) break;
          }
        })(),
        // Fallback: don't block forever if Arduino doesn't send the string
        new Promise<void>(resolve => setTimeout(resolve, READY_TIMEOUT_MS)),
      ]);
    } catch (e) {
      console.warn('[SerialBridge] Error waiting for ready signal:', e);
    } finally {
      reader.releaseLock();
    }
    console.log('[SerialBridge] Arduino ready — proceeding.');
  }

  // ── WebSocket (Python bridge) ─────────────────────────────────────────────

  connectWS(url = WS_BRIDGE_URL): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.onopen  = () => { this.ws = ws; resolve(); };
      ws.onerror = () => reject(new Error(`WebSocket bridge unreachable at ${url}. Is "Terminal Code" running?`));
      ws.onclose = () => { this.ws = null; };
    });
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  async send(cmd: ArduinoCommand): Promise<void> {
    const word = cmd.wave ? 'wave' : cmd.face ?? '';
    if (!word) return;
    return this._enqueue(word);
  }

  /**
   * Queue a pan update. Rapid calls coalesce — only the latest pixel-x
   * value is written each time the writer is free.
   */
  sendPan(pixelX: number): void {
    this.pendingPan = pixelX;
    this.writeChain = this.writeChain
      .then(() => {
        if (this.pendingPan === null) return;
        const px = this.pendingPan;
        this.pendingPan = null;
        return this._doWrite(`pan:${px}`);
      })
      .catch(() => {});
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private _enqueue(word: string): Promise<void> {
    const p = this.writeChain
      .then(() => this._doWrite(word))
      .catch(e => console.warn('[SerialBridge] Write error:', e));
    this.writeChain = p as Promise<void>;
    return p as Promise<void>;
  }

  private async _doWrite(word: string): Promise<void> {
    if (this.writer) {
      await this.writer.ready; // respect backpressure before every write
      await this.writer.write(this.enc.encode(word + '\n'));
      console.log('[SerialBridge] →', word);
    } else if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(word);
      console.log('[SerialBridge] WS →', word);
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    this.writer?.releaseLock();
    await this.port?.close();
    this.port   = null;
    this.writer = null;

    this.ws?.close();
    this.ws = null;
  }
}
