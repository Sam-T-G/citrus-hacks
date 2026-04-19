export const BRAILLE_MAP: Record<string, number[]> = {
  'wave_detected': [1, 2, 3, 4, 5, 6],
  'nod_yes': [1, 2, 4, 5],
  'shake_no': [3, 6],
  'person_detected': [1, 4],
  'smiling': [1, 2, 4, 5, 6],
  'frowning': [3, 4, 5, 6],
  'brows_furrowed': [1, 2, 3],
  'brows_raised': [4, 5, 6],
  'looking_away': [1, 3, 5],
  'thumbs_up': [1, 2, 3, 4, 5],
  'thumbs_down': [2, 3, 4, 5, 6],
  'crossed_arms': [1, 2, 3, 6],
  'facing_away': [1, 4, 5, 6],
  'slouching': [2, 5],
  'blinking': [1, 2],
  'looking_up': [1, 3],
  'looking_down': [4, 6],
  'facing_you': [1, 2, 3, 4, 5, 6],
};

export const CUE_NAMES: Record<string, string> = {
  'wave_detected': 'Wave Detected',
  'nod_yes': 'Nod (Yes)',
  'shake_no': 'Shake (No)',
  'person_detected': 'In View',
  'smiling': 'Smiling',
  'frowning': 'Frowning',
  'brows_furrowed': 'Brows Furrowed',
  'brows_raised': 'Brows Raised',
  'looking_away': 'Looking Away',
  'thumbs_up': 'Thumbs Up',
  'thumbs_down': 'Thumbs Down',
  'crossed_arms': 'Arms Crossed',
  'facing_away': 'Facing Away',
  'slouching': 'Slouching',
  'blinking': 'Blink Detected',
  'looking_up': 'Looking Up',
  'looking_down': 'Looking Down',
  'facing_you': 'Facing Camera',
};

export type SocialState = 'friendly' | 'engaged' | 'concerned' | 'confused' | 'disagreeing' | 'disengaged' | 'neutral';

export const STATE_WEIGHTS: Record<string, Partial<Record<SocialState, number>>> = {
  'smiling': { friendly: 3, engaged: 1 },
  'brows_furrowed': { concerned: 2, confused: 1, disagreeing: 1 },
  'brows_raised': { confused: 2 },
  'nod_yes': { friendly: 1, engaged: 2 },
  'shake_no': { disagreeing: 3 },
  'facing_you': { friendly: 1, concerned: 1, confused: 1, engaged: 2 },
  'looking_away': { engaged: -2, disengaged: 2 },
  'frowning': { concerned: 2, disagreeing: 1 },
  'crossed_arms': { disengaged: 2, disagreeing: 1 },
  'slouching': { disengaged: 2 }
};
