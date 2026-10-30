import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Camera, CameraOff, RotateCcw, AlertCircle } from 'lucide-react';

const CameraCapture = forwardRef(({ onCapture, autoStart = true }, ref) => {
  const [active, setActive]     = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError]       = useState('');
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setActive(true);
      return stream;
    } catch {
      setError('Camera access denied. Allow camera access in browser settings.');
      throw new Error('Camera access denied');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return snapshot || null;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, canvas.height - 34, canvas.width, 34);
    ctx.fillStyle = '#fff';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`SafeHer — ${new Date().toLocaleString()}`, 8, canvas.height - 12);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    setSnapshot(dataUrl);
    onCapture?.(dataUrl);
    return dataUrl;
  }, [onCapture, snapshot]);

  useImperativeHandle(ref, () => ({
    start: startCamera,
    stop: stopCamera,
    capture: () => {
      if (!active) {
        return startCamera().then(() => new Promise((res) => setTimeout(() => res(capturePhoto()), 1000))).catch(() => null);
      }
      return Promise.resolve(capturePhoto());
    },
  }));

  useEffect(() => {
    if (autoStart) startCamera().catch(() => {});
    return () => stopCamera();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ background: 'var(--neutral-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-lg)', padding: 14 }}>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Camera size={15} strokeWidth={2} color="var(--text-muted)" />
          Live camera feed
        </div>
        {!active && !snapshot && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={startCamera}>
            Open camera
          </button>
        )}
      </div>

      {active && (
        <div>
          <video
            ref={videoRef}
            className="camera-preview"
            playsInline muted autoPlay
            style={{ transform: 'scaleX(-1)', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={capturePhoto} style={{ flex: 1 }}>
              <Camera size={13} strokeWidth={2} /> Capture
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={stopCamera} style={{ flex: 1 }}>
              <CameraOff size={13} strokeWidth={2} /> Turn off
            </button>
          </div>
        </div>
      )}

      {snapshot && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Last captured:</div>
          <img src={snapshot} alt="Evidence snapshot" className="snapshot-preview" />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setSnapshot(null); startCamera(); }}
            style={{ marginTop: 8, width: '100%' }}
          >
            <RotateCcw size={13} strokeWidth={2} /> Reset camera
          </button>
        </div>
      )}

      {error && (
        <div className="msg msg-error" style={{ marginTop: 8 }}>
          <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
});

CameraCapture.displayName = 'CameraCapture';
export default CameraCapture;
