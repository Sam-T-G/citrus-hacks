import { useState, useEffect } from 'react';
import { HomeScreen }            from './screens/Home';
import { ProfileScreen }         from './screens/Profile';
import { MemoriesScreen }        from './screens/Memories';
import { AlertScreen }           from './screens/Alert';
import { DesktopCompanionShell } from './DesktopShell';
import { OwlGlyph }              from './ui';
import { usePatientData }        from './PatientContext';
import { SessionLog }            from '../ui/SessionLog';
import './companion.css';

type MobileScreen = 'home' | 'profile' | 'memories' | 'log' | 'alert';

const TABS: { id: MobileScreen; label: string }[] = [
  { id: 'home',     label: 'Today' },
  { id: 'profile',  label: 'Profile' },
  { id: 'memories', label: 'Memories' },
  { id: 'log',      label: 'Care Log' },
];

function useIsDesktop() {
  const [desktop, setDesktop] = useState(window.innerWidth >= 900);
  useEffect(() => {
    const handler = () => setDesktop(window.innerWidth >= 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return desktop;
}

export function CompanionApp() {
  const [screen, setScreen] = useState<MobileScreen>('home');
  const isDesktop = useIsDesktop();
  const { store } = usePatientData();

  if (isDesktop) {
    return <DesktopCompanionShell />;
  }

  return (
    <div className="companion companion-shell">
      {/* Mobile header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px',
        borderBottom: '0.5px solid var(--hair)', background: 'var(--paper)', flexShrink: 0,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <OwlGlyph size={22} color="var(--paper)" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', lineHeight: 1 }}>Mira Companion</div>
          <div style={{ fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 2 }}>
            {store ? `${store.patient.preferred} ${store.patient.last} · ${store.patient.home.split('·')[1]?.trim() ?? ''}` : 'Loading…'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sage-deep)', display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--csans)', fontSize: 12.5, color: 'var(--sage-deep)', fontWeight: 500 }}>Mira online</span>
        </div>
      </div>

      {/* Tab bar */}
      {screen !== 'alert' && (
        <div className="companion-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`companion-tab${screen === t.id ? ' active' : ''}`}
              onClick={() => setScreen(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="companion-body">
        {screen === 'home'     && <HomeScreen     onAlert={() => setScreen('alert')} />}
        {screen === 'profile'  && <ProfileScreen  />}
        {screen === 'memories' && <MemoriesScreen />}
        {screen === 'log'      && (
          <div style={{ padding: '0 0 24px' }}>
            <SessionLog />
          </div>
        )}
        {screen === 'alert'    && <AlertScreen    onBack={() => setScreen('home')} />}
      </div>
    </div>
  );
}
