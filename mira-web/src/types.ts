// Matches the owl's LCD face functions in owl.ino
export type FaceType = 'plain' | 'robot' | 'tears' | 'dizzy' | 'happy' | 'wink' | 'dead';

export interface ArduinoCommand {
  face?: FaceType;
  wave?: 1; // triggers servo sweep 0→180→0 twice
}

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  ts:   number;
}

export type EngineState = 'idle' | 'connecting' | 'listening' | 'speaking';

// ── Session event log ────────────────────────────────────────

export type MoodType =
  | 'calm' | 'happy' | 'confused' | 'agitated'
  | 'distressed' | 'sad' | 'fearful' | 'lucid';

export type MoodIntensity = 'mild' | 'moderate' | 'severe';

export type BehaviorEventType =
  | 'repetitive_question'
  | 'wandering_attempt'
  | 'refused_medication'
  | 'did_not_eat'
  | 'fall_risk'
  | 'fall_detected'
  | 'frantic_movement'
  | 'unresponsive'
  | 'aggression'
  | 'lucid_moment'
  | 'general';

export type AlertSeverity = 'low' | 'medium' | 'high';

export type SessionEventType =
  | 'mood_observation'
  | 'behavior_event'
  | 'caregiver_alert'
  | 'medication_event'
  | 'session_start'
  | 'session_end';

export interface MoodObservationData {
  mood:      MoodType;
  intensity: MoodIntensity;
  notes?:    string;
}

export interface BehaviorEventData {
  event_type: BehaviorEventType;
  notes:      string;
}

export interface CaregiverAlertData {
  severity: AlertSeverity;
  reason:   string;
}

export interface MedicationEventData {
  action: 'prompted' | 'taken' | 'refused' | 'uncertain';
  notes?: string;
}

export interface SessionEvent {
  id:        string;          // uuid-lite: ts+random
  ts:        number;          // unix ms
  sessionId: string;
  type:      SessionEventType;
  data:      MoodObservationData | BehaviorEventData | CaregiverAlertData | MedicationEventData | Record<string, unknown>;
}
