import { useRef, useEffect } from 'react';
import type { CameraCapture } from '../vision/CameraCapture';
import type { ArduinoCommand } from '../types';

interface Props {
  camera:  CameraCapture | null;
  lastCmd: ArduinoCommand | null;
  active:  boolean;
}

export function CameraPreview({ camera, lastCmd, active }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (active && camera && videoRef.current) {
      camera.attachPreview(videoRef.current);
    }
  }, [active, camera]);

  return (
    <div className="camera-panel">
      {active
        ? <video ref={videoRef} autoPlay muted playsInline className="camera-feed" />
        : <div className="camera-feed camera-feed--off">Camera inactive</div>
      }
      {lastCmd && (
        <div className="cmd-display">
          <div className="card__label">Arduino Command</div>
          <pre className="cmd-display__pre">{JSON.stringify(lastCmd, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
