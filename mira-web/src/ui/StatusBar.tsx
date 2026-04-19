import type { EngineState } from '../types';

interface Props {
  engineState:  EngineState;
  serialStatus: 'disconnected' | 'connected';
}

const LABELS: Record<EngineState, string> = {
  idle:       'Idle',
  connecting: 'Connecting',
  listening:  'Listening',
  speaking:   'Speaking',
};

export function StatusBar({ engineState, serialStatus }: Props) {
  const active = engineState !== 'idle';

  return (
    <header className="statusbar">
      <div className="statusbar__brand">
        <div className="statusbar__logo">🦉</div>
        <span className="statusbar__name">MIRA</span>
      </div>

      <div className="statusbar__divider" />

      <span className={`pill pill--${engineState}`}>
        <span className={`dot${active ? ' dot--pulse' : ''}`} />
        {LABELS[engineState]}
        {engineState === 'speaking' && (
          <span className="waveform" style={{ marginLeft: 2 }}>
            <span className="waveform__bar" />
            <span className="waveform__bar" />
            <span className="waveform__bar" />
            <span className="waveform__bar" />
            <span className="waveform__bar" />
          </span>
        )}
      </span>

      <div className="statusbar__right">
        <span className={`serial-badge${serialStatus === 'connected' ? ' serial-badge--on' : ''}`}>
          <span className="serial-badge__dot" />
          {serialStatus === 'connected' ? 'Arduino' : 'No Arduino'}
        </span>
      </div>
    </header>
  );
}
