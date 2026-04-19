/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Activity, 
  Heart, 
  UserCheck, 
  Music, 
  Smile, 
  Eye, 
  LogOut,
  Brain,
  Settings,
  RefreshCw,
  Sparkles,
  Loader2,
  Calendar,
  Thermometer,
  Shield,
  Radio
} from 'lucide-react';
import { CUE_NAMES, STATE_WEIGHTS, SocialState } from './constants';
import { analyzeInteractionLog, RobotInsight } from './services/geminiService';

// --- Types ---

interface VisualLogEntry {
  id: string;
  cueId: string;
  name: string;
  timestamp: Date;
}

interface RobotAction {
  id: string;
  label: string;
  timestamp: Date;
  type: 'autonomous' | 'suggested';
}

// --- Main Component ---

export default function App() {
  const [log, setLog] = useState<VisualLogEntry[]>([]);
  const [actions, setActions] = useState<RobotAction[]>([]);
  const [proximity, setProximity] = useState<number>(0); 
  const [socialState, setSocialState] = useState<SocialState>('neutral');
  const [isAutoActive, setIsAutoActive] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<RobotInsight | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevProximityRef = useRef<number>(proximity);
  const logEndRef = useRef<HTMLDivElement>(null);
  const actionEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll functions
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  useEffect(() => {
    actionEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [actions]);

  // Helper functions
  const triggerAction = useCallback((label: string, type: 'autonomous' | 'suggested' = 'autonomous') => {
    const newAction: RobotAction = {
      id: Math.random().toString(36).substring(7),
      label,
      timestamp: new Date(),
      type
    };
    setActions(prev => [...prev.slice(-19), newAction]); // Keep last 20
  }, []);

  const addLogEntry = useCallback((cueId: string) => {
    const newEntry: VisualLogEntry = {
      id: Math.random().toString(36).substring(7),
      cueId,
      name: CUE_NAMES[cueId],
      timestamp: new Date()
    };
    setLog(prev => [...prev.slice(-49), newEntry]); // Keep last 50
  }, []);

  // Initialize camera
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
      .then(s => {
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(err => console.error("Camera access denied", err));
  }, []);

  // Proximity Logic Simulation
  useEffect(() => {
    if (proximity > 20 && prevProximityRef.current <= 20) {
      triggerAction("Gently greeted you as you arrived.");
    }
    
    if (proximity > 0 && Math.random() > 0.95) {
      const cues = Object.keys(CUE_NAMES);
      const randomCue = cues[Math.floor(Math.random() * cues.length)];
      addLogEntry(randomCue);
    }

    prevProximityRef.current = proximity;
  }, [proximity, triggerAction, addLogEntry]);

  // Social State Engine
  useEffect(() => {
    if (log.length === 0) return;
    
    const recentLog = log.slice(0, 5);
    const weights: Record<SocialState, number> = {
      friendly: 0, engaged: 0, concerned: 0, confused: 0, 
      disagreeing: 0, disengaged: 0, neutral: 0
    };

    recentLog.forEach(entry => {
      const effect = STATE_WEIGHTS[entry.cueId];
      if (effect) {
        Object.entries(effect).forEach(([state, val]) => {
          weights[state as SocialState] += (val || 0);
        });
      }
    });

    const newState = Object.entries(weights).reduce((a, b) => a[1] > b[1] ? a : b)[0] as SocialState;
    if (newState !== socialState) {
      setSocialState(newState);
      if (newState === 'concerned') {
        triggerAction("Noticed you seemed worried. I'm here for you.");
      }
    }
  }, [log, socialState, triggerAction]);

  const handleGeminiAnalysis = async () => {
    if (log.length < 3) return;
    setIsAnalyzing(true);
    const logStrings = log.map(e => `[${e.timestamp.toLocaleTimeString()}] ${e.name}`);
    const result = await analyzeInteractionLog(logStrings);
    setAiInsight(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden lg:flex-row bg-warm-bg p-4 lg:p-6 gap-6">
      {/* LEFT COLUMN: Overview & Actions */}
      <aside className="w-full lg:w-80 flex flex-col gap-6">
        <div className="minimal-panel p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-warm-clay/20 rounded-lg">
              <Heart className="text-warm-clay" size={20} />
            </div>
            <h1 className="font-serif text-xl font-bold italic">Dementia Anchor</h1>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatusIcon icon={<Shield size={14} />} label="Guard" active />
            <StatusIcon icon={<Smile size={14} />} label="Presence" active />
          </div>
        </div>

        {/* Interpretation Module */}
        <div className="minimal-panel p-6 flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 mb-4 font-mono">Current Interpretation</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif italic text-warm-ink opacity-60">Social State</span>
              <span className="px-2 py-0.5 bg-warm-accent/10 text-warm-accent text-[10px] font-bold uppercase rounded-full">
                {socialState}
              </span>
            </div>
            <p className="text-sm font-medium leading-relaxed italic text-warm-ink opacity-80">
              {getInterpretationText(socialState, proximity)}
            </p>
          </div>
        </div>

        <div className="flex-1 minimal-panel overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-warm-border">
            <h2 className="font-serif italic text-base opacity-80">Robot Gestures</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            <AnimatePresence initial={false}>
              {actions.map((action) => (
                <motion.div 
                  key={action.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-xl bg-warm-bg/50 border border-warm-border/30"
                >
                  <p className="text-[11px] font-medium leading-normal opacity-70">{action.label}</p>
                </motion.div>
              ))}
              <div ref={actionEndRef} />
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* CENTER COLUMN: Vision & Interaction */}
      <main className="flex-1 flex flex-col gap-6">
        <div className="flex-1 minimal-panel relative overflow-hidden group">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            className="h-full w-full object-cover grayscale-[30%] opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-warm-bg/10 via-transparent to-black/20 pointer-events-none" />
          
          <div className="absolute top-6 right-6 flex flex-col items-center gap-4">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={proximity}
              onChange={(e) => setProximity(parseInt(e.target.value))}
              className="vertical-slider h-48 w-1 accent-warm-accent cursor-pointer opacity-20 hover:opacity-100 transition-opacity"
            />
          </div>

          <div className="absolute bottom-6 left-6 flex gap-3">
             <div className="px-4 py-2 bg-white/60 backdrop-blur-md border border-white/40 rounded-full flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-warm-accent animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-warm-ink opacity-60">Camera Sync</span>
             </div>
          </div>
        </div>

        <button 
          onClick={handleGeminiAnalysis}
          disabled={isAnalyzing || log.length < 3}
          className="py-4 minimal-panel bg-warm-ink text-white font-serif italic text-lg hover:bg-warm-ink/90 transition-all disabled:opacity-30"
        >
          {isAnalyzing ? "Deeply Reflecting..." : "Analyze Daily Context"}
        </button>
      </main>

      {/* RIGHT COLUMN: Raw Visual Log */}
      <aside className="w-full lg:w-72 flex flex-col gap-6">
        <div className="flex-1 minimal-panel overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-warm-border flex items-center justify-between">
            <h2 className="font-serif italic text-base opacity-80">Raw Insight Log</h2>
            <Radio size={12} className="text-warm-accent animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto p-6 font-mono text-[10px] leading-relaxed custom-scrollbar bg-warm-bg/10">
            {log.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-10">
                <Activity size={32} />
                <p className="mt-2 font-serif italic">Awaiting cues</p>
              </div>
            )}
            {log.map((entry) => (
              <div key={entry.id} className="py-2 border-b border-warm-border/20 last:border-0 opacity-60 hover:opacity-100 transition-opacity">
                <span className="text-warm-accent opacity-40 mr-2">[{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className="font-bold">{entry.name}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
        
        {/* Manual Test Hub for prototype */}
        <div className="minimal-panel p-4 grid grid-cols-2 gap-2 bg-warm-clay/5">
          <ControlButton onClick={() => addLogEntry('smiling')} label="Smile" />
          <ControlButton onClick={() => addLogEntry('brows_furrowed')} label="Distress" />
          <ControlButton onClick={() => addLogEntry('wave_detected')} label="Wave" />
          <ControlButton onClick={() => addLogEntry('nod_yes')} label="Nod" />
        </div>
      </aside>

      {/* AI Insight Overlay */}
      <AnimatePresence>
        {aiInsight && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-warm-ink/20 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-white rounded-[32px] p-10 shadow-2xl border border-warm-border text-center"
            >
              <Brain className="text-warm-accent mx-auto mb-6" size={48} />
              <h3 className="font-serif text-3xl mb-4 italic">Reflective Summary</h3>
              <p className="text-xl leading-relaxed mb-8 opacity-70 italic">"{aiInsight.moodAssessment}"</p>
              <div className="p-4 bg-warm-bg rounded-2xl border border-dotted border-warm-border font-medium text-warm-ink/60 uppercase tracking-widest text-[11px]">
                NEXT STEP: {aiInsight.recommendedActivity}
              </div>
              <button onClick={() => setAiInsight(null)} className="mt-10 px-8 py-3 bg-warm-accent text-white rounded-full font-bold text-sm shadow-lg shadow-warm-accent/20 hover:scale-105 transition-transform">Done</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Helper Components & Logic ---

function getInterpretationText(state: SocialState, prox: number) {
  if (prox < 10) return "It's very quiet. Perhaps you are enjoying some peaceful alone time.";
  switch(state) {
    case 'friendly': return "You seem quite happy right now. It's lovely to see you smile.";
    case 'concerned': return "I notice you might be feeling a bit uneasy. I'm right here with you.";
    case 'engaged': return "You are very focused on what's happening. I'm paying close attention too.";
    case 'confused': return "Things might feel a bit puzzling. Take a deep breath, we can go slow.";
    case 'disengaged': return "You seem a bit distant. That's okay, I'll be here whenever you're ready.";
    default: return "Everything feels calm and steady right now.";
  }
}

function StatusIcon({ icon, label, active }: { icon: ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${active ? 'bg-warm-bg border-warm-border' : 'opacity-20'}`}>
      <div className="opacity-40">{icon}</div>
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] opacity-60">{label}</span>
    </div>
  );
}

function ControlButton({ label, onClick }: { label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="py-2 text-[10px] font-bold uppercase tracking-widest bg-white border border-warm-border rounded-lg hover:bg-warm-bg transition-colors"
    >
      {label}
    </button>
  );
}
