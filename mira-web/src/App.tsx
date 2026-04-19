import { PatientProvider } from './companion/PatientContext';
import { SessionProvider }  from './session/SessionContext';
import { CompanionApp }     from './companion/CompanionApp';
import './ui/styles.css';

export default function App() {
  return (
    <PatientProvider>
      <SessionProvider>
        <CompanionApp />
      </SessionProvider>
    </PatientProvider>
  );
}
