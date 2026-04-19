import { useState } from 'react';
import type { PatientStore, Patient } from './PatientContext';
import type { PronounSet } from './pronouns';

interface Props {
  store:   PatientStore;
  saving:  boolean;
  onSave:  (updates: Partial<PatientStore>) => Promise<void>;
  onClose: () => void;
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
  border: '0.5px solid var(--hair)', background: 'var(--paper)',
  color: 'var(--ink)', fontFamily: 'var(--csans)', outline: 'none',
  boxSizing: 'border-box',
};

const TEXTAREA_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  resize: 'vertical', minHeight: 90, lineHeight: 1.55,
};

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em',
  textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: 5,
};

function Field({ label, value, onChange, multiline, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; hint?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={LABEL_STYLE}>{label}</label>
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 5 }}>{hint}</div>}
      {multiline
        ? <textarea style={TEXTAREA_STYLE} value={value} onChange={e => onChange(e.target.value)} />
        : <input   style={INPUT_STYLE}     value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

export function ProfileEditModal({ store, saving, onSave, onClose }: Props) {
  const p = store.patient;

  const [form, setForm] = useState({
    first:      p.first,
    preferred:  p.preferred,
    last:       p.last,
    birth:      p.birth,
    stage:      p.stage,
    diagnosed:  p.diagnosed,
    home:       p.home,
    pronouns:   (p.pronouns ?? 'she/her') as PronounSet,
    likes:      p.likes.join('\n'),
    dislikes:   p.dislikes.join('\n'),
    calmers:    p.calmers.join('\n'),
    triggers:   p.triggers.join('\n'),
  });

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const splitLines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);

  const handleSave = async () => {
    const updated: Patient = {
      ...p,
      first:      form.first.trim(),
      preferred:  form.preferred.trim(),
      last:       form.last.trim(),
      birth:      form.birth.trim(),
      stage:      form.stage.trim(),
      diagnosed:  form.diagnosed.trim(),
      home:       form.home.trim(),
      pronouns:   form.pronouns,
      likes:      splitLines(form.likes),
      dislikes:   splitLines(form.dislikes),
      calmers:    splitLines(form.calmers),
      triggers:   splitLines(form.triggers),
    };
    await onSave({ patient: updated });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(26,25,21,0.45)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 600, maxHeight: '90vh', background: 'var(--paper)', borderRadius: 18,
        boxShadow: '0 30px 80px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(26,25,21,0.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '0.5px solid var(--hair)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 3 }}>
              Edit profile
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', lineHeight: 1 }}>
              {p.preferred || p.first} {p.last}
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--ink-3)', fontSize: 22, lineHeight: 1, border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '24px 24px 8px', flex: 1 }}>

          <div style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sage-deep)', marginBottom: 14 }}>
            Identity
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 4 }}>
            <Field label="First name"  value={form.first}     onChange={set('first')} />
            <Field label="Preferred name" value={form.preferred} onChange={set('preferred')} />
            <Field label="Last name"   value={form.last}      onChange={set('last')} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL_STYLE}>Pronouns</label>
            <select
              style={{ ...INPUT_STYLE, cursor: 'pointer' }}
              value={form.pronouns}
              onChange={e => setForm(f => ({ ...f, pronouns: e.target.value as PronounSet }))}
            >
              <option value="she/her">she / her</option>
              <option value="he/him">he / him</option>
              <option value="they/them">they / them</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
            <Field label="Date of birth"   value={form.birth}     onChange={set('birth')} />
            <Field label="Diagnosis stage" value={form.stage}     onChange={set('stage')} />
            <Field label="Diagnosed"       value={form.diagnosed} onChange={set('diagnosed')} />
            <Field label="Home / room"     value={form.home}      onChange={set('home')} />
          </div>

          <div style={{ height: 1, background: 'var(--hair)', margin: '20px 0' }} />

          <div style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sage-deep)', marginBottom: 14 }}>
            Preferences
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }}>
            <Field label="Loves"       value={form.likes}    onChange={set('likes')}    multiline hint="One item per line" />
            <Field label="Dislikes"    value={form.dislikes} onChange={set('dislikes')} multiline hint="One item per line" />
            <Field label="What calms" value={form.calmers}  onChange={set('calmers')}  multiline hint="One item per line" />
            <Field label="Gently avoid"   value={form.triggers} onChange={set('triggers')} multiline hint="One item per line" />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '0.5px solid var(--hair)',
          display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 10, background: 'var(--paper-2)',
            color: 'var(--ink-2)', fontSize: 13, border: '0.5px solid var(--hair)',
            cursor: 'pointer', fontFamily: 'var(--csans)',
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 10, background: 'var(--ink)',
            color: 'var(--paper)', fontSize: 13, fontWeight: 500, border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--csans)',
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
