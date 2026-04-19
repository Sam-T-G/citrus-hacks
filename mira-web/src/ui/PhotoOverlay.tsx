/**
 * PhotoOverlay — full-screen soft display when Mira shows a memory photo.
 * Appears over the camera view; dismissed by tap or after 60s of inactivity.
 */
import { useEffect, useRef } from 'react';
import type { Memory } from '../companion/PatientContext';

const TINT_BG: Record<string, string> = {
  clay: 'oklch(0.88 0.06 55)',
  sage: 'oklch(0.88 0.05 150)',
  rose: 'oklch(0.88 0.05 25)',
  paper: 'oklch(0.92 0.01 80)',
};

interface Props {
  memory: Memory;
  onDismiss: () => void;
}

export function PhotoOverlay({ memory, onDismiss }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 60s
  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 60_000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onDismiss]);

  const bg = TINT_BG[memory.tint] ?? TINT_BG.paper;

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(26,25,21,0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'c-fadeUp 300ms ease-out',
        cursor: 'pointer',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520, maxWidth: '90vw',
          background: 'var(--paper)',
          borderRadius: 20,
          boxShadow: '0 40px 100px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(26,25,21,0.15)',
          overflow: 'hidden',
          cursor: 'default',
        }}
      >
        {/* Photo area */}
        <div style={{
          height: 320,
          background: memory.imageUrl ? 'var(--paper-3)' : bg,
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {memory.imageUrl ? (
            <img
              src={memory.imageUrl}
              alt={memory.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 56, lineHeight: 1,
                color: 'var(--ink)', opacity: 0.15, marginBottom: 16,
              }}>
                ◻
              </div>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)',
                opacity: 0.5, lineHeight: 1.3,
              }}>
                {memory.title}
              </div>
            </div>
          )}

          {/* Tag pill */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            padding: '5px 12px', borderRadius: 999,
            background: 'rgba(250,247,242,0.92)',
            fontFamily: 'var(--cmono)', fontSize: 10,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--ink-2)',
          }}>
            {memory.tag}
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            style={{
              position: 'absolute', top: 12, right: 12,
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(26,25,21,0.5)',
              color: 'var(--paper)', border: 'none',
              fontSize: 18, lineHeight: 1, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Info */}
        <div style={{ padding: '24px 28px 28px' }}>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 26, lineHeight: 1.1,
            color: 'var(--ink)', marginBottom: 10,
          }}>
            {memory.title}
          </div>
          <div style={{
            fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6,
            marginBottom: 16,
          }}>
            {memory.desc}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {memory.tags.map(t => (
              <span key={t} style={{
                padding: '4px 10px', borderRadius: 999,
                background: 'var(--paper-2)', border: '0.5px solid var(--hair)',
                fontFamily: 'var(--cmono)', fontSize: 10.5,
                letterSpacing: '0.08em', color: 'var(--ink-3)',
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
