import type { ArduinoCommand } from '../types';

const SEP = '||';

const VALID_FACES  = new Set(['calm', 'happy', 'thinking', 'sleepy', 'listening']);
const VALID_LEDS   = new Set(['warm', 'cool', 'off']);

function validate(raw: Record<string, unknown>): ArduinoCommand {
  const cmd: ArduinoCommand = {};
  if (typeof raw.face   === 'string' && VALID_FACES.has(raw.face))   cmd.face   = raw.face   as ArduinoCommand['face'];
  if (typeof raw.led    === 'string' && VALID_LEDS.has(raw.led))      cmd.led    = raw.led    as ArduinoCommand['led'];
  if (typeof raw.servo  === 'number' && raw.servo >= 0 && raw.servo <= 180) cmd.servo = raw.servo;
  if (typeof raw.chime  === 'number') cmd.chime   = raw.chime;
  if (typeof raw.photo  === 'string') cmd.photo   = raw.photo;
  if (typeof raw.caption=== 'string') cmd.caption = raw.caption;
  if (raw.screen === 'off')           cmd.screen  = 'off';
  return cmd;
}

/**
 * Parse a Gemini response of the form:
 *   "Spoken text here. || {"face":"happy","led":"warm"}"
 *
 * Returns { spoken, cmd }. If no separator or malformed JSON, cmd is {}.
 */
export function parseResponse(text: string): { spoken: string; cmd: ArduinoCommand } {
  const idx = text.indexOf(SEP);
  if (idx === -1) return { spoken: text.trim(), cmd: {} };

  const spoken = text.slice(0, idx).trim();
  try {
    const raw = JSON.parse(text.slice(idx + SEP.length).trim());
    return { spoken, cmd: validate(raw) };
  } catch {
    return { spoken, cmd: {} };
  }
}
