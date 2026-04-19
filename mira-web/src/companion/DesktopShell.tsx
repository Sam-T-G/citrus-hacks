import { useState, useEffect } from 'react';
import { OwlGlyph, OwlQuote, Card, SectionHeader, Pill, Placeholder, Chips } from './ui';
import { usePatientData, usePronouns } from './PatientContext';
import { cap } from './pronouns';
import { useSession } from '../session/SessionContext';
import { ProfileEditModal } from './ProfileEditModal';
import { CameraPreview } from '../ui/CameraPreview';
import { LiveTranscript } from './LiveTranscript';
import { SessionLog } from '../ui/SessionLog';
import { logService } from '../services/LogService';
import { notificationService } from '../services/NotificationService';
import type { InAppNotif } from '../services/NotificationService';
import type { SessionEvent, ConversationTurnData } from '../types';
import type { VisionPipeline } from '../vision/VisionPipeline';

type DesktopNav = 'today' | 'profile' | 'memories' | 'voices' | 'team';

const MOOD_COLORS = [
  'var(--rose-deep)', 'var(--rose)', 'var(--clay)', 'var(--sage)', 'var(--sage-deep)',
];

/* ── Sidebar ─────────────────────────────────────────────── */
function Sidebar({ nav, onNav, onAlert }: { nav: DesktopNav; onNav: (n: DesktopNav) => void; onAlert: () => void }) {
  const { store } = usePatientData();
  const pr = usePronouns();
  const { alerts } = useSession();
  const [notifs, setNotifs] = useState<InAppNotif[]>([]);
  useEffect(() => notificationService.subscribe(setNotifs), []);

  const highAlerts    = alerts.filter(a => a.severity === 'high').length;
  const mediumAlerts  = alerts.filter(a => a.severity === 'medium').length;
  const alertCount    = highAlerts + mediumAlerts;
  const pendingNotifs = notifs.filter(n => !n.acknowledged).length;
  type NavItem = { id: DesktopNav; label: string; hint: string };
  const items: NavItem[] = [
    { id: 'today',    label: 'Today',       hint: "What's happening now" },
    { id: 'profile',  label: store?.patient.preferred ?? 'Patient', hint: `${cap(pr.possAdj)} story & routine` },
    { id: 'memories', label: 'Memories',    hint: 'Photos, video, audio' },
    { id: 'voices',   label: 'Voices',      hint: 'Family recordings' },
    { id: 'team',     label: 'Care team',   hint: 'People & settings' },
  ];

  const patientName = store ? `${store.patient.preferred} ${store.patient.last}` : '…';
  const room = store?.patient.home.split('·')[1]?.trim() ?? '';

  return (
    <div className="d-sidebar">
      {/* Patient card */}
      <div className="d-sidebar-patient">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Placeholder w={40} h={40} tint="clay" label="" radius={20} />
          <div>
            <div className="c-eyebrow" style={{ marginBottom: 2 }}>With</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1, color: 'var(--ink)' }}>{patientName}</div>
          </div>
        </div>
        <div className="d-online-badge">
          <span className="d-heartbeat-dot" />
          <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500 }}>Owl online{room ? ` · ${room}` : ''}</span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: '14px 10px', flex: 1 }}>
        <div className="c-eyebrow" style={{ padding: '0 10px 8px' }}>Navigate</div>
        {items.map(it => {
          const active = nav === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onNav(it.id)}
              className={`d-nav-item${active ? ' active' : ''}`}
            >
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em' }}>{it.label}</div>
                <div style={{ fontSize: 10.5, marginTop: 1, letterSpacing: '-0.005em', opacity: active ? 0.55 : 0.7 }}>{it.hint}</div>
              </div>
              {it.id === 'today' && (
                <span className={`d-live-badge${active ? ' active' : ''}`}>LIVE</span>
              )}
              {it.id === 'team' && pendingNotifs > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 9, background: 'var(--rose-deep)',
                  color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: '0 5px', fontFamily: 'var(--csans)',
                }}>{pendingNotifs}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Caregivers on now */}
      <div className="d-sidebar-footer">
        <div className="c-eyebrow" style={{ marginBottom: 10 }}>On now</div>
        {(store?.caregivers ?? []).filter(c => c.online).map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
              <Placeholder w={22} h={22} tint={c.tint as 'clay' | 'sage' | 'rose' | 'paper'} label="" radius={11} />
              <span className="d-online-dot" />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.2 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{c.role}</div>
            </div>
          </div>
        ))}
        <button onClick={onAlert} className={`d-alert-preview-btn${highAlerts > 0 ? ' d-alert-preview-btn--active' : ''}`}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: highAlerts > 0 ? 'var(--rose-deep)' : mediumAlerts > 0 ? 'var(--clay-deep)' : 'var(--ink-4)',
          }} />
          {alertCount > 0 ? `${alertCount} alert${alertCount > 1 ? 's' : ''} active` : 'Alerts'}
          {alertCount > 0 && (
            <span style={{
              marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9,
              background: highAlerts > 0 ? 'var(--rose-deep)' : 'var(--clay-deep)',
              color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: '0 4px',
            }}>
              {alertCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── State pill colours ──────────────────────────────────── */
const STATE_LABEL: Record<string, string> = {
  idle: 'Mira offline', connecting: 'Connecting…',
  listening: 'Listening', speaking: 'Speaking',
};
const STATE_COLOR: Record<string, string> = {
  idle: 'var(--ink-4)', connecting: 'oklch(0.6 0.12 250)',
  listening: 'var(--sage-deep)', speaking: 'var(--clay-deep)',
};

/* ── Today (3-pane) ──────────────────────────────────────── */
function DesktopToday({ onAlert }: { onAlert: () => void }) {
  const {
    engineState, transcript, liveUser, lastCmd, serialStatus,
    sessionActive, engineRef, startSession, stopSession, connectSerial, connectBridge, errorMsg, clearError,
  } = useSession();
  const { store, currentCaregiver } = usePatientData();
  const pr = usePronouns();

  // engineRef is a ref — changes to it don't trigger re-renders.
  // Sync visionPipeline into state so CameraPreview gets the live instance after session starts.
  const [visionPipeline, setVisionPipeline] = useState<VisionPipeline | null>(null);
  useEffect(() => {
    setVisionPipeline(sessionActive ? (engineRef.current?.visionPipeline ?? null) : null);
  }, [sessionActive, engineRef]);

  const [logEvents, setLogEvents] = useState<SessionEvent[]>([]);
  useEffect(() => logService.subscribe(setLogEvents), []);

  const lastMiraQuote = logEvents
    .filter(e => e.type === 'conversation_turn' && (e.data as ConversationTurnData).role === 'assistant')
    .slice(-1)[0];
  const lastQuoteText = lastMiraQuote ? (lastMiraQuote.data as ConversationTurnData).text : '';

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const hour = now.getHours();
  const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const firstName = currentCaregiver?.name.split(' ')[0] ?? store?.caregivers[0]?.name.split(' ')[0] ?? 'Caregiver';
  const patientPreferred = store?.patient.preferred ?? 'Nana';

  const stateColor = STATE_COLOR[engineState] ?? 'var(--ink-4)';

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* Left — camera + session controls */}
      <div className="d-panel" style={{ width: 360, flexShrink: 0, borderRight: '0.5px solid var(--hair)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="c-eyebrow" style={{ marginBottom: 0 }}>Right now · {timeStr}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: stateColor }} />
            <span style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: stateColor }}>
              {STATE_LABEL[engineState]}
            </span>
          </div>
        </div>

        {/* Camera preview */}
        <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 18, background: 'var(--paper-3)' }}>
          <CameraPreview
            camera={engineRef.current?.cameraCapture ?? null}
            vision={visionPipeline}
            lastCmd={lastCmd}
            active={sessionActive}
            engineState={engineState}
          />
        </div>

        {/* Owl identity */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <OwlGlyph size={30} color="var(--paper)" breathing={sessionActive} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.2, color: 'var(--ink)' }}>
              {sessionActive ? `Mira is with ${patientPreferred}.` : 'Mira is offline.'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 }}>
              {sessionActive
                ? `${store?.patient.home.split('·').pop()?.trim() ?? 'Room'} · Listening actively.`
                : 'Start a session to connect the owl.'}
            </div>
          </div>
        </div>

        {/* Session controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {!sessionActive
            ? <Pill tone="ink" onClick={startSession} style={{ justifyContent: 'center', padding: '11px 14px' }}>
                Start session
              </Pill>
            : <Pill tone="rose" onClick={stopSession} style={{ justifyContent: 'center', padding: '11px 14px' }}>
                End session
              </Pill>
          }
          {serialStatus === 'disconnected' && (<>
            <Pill tone="default" onClick={connectSerial} style={{ justifyContent: 'center' }}>
              Connect Serial
            </Pill>
            <Pill tone="default" onClick={connectBridge} style={{ justifyContent: 'center' }}>
              Connect Bridge
            </Pill>
          </>)}
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 12px', borderRadius: 10, background: 'oklch(0.94 0.04 25)',
            fontSize: 12, color: 'var(--rose-deep)', lineHeight: 1.5, marginBottom: 16,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
          }}>
            <span>{errorMsg}</span>
            <button onClick={clearError} style={{ color: 'var(--rose-deep)', fontSize: 14, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}>×</button>
          </div>
        )}

        <div className="c-eyebrow" style={{ marginBottom: 10 }}>Sensors</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { l: 'Heart', v: '72', u: 'bpm', tone: 'sage' },
            { l: 'Voice', v: 'calm', tone: 'sage' },
            { l: 'Motion', v: 'still', tone: 'sage' },
            { l: 'Ambient', v: '68°', tone: 'default' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '10px 12px', borderRadius: 10,
              background: s.tone === 'sage' ? 'oklch(0.96 0.02 150)' : 'var(--paper-2)',
            }}>
              <div className="c-eyebrow" style={{ marginBottom: 4 }}>{s.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: s.tone === 'sage' ? 'var(--sage-deep)' : 'var(--ink)', lineHeight: 1 }}>{s.v}</span>
                {s.u && <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{s.u}</span>}
              </div>
            </div>
          ))}
        </div>

        <button onClick={onAlert} style={{
          marginTop: 16, width: '100%', padding: '10px 12px', borderRadius: 10,
          background: 'oklch(0.96 0.03 25)', color: 'var(--rose-deep)',
          border: '0.5px solid oklch(0.85 0.08 25)', fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--csans)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--rose-deep)' }} />
          Preview a distress alert
        </button>
      </div>

      {/* Center — live transcript + historical journal */}
      <div className="d-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header — always visible */}
        <div style={{ marginBottom: 20, flexShrink: 0 }}>
          <div className="c-eyebrow" style={{ marginBottom: 6 }}>{dateStr}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 32, lineHeight: 1, color: 'var(--ink)', marginBottom: 6 }}>
            Good {tod}, {firstName}.
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {sessionActive
              ? `Mira is with ${patientPreferred} now — conversation is live.`
              : 'Here is what Mira said today.'}
          </div>
        </div>

        {/* Live transcript — fills remaining space when active */}
        {sessionActive ? (
          <LiveTranscript
            entries={transcript}
            liveUser={liveUser}
            active={sessionActive}
          />
        ) : (
          /* Idle: show real session log timeline */
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="c-eyebrow" style={{ marginBottom: 16 }}>Today's session log</div>
            {logEvents.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                No events logged yet. Start a session to begin.
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 12 }}>
                <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 1, background: 'var(--hair)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {[...logEvents].reverse().map((e) => {
                    const time = new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    let label = '';
                    let body: React.ReactNode = null;
                    let dotColor = 'var(--ink-3)';

                    if (e.type === 'conversation_turn') {
                      const d = e.data as ConversationTurnData;
                      label = d.role === 'assistant' ? 'Mira' : 'Patient';
                      const snippet = d.text.length > 140 ? d.text.slice(0, 137) + '…' : d.text;
                      body = <div style={{ fontStyle: 'italic', color: 'var(--ink)', fontSize: 14, lineHeight: 1.5 }}>"{snippet}"</div>;
                    } else if (e.type === 'mood_observation') {
                      label = 'Mood observed';
                      dotColor = 'var(--sage-deep)';
                      const d = e.data as { mood: string; intensity: string; notes?: string };
                      body = <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{d.mood} · {d.intensity}{d.notes ? ` — ${d.notes}` : ''}</div>;
                    } else if (e.type === 'behavior_event') {
                      label = 'Behaviour';
                      dotColor = 'var(--clay-deep)';
                      const d = e.data as { event_type: string; notes: string };
                      body = <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{d.event_type.replace(/_/g, ' ')}{d.notes ? ` — ${d.notes}` : ''}</div>;
                    } else if (e.type === 'caregiver_alert') {
                      label = 'Alert';
                      dotColor = 'var(--rose-deep)';
                      const d = e.data as { severity: string; reason: string };
                      body = <div style={{ fontSize: 13, color: 'var(--rose-deep)', lineHeight: 1.5 }}>{d.severity.toUpperCase()} — {d.reason}</div>;
                    } else if (e.type === 'visual_observation') {
                      label = 'Visual check';
                      dotColor = 'oklch(0.65 0.12 150)';
                      const d = e.data as { emotion_hint: string; description: string };
                      body = <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{d.emotion_hint} — {d.description}</div>;
                    } else if (e.type === 'session_start' || e.type === 'session_end') {
                      label = e.type === 'session_start' ? 'Session started' : 'Session ended';
                      body = null;
                    } else {
                      return null;
                    }

                    return (
                      <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 16, alignItems: 'flex-start', position: 'relative' }}>
                        <div style={{
                          position: 'absolute', left: -16, top: 5, width: 8, height: 8,
                          borderRadius: '50%', background: 'var(--paper)', border: `1.5px solid ${dotColor}`,
                        }} />
                        <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.02em', paddingTop: 3 }}>{time}</div>
                        <div>
                          <div className="c-eyebrow" style={{ marginBottom: 3, color: dotColor }}>{label}</div>
                          {body}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {lastQuoteText && (
              <div style={{ marginTop: 36, paddingTop: 24, borderTop: '0.5px solid var(--hair)' }}>
                <OwlQuote size="lg">{lastQuoteText.length > 200 ? lastQuoteText.slice(0, 197) + '…' : lastQuoteText}</OwlQuote>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right — mood + upcoming + quick send */}
      <div className="d-panel" style={{ width: 260, flexShrink: 0, borderLeft: '0.5px solid var(--hair)', background: 'var(--paper-2)', overflowY: 'auto' }}>
        <div className="c-eyebrow" style={{ marginBottom: 14 }}>This week</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', marginBottom: 16 }}>{cap(pr.possAdj)} mood</div>

        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
            {(store?.moods ?? []).map((m, i) => {
              const moods = store?.moods ?? [];
              const h = (m.mood / 5) * 68 + 8;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: '100%', height: h, borderRadius: 4,
                    background: MOOD_COLORS[Math.min(4, Math.max(0, m.mood - 1))],
                    opacity: i === moods.length - 1 ? 1 : 0.5,
                  }} />
                  <span style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, color: 'var(--ink-3)' }}>{m.d}</span>
                </div>
              );
            })}
          </div>
          {(() => {
            const moods = store?.moods ?? [];
            const today = moods[moods.length - 1];
            const worst = [...moods].sort((a, b) => a.mood - b.mood)[0];
            const parts: string[] = [];
            if (worst && worst.note && worst.d !== today?.d) parts.push(`${worst.d} was harder — ${worst.note.toLowerCase()}.`);
            if (today?.note) parts.push(`Today: ${today.note.toLowerCase()}.`);
            return parts.length ? (
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 12, lineHeight: 1.5 }}>
                {parts.join(' ')}
              </div>
            ) : null;
          })()}
        </Card>

        <div className="c-eyebrow" style={{ marginTop: 28, marginBottom: 12 }}>Coming up</div>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {(store?.patient.routine ?? []).slice(2, 6).map((r, i) => (
            <div key={i} style={{
              padding: '12px 14px', display: 'grid', gridTemplateColumns: '66px 1fr', gap: 10,
              borderTop: i > 0 ? '0.5px solid var(--hair-2)' : 'none',
            }}>
              <div style={{ fontFamily: 'var(--cmono)', fontSize: 11, color: 'var(--ink-3)' }}>{r.time}</div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{r.what}</div>
                {r.owl && <div style={{ fontFamily: 'var(--cmono)', fontSize: 11, color: 'var(--sage-deep)', marginTop: 3 }}>"{r.owl}"</div>}
              </div>
            </div>
          ))}
        </Card>

        <div className="c-eyebrow" style={{ marginTop: 28, marginBottom: 12 }}>Quick send</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(store?.memories ?? []).slice(0, 4).map(m => (
            <button key={m.id} style={{
              padding: 0, borderRadius: 8, overflow: 'hidden',
              border: '0.5px solid var(--hair-2)', background: 'var(--paper)', textAlign: 'left', cursor: 'pointer',
            }}>
              <Placeholder h={60} tint={m.tint as 'clay' | 'sage' | 'rose' | 'paper'} label={m.kind} radius={0} />
              <div style={{ padding: '7px 9px' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.2 }}>{m.title}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="c-eyebrow" style={{ marginTop: 28, marginBottom: 12 }}>Live care log</div>
        <SessionLog />
      </div>
    </div>
  );
}

/* ── Profile (2-col) ─────────────────────────────────────── */
function DesktopProfile() {
  const { store, saving, updateStore } = usePatientData();
  const pr = usePronouns();
  const [editing, setEditing] = useState(false);
  if (!store) return null;
  const p = store.patient;
  return (
    <div className="d-panel" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
      {editing && (
        <ProfileEditModal
          store={store}
          saving={saving}
          onSave={updateStore}
          onClose={() => setEditing(false)}
        />
      )}
      <div style={{ marginBottom: 28 }}>
        <div className="c-eyebrow" style={{ marginBottom: 6 }}>{cap(pr.possAdj)} story</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{p.preferred}.</div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.5 }}>
          Who {p.preferred} is — before what's wrong. The owl uses everything here to keep {pr.obj} company.
        </div>
        <div style={{ marginTop: 14 }}><Pill tone="ghost" onClick={() => setEditing(true)}>Edit profile</Pill></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 32, alignItems: 'flex-start' }}>
        {/* Left — portrait + facts */}
        <div>
          <div style={{ position: 'relative' }}>
            <Placeholder h={340} tint="clay" label="portrait · 2023" radius={14} />
            <div style={{
              position: 'absolute', left: 14, bottom: 14, background: 'rgba(250,247,242,0.92)',
              padding: '8px 12px', borderRadius: 10, backdropFilter: 'blur(6px)', border: '0.5px solid var(--hair)',
            }}>
              <div className="c-eyebrow" style={{ marginBottom: 2 }}>Call {pr.obj}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1, color: 'var(--ink)' }}>{p.preferred}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
            {[
              { k: 'Born', v: p.birth },
              { k: 'Stage', v: p.stage },
              { k: 'Home', v: p.home },
              { k: 'Diagnosed', v: p.diagnosed },
            ].map((f, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--paper-2)', borderRadius: 10 }}>
                <div className="c-eyebrow" style={{ marginBottom: 4 }}>{f.k}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }}>{f.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — likes, topics, calmers */}
        <div>
          <SectionHeader kicker={`What ${pr.subj} loves`}>A few things</SectionHeader>
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {p.likes.map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--clay-deep)', fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 0.5 }}>·</span>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <Card pad={16}>
              <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sage-deep)', marginBottom: 8 }}>Calms {pr.obj}</div>
              {p.calmers.map((l, i) => <div key={i} style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4, marginBottom: 4 }}>· {l}</div>)}
            </Card>
            <Card pad={16}>
              <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--rose-deep)', marginBottom: 8 }}>Gently avoid</div>
              {p.triggers.map((l, i) => <div key={i} style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4, marginBottom: 4 }}>· {l}</div>)}
            </Card>
          </div>

          <SectionHeader kicker="For the owl">{`Topics ${pr.subj} loves`}</SectionHeader>
          <Card pad={0}>
            {store.topics.map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderTop: i > 0 ? '0.5px solid var(--hair-2)' : 'none',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: t.warm ? 'var(--clay)' : 'var(--rose)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{t.primer}</div>
                </div>
                {!t.warm && <span style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--rose-deep)' }}>handle gently</span>}
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Bottom: routine + family */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 36 }}>
        <div>
          <SectionHeader kicker="Daily shape" action={<Pill tone="ghost">Edit</Pill>}>{cap(pr.possAdj)} routine</SectionHeader>
          {p.routine.map((r, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr', gap: 14, padding: '12px 0',
              borderBottom: i < p.routine.length - 1 ? '0.5px solid var(--hair-2)' : 'none',
            }}>
              <div style={{ fontFamily: 'var(--cmono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.02em' }}>{r.time}</div>
              <div>
                <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{r.what}</div>
                {r.owl && <div style={{ fontFamily: 'var(--cmono)', fontSize: 11.5, color: 'var(--sage-deep)', marginTop: 3 }}>"{r.owl}"</div>}
              </div>
            </div>
          ))}
        </div>
        <div>
          <SectionHeader kicker="Her people" action={<Pill tone="ghost">+ Add</Pill>}>Family</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {store.people.map(pr => (
              <Card key={pr.id} pad={12}>
                <Placeholder h={80} tint={pr.tint as 'clay' | 'sage' | 'rose' | 'paper'} label={pr.name.split(' ')[0].toLowerCase()} radius={8} />
                <div className="c-eyebrow" style={{ marginTop: 10, marginBottom: 2 }}>{pr.rel}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{pr.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.4 }}>{pr.note}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Memories (master-detail) ────────────────────────────── */
function DesktopMemories() {
  const { store } = usePatientData();
  const memories = store?.memories ?? [];
  const [selectedId, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video' | 'audio'>('all');
  const items = memories.filter(m => filter === 'all' || m.kind === filter);
  const activeId = selectedId ?? memories[0]?.id ?? null;
  const selected = memories.find(m => m.id === activeId) ?? memories[0] ?? null;

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* Grid */}
      <div className="d-panel" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="c-eyebrow" style={{ marginBottom: 6 }}>Library · {memories.length} items</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 10 }}>Memories.</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Pill tone="ghost">Import</Pill>
            <Pill tone="ink" icon={<span style={{ fontSize: 14 }}>+</span>}>New memory</Pill>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {(['all', 'photo', 'video', 'audio'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontSize: 12, padding: '7px 14px', borderRadius: 999, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: filter === f ? 'var(--ink)' : 'var(--paper-2)',
              color: filter === f ? 'var(--paper)' : 'var(--ink-2)',
              fontFamily: 'var(--csans)',
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {items.map(m => {
            const active = m.id === selectedId;
            return (
              <button key={m.id} onClick={() => setSelected(m.id)} style={{
                padding: 0, borderRadius: 14, overflow: 'hidden', textAlign: 'left', cursor: 'pointer',
                background: active ? '#FFFDF8' : 'var(--paper)',
                border: active ? '1.5px solid var(--ink)' : '0.5px solid var(--hair)',
                boxShadow: active ? '0 6px 18px rgba(26,25,21,0.1)' : '0 1px 2px rgba(26,25,21,0.04)',
                transition: 'all 140ms',
              }}>
                <div style={{ position: 'relative' }}>
                  <Placeholder h={140} tint={m.tint as 'clay' | 'sage' | 'rose' | 'paper'} label={m.kind} radius={0} />
                  {'duration' in m && m.kind !== 'photo' && (
                    <div style={{
                      position: 'absolute', left: 10, bottom: 10, background: 'rgba(26,25,21,0.78)',
                      padding: '3px 8px', borderRadius: 4, fontFamily: 'var(--cmono)', fontSize: 10, color: 'var(--paper)',
                    }}>
                      {m.kind === 'audio' ? '♪' : '▶'} {(m as { duration: string }).duration}
                    </div>
                  )}
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)', lineHeight: 1.15 }}>{m.title}</div>
                  <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 4 }}>
                    {m.tag} · {m.plays} plays
                  </div>
                  <div style={{ marginTop: 8 }}><Chips items={m.tags.slice(0, 3)} /></div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail pane */}
      <div className="d-panel" style={{ width: 360, flexShrink: 0, borderLeft: '0.5px solid var(--hair)', background: 'var(--paper-2)', overflowY: 'auto', padding: 0 }}>
        {!selected ? null : (<>
        <div style={{ position: 'relative' }}>
          <Placeholder h={240} tint={selected.tint as 'clay' | 'sage' | 'rose' | 'paper'} label={selected.kind} radius={0} />
          {selected.kind !== 'photo' && (
            <button style={{
              position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
              width: 60, height: 60, borderRadius: '50%', background: 'rgba(250,247,242,0.95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: 'none', cursor: 'pointer',
            }}>
              <svg width="18" height="20" viewBox="0 0 18 20"><path d="M2 1 L17 10 L2 19 Z" fill="var(--ink)" /></svg>
            </button>
          )}
        </div>
        <div style={{ padding: '24px 24px 32px' }}>
          <div className="c-eyebrow" style={{ marginBottom: 6 }}>{selected.tag}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 26, lineHeight: 1.1, color: 'var(--ink)', marginBottom: 12 }}>{selected.title}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>{selected.desc}</div>

          <div className="c-eyebrow" style={{ marginTop: 20, marginBottom: 8 }}>Tags</div>
          <Chips items={selected.tags} />

          <div style={{ marginTop: 20, padding: 14, background: 'var(--paper)', borderRadius: 10, border: '0.5px solid var(--hair-2)' }}>
            <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sage-deep)', marginBottom: 6 }}>Owl's note</div>
            <div style={{ fontFamily: 'var(--cmono)', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              "{selected.desc || 'She was still for a long time, then smiled.'}"
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
            <Pill tone="ink" style={{ justifyContent: 'center' }}>Send to owl now</Pill>
            <Pill tone="default" style={{ justifyContent: 'center' }}>Edit details</Pill>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 20 }}>
            <div style={{ padding: '10px 12px', background: 'var(--paper)', borderRadius: 8 }}>
              <div className="c-eyebrow" style={{ marginBottom: 4 }}>Played</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>{selected.plays}×</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--paper)', borderRadius: 8 }}>
              <div className="c-eyebrow" style={{ marginBottom: 4 }}>Last shown</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>{selected.id === 'm1' ? 'Tuesday' : '3 days ago'}</div>
            </div>
          </div>
        </div>
        </>)}
      </div>
    </div>
  );
}

/* ── Voices ──────────────────────────────────────────────── */
function DesktopVoices() {
  const { store } = usePatientData();
  const [playing, setPlaying] = useState<string | null>('v2');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <div className="d-panel" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ marginBottom: 28 }}>
          <div className="c-eyebrow" style={{ marginBottom: 6 }}>Voices of her people</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 8 }}>Voices.</div>
          <OwlQuote size="sm">When she can't place my voice, yours still lands.</OwlQuote>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(store?.voices ?? []).map(v => {
            const on = playing === v.id;
            return (
              <div key={v.id} style={{
                padding: 18, background: '#FFFDF8', borderRadius: 14,
                border: on ? '1px solid var(--ink)' : '0.5px solid var(--hair)',
                display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 18, alignItems: 'center',
              }}>
                <button onClick={() => setPlaying(on ? null : v.id)} style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: on ? 'var(--ink)' : 'var(--paper-2)',
                  color: on ? 'var(--paper)' : 'var(--ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer',
                }}>
                  {on
                    ? <svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="1" width="3.5" height="12" rx="0.5" fill="currentColor" /><rect x="8.5" y="1" width="3.5" height="12" rx="0.5" fill="currentColor" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 1 L12 7 L2 13 Z" fill="currentColor" /></svg>
                  }
                </button>
                <div>
                  <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>
                    {v.person} · <span style={{ color: 'var(--sage-deep)' }}>Used in {v.usedIn}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)', lineHeight: 1.1, marginBottom: 10 }}>{v.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 28 }}>
                    {v.waves.map((h, i) => (
                      <div key={i} style={{
                        flex: 1, height: `${h * 10}%`, minHeight: 3, borderRadius: 1,
                        background: on && i < v.waves.length * 0.45 ? 'var(--ink)' : 'var(--ink-4)',
                        opacity: on ? 1 : 0.5,
                      }} />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <span style={{ fontFamily: 'var(--cmono)', fontSize: 12, color: 'var(--ink-3)' }}>{v.duration}</span>
                  <button style={{ fontSize: 11, fontFamily: 'var(--cmono)', letterSpacing: '0.05em', color: 'var(--sage-deep)', border: 'none', background: 'none', cursor: 'pointer' }}>
                    Send to owl →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <SectionHeader kicker="Voice archive">Archived recordings</SectionHeader>
        <Card pad={20}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="var(--clay-deep)" strokeWidth="1.3" fill="none" /><path d="M10 5v5l3 3" stroke="var(--clay-deep)" strokeWidth="1.3" fill="none" strokeLinecap="round" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)', lineHeight: 1.15 }}>Archive recordings</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>From voicemails and old recordings</div>
            </div>
            <Pill tone="ink">Review</Pill>
          </div>
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'oklch(0.94 0.04 25)', borderRadius: 10, fontSize: 13, color: 'var(--rose-deep)', lineHeight: 1.5 }}>
            The owl will <strong>never impersonate</strong> loved ones who have passed. These recordings play as themselves — real voices, real words.
          </div>
        </Card>
      </div>

      {/* Record pane */}
      <div style={{ width: 340, flexShrink: 0, background: 'var(--ink)', padding: 32, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,242,0.55)', marginBottom: 12 }}>Record a voice</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.1, color: 'var(--paper)', marginBottom: 28 }}>Say something simple.</div>

        <div style={{
          width: '100%', aspectRatio: '1/1', borderRadius: 14,
          background: 'rgba(250,247,242,0.05)', border: '0.5px solid rgba(250,247,242,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 22,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 80 }}>
            {Array.from({ length: 22 }).map((_, i) => (
              <div key={i} style={{
                width: 4, height: recording ? Math.sin(i * 0.5) * 36 + 40 : 12,
                borderRadius: 2, background: recording ? 'var(--paper)' : 'rgba(250,247,242,0.3)', transition: 'height 220ms',
              }} />
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontFamily: 'var(--cmono)', fontSize: 14, color: 'var(--paper)', marginBottom: 22 }}>
          {mm}:{ss}
        </div>

        <button onClick={() => { setRecording(!recording); if (!recording) setSeconds(0); }} style={{
          width: '100%', padding: 14, borderRadius: 12,
          background: recording ? 'var(--rose)' : 'var(--paper)',
          color: recording ? 'var(--paper)' : 'var(--ink)',
          fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          border: 'none', cursor: 'pointer', fontFamily: 'var(--csans)',
        }}>
          <span style={{ width: 10, height: 10, borderRadius: recording ? 2 : '50%', background: recording ? 'var(--paper)' : 'var(--rose)' }} />
          {recording ? 'Stop recording' : 'Start recording'}
        </button>

        <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: 'rgba(250,247,242,0.06)', border: '0.5px solid rgba(250,247,242,0.1)' }}>
          <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,242,0.55)', marginBottom: 8 }}>Try saying</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.35, color: 'var(--paper)' }}>
            "Hi {store?.patient.preferred ?? 'sweetheart'}, it's me. I'm thinking of you today."
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Caregiver edit modal ────────────────────────────────── */
const TINT_OPTIONS = ['clay', 'sage', 'rose', 'paper'] as const;
type TintOption = typeof TINT_OPTIONS[number];

function CaregiverEditModal({ caregiver, saving, onSave, onDelete, onClose }: {
  caregiver: import('./PatientContext').Caregiver | null; // null = new
  saving: boolean;
  onSave:   (c: import('./PatientContext').Caregiver) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose:  () => void;
}) {
  const isNew = caregiver === null;
  const [form, setForm] = useState({
    id:     caregiver?.id     ?? `cg_${Date.now()}`,
    name:   caregiver?.name   ?? '',
    role:   caregiver?.role   ?? '',
    online: caregiver?.online ?? false,
    tint:   (caregiver?.tint  ?? 'clay') as TintOption,
  });

  const INPUT: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
    border: '0.5px solid var(--hair)', background: 'var(--paper)',
    color: 'var(--ink)', fontFamily: 'var(--csans)', outline: 'none', boxSizing: 'border-box',
  };
  const LABEL: React.CSSProperties = {
    fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: 5,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(26,25,21,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 440, background: 'var(--paper)', borderRadius: 18, boxShadow: '0 30px 80px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(26,25,21,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '0.5px solid var(--hair)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)' }}>{isNew ? 'Add person' : 'Edit caregiver'}</div>
          <button onClick={onClose} style={{ color: 'var(--ink-3)', fontSize: 22, lineHeight: 1, border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '24px 24px 8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
            <div>
              <label style={LABEL}>Full name</label>
              <input style={INPUT} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={LABEL}>Role</label>
              <input style={INPUT} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={LABEL}>Avatar colour</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {TINT_OPTIONS.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tint: t }))} style={{
                    width: 28, height: 28, borderRadius: '50%', border: form.tint === t ? '2.5px solid var(--ink)' : '2px solid transparent',
                    background: `var(--${t})`, cursor: 'pointer', padding: 0,
                  }} />
                ))}
              </div>
            </div>
            <div>
              <label style={LABEL}>Status</label>
              <button onClick={() => setForm(f => ({ ...f, online: !f.online }))} style={{
                marginTop: 6, padding: '8px 14px', borderRadius: 8, border: '0.5px solid var(--hair)',
                background: form.online ? 'var(--sage-deep)' : 'var(--paper-2)', cursor: 'pointer',
                color: form.online ? '#fff' : 'var(--ink-2)', fontFamily: 'var(--csans)', fontSize: 13,
              }}>
                {form.online ? 'On now' : 'Not on shift'}
              </button>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '0.5px solid var(--hair)', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <div>
            {!isNew && (
              <button onClick={() => onDelete(form.id)} style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--rose)', color: 'var(--rose-deep)', fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'var(--csans)' }}>
                Remove
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--paper-2)', color: 'var(--ink-2)', fontSize: 13, border: '0.5px solid var(--hair)', cursor: 'pointer', fontFamily: 'var(--csans)' }}>
              Cancel
            </button>
            <button onClick={() => onSave({ ...form })} disabled={saving || !form.name.trim()} style={{ padding: '10px 24px', borderRadius: 10, background: 'var(--ink)', color: 'var(--paper)', fontSize: 13, fontWeight: 500, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--csans)', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : isNew ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Team & settings ─────────────────────────────────────── */
const SEVERITY_DOT: Record<string, string> = {
  high:   'var(--rose-deep)',
  medium: 'var(--clay-deep)',
  low:    'var(--ink-3)',
};

const SEVERITY_BG: Record<string, string> = {
  high:   'oklch(0.95 0.04 25)',
  medium: 'oklch(0.96 0.04 55)',
  low:    'var(--paper-2)',
};

function AlertFeed() {
  const [notifs, setNotifs] = useState<InAppNotif[]>([]);
  useEffect(() => notificationService.subscribe(setNotifs), []);

  const pending = notifs.filter(n => !n.acknowledged);
  const acked   = notifs.filter(n => n.acknowledged);

  return (
    <div>
      {/* Pending alerts */}
      {pending.length === 0 ? (
        <div style={{
          padding: '18px 20px', borderRadius: 12, background: 'oklch(0.96 0.02 150)',
          border: '0.5px solid oklch(0.88 0.04 150)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sage-deep)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--sage-deep)' }}>All clear</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>No unacknowledged alerts at this time.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {[...pending].reverse().map(n => (
            <div key={n.id} style={{
              padding: '14px 16px', borderRadius: 12, background: SEVERITY_BG[n.severity],
              border: `0.5px solid ${n.severity === 'high' ? 'oklch(0.85 0.08 25)' : 'var(--hair)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEVERITY_DOT[n.severity], flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: SEVERITY_DOT[n.severity], fontWeight: 600 }}>
                      {n.severity}
                    </span>
                    <span style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, color: 'var(--ink-4)' }}>
                      {new Date(n.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.4 }}>{n.reason}</div>
                </div>
                <button
                  onClick={() => notificationService.acknowledge(n.id)}
                  style={{
                    flexShrink: 0, padding: '5px 10px', borderRadius: 7, fontSize: 11.5,
                    background: 'var(--ink)', color: 'var(--paper)', border: 'none',
                    cursor: 'pointer', fontFamily: 'var(--csans)', fontWeight: 500,
                  }}
                >
                  Acknowledge
                </button>
              </div>
            </div>
          ))}
          {pending.length > 1 && (
            <button
              onClick={() => notificationService.acknowledgeAll()}
              style={{ alignSelf: 'flex-end', padding: '6px 12px', borderRadius: 8, fontSize: 12, background: 'none', border: '0.5px solid var(--hair)', color: 'var(--ink-3)', cursor: 'pointer', fontFamily: 'var(--csans)' }}
            >
              Acknowledge all ({pending.length})
            </button>
          )}
        </div>
      )}

      {/* Acknowledged history */}
      {acked.length > 0 && (
        <div>
          <div className="c-eyebrow" style={{ marginTop: 20, marginBottom: 10 }}>Acknowledged</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[...acked].reverse().map((n, i) => (
              <div key={n.id} style={{
                display: 'grid', gridTemplateColumns: '8px 1fr auto', gap: 10, alignItems: 'flex-start',
                padding: '10px 0', borderBottom: i < acked.length - 1 ? '0.5px solid var(--hair-2)' : 'none',
                opacity: 0.55,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: SEVERITY_DOT[n.severity], marginTop: 4, flexShrink: 0 }} />
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>{n.reason}</div>
                <span style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                  {new Date(n.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DesktopTeam() {
  const { store, saving, updateStore } = usePatientData();
  const pr = usePronouns();
  const [notifs, setNotifs] = useState<InAppNotif[]>([]);
  const [editTarget, setEditTarget] = useState<import('./PatientContext').Caregiver | null>(null);
  const [modalMode, setModalMode] = useState<'edit' | 'new' | null>(null);

  useEffect(() => notificationService.subscribe(setNotifs), []);

  const pendingCount = notifs.filter(n => !n.acknowledged).length;

  const openEdit = (c: import('./PatientContext').Caregiver) => { setEditTarget(c); setModalMode('edit'); };
  const openNew  = () => { setEditTarget(null); setModalMode('new'); };
  const closeModal = () => setModalMode(null);

  const handleSaveCaregiver = async (updated: import('./PatientContext').Caregiver) => {
    if (!store) return;
    const list = store.caregivers;
    const idx = list.findIndex(c => c.id === updated.id);
    const next = idx >= 0 ? list.map(c => c.id === updated.id ? updated : c) : [...list, updated];
    await updateStore({ caregivers: next });
    closeModal();
  };

  const handleDeleteCaregiver = async (id: string) => {
    if (!store) return;
    await updateStore({ caregivers: store.caregivers.filter(c => c.id !== id) });
    closeModal();
  };

  return (
    <div className="d-panel" style={{ flex: 1, overflowY: 'auto' }}>
      {modalMode !== null && (
        <CaregiverEditModal
          caregiver={editTarget}
          saving={saving}
          onSave={handleSaveCaregiver}
          onDelete={handleDeleteCaregiver}
          onClose={closeModal}
        />
      )}

      <div style={{ marginBottom: 28 }}>
        <div className="c-eyebrow" style={{ marginBottom: 6 }}>Care coordination</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 8 }}>Team & alerts.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill tone="ink" onClick={openNew}>+ Add person</Pill>
        </div>
      </div>

      {/* ── Alert notification center ── */}
      <div style={{ marginBottom: 36 }}>
        <SectionHeader kicker="Notifications" action={
          pendingCount > 0 ? (
            <span style={{
              minWidth: 20, height: 20, borderRadius: 10, background: 'var(--rose-deep)',
              color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: '0 6px', fontFamily: 'var(--csans)',
            }}>{pendingCount}</span>
          ) : null
        }>
          Alert feed
        </SectionHeader>
        <AlertFeed />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <div>
          <SectionHeader kicker="On the team">Caregivers</SectionHeader>
          <Card pad={0}>
            {(store?.caregivers ?? []).map((c, i) => (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '44px 1fr auto auto', gap: 12, alignItems: 'center',
                padding: '16px 18px', borderTop: i > 0 ? '0.5px solid var(--hair-2)' : 'none',
              }}>
                <div style={{ position: 'relative', width: 44, height: 44 }}>
                  <Placeholder w={44} h={44} tint={c.tint as 'clay' | 'sage' | 'rose' | 'paper'} label="" radius={22} />
                  {c.online && <span style={{ position: 'absolute', right: -2, bottom: -2, width: 12, height: 12, borderRadius: '50%', background: 'var(--sage-deep)', border: '2px solid #FFFDF8' }} />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{c.role}</div>
                </div>
                <span style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.online ? 'var(--sage-deep)' : 'var(--ink-4)' }}>
                  {c.online ? 'On now' : 'Quiet'}
                </span>
                <button onClick={() => openEdit(c)} style={{ fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--csans)', padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                  Edit
                </button>
              </div>
            ))}
          </Card>

          <SectionHeader kicker="For hard moments">Grounding library</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(store?.grounding ?? []).map(g => (
              <Card key={g.id} pad={16} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', flexShrink: 0 }}>
                  {g.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)', lineHeight: 1.15 }}>{g.name}</div>
                  <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 3 }}>
                    {g.duration} · for {g.use.toLowerCase()}
                  </div>
                </div>
                <Pill tone="default">Start</Pill>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader kicker="Owl settings">{`How ${pr.subj} sounds`}</SectionHeader>
          <Card pad={0}>
            {[
              { l: 'Voice', v: 'Calm · warm, low register' },
              { l: 'Wake word', v: 'Hey, owl' },
              { l: 'Night light', v: 'Soft amber, 2%' },
              { l: 'Privacy', v: 'Audio never leaves the room' },
              { l: 'Firmware', v: 'v3.2.1 — up to date' },
              { l: 'Notifications', v: 'Alerts + daily digest' },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '15px 18px', borderTop: i > 0 ? '0.5px solid var(--hair-2)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{s.l}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{s.v}</div>
                </div>
                <Pill tone="ghost">Edit</Pill>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

const ALERT_SEVERITY_LABELS: Record<string, string> = {
  high:   'Immediate attention',
  medium: 'Needs attention',
  low:    'Note',
};

const ALERT_BG: Record<string, string> = {
  high:   'oklch(0.94 0.05 25)',
  medium: 'oklch(0.95 0.04 55)',
  low:    'var(--paper-2)',
};

/* ── Alert modal ─────────────────────────────────────────── */
function DesktopAlertModal({ onClose }: { onClose: () => void }) {
  const [responded, setResponded] = useState<string | null>(null);
  const { store, currentCaregiver } = usePatientData();
  const pr = usePronouns();
  const { alerts, dismissAlert } = useSession();

  const preferred   = store?.patient.preferred ?? 'Patient';
  const room        = store?.patient.home.split('·').pop()?.trim() ?? '';
  const calmer      = store?.patient.calmers[0] ?? 'some music';
  const primaryId   = store?.currentCaregiverId;
  const firstVoice  = store?.voices[0];
  const firstPhoto  = store?.memories.find(m => m.kind === 'photo');
  const firstGround = store?.grounding[0];
  const onShift     = store?.caregivers.find(c => c.online && c.id !== primaryId);
  const timeStr     = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Most severe active alert drives the header
  const topAlert = alerts.find(a => a.severity === 'high') ?? alerts.find(a => a.severity === 'medium') ?? alerts[0];
  const hasLiveAlerts = alerts.length > 0;

  const actions: { id: string; primary?: boolean; title: string; detail: string }[] = [];
  if (firstVoice) actions.push({ id: 'voice', primary: true, title: `Play ${firstVoice.person.split(' ')[0]}'s voice`, detail: `${firstVoice.title} · ${firstVoice.duration}` });
  if (firstPhoto) actions.push({ id: 'photo', title: `Show: ${firstPhoto.title}`, detail: firstPhoto.desc });
  if (firstGround) actions.push({ id: 'ground', title: `Start grounding: ${firstGround.name}`, detail: `${firstGround.duration} · for ${firstGround.use.toLowerCase()}` });
  if (onShift) actions.push({ id: 'call', title: `Call ${onShift.name}`, detail: `${onShift.role}${room ? ` · ${room}` : ''} · On shift now` });

  const headerBg = topAlert ? ALERT_BG[topAlert.severity] : 'oklch(0.96 0.03 25)';
  const headerBorder = topAlert?.severity === 'high' ? '0.5px solid oklch(0.85 0.08 25)' : '0.5px solid var(--hair)';

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(26,25,21,0.4)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'c-fadeUp 240ms ease-out',
    }}>
      <div style={{
        width: 600, maxHeight: '88%', background: 'var(--paper)', borderRadius: 18,
        boxShadow: '0 30px 80px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(26,25,21,0.2)',
        overflow: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '18px 24px', background: headerBg, borderBottom: headerBorder,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ position: 'relative', width: 10, height: 10 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--rose-deep)' }} />
              <span style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '1px solid var(--rose)', animation: 'c-pulseRing 1.8s ease-out infinite' }} />
            </span>
            <span className="c-eyebrow" style={{ color: 'var(--rose-deep)', marginBottom: 0 }}>
              {hasLiveAlerts ? `${ALERT_SEVERITY_LABELS[topAlert!.severity]} · ${timeStr}` : `Alert log · ${timeStr}`}
              {room ? ` · ${room}` : ''}
            </span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--ink-3)', fontSize: 20, lineHeight: 1, border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        <div style={{ padding: '28px 28px 24px' }}>

          {/* Live alert queue */}
          {hasLiveAlerts && (
            <div style={{ marginBottom: 22 }}>
              {alerts.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10,
                  padding: '14px 16px', borderRadius: 12, background: ALERT_BG[a.severity],
                  border: `0.5px solid ${a.severity === 'high' ? 'oklch(0.82 0.1 25)' : 'var(--hair)'}`,
                }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <OwlGlyph size={26} color="var(--paper)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: a.severity === 'high' ? 'var(--rose-deep)' : 'var(--clay-deep)', marginBottom: 4 }}>
                      {ALERT_SEVERITY_LABELS[a.severity]}
                    </div>
                    <OwlQuote size="sm" style={{ borderLeft: 'none', paddingLeft: 0 }}>{a.reason}</OwlQuote>
                  </div>
                  <button onClick={() => dismissAlert(a.id)} style={{ color: 'var(--ink-3)', fontSize: 16, border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {!hasLiveAlerts && (
            <div style={{ fontFamily: 'var(--serif)', fontSize: 30, lineHeight: 1.1, color: 'var(--ink)', marginBottom: 18 }}>
              {cap(pr.possAdj)} owl is watching.
            </div>
          )}

          {/* Caregiver narration for no live alerts */}
          {!hasLiveAlerts && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <OwlGlyph size={26} color="var(--paper)" />
              </div>
              <OwlQuote size="sm" style={{ flex: 1 }}>
                No active alerts. I'm watching {preferred} closely and will notify you immediately if anything changes. I tried {calmer} earlier and {pr.subj} {pr.isAre} calm.
              </OwlQuote>
            </div>
          )}

          <div className="c-eyebrow" style={{ marginBottom: 10 }}>What should I do?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actions.map(a => (
              <button key={a.id} onClick={() => setResponded(a.id)} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                background: responded === a.id ? 'var(--ink)' : a.primary ? '#FFFDF8' : 'var(--paper-2)',
                color: responded === a.id ? 'var(--paper)' : 'var(--ink)',
                border: a.primary && responded !== a.id ? '1px solid var(--ink)' : '0.5px solid var(--hair)',
                fontFamily: 'var(--csans)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: responded === a.id ? 'rgba(250,247,242,0.6)' : 'var(--ink-3)', marginTop: 3 }}>{a.detail}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" style={{ opacity: 0.4 }}><path d="M4 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button onClick={onClose} style={{ flex: 2, padding: 13, borderRadius: 12, background: 'var(--ink)', color: 'var(--paper)', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--csans)' }}>
              I'll come in person
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 12, background: 'var(--paper-2)', color: 'var(--ink-2)', fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'var(--csans)' }}>
              Let the owl handle it
            </button>
          </div>
          {currentCaregiver && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--paper-2)', borderRadius: 10, fontSize: 12, color: 'var(--ink-3)' }}>
              Notifying: {store?.caregivers.filter(c => c.id !== currentCaregiver.id).map(c => c.name).join(' · ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Desktop shell ───────────────────────────────────────── */
export function DesktopCompanionShell() {
  const [nav, setNav] = useState<DesktopNav>('today');
  const [showAlert, setShowAlert] = useState(false);
  const { alerts } = useSession();

  // Auto-open the alert panel when a high-severity alert arrives
  useEffect(() => {
    if (alerts.some(a => a.severity === 'high')) setShowAlert(true);
  }, [alerts]);

  let content: React.ReactNode;
  switch (nav) {
    case 'today':    content = <DesktopToday onAlert={() => setShowAlert(true)} />; break;
    case 'profile':  content = <DesktopProfile />; break;
    case 'memories': content = <DesktopMemories />; break;
    case 'voices':   content = <DesktopVoices />; break;
    case 'team':     content = <DesktopTeam />; break;
  }

  return (
    <div className="companion" style={{ display: 'flex', height: '100%', minHeight: 0, position: 'relative' }}>
      <Sidebar nav={nav} onNav={setNav} onAlert={() => setShowAlert(true)} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {content}
        {showAlert && <DesktopAlertModal onClose={() => setShowAlert(false)} />}
      </div>
    </div>
  );
}
