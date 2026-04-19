import { OwlGlyph, Heartbeat, Card, OwlQuote, SectionHeader, Pill } from '../ui';
import { LiveTranscript } from '../LiveTranscript';
import { useSession } from '../../session/SessionContext';
import { usePatientData, usePronouns } from '../PatientContext';
import { cap } from '../pronouns';

const MOOD_COLORS = [
  'var(--rose-deep)', 'var(--rose)', 'var(--clay)', 'var(--sage)', 'var(--sage-deep)',
];

function currentRoutineActivity(routine: { time: string; what: string }[]): string {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let last = routine[0];
  for (const r of routine) {
    const parts = r.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!parts) continue;
    let h = parseInt(parts[1]);
    const m = parseInt(parts[2]);
    const pm = parts[3].toUpperCase() === 'PM';
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    if (h * 60 + m <= nowMins) last = r;
  }
  return last?.what ?? '';
}

function moodSummary(moods: { d: string; mood: number; note: string | null }[]): string {
  if (!moods.length) return '';
  const today = moods[moods.length - 1];
  const worst = [...moods].sort((a, b) => a.mood - b.mood)[0];
  const todayNote = today.note;
  const worstNote = worst.note && worst.d !== today.d ? `${worst.d}: ${worst.note.toLowerCase()}.` : null;
  if (worstNote && todayNote) return `${worst.d} was harder — ${worstNote} Today: ${todayNote.toLowerCase()}.`;
  if (todayNote) return `${today.d}: ${todayNote}.`;
  if (worstNote) return `${worst.d} was harder — ${worstNote}`;
  return '';
}

export function HomeScreen({ onAlert }: { onAlert: () => void }) {
  const { engineState, transcript, liveUser, sessionActive, startSession, stopSession, connectSerial, serialStatus } = useSession();
  const { store, currentCaregiver } = usePatientData();
  const pr = usePronouns();

  const stateLabel = { idle: 'Offline', connecting: 'Connecting…', listening: 'Listening', speaking: 'Speaking' }[engineState] ?? engineState;
  const stateColor = { idle: 'var(--ink-4)', connecting: 'oklch(0.6 0.12 250)', listening: 'var(--sage-deep)', speaking: 'var(--clay-deep)' }[engineState] ?? 'var(--ink-4)';

  const preferred   = store?.patient.preferred ?? '';
  const room        = store?.patient.home.split('·').pop()?.trim() ?? '';
  const firstName   = currentCaregiver?.name.split(' ')[0] ?? store?.caregivers[0]?.name.split(' ')[0] ?? '';
  const hour        = new Date().getHours();
  const tod         = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const activity    = store ? currentRoutineActivity(store.patient.routine) : '';
  const moodNote    = store ? moodSummary(store.moods) : '';
  const lastLogNote = store?.todayLog.filter(e => e.kind === 'share' || e.kind === 'topic' || e.kind === 'memory').slice(-1)[0]?.text ?? '';

  return (
    <div>
      {/* Owl presence hero */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{ position: 'relative', marginTop: 4, flexShrink: 0 }}>
          {sessionActive && (
            <div className="c-pulse-ring" style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              border: '1px solid var(--sage)', opacity: 0.35,
            }}/>
          )}
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <OwlGlyph size={44} color="var(--paper)" breathing={sessionActive}/>
          </div>
        </div>
        <div style={{ flex: 1, paddingTop: 6 }}>
          <div className="c-eyebrow" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: stateColor }} />
            <span style={{ color: stateColor }}>{stateLabel}{room ? ` · ${room}` : ''}</span>
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.05, color: 'var(--ink)', marginBottom: 6 }}>
            Good {tod}{firstName ? `, ${firstName}` : ''}.
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {sessionActive
              ? `Mira is with ${preferred} now.`
              : `Start a session to connect Mira to ${preferred}.`}
          </div>
        </div>
      </div>

      {/* Session controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {!sessionActive
          ? <Pill tone="ink" onClick={startSession}>Start session</Pill>
          : <Pill tone="rose" onClick={stopSession}>End session</Pill>
        }
        {serialStatus === 'disconnected' && (
          <Pill tone="default" onClick={connectSerial}>Connect Arduino</Pill>
        )}
        {sessionActive && <Pill tone="ghost" onClick={onAlert}>Simulate alert</Pill>}
      </div>

      {/* Live transcript — shown when session is active */}
      {sessionActive && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ height: 340, display: 'flex', flexDirection: 'column' }}>
            <LiveTranscript entries={transcript} liveUser={liveUser} active={sessionActive} />
          </div>
        </div>
      )}

      {/* Right now status card — shown when idle */}
      {!sessionActive && (
        <Card pad={0} style={{ overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ height: 120, background: 'repeating-linear-gradient(135deg, #EADFCF 0 14px, #D7C6AE 14px 28px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px 14px 0 0' }}>
            <span style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', background: 'rgba(250,247,242,0.75)', color: 'rgba(26,25,21,0.45)', padding: '3px 8px', borderRadius: 4 }}>live view · windowsill</span>
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="c-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--sage-deep)', marginBottom: 0 }}>
                <Heartbeat size={6}/> Right now
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1.2, color: 'var(--ink)', marginBottom: 8 }}>
              {activity || 'Quiet moment.'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Heart rate calm · Posture: relaxed · Ambient 68°F
            </div>
          </div>
        </Card>
      )}

      {/* Owl's journal */}
      <SectionHeader kicker="Owl's journal" action={<Pill tone="ghost">Today</Pill>}>
        {sessionActive ? 'Earlier today' : 'What I said today'}
      </SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {(store?.todayLog ?? []).map((e, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '72px 1fr', gap: 14, padding: '14px 0',
            borderBottom: i < (store?.todayLog.length ?? 0) - 1 ? '0.5px solid var(--hair-2)' : 'none',
          }}>
            <div style={{ fontFamily: 'var(--cmono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.02em', paddingTop: 2 }}>{e.t}</div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              {e.kind === 'greet' || e.kind === 'music'
                ? <span style={{ fontFamily: 'var(--cmono)', fontSize: 12.5, color: 'var(--ink)' }}>"{e.text}"</span>
                : <span>{e.text}</span>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Mood pulse */}
      <SectionHeader kicker="This week">{cap(pr.possAdj)} mood</SectionHeader>
      <Card pad={18}>
        <div className="c-mood-chart">
          {(store?.moods ?? []).map((m, i) => {
            const moods = store?.moods ?? [];
            const h = (m.mood / 5) * 54 + 6;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div className="c-mood-bar" style={{
                  height: h,
                  background: MOOD_COLORS[Math.min(4, Math.max(0, m.mood - 1))],
                  opacity: i === moods.length - 1 ? 1 : 0.55,
                }}/>
                <span style={{ fontFamily: 'var(--cmono)', fontSize: 10, color: 'var(--ink-3)' }}>{m.d}</span>
              </div>
            );
          })}
        </div>
        {moodNote && (
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 14, lineHeight: 1.55 }}>
            {moodNote}
          </div>
        )}
      </Card>

      {/* Owl quote */}
      {lastLogNote && (
        <div style={{ margin: '28px 0 8px' }}>
          <OwlQuote>{lastLogNote}</OwlQuote>
        </div>
      )}
    </div>
  );
}
