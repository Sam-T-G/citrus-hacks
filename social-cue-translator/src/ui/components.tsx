import { Cpu, Terminal } from 'lucide-react';

export function StatusIndicator({ error, status }: { error: string | null, status: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-[#F5F2ED] rounded-full">
      <div className={`w-2.5 h-2.5 rounded-full ${error ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
      <span className="font-mono text-[11px] uppercase tracking-wider text-[#5A5A40] font-bold">{status}</span>
    </div>
  );
}

export function LogViewer({ history }: { history: { time: string, cue: string }[] }) {
  return (
    <div className="w-full h-full bg-[#111] rounded-xl border border-white/10 font-mono text-[11px] p-4 text-green-400/80 overflow-y-auto shadow-inner">
      <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2 text-white/40">
        <Terminal size={14} />
        <span className="uppercase tracking-widest text-[9px]">Live Recognition Log</span>
      </div>
      <div className="space-y-1.5">
        {history.length === 0 && (
          <p className="opacity-30 italic">Awaiting reliable gesture input...</p>
        ) }
        {history.map((h, i) => (
          <div key={i} className="flex gap-4 border-b border-white/5 pb-1 last:border-0">
            <span className="opacity-40 shrink-0">{h.time}</span>
            <span className="text-white/90">EVENT::{h.cue.toUpperCase()}</span>
            <span className="ml-auto text-green-500/40 text-[9px]">MATCH_CONFIRMED</span>
          </div>
        ))}
        {history.length > 0 && <p className="animate-pulse pt-2">_</p>}
      </div>
    </div>
  );
}
