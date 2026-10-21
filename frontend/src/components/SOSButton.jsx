import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../api';
import VoiceSOS from './VoiceSOS';
import CameraCapture from './CameraCapture';

const COUNTDOWN_SECONDS = 5;

const VERIFIED_HOTLINES = [
  { name: 'National Emergency', number: '112', desc: 'Police / Medical / Fire' },
  { name: 'Pune Women Helpline', number: '1091', desc: 'Pune Police Bharosa Cell' },
  { name: 'Police Control', number: '100', desc: 'Direct Police Control Room' },
  { name: 'Ambulance', number: '108', desc: 'Emergency Medical Services' }
];

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 3000
    });
  });
}

export default function SOSButton() {
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [lastAlert, setLastAlert] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [policeStatus, setPoliceStatus] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [enableCamera, setEnableCamera] = useState(false); // Off by default as required
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  const countdownRef = useRef(null);
  const pendingOptsRef = useRef(null);
  const cameraRef = useRef(null);

  // Clear countdown
  const cancelCountdown = useCallback(() => {
    clearInterval(countdownRef.current);
    setCountdown(null);
    pendingOptsRef.current = null;
    setStatusMsg('✅ SOS countdown cancelled.');
    setStatusType('info');
    setTimeout(() => setStatusMsg(''), 3000);
  }, []);

  // Dispatch SOS
  const dispatchSOS = useCallback(async (opts = {}) => {
    setLoading(true);
    setStatusMsg('📍 Acquiring GPS coordinates…');
    setStatusType('info');

    let latitude = 18.5204; // Pune fallback
    let longitude = 73.8567;
    let gpsSuccess = false;

    try {
      const pos = await getCurrentPosition();
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
      gpsSuccess = true;
    } catch (gpsErr) {
      console.warn('GPS acquisition failed:', gpsErr.message);
      setStatusMsg('⚠️ GPS unavailable. Dispatching SOS with fallback Pune coordinates.');
    }

    // Capture photo ONLY if user explicitly enabled camera evidence
    let photo = null;
    if (enableCamera && cameraRef.current) {
      try {
        photo = await cameraRef.current.capture();
        setCapturedPhoto(photo);
      } catch (camErr) {
        console.warn('Camera capture failed:', camErr);
      }
    }

    setStatusMsg('📡 Saving alert to database & dispatching to contacts…');

    try {
      const { data } = await api.post('/sos', {
        latitude,
        longitude,
        address: gpsSuccess ? null : 'Pune (GPS approximate)',
        type: opts.triggerType || 'manual',
        trigger_type: opts.triggerType || 'manual',
        voice_phrase: opts.voicePhrase || null,
        photo_base64: photo
      });

      setLastAlert(data.alert);
      setDeliveries(data.deliveries || []);
      setPoliceStatus(data.policeStatus || null);

      const sentCount = (data.deliveries || []).filter((d) => d.status === 'sent').length;
      const simCount = (data.deliveries || []).filter((d) => d.status === 'simulated').length;
      const failCount = (data.deliveries || []).filter((d) => d.status === 'failed').length;

      let msg = `🆘 Alert logged! `;
      if (sentCount > 0) msg += `${sentCount} SMS sent live. `;
      if (simCount > 0) msg += `${simCount} simulated SMS logged (Dev mode). `;
      if (failCount > 0) msg += `${failCount} delivery failed. `;
      if (data.contactsTotal === 0) msg += `No emergency contacts configured. `;

      setStatusMsg(msg);
      setStatusType(failCount > 0 ? 'error' : 'success');
    } catch (err) {
      setStatusMsg(err.response?.data?.error || 'Failed to dispatch SOS. Please use direct emergency dial below.');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  }, [enableCamera]);

  // Start cancellable countdown
  const startCountdown = useCallback((opts = {}) => {
    if (loading || countdown !== null) return;
    pendingOptsRef.current = opts;
    setCountdown(COUNTDOWN_SECONDS);
    let remaining = COUNTDOWN_SECONDS;

    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        setCountdown(null);
        dispatchSOS(pendingOptsRef.current || {});
        pendingOptsRef.current = null;
      }
    }, 1000);
  }, [loading, countdown, dispatchSOS]);

  // Voice SOS trigger
  const handleVoiceTrigger = useCallback((phrase) => {
    // Voice emergency triggers immediately
    dispatchSOS({ triggerType: 'voice', voicePhrase: phrase });
  }, [dispatchSOS]);

  // Retry failed deliveries without duplicate alert
  const handleRetryDeliveries = async () => {
    if (!lastAlert) return;
    setRetrying(true);
    try {
      const { data } = await api.post(`/sos/${lastAlert.id}/retry`);
      setDeliveries(data.retryDeliveries || []);
      setStatusMsg('✅ Retried notification deliveries. Check honest delivery status below.');
      setStatusType('success');
    } catch (err) {
      setStatusMsg('❌ Retry failed: ' + (err.response?.data?.error || err.message));
      setStatusType('error');
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => () => clearInterval(countdownRef.current), []);

  return (
    <div className="glass-card glow" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>🚨 Emergency SOS</h2>
        <span className="badge badge-red">Pune 24/7 Response</span>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
        Press the button to capture your location, alert your trusted contacts, and access verified Indian emergency services.
      </p>

      {/* SOS Button Ring */}
      <div className="sos-wrapper">
        <div className="sos-ring-outer">
          {!loading && (
            <>
              <div className="sos-pulse-ring" />
              <div className="sos-pulse-ring" />
            </>
          )}
          <button
            className={`sos-btn ${loading ? 'loading' : ''}`}
            onClick={() => startCountdown({ triggerType: 'manual' })}
            disabled={loading || countdown !== null}
            id="sos-main-button"
          >
            {loading ? (
              <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            ) : countdown !== null ? (
              <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>{countdown}</span>
            ) : (
              <>
                SOS
                <br />
                <span className="sos-btn-label">PRESS</span>
              </>
            )}
          </button>
        </div>

        {countdown !== null && (
          <div className="sos-countdown">
            <div className="countdown-number">{countdown}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Dispatching SOS in {countdown}s…
            </div>
            <button className="btn btn-secondary btn-sm" onClick={cancelCountdown} style={{ marginTop: 4 }}>
              ✕ Cancel Emergency Alert
            </button>
          </div>
        )}
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div
          className={`msg ${statusType === 'success' ? 'msg-success' : statusType === 'error' ? 'msg-error' : 'msg-info'}`}
          style={{ marginTop: 14 }}
        >
          {statusMsg}
        </div>
      )}

      {/* Honest Delivery States */}
      {deliveries.length > 0 && (
        <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📋 Honest Delivery Status Breakdown:</span>
            {deliveries.some((d) => d.status === 'failed') && (
              <button className="btn btn-secondary btn-sm" onClick={handleRetryDeliveries} disabled={retrying} style={{ fontSize: 11, padding: '3px 8px' }}>
                {retrying ? 'Retrying…' : '🔄 Retry Failed'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {deliveries.map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  padding: '6px 8px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 6
                }}
              >
                <div>
                  <strong>{d.name || d.phone}:</strong> {d.phone}
                </div>
                <div>
                  {d.status === 'sent' && <span className="badge badge-green">Sent (Twilio)</span>}
                  {d.status === 'simulated' && <span className="badge badge-yellow">Simulated (Dev)</span>}
                  {d.status === 'failed' && <span className="badge badge-red">Failed: {d.error}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Honest Police Status */}
      {policeStatus && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 6 }}>
          🚔 <strong>Police Dispatch Status:</strong>{' '}
          {policeStatus.dispatched ? (
            <span style={{ color: 'var(--accent-green)' }}>Dispatched to police endpoint (Ref: {policeStatus.refId})</span>
          ) : (
            <span>{policeStatus.reason}</span>
          )}
        </div>
      )}

      {/* Direct Emergency Call Actions (Verified Indian Numbers) */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          📞 Direct Emergency Calling (One-Tap Dial):
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {VERIFIED_HOTLINES.map((h) => (
            <a
              key={h.number}
              href={`tel:${h.number}`}
              className="btn btn-secondary btn-sm"
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '8px 10px',
                borderLeft: '3px solid var(--accent-red)'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>
                📞 Call {h.number}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {h.name}
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="divider" style={{ margin: '18px 0' }} />

      {/* Voice SOS Option */}
      <VoiceSOS onTrigger={handleVoiceTrigger} disabled={loading} />

      {/* Camera Evidence Option (Not enabled by default) */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>📷 Camera Evidence (Optional)</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Enable to snapshot evidence upon SOS trigger. Off by default.
            </div>
          </div>
          <button
            type="button"
            className={`btn btn-sm ${enableCamera ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setEnableCamera(!enableCamera)}
            style={{ fontSize: 11 }}
          >
            {enableCamera ? 'Enabled ✓' : 'Disabled ○'}
          </button>
        </div>

        {enableCamera && <CameraCapture ref={cameraRef} onCapture={(b64) => setCapturedPhoto(b64)} />}
      </div>
    </div>
  );
}
