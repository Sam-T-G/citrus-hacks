export type FaceType = 'calm' | 'happy' | 'thinking' | 'sleepy' | 'listening';
export type LedMode  = 'warm' | 'cool' | 'off';

export interface ArduinoCommand {
  face?:    FaceType;
  led?:     LedMode;
  servo?:   number;
  chime?:   number;
  photo?:   string;
  caption?: string;
  screen?:  'off';
}

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  ts:   number;
}

export type EngineState = 'idle' | 'connecting' | 'listening' | 'speaking';
