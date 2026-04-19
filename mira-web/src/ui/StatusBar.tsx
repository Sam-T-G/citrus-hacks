import type { EngineState } from '../types';

interface Props {
  engineState:  EngineState;
  serialStatus: 'disconnected' | 'connected';
}

const LABELS: Record<EngineState, string> = {
  idle:       'Idle',
  connecting: 'Connecting…',
  listening:  'Listening',
  speaking:   'Speaking',
};

export function StatusBar({ engineState, serialStatus }: Props) {
  return (
    <header className="statusbar">
      <span className="statusbar__brand">MIRA</span>
      <span className={`pill pill--${engineState}`}>
        <span className={`dot${engineState !== 'idle' ? ' dot--pulse' : ''}`} />
        {LABELS[engineState]}
      </span>
      <div className="statusbar__right">
        <span className={`controls__serial${serialStatus === 'connected' ? ' controls__serial--on' : ''}`}>
          {serialStatus === 'connected' ? '● Arduino' : '○ Arduino'}
        </span>
      </div>
    </header>
  );
}
