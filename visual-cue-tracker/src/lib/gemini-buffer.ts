import { CUE_NAMES } from './constants';
import type { CueEvent } from './gesture-logic';

export interface BufferedState {
  startTime: number;
  endTime: number;
  cues: Array<{ time: string; name: string; raw: string; confidence: number }>;
}

export class GeminiBuffer {
  private buffer: CueEvent[] = [];
  
  add(event: CueEvent) {
    this.buffer.push(event);
  }

  // Flushes the current buffer and returns a formatted string ideal for LLM context
  flush(): string {
    if (this.buffer.length === 0) return "[No visual cues detected in this timeframe]";
    
    // Sort chronologically
    this.buffer.sort((a, b) => a.timestamp - b.timestamp);
    
    let logString = "--- VISUAL CUE STREAM ---\n";
    this.buffer.forEach(e => {
      const time = new Date(e.timestamp).toISOString().substring(11, 23); // hh:mm:ss.ms
      const name = CUE_NAMES[e.cue] || e.cue;
      logString += `[${time}] LOG: ${name} (conf: ${e.confidence.toFixed(2)})\n`;
    });
    logString += "-------------------------\n";
    
    this.buffer = []; // clear buffer
    return logString;
  }

  getRawJSON(): BufferedState {
    const raw = [...this.buffer];
    raw.sort((a, b) => a.timestamp - b.timestamp);
    
    const res: BufferedState = {
      startTime: raw[0]?.timestamp || 0,
      endTime: raw[raw.length - 1]?.timestamp || 0,
      cues: raw.map(e => ({
        time: new Date(e.timestamp).toISOString(),
        name: CUE_NAMES[e.cue] || e.cue,
        raw: e.cue,
        confidence: e.confidence
      }))
    };
    
    this.buffer = [];
    return res;
  }
}
