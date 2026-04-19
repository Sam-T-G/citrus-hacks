import { motion } from 'motion/react';
import { Cpu, Terminal } from 'lucide-react';

export function TabButton({ active, icon, label, onClick }: { active: boolean, icon: any, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${active ? 'bg-[#5A5A40] text-[#F5F2ED] shadow-md' : 'text-[#5A5A40]/40 hover:text-[#5A5A40]/80'}`}
    >
      {icon}
      {label}
    </button>
  );
}

export function BrailleDisplay({ cue, brailleMap }: { cue: string | null, brailleMap: Record<string, number[]> }) {
  const activeDots = cue ? brailleMap[cue] || [] : [];
  return (
    <div className="braille-grid">
      {[1, 4, 2, 5, 3, 6].map((dot) => (
        <div 
          key={dot} 
          className={`braille-dot ${activeDots.includes(dot) ? 'active' : ''}`} 
        />
      ))}
    </div>
  );
}

export function StatusIndicator({ error, status }: { error: string | null, status: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-[#F5F2ED] rounded-full">
      <div className={`w-2.5 h-2.5 rounded-full ${error ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
      <span className="font-mono text-[11px] uppercase tracking-wider text-[#5A5A40] font-bold">{status}</span>
    </div>
  );
}

export function CodePreview() {
  const code = `#include <iostream>
#include <vector>
#include <cmath>

class SocialCueDetector {
public:
    std::string process(const LandMesh& face, const Pose& pose) {
        if (detect_smile(face)) return "smiling";
        if (detect_nod(pose)) return "nod_yes";
        return "neutral";
    }
};`;

  return (
    <div className="w-full h-full max-w-4xl bg-[#111] rounded-xl border border-white/10 overflow-hidden flex flex-col font-mono text-xs">
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        </div>
        <span className="opacity-40 text-[9px] uppercase tracking-widest pl-2">cv_module.cpp — production-ready</span>
      </div>
      <div className="p-6 overflow-y-auto text-white/70 leading-relaxed italic">
        <pre className="not-italic text-yellow-400/90">{code}</pre>
        <div className="mt-8 p-4 bg-yellow-400/10 border border-yellow-400/20 rounded text-[11px] text-yellow-400">
          <p className="font-bold mb-1 uppercase tracking-widest flex items-center gap-2">
            <Cpu size={14} /> Engineer's Note
          </p>
          <p>
            The production build utilizes SIMD-accelerated calculations for gesture detection. 
          </p>
        </div>
      </div>
    </div>
  );
}

export function LogViewer({ history }: { history: any[] }) {
  return (
    <div className="w-full h-full max-w-2xl bg-[#000] rounded-xl border border-white/10 font-mono text-[11px] p-6 text-green-400/80 overflow-y-auto">
      <div className="space-y-1">
        <p className="opacity-50"># System Boot Sequence Initiated...</p>
        <p className="opacity-50"># Loading Mediapipe Wasm Engine [OK]</p>
        {history.map((h, i) => (
          <p key={i}>[{h.time}] EVENT_EMIT: Type={h.cue.toUpperCase()} Status=TRANSMITTED</p>
        ))}
        <p className="animate-pulse">_</p>
      </div>
    </div>
  );
}
