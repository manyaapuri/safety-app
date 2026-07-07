import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';

/**
 * CameraCapture — accesses camera to capture a photo on SOS trigger.
 * Exposes methods to the parent so they can trigger capture automatically.
 */
const CameraCapture = forwardRef(({ onCapture, autoStart = true }, ref) => {
  const [active, setActive] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setActive(true);
      return stream;
    } catch (err) {
      setError('Camera access denied. Please allow camera access in browser settings.');
      console.error('Camera error:', err);
      throw err;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      if (snapshot) return snapshot;
      return null;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    // Add timestamp overlay
    ctx.drawImage(video, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
    ctx.fillStyle = '#fff';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText(`🛡️ Safety Alert — ${new Date().toLocaleString()}`, 8, canvas.height - 14);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    setSnapshot(dataUrl);
    onCapture?.(dataUrl);
    return dataUrl;
  }, [onCapture, snapshot]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    start: startCamera,
    stop: stopCamera,
    capture: () => {
      if (!active) {
        // If not active, try starting it first, wait a short delay, then capture
        return startCamera()
          .then(() => {
            return new Promise((resolve) => {
              setTimeout(() => {
                const img = capturePhoto();
                resolve(img);
              }, 1000);
            });
          })
          .catch(() => null);
      }
      return Promise.resolve(capturePhoto());
    }
  }));

  useEffect(() => {
    if (autoStart) {
      startCamera().catch(() => {});
    }
    return () => stopCamera();
  }, [autoStart, startCamera, stopCamera]);

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>📷 Live Camera Feed</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Active monitoring for visual evidence
          </div>
        </div>
        {!active && !snapshot && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={startCamera} style={{ width: 'auto' }}>
            Open Camera
          </button>
        )}
      </div>

      {active && (
        <div style={{ position: 'relative' }}>
          <video ref={videoRef} className="camera-preview" playsInline muted autoPlay style={{ width: '100%', borderRadius: 8, transform: 'scaleX(-1)' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={capturePhoto} style={{ flex: 1 }}>
              📸 Capture Snapshot
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={stopCamera} style={{ flex: 1 }}>
              ✕ Turn Off
            </button>
          </div>
        </div>
      )}

      {snapshot && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Last Captured Evidence:</div>
          <img src={snapshot} alt="Evidence snapshot" className="snapshot-preview" style={{ width: '100%', borderRadius: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSnapshot(null); startCamera(); }} style={{ flex: 1 }}>
              🔄 Reset Camera
            </button>
          </div>
        </div>
      )}

      {error && <div className="msg msg-error" style={{ marginTop: 8 }}>{error}</div>}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
});

export default CameraCapture;
