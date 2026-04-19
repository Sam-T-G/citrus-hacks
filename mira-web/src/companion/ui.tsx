import type { CSSProperties, ReactNode } from 'react';

// ── Owl glyph ─────────────────────────────────────────────
export function OwlGlyph({ size = 24, color = 'currentColor', breathing = false }: {
  size?: number; color?: string; breathing?: boolean;
}) {
  const eye = size * 0.085;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none"
      className={breathing ? 'c-breathe' : undefined}
      style={{ display: 'block' }}>
      <path d="M10 9 L13 5 L15 9 Z" fill={color} opacity="0.9"/>
      <path d="M25 9 L27 5 L30 9 Z" fill={color} opacity="0.9"/>
      <path d="M8 14 Q8 8 14 8 L26 8 Q32 8 32 14 L32 26 Q32 34 20 34 Q8 34 8 26 Z" fill={color}/>
      <circle cx="15" cy="19" r="3.5" fill="#FAF7F2"/>
      <circle cx="25" cy="19" r="3.5" fill="#FAF7F2"/>
      <circle cx="15" cy="19" r={eye * 1.8} fill={color}/>
      <circle cx="25" cy="19" r={eye * 1.8} fill={color}/>
      <circle cx="15.8" cy="18.3" r={eye * 0.6} fill="#FAF7F2"/>
      <circle cx="25.8" cy="18.3" r={eye * 0.6} fill="#FAF7F2"/>
      <path d="M20 22 L18 25 L22 25 Z" fill="#FAF7F2" opacity="0.9"/>
    </svg>
  );
}

// ── Heartbeat dot ─────────────────────────────────────────
export function Heartbeat({ color = 'var(--sage-deep)', size = 8 }: { color?: string; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size * 2, height: size * 2, position: 'relative' }}>
      <span style={{ position: 'absolute', width: size * 2, height: size * 2, borderRadius: '50%', background: color, opacity: 0.25, animation: 'c-heartbeat 2.4s ease-out infinite' }}/>
      <span style={{ position: 'relative', width: size, height: size, borderRadius: '50%', background: color, boxShadow: '0 0 0 2px rgba(255,255,255,0.8)' }}/>
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────
export function Card({ children, style, pad = 16, onClick }: {
  children: ReactNode; style?: CSSProperties; pad?: number; onClick?: () => void;
}) {
  return (
    <div className="c-card" onClick={onClick} style={{ padding: pad, cursor: onClick ? 'pointer' : undefined, ...style }}>
      {children}
    </div>
  );
}

// ── Owl voice pull quote ──────────────────────────────────
export function OwlQuote({ children, size = 'md', style }: {
  children: ReactNode; size?: 'sm' | 'md' | 'lg'; style?: CSSProperties;
}) {
  const fs = size === 'lg' ? 20 : size === 'sm' ? 13 : 15.5;
  return (
    <div className="c-owl-quote" style={{ fontSize: fs, ...style }}>
      <span className="c-quote-text">"{children}"</span>
      <div className="c-quote-attr">— Owl</div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────
export function SectionHeader({ kicker, children, action }: {
  kicker?: string; children: ReactNode; action?: ReactNode;
}) {
  return (
    <div className="c-section-header">
      <div>
        {kicker && <div className="c-section-kicker">{kicker}</div>}
        <div className="c-section-title">{children}</div>
      </div>
      {action}
    </div>
  );
}

// ── Pill button ───────────────────────────────────────────
type PillTone = 'default' | 'ink' | 'ghost' | 'sage' | 'clay' | 'rose';
export function Pill({ children, tone = 'default', onClick, icon, style }: {
  children: ReactNode; tone?: PillTone; onClick?: () => void; icon?: ReactNode; style?: CSSProperties;
}) {
  return (
    <button className={`c-pill c-pill-${tone}`} onClick={onClick} style={style}>
      {icon}{children}
    </button>
  );
}

// ── Image placeholder ─────────────────────────────────────
type Tint = 'sage' | 'clay' | 'rose' | 'paper';
const TINTS: Record<Tint, [string, string]> = {
  sage:  ['#DCE6D8', '#C4D4BF'],
  clay:  ['#EADFCF', '#D7C6AE'],
  rose:  ['#EBD7D0', '#D7B9AE'],
  paper: ['#EEE7D6', '#DED3BA'],
};
export function Placeholder({ w = '100%', h = 120, label = 'photo', tint = 'sage', radius = 8, style }: {
  w?: string | number; h?: number; label?: string; tint?: Tint; radius?: number; style?: CSSProperties;
}) {
  const [a, b] = TINTS[tint] ?? TINTS.paper;
  return (
    <div className="c-placeholder" style={{
      width: w, height: h, borderRadius: radius,
      background: `repeating-linear-gradient(135deg, ${a} 0 14px, ${b} 14px 28px)`,
      ...style,
    }}>
      <span>{label}</span>
    </div>
  );
}

// ── Chips ─────────────────────────────────────────────────
export function Chips({ items }: { items: string[] }) {
  return (
    <div className="c-chips">
      {items.map((t, i) => <span key={i} className="c-chip">{t}</span>)}
    </div>
  );
}

// ── Fact line ─────────────────────────────────────────────
export function FactLine({ kicker, val }: { kicker: string; val: string }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--paper-2)', borderRadius: 10 }}>
      <div className="c-eyebrow" style={{ marginBottom: 4 }}>{kicker}</div>
      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }}>{val}</div>
    </div>
  );
}
