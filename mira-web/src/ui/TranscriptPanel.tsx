import { useRef, useEffect } from 'react';
import type { TranscriptEntry } from '../types';

interface Props {
  entries: TranscriptEntry[];
}

export function TranscriptPanel({ entries }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="transcript" ref={scrollRef}>
      {entries.length === 0
        ? <div className="transcript__empty"><p>Start a session and say something.</p></div>
        : entries.map(e => (
            <div key={e.ts} className={`message message--${e.role}`}>
              <span className="message__role">{e.role === 'user' ? 'You' : 'Mira'}</span>
              <div className="message__bubble">{e.text}</div>
            </div>
          ))
      }
    </div>
  );
}
