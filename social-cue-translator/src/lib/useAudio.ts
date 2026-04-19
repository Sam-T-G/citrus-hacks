import { useCallback, useRef, useState } from 'react';
import { CUE_NAMES, SocialState } from '../constants';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// Cues to skip announcing — too common/noisy for continuous speech
const SILENT_CUES = new Set(['person_detected', 'facing_you', 'none']);

export function useAudio() {
  const [isEnabled, setIsEnabled] = useState(false);
  const lastNarrateTime = useRef(0);
  const isSpeaking = useRef(false);

  const speak = useCallback((text: string, interrupt = false) => {
    if (!window.speechSynthesis) return;
    if (interrupt) window.speechSynthesis.cancel();
    if (isSpeaking.current && !interrupt) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onstart = () => { isSpeaking.current = true; };
    utterance.onend = () => { isSpeaking.current = false; };
    utterance.onerror = () => { isSpeaking.current = false; };
    window.speechSynthesis.speak(utterance);
  }, []);

  // Called on every new cue detection — speaks the human-readable cue name.
  const announceCue = useCallback((cue: string) => {
    if (!isEnabled || SILENT_CUES.has(cue)) return;
    const label = CUE_NAMES[cue] ?? cue;
    speak(label);
  }, [isEnabled, speak]);

  // Called periodically — uses Gemini to produce a rich 1-sentence narration
  // of the interpreted social state. Falls back to a plain phrase if no key.
  const narrateState = useCallback(async (
    state: SocialState,
    recentCues: string[]
  ) => {
    if (!isEnabled || state === 'neutral') return;
    const now = Date.now();
    if (now - lastNarrateTime.current < 8000) return;
    lastNarrateTime.current = now;

    if (GEMINI_KEY) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
        const cueList = recentCues
          .filter(c => !SILENT_CUES.has(c))
          .slice(0, 4)
          .map(c => CUE_NAMES[c] ?? c)
          .join(', ');

        const res = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: `You are an audio narrator for a blind person's assistive wearable.
In one sentence under 20 words, describe what the other person is doing socially.
State: ${state}. Recent signals: ${cueList || 'none'}.
Be natural and direct. No filler phrases like "It appears" — just say what's happening.`
        });

        const text = res.text?.trim();
        if (text) { speak(text, true); return; }
      } catch {
        // fall through to simple fallback
      }
    }

    speak(`The person appears ${state}.`, true);
  }, [isEnabled, speak]);

  return { isEnabled, setIsEnabled, announceCue, narrateState };
}
