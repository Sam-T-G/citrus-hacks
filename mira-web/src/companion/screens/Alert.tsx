import { useState } from 'react';
import { OwlGlyph, OwlQuote } from '../ui';
import { usePatientData, usePronouns } from '../PatientContext';
import { cap } from '../pronouns';

type ResponseKey = string | null;

function ReadingTile({ label, val, unit, tone = 'paper', trend }: {
  label: string; val: string; unit?: string; tone?: 'rose' | 'clay' | 'sage' | 'paper'; trend?: 'up';
}) {
  return (
    <div className={`reading-tile reading-tile-${tone}`}>
      <div style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1 }}>{val}</span>
        {unit && <span style={{ fontSize: 11, opacity: 0.6 }}>{unit}</span>}
        {trend === 'up' && <span style={{ fontSize: 11 }}>↑</span>}
      </div>
    </div>
  );
}

function ActionRow({ title, detail, onClick, active, primary }: {
  title: string; detail: string; onClick: () => void; active: boolean; primary?: boolean;
}) {
  const cls = active ? 'action-row action-row-active' : primary ? 'action-row action-row-primary' : 'action-row action-row-default';
  return (
    <button className={cls} onClick={onClick}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, lineHeight: 1.4, opacity: active ? 0.6 : undefined, color: active ? undefined : 'var(--ink-3)' }}>{detail}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" style={{ opacity: 0.4, flexShrink: 0 }}>
        <path d="M4 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

export function AlertScreen({ onBack }: { onBack: () => void }) {
  const [responded, setResponded] = useState<ResponseKey>(null);
  const { store, currentCaregiver } = usePatientData();
  const pr = usePronouns();

  const preferred = store?.patient.preferred ?? 'She';
  const room      = store?.patient.home.split('·').pop()?.trim() ?? '';

  // First voice in library
  const firstVoice = store?.voices[0];
  // First photo memory
  const firstPhoto = store?.memories.find(m => m.kind === 'photo');
  // First grounding exercise
  const firstGround = store?.grounding[0];
  // On-shift caregiver (first online non-primary)
  const primaryId    = store?.currentCaregiverId;
  const onShift      = store?.caregivers.find(c => c.online && c.id !== primaryId);
  // Other caregivers to notify (online, not current user)
  const toNotify     = store?.caregivers.filter(c => c.id !== currentCaregiver?.id).slice(0, 2) ?? [];

  // Calmer to reference in narration
  const calmer = store?.patient.calmers[0] ?? 'some music';

  const actions: { id: string; primary?: boolean; title: string; detail: string }[] = [];
  if (firstVoice) {
    actions.push({
      id: 'voice', primary: true,
      title: `Play ${firstVoice.person.split(' ')[0]}'s voice`,
      detail: `${firstVoice.title} · ${firstVoice.duration}`,
    });
  }
  if (firstPhoto) {
    actions.push({
      id: 'photo',
      title: `Show: ${firstPhoto.title}`,
      detail: firstPhoto.desc,
    });
  }
  if (firstGround) {
    actions.push({
      id: 'ground',
      title: `Start grounding: ${firstGround.name}`,
      detail: `${firstGround.duration} · for ${firstGround.use.toLowerCase()}`,
    });
  }
  if (onShift) {
    actions.push({
      id: 'call',
      title: `Call ${onShift.name}`,
      detail: `${onShift.role}${room ? ` · ${room} · On shift now` : ' · On shift now'}`,
    });
  }

  return (
    <div>
      {/* Header */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, fontFamily: 'var(--csans)' }}>
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to today
      </button>

      <div className="c-eyebrow" style={{ color: 'var(--rose-deep)', marginBottom: 4 }}>
        Live alert · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="c-title" style={{ marginBottom: 18 }}>{cap(pr.subj)} seems upset.</div>

      {/* Owl narration card */}
      <div className="alert-screen-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div className="c-pulse-ring-fast" style={{
              position: 'absolute', inset: -4, borderRadius: '50%',
              border: '1px solid var(--rose)', opacity: 0.6,
            }}/>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <OwlGlyph size={28} color="var(--paper)"/>
            </div>
          </div>
          <OwlQuote size="sm" style={{ borderLeft: 'none', paddingLeft: 0, flex: 1 }}>
            {preferred} seems distressed. {cap(pr.possAdj)} voice rose and {pr.subj} {pr.isAre} restless. I said "I'm right here" and tried {calmer}. {cap(pr.subj)} {pr.isAre} still unsettled.
          </OwlQuote>
        </div>
      </div>

      {/* Sensor readings */}
      <div className="c-grid-3" style={{ marginTop: 14 }}>
        <ReadingTile label="Heart" val="94" unit="bpm" tone="rose" trend="up"/>
        <ReadingTile label="Voice" val="tense" tone="rose"/>
        <ReadingTile label="Motion" val="pacing" tone="clay"/>
      </div>

      {/* Response actions */}
      <div style={{ marginTop: 28, marginBottom: 14 }}>
        <div className="c-section-kicker" style={{ marginBottom: 8 }}>What should I do?</div>
        <div className="c-section-title">Help me help {pr.obj}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {actions.map(a => (
          <ActionRow
            key={a.id}
            primary={a.primary}
            title={a.title}
            detail={a.detail}
            onClick={() => setResponded(a.id)}
            active={responded === a.id}
          />
        ))}
      </div>

      <button onClick={onBack} style={{
        width: '100%', padding: 14, borderRadius: 12, border: 'none',
        background: 'var(--ink)', color: 'var(--paper)', fontSize: 14, fontWeight: 500,
        cursor: 'pointer', fontFamily: 'var(--csans)', marginBottom: 8,
      }}>
        I'll come in person
      </button>
      <button onClick={onBack} style={{
        width: '100%', padding: 12, fontSize: 13, color: 'var(--ink-3)',
        background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--csans)',
      }}>
        Let the owl handle it
      </button>

      {toNotify.length > 0 && (
        <div style={{ padding: '12px 14px', background: 'var(--paper-2)', borderRadius: 10, marginTop: 8 }}>
          <div className="c-eyebrow" style={{ marginBottom: 4 }}>Notifying</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {toNotify.map(c => c.name).join(' · ')}
          </div>
        </div>
      )}
    </div>
  );
}
