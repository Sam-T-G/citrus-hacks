import type { ArduinoCommand } from '../types';
import type { SerialBridge } from '../arduino/SerialBridge';

const LISTENING_FACE: ArduinoCommand = { face: 'plain' };

export class BehaviorRouter {
  constructor(private bridge: SerialBridge | null) {}

  /** Called when Gemini fires a set_face / wave_wing tool call. */
  async onArduinoCommand(cmd: ArduinoCommand): Promise<void> {
    await this.send(cmd);
  }

  /** Called when assistant_audio_ended fires — return to neutral. */
  async onSpeakingEnd(): Promise<void> {
    await this.send(LISTENING_FACE);
  }

  async setIdle(): Promise<void> {
    await this.send(LISTENING_FACE);
  }

  private async send(cmd: ArduinoCommand): Promise<void> {
    if (this.bridge?.isConnected) {
      await this.bridge.send(cmd);
    }
  }
}
