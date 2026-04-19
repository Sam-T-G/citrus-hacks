/**
 * Serial bridge for the owl Arduino (owl.ino).
 *
 * owl.ino reads plain newline-terminated strings at 9600 baud and maps them
 * to LCD face functions and a servo wave. We send exactly those strings —
 * no JSON, no framing — so the Arduino requires zero firmware changes.
 *
 * Protocol (host → Arduino):
 *   "happy\n"  → happy()   LCD: (  ^  )  (  ^  )
 *   "plain\n"  → plain()   LCD: (  B  )  (  B  )
 *   "robot\n"  → robot()   LCD: [  o  ]  [  o  ]
 *   "tears\n"  → tears()   LCD: (  T  )  (  T  )
 *   "dizzy\n"  → dizzy()   LCD: (  @  )  (  @  )
 *   "wink\n"   → wink()    LCD: (  ^  )  (  -  )
 *   "dead\n"   → dead()    LCD: (  X  )  (  X  )
 *   "wave\n"   → wave()×2  Servo sweeps 0→180→0
 *
 * Web Serial is Chrome/Edge only — call isSupported() before connecting.
 */
import type { ArduinoCommand } from '../types';

export class SerialBridge {
  private port:     SerialPort | null = null;
  private writer:   WritableStreamDefaultWriter<Uint8Array> | null = null;
  private enc = new TextEncoder();

  static isSupported(): boolean {
    return 'serial' in navigator;
  }

  get isConnected(): boolean { return this.port !== null; }

  async connect(baudRate = 9600): Promise<void> {
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate });
    this.writer = this.port.writable!.getWriter();
  }

  async send(cmd: ArduinoCommand): Promise<void> {
    if (!this.writer) return;
    const word = cmd.wave ? 'wave' : cmd.face ?? '';
    if (!word) return;
    await this.writer.write(this.enc.encode(word + '\n'));
  }

  async disconnect(): Promise<void> {
    this.writer?.releaseLock();
    await this.port?.close();
    this.port   = null;
    this.writer = null;
  }
}
