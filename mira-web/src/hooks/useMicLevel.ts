import { useState, useRef, useCallback } from 'react';

/**
 * Returns a 0–1 mic level value updated ~20× per second,
 * plus start/stop helpers that manage their own AudioContext + AnalyserNode.
 */
export function useMicLevel() {
  const [level, setLevel]   = useState(0);
  const ctxRef              = useRef<AudioContext | null>(null);
  const rafRef              = useRef<number>(0);
  const streamRef           = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const ctx      = new AudioContext();
    ctxRef.current = ctx;
    const source   = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((s, v) => s + v, 0) / data.length;
      setLevel(Math.min(1, avg / 80));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    ctxRef.current?.close();
    ctxRef.current  = null;
    streamRef.current = null;
    setLevel(0);
  }, []);

  return { level, start, stop };
}
