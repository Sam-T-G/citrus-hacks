import { useRef, useEffect } from 'react';
import type { TranscriptEntry } from '../types';
import { OwlGlyph } from './ui';
import { usePatientData } from './PatientContext';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  entries:   TranscriptEntry[];
  liveUser?: string;
  active:    boolean;
}

export function LiveTranscript({ entries, liveUser, active }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { store } = usePatientData();
  const preferred = store?.patient.preferred ?? 'Patient';

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [entries, liveUser]);

  const isEmpty = entries.length === 0 && !liveUser;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: active ? 'var(--sage-deep)' : 'var(--ink-3)', marginBottom: 3 }}>
            {active ? '● Live conversation' : 'Conversation'}
          </div>
        </div>
        {entries.length > 0 && (
          <span style={{ fontFamily: 'var(--cmono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.05em' }}>
            {entries.length} message{entries.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Scrolling message area */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
        paddingRight: 4,
        scrollbarWidth: 'thin', scrollbarColor: 'var(--hair) transparent',
      }}>
        {isEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16, paddingTop: 40 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <OwlGlyph size={30} color="var(--ink-4)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.2, marginBottom: 6 }}>
                {active ? 'Mira is listening…' : 'No conversation yet.'}
              </div>
              <div style={{ fontFamily: 'var(--cmono)', fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                {active ? 'Speak and the dialogue will appear here.' : 'Start a session to begin.'}
              </div>
            </div>
          </div>
        )}

        {entries.map((e) => {
          const isMira = e.role === 'assistant';
          return (
            <div key={e.ts} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isMira ? 'flex-start' : 'flex-end',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5,
                flexDirection: isMira ? 'row' : 'row-reverse',
              }}>
                {isMira && (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <OwlGlyph size={13} color="var(--paper)" />
                  </div>
                )}
                <span style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                  {isMira ? 'Mira' : preferred}
                </span>
                <span style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.02em' }}>
                  {formatTime(e.ts)}
                </span>
              </div>
              <div style={{
                maxWidth: '80%',
                padding: isMira ? '12px 16px' : '11px 16px',
                borderRadius: isMira ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                background: isMira ? 'var(--paper-2)' : 'var(--ink)',
                color: isMira ? 'var(--ink)' : 'var(--paper)',
                border: isMira ? '0.5px solid var(--hair)' : 'none',
                fontFamily: isMira ? 'var(--cmono)' : 'var(--serif)',
                fontSize: isMira ? 13.5 : 17,
                lineHeight: 1.55,
              }}>
                {e.text}
              </div>
            </div>
          );
        })}

        {/* Live in-progress user speech */}
        {liveUser && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexDirection: 'row-reverse' }}>
              <span style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{preferred}</span>
              <span style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, color: 'var(--sage-deep)' }}>speaking…</span>
            </div>
            <div style={{
              maxWidth: '80%', padding: '11px 16px',
              borderRadius: '14px 4px 14px 14px',
              background: 'var(--paper-3)',
              border: '0.5px solid var(--hair)',
              fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.55, color: 'var(--ink)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {liveUser}
              <span style={{
                display: 'inline-block', width: 2, height: '1em',
                background: 'var(--ink)', borderRadius: 1,
                animation: 'c-blink 1s step-end infinite',
                flexShrink: 0, verticalAlign: 'middle',
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
