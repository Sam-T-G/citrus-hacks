import { useRef, useEffect } from 'react';
import type { TranscriptEntry } from '../types';

interface Props {
  entries:   TranscriptEntry[];
  liveUser?: string;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function TranscriptPanel({ entries, liveUser }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries, liveUser]);

  const isEmpty = entries.length === 0 && !liveUser;

  return (
    <div className="transcript-panel">
      <div className="transcript-header">
        <div className="transcript-header__title">Conversation</div>
      </div>

      <div className="transcript" ref={scrollRef}>
        {isEmpty && (
          <div className="transcript__empty">
            <div className="transcript__empty-icon">💬</div>
            <p>Start a session to begin your conversation with Mira.</p>
          </div>
        )}

        {entries.map(e => (
          <div key={e.ts} className={`message message--${e.role}`}>
            <span className="message__role">{e.role === 'user' ? 'You' : 'Mira'}</span>
            <div className="message__bubble">{e.text}</div>
            <span className="message__time">{formatTime(e.ts)}</span>
          </div>
        ))}

        {liveUser && (
          <div className="message message--user">
            <span className="message__role">You</span>
            <div className="message__bubble message__bubble--live">
              {liveUser}<span className="transcript__cursor" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
