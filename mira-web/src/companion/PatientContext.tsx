import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getPronouns, type Pronouns } from './pronouns';

/* ── Types ───────────────────────────────────────────────── */
export interface Patient {
  first: string; preferred: string; last: string;
  birth: string; stage: string; diagnosed: string; home: string;
  pronouns?: string;
  likes: string[]; dislikes: string[]; triggers: string[]; calmers: string[];
  routine: { time: string; what: string; owl: string | null }[];
}
export interface Caregiver {
  id: string; name: string; role: string; online: boolean; tint: string;
}
export interface Person {
  id: string; rel: string; name: string; note: string; tint: string;
}
export interface Topic {
  id: string; title: string; primer: string; warm: boolean;
}
export interface Memory {
  id: string; kind: string; title: string; tag: string; tint: string;
  desc: string; tags: string[]; plays: number; duration?: string;
  imageUrl?: string;
}
export interface Voice {
  id: string; person: string; title: string; duration: string; usedIn: string; waves: number[];
}
export interface Grounding {
  id: string; name: string; duration: string; use: string;
}
export interface MoodEntry {
  d: string; mood: number; note: string | null;
}
export interface LogEntry {
  t: string; kind: string; text: string;
}

export interface PatientStore {
  currentCaregiverId: string;
  patient:    Patient;
  caregivers: Caregiver[];
  people:     Person[];
  topics:     Topic[];
  voices:     Voice[];
  grounding:  Grounding[];
  memories:   Memory[];
  moods:      MoodEntry[];
  todayLog:   LogEntry[];
}

/* ── Context ─────────────────────────────────────────────── */
interface PatientCtx {
  store:            PatientStore | null;
  loading:          boolean;
  saving:           boolean;
  updateStore:      (updates: Partial<PatientStore>) => Promise<void>;
  currentCaregiver: Caregiver | null;
  pronouns:         Pronouns;
}

const Ctx = createContext<PatientCtx | null>(null);

export function usePatientData(): PatientCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePatientData must be inside PatientProvider');
  return ctx;
}

export function usePronouns(): Pronouns {
  return usePatientData().pronouns;
}

export type { Pronouns };

/* ── Provider ────────────────────────────────────────────── */
export function PatientProvider({ children }: { children: ReactNode }) {
  const [store,   setStore]   = useState<PatientStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    fetch('/api/patient')
      .then(r => r.json())
      .then((data: PatientStore) => { setStore(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const updateStore = useCallback(async (updates: Partial<PatientStore>) => {
    if (!store) return;
    const next = { ...store, ...updates };
    setStore(next);
    setSaving(true);
    try {
      await fetch('/api/patient', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next, null, 2),
      });
    } finally {
      setSaving(false);
    }
  }, [store]);

  const currentCaregiver = store
    ? (store.caregivers.find(c => c.id === store.currentCaregiverId) ?? store.caregivers[0] ?? null)
    : null;

  const pronouns = getPronouns(store?.patient.pronouns);

  return (
    <Ctx.Provider value={{ store, loading, saving, updateStore, currentCaregiver, pronouns }}>
      {children}
    </Ctx.Provider>
  );
}
