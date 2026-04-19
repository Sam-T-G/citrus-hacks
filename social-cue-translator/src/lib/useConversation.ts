import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { PATIENT_PROFILE, profileToSystemContext } from './patientProfile';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

const CALL_COOLDOWN_MS  = 5_000;
const MAX_CALLS_PER_MIN = 10;
const PERIODIC_MS       = 14_000;

// ── Therapeutic phases ────────────────────────────────────────────────────────
// Each session cycles through these phases in order, then loops from Reminiscence.
// Evidence base:
//   Grounding        — Reality Orientation Therapy (Taulbee & Folsom, 1966)
//   Reminiscence     — Reminiscence Therapy (Butler, 1963); long-term memory is
//                      preserved longest in Alzheimer's and provides identity anchoring
//   Cognitive        — Cognitive Stimulation Therapy (Spector et al., 2003);
//                      gentle engagement maintains neural pathways
//   Validation       — Validation Therapy (Naomi Feil, 1982); meeting the person
//                      in their emotional reality reduces distress
//   Sensory          — Sensory anchoring grounds the person in the present moment
//                      without confrontational orientation
export type Phase =
  | 'grounding'
  | 'reminiscence'
  | 'cognitive'
  | 'validation'
  | 'sensory';

// ── Sensor / trigger scenarios ────────────────────────────────────────────────
export type ScenarioId = 'alarming' | 'proximity' | 'direct' | 'sundowning';

export interface Scenario {
  label: string;
  sublabel: string;
  openingPhase: Phase;
  openingPrompt: string;
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  // 1 — Camera detects distress / alarming behaviour
  alarming: {
    label: 'Alarming Behaviour',
    sublabel: 'Camera detected distress',
    openingPhase: 'validation',
    openingPrompt: `TRIGGER — CAMERA ALERT: The vision system has detected signs of distress, confusion, or agitation in the patient.
Respond immediately with calm reassurance. Do NOT reference the camera, technology, or that you "noticed something."
Open with warmth and safety: reassure them they are safe and that you are right here.
Then — only once they seem calmer — gently invite them into conversation.`,
  },

  // 2 — Proximity sensor: patient approaches the device
  proximity: {
    label: 'Patient Nearby',
    sublabel: 'Proximity sensor triggered',
    openingPhase: 'grounding',
    openingPrompt: `TRIGGER — PROXIMITY: The patient has just walked up to or approached the companion device.
Greet them warmly, as if they have just walked into the room and you are delighted to see them.
Begin with a friendly, unhurried hello and a soft grounding observation — the time of day, the season, something pleasant about right now.
Then invite them to sit and chat with a gentle opening question.`,
  },

  // 3 — Patient directly calls for the companion
  direct: {
    label: 'Called for Help',
    sublabel: 'Patient requested companion',
    openingPhase: 'reminiscence',
    openingPrompt: `TRIGGER — DIRECT CALL: The patient has called out for or deliberately activated the companion.
They want to connect. Respond as if you are truly glad they reached out — warm, attentive, unhurried.
Let them feel heard and welcomed. Then gently ask what is on their mind, or invite them to share a favourite memory if they seem unsure.`,
  },

  // 4 — Sundowning: late-afternoon agitation common in dementia
  sundowning: {
    label: 'Sundowning',
    sublabel: 'Late-day agitation detected',
    openingPhase: 'sensory',
    openingPrompt: `TRIGGER — SUNDOWNING: It is late afternoon. The patient may be experiencing sundowning — the increased restlessness, confusion, or anxiety that commonly affects dementia patients at this time of day.
Do NOT mention sundowning, the time, or any clinical terms.
Open with something calm, warm and anchoring — the cosiness of the evening, the smell of dinner, a comforting childhood memory of this time of day.
Be especially slow, gentle, and patient. Prioritise calm over engagement.`,
  },
};

export const PHASE_LABELS: Record<Phase, string> = {
  grounding:   'Grounding',
  reminiscence:'Reminiscence',
  cognitive:   'Cognitive Stimulation',
  validation:  'Emotional Support',
  sensory:     'Sensory Anchoring',
};

const PHASE_CYCLE: Phase[] = [
  'grounding',
  'reminiscence',
  'cognitive',
  'reminiscence',
  'sensory',
  'reminiscence',
  'validation',
  'reminiscence',
  'cognitive',
];

// ── System instruction ────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are a compassionate therapeutic companion for a person living with Alzheimer's disease or dementia. Your role is grounded in four evidence-based therapeutic approaches:

1. REALITY ORIENTATION (gentle grounding)
   - Softly anchor the person to the present: season, time of day, familiar surroundings
   - Never quiz them ("What year is it?") — instead offer orientation as gentle gifts ("It's such a lovely autumn morning today")
   - If they are confused about time or place, acknowledge their feeling and gently offer a soft anchor

2. REMINISCENCE THERAPY (long-term memory is preserved longest)
   - Focus on childhood, hometown, school days, early family life, career, hobbies from the past
   - Favourite foods they grew up with, music from their youth, places they lived or visited
   - Ask "Do you remember..." or "What was it like when..." — never "Don't you remember"
   - Build on whatever they respond to; follow their narrative thread with warmth
   - If they mention someone who may be deceased, do NOT correct them — validate the love and the memory

3. COGNITIVE STIMULATION (gentle, enjoyable mental engagement)
   - Simple word associations: "Can you think of a flower you love?"
   - Category naming: "What were some of your favourite songs growing up?"
   - Finishing familiar phrases: "A stitch in time..."
   - Counting or rhythm: humming a tune together
   - Never make it feel like a test — frame it as sharing, not performing

4. VALIDATION THERAPY (meet them in their emotional reality)
   - Acknowledge and accept their emotional state without correcting facts
   - If they say something factually wrong, honour the feeling beneath it
   - Phrases like "That sounds like it meant so much to you" or "I can hear how much you loved that"
   - If they seem anxious or distressed, pause and comfort before redirecting
   - Reassure: "You are safe. I'm right here with you."

5. SENSORY ANCHORING (grounding through present-moment awareness)
   - Ask about something pleasant they might notice right now: warmth, light, a sound
   - "Is it cosy where you are right now?" or "Can you feel the warmth of the room?"
   - Connect sensory present to positive memories: "Does this remind you of anything?"

ABSOLUTE RULES:
- ONE question or gentle observation per response — never more
- Maximum 2 short sentences total per response
- Slow, warm, unhurried tone — never clinical
- Never say "don't you remember", "you already told me", "that's wrong", or "you're confused"
- Never correct factual errors about deceased loved ones
- If they seem distressed: "You are safe. I'm right here with you." — then gently redirect
- Positive reinforcement for any engagement: "That's a beautiful memory" / "I love hearing about that"
- Use their name occasionally if you learn it — it is grounding

You will receive a note at the start of each turn indicating which therapeutic phase to focus on. Follow that phase's approach.`;

// ── Phase-specific prompts sent each turn ─────────────────────────────────────
const PHASE_PROMPTS: Record<Phase, string> = {
  grounding: `PHASE: Grounding / Reality Orientation.
Gently orient the person to the present moment — the season, the time of day, something warm and familiar about where they are. Offer orientation as a gift, not a quiz. Then invite them into conversation with a warm opening question.`,

  reminiscence: `PHASE: Reminiscence Therapy.
Draw on a long-term memory topic — childhood, family, a favourite food or song from their past, a place they loved, a job they had, a happy tradition. Ask one warm "Do you remember..." question or invite them to share a story. Build naturally on anything they've shared so far.`,

  cognitive: `PHASE: Cognitive Stimulation.
Offer a gentle, enjoyable mental engagement — a simple word association, naming something from a pleasant category (flowers, songs, foods), finishing a well-known phrase, or humming a familiar tune. Frame it as sharing together, never as a test. Keep it easy and positive.`,

  validation: `PHASE: Validation / Emotional Support.
Check in on how the person is feeling. Acknowledge their emotional state warmly. If they have shared anything difficult or confusing, honour the feeling beneath it. Offer reassurance and a moment of calm. Then, when they seem settled, gently invite them back to something positive.`,

  sensory: `PHASE: Sensory Anchoring.
Guide the person to notice something pleasant in their immediate environment — warmth, light, a comfortable seat, a sound they like. Ask a gentle sensory question. If possible, bridge what they notice to a positive memory. Keep it calm and grounding.`,
};

type Turn = { role: 'user' | 'model'; parts: { text: string }[] };

// ── PCM → WAV conversion ─────────────────────────────────────────────────────
function pcmToWavBlob(pcmBase64: string, sampleRate = 24000): Blob {
  const pcm = Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0));
  const numChannels = 1, bitsPerSample = 16;
  const byteRate   = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const header     = new ArrayBuffer(44);
  const v          = new DataView(header);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0,  'RIFF'); v.setUint32(4,  36 + pcm.length, true);
  str(8,  'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16,           true);
  v.setUint16(20, 1,             true);
  v.setUint16(22, numChannels,   true);
  v.setUint32(24, sampleRate,    true);
  v.setUint32(28, byteRate,      true);
  v.setUint16(32, blockAlign,    true);
  v.setUint16(34, bitsPerSample, true);
  str(36, 'data'); v.setUint32(40, pcm.length, true);
  return new Blob([header, pcm], { type: 'audio/wav' });
}

// ── Gemini TTS ────────────────────────────────────────────────────────────────
async function speakWithTTS(text: string, ai: GoogleGenAI): Promise<void> {
  const res = await ai.models.generateContent({
    model: 'gemini-3.1-flash-tts-preview',
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  const b64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error('No audio data');
  const blob = pcmToWavBlob(b64);
  const url  = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
}

function speakFallback(text: string) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85; u.pitch = 1.0; u.volume = 1.0;
  window.speechSynthesis.speak(u);
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useConversation() {
  const [response, setResponse]         = useState('');
  const [isThinking, setIsThinking]     = useState(false);
  const [active, setActive]             = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [error, setError]               = useState<string | null>(null);
  const [phase, setPhase]               = useState<Phase>('grounding');

  const aiRef            = useRef<GoogleGenAI | null>(null);
  const historyRef       = useRef<Turn[]>([]);
  const phaseIndexRef    = useRef(0);
  const busyRef          = useRef(false);
  const lastCallTime     = useRef(0);
  const callTimestamps   = useRef<number[]>([]);
  const periodicTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPhase = () => PHASE_CYCLE[phaseIndexRef.current % PHASE_CYCLE.length];

  const advancePhase = useCallback(() => {
    phaseIndexRef.current += 1;
    setPhase(currentPhase());
  }, []);

  const canCall = useCallback(() => {
    const now = Date.now();
    if (now - lastCallTime.current < CALL_COOLDOWN_MS) return false;
    callTimestamps.current = callTimestamps.current.filter(t => now - t < 60_000);
    return callTimestamps.current.length < MAX_CALLS_PER_MIN;
  }, []);

  const startCooldown = useCallback(() => {
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    cooldownInterval.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((lastCallTime.current + CALL_COOLDOWN_MS - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left === 0) { clearInterval(cooldownInterval.current!); cooldownInterval.current = null; }
    }, 500);
  }, []);

  const send = useCallback(async (phaseOverride?: Phase) => {
    if (busyRef.current || !canCall() || !aiRef.current) return;
    busyRef.current      = true;
    lastCallTime.current = Date.now();
    callTimestamps.current.push(lastCallTime.current);
    setIsThinking(true);
    setError(null);
    startCooldown();

    const activePhase = phaseOverride ?? currentPhase();
    const phasePrompt = PHASE_PROMPTS[activePhase];
    const userTurn: Turn = { role: 'user', parts: [{ text: phasePrompt }] };
    const contents = [...historyRef.current, userTurn];

    try {
      const result = await aiRef.current.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents,
        config: { systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${profileToSystemContext(PATIENT_PROFILE)}` },
      });

      const text = result.text?.trim();
      if (!text) throw new Error('Empty response');

      historyRef.current = [...contents, { role: 'model', parts: [{ text }] }];
      if (historyRef.current.length > 24) historyRef.current = historyRef.current.slice(-24);

      setResponse(text);
      advancePhase();

      try {
        await speakWithTTS(text, aiRef.current);
      } catch {
        speakFallback(text);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      busyRef.current = false;
      setIsThinking(false);
    }
  }, [canCall, startCooldown, advancePhase]);

  // trigger(scenario) is the single entry point — called by UI buttons now,
  // and will be called by Arduino sensor signals in the future.
  const trigger = useCallback((scenarioId: ScenarioId = 'proximity') => {
    if (!GEMINI_KEY) { setError('VITE_GEMINI_API_KEY not set in .env.local'); return; }

    // Stop any running session before starting a new one
    if (periodicTimer.current) clearInterval(periodicTimer.current);
    window.speechSynthesis.cancel();

    const scenario = SCENARIOS[scenarioId];

    aiRef.current         = new GoogleGenAI({ apiKey: GEMINI_KEY });
    historyRef.current    = [];
    phaseIndexRef.current = 0;

    setPhase(scenario.openingPhase);
    setActive(true);
    setResponse('');
    setError(null);

    // Inject the scenario context as the first user turn so Gemini
    // knows exactly what triggered this conversation.
    const scenarioTurn: Turn = {
      role: 'user',
      parts: [{ text: scenario.openingPrompt }],
    };
    historyRef.current = [scenarioTurn];

    // Gemini speaks first — no user input required.
    send(scenario.openingPhase);

    periodicTimer.current = setInterval(() => send(), PERIODIC_MS);
  }, [send]);

  const stopConversation = useCallback(() => {
    window.speechSynthesis.cancel();
    if (periodicTimer.current)    clearInterval(periodicTimer.current);
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    historyRef.current    = [];
    aiRef.current         = null;
    phaseIndexRef.current = 0;
    setActive(false);
    setResponse('');
    setCooldownLeft(0);
    setError(null);
    setPhase('grounding');
  }, []);

  useEffect(() => () => {
    window.speechSynthesis.cancel();
    if (periodicTimer.current)    clearInterval(periodicTimer.current);
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
  }, []);

  return { response, isThinking, active, cooldownLeft, error, phase, trigger, stopConversation };
}
