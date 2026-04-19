import { useConversation, PHASE_LABELS, SCENARIOS, ScenarioId } from './lib/useConversation';
import { Loader2, Square, AlertTriangle, Radar, HandHelping, Sunset } from 'lucide-react';

const SCENARIO_ICONS: Record<ScenarioId, React.ReactNode> = {
  alarming:   <AlertTriangle size={18} />,
  proximity:  <Radar size={18} />,
  direct:     <HandHelping size={18} />,
  sundowning: <Sunset size={18} />,
};

const SCENARIO_ORDER: ScenarioId[] = ['alarming', 'proximity', 'direct', 'sundowning'];

export default function App() {
  const {
    response, isThinking, active, cooldownLeft, error, phase,
    trigger, stopConversation,
  } = useConversation();

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center gap-10 p-10">

      {/* Phase indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full transition-colors ${active ? 'bg-green-500 animate-pulse' : 'bg-[#5A5A40]/20'}`} />
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#5A5A40]/50 font-bold">
          {active ? PHASE_LABELS[phase] : 'Companion'}
        </p>
      </div>

      {/* Gemini response */}
      <div className="max-w-lg w-full text-center min-h-[140px] flex items-center justify-center">
        {isThinking ? (
          <Loader2 size={32} className="animate-spin text-[#5A5A40]/30" />
        ) : (
          <p className="text-3xl font-serif leading-relaxed text-[#2D2926]">
            {response || 'Select a trigger below to begin.'}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs font-mono text-red-400 max-w-md text-center">{error}</p>
      )}

      {/* Cooldown */}
      {active && !error && cooldownLeft > 0 && (
        <p className="text-[11px] font-mono text-[#5A5A40]/30 tracking-widest">
          next prompt in {cooldownLeft}s
        </p>
      )}

      {/* ── Trigger buttons ── */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {SCENARIO_ORDER.map((id) => {
          const s = SCENARIOS[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => trigger(id)}
              disabled={isThinking}
              className="flex flex-col items-start gap-1.5 p-4 rounded-2xl bg-white border border-[#E6E0D4] text-left shadow-sm hover:shadow-md hover:border-[#5A5A40]/30 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-[#5A5A40]">{SCENARIO_ICONS[id]}</span>
              <span className="text-sm font-semibold text-[#2D2926] leading-tight">{s.label}</span>
              <span className="text-[10px] text-[#5A5A40]/50 uppercase tracking-wider">{s.sublabel}</span>
            </button>
          );
        })}
      </div>

      {/* Stop */}
      {active && (
        <button
          type="button"
          onClick={stopConversation}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-[#E6E0D4] text-[#5A5A40] text-sm font-semibold shadow-sm hover:bg-[#F5F2ED] transition-all active:scale-95"
        >
          <Square size={14} />
          Stop
        </button>
      )}

      <p className="text-[11px] text-[#5A5A40]/25 text-center max-w-sm">
        Each button simulates a real sensor input — camera, proximity, call button, or time-based detection
      </p>
    </div>
  );
}
