import { useState } from 'react';
import { Card, Placeholder, Pill, SectionHeader, OwlQuote, Chips } from '../ui';
import { usePatientData } from '../PatientContext';

type Tint = 'sage' | 'clay' | 'rose' | 'paper';
type FilterKind = 'all' | 'photo' | 'video' | 'audio';

const FILTERS: { id: FilterKind; label: string }[] = [
  { id: 'all',   label: 'All' },
  { id: 'photo', label: 'Photos' },
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
];

export function MemoriesScreen() {
  const { store } = usePatientData();
  const [filter, setFilter] = useState<FilterKind>('all');

  const memories = store?.memories ?? [];
  const items = memories.filter(m => filter === 'all' || m.kind === filter);
  const favorites = [...memories].sort((a, b) => b.plays - a.plays).slice(0, 3);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div className="c-eyebrow" style={{ marginBottom: 4 }}>For grounding & joy</div>
          <div className="c-title">Memories.</div>
        </div>
        <Pill tone="ink" icon={<span style={{ fontSize: 16, lineHeight: 1 }}>+</span>}>Add</Pill>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            fontSize: 12.5, padding: '6px 14px', borderRadius: 999,
            background: filter === f.id ? 'var(--ink)' : 'var(--paper-2)',
            color: filter === f.id ? 'var(--paper)' : 'var(--ink-2)',
            fontWeight: 500, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--csans)',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Favorites shelf — polaroid-ish */}
      <SectionHeader kicker="Most played">Her favorites</SectionHeader>
      <div className="c-scroll-row" style={{ marginBottom: 8 }}>
        {favorites.map((m, i) => (
          <div key={m.id} style={{
            flex: '0 0 200px',
            transform: `rotate(${i % 2 === 0 ? -1.2 : 1.2}deg)`,
            transition: 'transform 200ms',
          }}>
            <Card pad={8}>
              <Placeholder h={160} tint={m.tint as Tint} label={m.kind} radius={6}/>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 10, color: 'var(--ink)', lineHeight: 1.15 }}>{m.title}</div>
              <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 4 }}>
                {m.tag} · {m.plays} plays
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Library */}
      <SectionHeader kicker={`${items.length} items`}>Library</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(m => (
          <Card key={m.id} pad={12}>
            <div className="memory-card">
              <div className="memory-thumb">
                <Placeholder w={100} h={100} tint={m.tint as Tint} label={m.kind} radius={8}/>
                {m.kind !== 'photo' && 'duration' in m && (
                  <div className="memory-badge">
                    {m.kind === 'audio' ? '♪ ' : '▶ '}{m.duration}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', lineHeight: 1.1, marginBottom: 3 }}>{m.title}</div>
                  <div style={{ fontFamily: 'var(--cmono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>{m.tag}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{m.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <Chips items={m.tags}/>
                  <button style={{
                    fontSize: 11, fontFamily: 'var(--cmono)', letterSpacing: '0.05em',
                    color: 'var(--sage-deep)', padding: '4px 8px', border: 'none',
                    background: 'none', cursor: 'pointer',
                  }}>Send →</button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {store?.todayLog.some(e => e.kind === 'memory') && (
        <div style={{ margin: '28px 0 8px' }}>
          <OwlQuote size="sm">
            {store.todayLog.filter(e => e.kind === 'memory').slice(-1)[0]?.text ?? ''}
          </OwlQuote>
        </div>
      )}
    </div>
  );
}
