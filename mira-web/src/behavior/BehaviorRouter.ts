import { parseResponse } from './CommandParser';
import type { ArduinoCommand } from '../types';
import type { SerialBridge } from '../arduino/SerialBridge';

const IDLE_DEFAULTS:    ArduinoCommand = { face: 'calm',      led: 'warm' };
const SPEAKING_FACE:    ArduinoCommand = { face: 'happy' };
const LISTENING_FACE:   ArduinoCommand = { face: 'listening' };

export class BehaviorRouter {
  constructor(private bridge: SerialBridge | null) {}

  /** Called when assistant_audio_started fires. */
  async onSpeakingStart(): Promise<void> {
    await this.send(SPEAKING_FACE);
  }

  /** Called when assistant_audio_ended fires. */
  async onSpeakingEnd(): Promise<void> {
    await this.send(LISTENING_FACE);
  }

  /**
   * Called at turn_complete with the full transcript text.
   * Parses || command, dispatches to Arduino, returns spoken portion.
   */
  async onAssistantText(text: string): Promise<string> {
    const { spoken, cmd } = parseResponse(text);
    await this.send(Object.keys(cmd).length > 0 ? cmd : IDLE_DEFAULTS);
    return spoken;
  }

  async setIdle(): Promise<void> {
    await this.send(IDLE_DEFAULTS);
  }

  private async send(cmd: ArduinoCommand): Promise<void> {
    if (this.bridge?.isConnected) {
      await this.bridge.send(cmd);
    }
  }
}
