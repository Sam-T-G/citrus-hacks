/**
 * Arduino communication over the Web Serial API.
 *
 * Commands are sent as newline-delimited JSON matching the protocol defined
 * in the Python serial_bridge. Sensor data arriving from Arduino is parsed
 * and exposed via the onSensor callback and the `latest` property.
 *
 * Web Serial is Chrome/Edge only. Call isSupported() before connecting.
 */
import type { ArduinoCommand } from '../types';

export interface SensorReading {
  temp: number;
  prox: number;
  pir:  boolean;
}

export class SerialBridge {
  private port:   SerialPort   | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private _latest: SensorReading | null = null;
  private readLoop: Promise<void> | null = null;
  private enc = new TextEncoder();

  onSensor?: (reading: SensorReading) => void;

  static isSupported(): boolean {
    return 'serial' in navigator;
  }

  get isConnected(): boolean { return this.port !== null; }
  get latest(): SensorReading | null { return this._latest; }

  async connect(baudRate = 115200): Promise<void> {
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate });
    this.writer = this.port.writable!.getWriter();
    this.readLoop = this._readLoop();
  }

  async send(cmd: ArduinoCommand): Promise<void> {
    if (!this.writer) return;
    const line = JSON.stringify(cmd) + '\n';
    await this.writer.write(this.enc.encode(line));
  }

  async disconnect(): Promise<void> {
    this.reader?.cancel();
    await this.readLoop;
    this.writer?.releaseLock();
    await this.port?.close();
    this.port   = null;
    this.writer = null;
    this.reader = null;
  }

  private async _readLoop(): Promise<void> {
    const dec = new TextDecoder();
    let buf   = '';
    this.reader = this.port!.readable!.getReader();
    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          try {
            const raw  = JSON.parse(line.trim());
            const reading: SensorReading = {
              temp: Number(raw.temp ?? 0),
              prox: Number(raw.prox ?? 0),
              pir:  Boolean(raw.pir),
            };
            this._latest = reading;
            this.onSensor?.(reading);
          } catch { /* ignore malformed lines */ }
        }
      }
    } catch { /* port closed or cancelled */ } finally {
      this.reader.releaseLock();
    }
  }
}
