import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { HomeScreen } from './screens/Home';
import { ProfileScreen } from './screens/Profile';
import { MemoriesScreen } from './screens/Memories';
import { AlertScreen } from './screens/Alert';
import { DesktopCompanionShell } from './DesktopShell';
import { OwlGlyph } from './ui';
import { usePatientData } from './PatientContext';
import { SessionLog } from '../ui/SessionLog';
import './companion.css';
const TABS = [
    { id: 'home', label: 'Today' },
    { id: 'profile', label: 'Profile' },
    { id: 'memories', label: 'Memories' },
    { id: 'log', label: 'Care Log' },
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
    const [screen, setScreen] = useState('home');
    const isDesktop = useIsDesktop();
    const { store } = usePatientData();
    if (isDesktop) {
        return _jsx(DesktopCompanionShell, {});
    }
    return (_jsxs("div", { className: "companion companion-shell", children: [_jsxs("div", { style: {
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px',
                    borderBottom: '0.5px solid var(--hair)', background: 'var(--paper)', flexShrink: 0,
                }, children: [_jsx("div", { style: { width: 36, height: 36, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(OwlGlyph, { size: 22, color: "var(--paper)" }) }), _jsxs("div", { children: [_jsx("div", { style: { fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', lineHeight: 1 }, children: "Mira Companion" }), _jsx("div", { style: { fontFamily: 'var(--cmono)', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 2 }, children: store ? `${store.patient.preferred} ${store.patient.last} · ${store.patient.home.split('·')[1]?.trim() ?? ''}` : 'Loading…' })] }), _jsxs("div", { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { width: 7, height: 7, borderRadius: '50%', background: 'var(--sage-deep)', display: 'inline-block' } }), _jsx("span", { style: { fontFamily: 'var(--csans)', fontSize: 12.5, color: 'var(--sage-deep)', fontWeight: 500 }, children: "Mira online" })] })] }), screen !== 'alert' && (_jsx("div", { className: "companion-tabs", children: TABS.map(t => (_jsx("button", { className: `companion-tab${screen === t.id ? ' active' : ''}`, onClick: () => setScreen(t.id), children: t.label }, t.id))) })), _jsxs("div", { className: "companion-body", children: [screen === 'home' && _jsx(HomeScreen, { onAlert: () => setScreen('alert') }), screen === 'profile' && _jsx(ProfileScreen, {}), screen === 'memories' && _jsx(MemoriesScreen, {}), screen === 'log' && (_jsx("div", { style: { padding: '0 0 24px' }, children: _jsx(SessionLog, {}) })), screen === 'alert' && _jsx(AlertScreen, { onBack: () => setScreen('home') })] })] }));
}
