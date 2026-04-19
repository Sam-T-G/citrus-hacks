import { jsx as _jsx } from "react/jsx-runtime";
import { PatientProvider } from './companion/PatientContext';
import { SessionProvider } from './session/SessionContext';
import { CompanionApp } from './companion/CompanionApp';
import './ui/styles.css';
export default function App() {
    return (_jsx(PatientProvider, { children: _jsx(SessionProvider, { children: _jsx(CompanionApp, {}) }) }));
}
