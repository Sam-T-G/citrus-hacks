import { Card, Placeholder, Pill, SectionHeader, OwlQuote, FactLine } from '../ui';
import { usePatientData } from '../PatientContext';

type Tint = 'sage' | 'clay' | 'rose' | 'paper';

export function ProfileScreen() {
  const { store } = usePatientData();
  if (!store) return null;
  const data = store;
  const p = data.patient;
  return (
    <div>
      <div className="c-eyebrow" style={{ marginBottom: 6 }}>Her story</div>
      <div className="c-title" style={{ marginBottom: 20 }}>{p.preferred}.</div>

      {/* Portrait */}
      <div style={{ position: 'relative', marginBottom: 18 }}>
        <Placeholder h={220} tint="clay" label="portrait · 2023" radius={14}/>
        <div style={{
          position: 'absolute', left: 14, bottom: 14,
          background: 'rgba(250,247,242,0.92)', padding: '8px 12px', borderRadius: 10,
          backdropFilter: 'blur(6px)', border: '0.5px solid var(--hair)',
        }}>
          <div style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 2 }}>Call her</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, lineHeight: 1, color: 'var(--ink)' }}>{p.preferred}</div>
        </div>
      </div>

      {/* Facts */}
      <div className="c-grid-2" style={{ marginBottom: 4 }}>
        <FactLine kicker="Born" val={p.birth}/>
        <FactLine kicker="Stage" val={p.stage}/>
        <FactLine kicker="Home" val={p.home}/>
        <FactLine kicker="Diagnosed" val={p.diagnosed}/>
      </div>

      {/* What she loves */}
      <SectionHeader kicker="What she loves">A few things</SectionHeader>
      <Card>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {p.likes.map((l, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 14, color: 'var(--ink)' }}>
              <span style={{ color: 'var(--clay-deep)', fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 0.8 }}>·</span>
              <span style={{ lineHeight: 1.5 }}>{l}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Calmers & triggers */}
      <div className="c-grid-2" style={{ marginTop: 12 }}>
        <Card pad={14}>
          <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sage-deep)', marginBottom: 8 }}>Calms her</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {p.calmers.map((l, i) => (
              <li key={i} style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>· {l}</li>
            ))}
          </ul>
        </Card>
        <Card pad={14}>
          <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--rose-deep)', marginBottom: 8 }}>Gently avoid</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {p.triggers.map((l, i) => (
              <li key={i} style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>· {l}</li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Daily routine */}
      <SectionHeader kicker="Daily shape" action={<Pill tone="ghost">Edit</Pill>}>Her routine</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {p.routine.map((r, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '80px 1fr', gap: 14, padding: '14px 0',
            borderBottom: i < p.routine.length - 1 ? '0.5px solid var(--hair-2)' : 'none',
          }}>
            <div style={{ fontFamily: 'var(--cmono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.02em' }}>{r.time}</div>
            <div>
              <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, marginBottom: r.owl ? 4 : 0 }}>{r.what}</div>
              {r.owl && (
                <div style={{ fontFamily: 'var(--cmono)', fontSize: 11.5, color: 'var(--sage-deep)' }}>Owl: "{r.owl}"</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Family */}
      <SectionHeader kicker="Her people" action={<Pill tone="ghost">+ Add</Pill>}>Family</SectionHeader>
      <div className="c-grid-3">
        {data.people.map(pr => (
          <Card key={pr.id} pad={10}>
            <Placeholder h={80} tint={pr.tint as Tint} label={pr.name.split(' ')[0].toLowerCase()} radius={8}/>
            <div style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 8 }}>{pr.rel}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginTop: 2 }}>{pr.name}</div>
          </Card>
        ))}
      </div>

      {/* Conversation topics */}
      <SectionHeader kicker="For the owl">Topics she loves</SectionHeader>
      <Card pad={0}>
        {data.topics.map((t, i) => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
            borderTop: i > 0 ? '0.5px solid var(--hair-2)' : 'none',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: t.warm ? 'var(--clay)' : 'var(--rose)', flexShrink: 0 }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)', marginBottom: 2 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>{t.primer}</div>
            </div>
            {!t.warm && (
              <span style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--rose-deep)', whiteSpace: 'nowrap' }}>handle gently</span>
            )}
          </div>
        ))}
      </Card>

      {store.todayLog.length > 0 && (
        <div style={{ margin: '28px 0 8px' }}>
          <OwlQuote size="sm">
            {store.todayLog.filter(e => e.kind === 'share' || e.kind === 'topic' || e.kind === 'memory').slice(-1)[0]?.text
              ?? store.todayLog.slice(-1)[0]?.text
              ?? ''}
          </OwlQuote>
        </div>
      )}
    </div>
  );
}
