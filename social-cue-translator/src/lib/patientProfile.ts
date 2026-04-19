// Patient profile — injected into Gemini's system instruction so every
// response is personalised. This will be editable via an app interface later.

export interface FamilyMember {
  name: string;
  relation: string;
  notes?: string;
}

export interface PatientProfile {
  // Identity
  name: string;
  preferredName: string;     // what they like to be called
  age: number;
  diagnosis: string;

  // Personal history
  hometown: string;
  career: string;
  significantPlaces: string[];

  // Family & relationships
  family: FamilyMember[];

  // Personality & preferences
  hobbies: string[];
  favouriteFoods: string[];
  favouriteMusic: string[];  // era, genres, or specific artists
  favouriteTopics: string[]; // topics that make them light up
  comfortItems: string[];    // physical objects or sensory anchors that calm them

  // Things to handle carefully
  sensitivities: string[];   // topics or names that may cause distress
  avoidTopics: string[];     // things to steer away from entirely

  // Caregiver notes
  caregiverNotes: string;
}

// ── Default profile ────────────────────────────────────────────────────────────
// Replace this with a dynamic load from a database or settings file later.
export const PATIENT_PROFILE: PatientProfile = {
  name:          'Sam',
  preferredName: 'Sam',
  age:           70,
  diagnosis:     'Alzheimer\'s disease (early-to-mid stage)',

  hometown:          'San Francisco, California',
  career:            'High school history teacher for 30 years',
  significantPlaces: ['Golden Gate Park', 'Fisherman\'s Wharf', 'the old school on Clement Street'],

  family: [
    { name: 'Margaret', relation: 'wife',            notes: 'Married 42 years. Sam lights up when she\'s mentioned.' },
    { name: 'David',    relation: 'son',              notes: 'Lives nearby, visits on weekends.' },
    { name: 'Claire',   relation: 'daughter',         notes: 'Lives in Portland. Calls every Sunday.' },
    { name: 'Lily',     relation: 'granddaughter',    notes: 'Age 8. Sam adores her.' },
  ],

  hobbies:        ['gardening', 'reading history books', 'watching baseball', 'woodworking', 'crossword puzzles'],
  favouriteFoods: ['clam chowder', 'sourdough bread', 'apple pie', 'coffee in the morning'],
  favouriteMusic: ['Frank Sinatra', 'big band jazz', 'The Beatles', 'classic country'],
  favouriteTopics:[
    'the San Francisco Giants',
    'World War II history',
    'his garden',
    'stories about teaching',
    'road trips up the California coast',
  ],
  comfortItems: ['a warm cup of coffee', 'the smell of fresh bread', 'baseball on the radio'],

  sensitivities: [
    'his brother Frank, who passed away in 2019 — handle with care if mentioned',
  ],
  avoidTopics: [
    'his diagnosis or memory loss directly',
    'anything that makes him feel tested or evaluated',
    'news or politics',
  ],

  caregiverNotes: `Sam responds very well to baseball talk and stories about his teaching days.
He sometimes thinks it's the 1980s — go along with it gently rather than correcting him.
He enjoys a slow pace and doesn't like being rushed. Morning sessions tend to go better than evenings.`,
};

// ── Serialise for Gemini ───────────────────────────────────────────────────────
export function profileToSystemContext(p: PatientProfile): string {
  const family = p.family
    .map(f => `  - ${f.name} (${f.relation})${f.notes ? ': ' + f.notes : ''}`)
    .join('\n');

  return `
PATIENT PROFILE — read this carefully and use it to personalise every response:

Name: ${p.name} (call them "${p.preferredName}")
Age: ${p.age}
Diagnosis: ${p.diagnosis}

Personal history:
  Hometown: ${p.hometown}
  Career: ${p.career}
  Places they love: ${p.significantPlaces.join(', ')}

Family:
${family}

Hobbies: ${p.hobbies.join(', ')}
Favourite foods: ${p.favouriteFoods.join(', ')}
Favourite music: ${p.favouriteMusic.join(', ')}
Topics that make them light up: ${p.favouriteTopics.join(', ')}
Comfort anchors: ${p.comfortItems.join(', ')}

Handle with care: ${p.sensitivities.join('; ')}
Avoid entirely: ${p.avoidTopics.join('; ')}

Caregiver notes:
${p.caregiverNotes}
`.trim();
}
