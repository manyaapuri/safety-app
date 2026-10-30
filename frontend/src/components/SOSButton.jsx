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
      timeout: 2500,
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
  const idempotencyKeyRef = useRef(null);
  const hasPendingDeliveries = deliveries.some((delivery) => ['queued', 'processing'].includes(delivery.status));

  useEffect(() => {
    if (!lastAlert?.id || !hasPendingDeliveries) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const { data } = await api.get(`/sos/deliveries/${lastAlert.id}`);
        if (!active || !Array.isArray(data) || data.length === 0) return;
        setDeliveries(data);
        if (data.every((delivery) => !['queued', 'processing'].includes(delivery.status))) {
          const accepted = data.filter((delivery) => ['sent', 'accepted'].includes(delivery.status)).length;
          const simulated = data.filter((delivery) => delivery.status === 'simulated').length;
          const failed = data.filter((delivery) => delivery.status === 'failed').length;
          const unavailable = data.filter((delivery) => delivery.status === 'unavailable').length;
          setStatusMsg(`Delivery update: ${accepted} provider accepted, ${simulated} simulated, ${failed} failed, ${unavailable} unavailable.`);
          setStatusType(failed || unavailable ? 'error' : simulated && !accepted ? 'info' : 'success');
        }
      } catch (error) {
        console.warn('[sos] Could not refresh notification status:', error.message);
      }
    };
    const interval = setInterval(refresh, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [lastAlert?.id, hasPendingDeliveries]);

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
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = globalThis.crypto?.randomUUID?.() || `sos-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    const idempotencyKey = idempotencyKeyRef.current;

    let latitude = null;
    let longitude = null;
    let accuracy = null;
    let locationRecordedAt = null;
    let gpsSuccess = false;

    try {
      const pos = await getCurrentPosition();
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
      accuracy = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null;
      locationRecordedAt = new Date(pos.timestamp || Date.now()).toISOString();
      gpsSuccess = true;
    } catch (gpsErr) {
      console.warn('GPS acquisition failed:', gpsErr.message);
      setStatusMsg('⚠️ GPS unavailable. Sending SOS without a location; you can still call 112 below.');
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
        accuracy,
        location_recorded_at: locationRecordedAt,
        address: null,
        type: opts.triggerType || 'manual',
        trigger_type: opts.triggerType || 'manual',
        voice_phrase: opts.voicePhrase || null,
        photo_base64: photo
      }, { headers: { 'Idempotency-Key': idempotencyKey } });
      idempotencyKeyRef.current = null;

      setLastAlert(data.alert);
      setDeliveries(data.deliveries || []);
      setPoliceStatus(data.policeStatus || null);

      const sentCount = (data.deliveries || []).filter((d) => d.status === 'sent').length;
      const queuedCount = (data.deliveries || []).filter((d) => d.status === 'queued').length;
      const simCount = (data.deliveries || []).filter((d) => d.status === 'simulated').length;
      const failCount = (data.deliveries || []).filter((d) => d.status === 'failed').length;

      let msg = `🆘 Alert logged! `;
      if (!gpsSuccess) msg += 'Location unavailable. ';
      if (sentCount > 0) msg += `${sentCount} SMS sent live. `;
      if (queuedCount > 0) msg += `${queuedCount} SMS accepted by the provider; delivery is not confirmed. `;
      if (simCount > 0) msg += `${simCount} simulated SMS logged (Dev mode). `;
      if (failCount > 0) msg += `${failCount} delivery failed. `;
      if ((data.deliveries || []).some((d) => ['queued', 'processing'].includes(d.status))) msg += 'Contact notifications are queued; status will update here. ';
      if (data.contactsTotal === 0) msg += `No emergency contacts configured. `;
      else if (data.notificationTargets === 0) msg += 'No notification channels are enabled for your contacts. ';

      setStatusMsg(msg);
      setStatusType(failCount > 0 ? 'error' : queuedCount > 0 ? 'info' : 'success');
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
      setStatusMsg(data.retryDeliveries?.length
        ? 'Notification retry queued. Delivery is not confirmed until its status updates.'
        : data.message || 'No failed notifications are eligible for retry.');
      setStatusType(data.retryDeliveries?.length ? 'info' : 'error');
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
            aria-label={loading ? 'Sending emergency SOS' : countdown !== null ? `Emergency SOS will send in ${countdown} seconds` : 'Start emergency SOS countdown'}
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
          <div className="sos-countdown" role="status" aria-live="assertive">
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
          role="status"
          aria-live="polite"
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
                  {d.status === 'sent' && <span className="badge badge-green">Delivered ({d.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'})</span>}
                  {d.status === 'queued' && <span className="badge badge-yellow">Queued (delivery unconfirmed)</span>}
                  {d.status === 'processing' && <span className="badge badge-yellow">Sending…</span>}
                  {d.status === 'accepted' && <span className="badge badge-yellow">Accepted by provider (delivery unconfirmed)</span>}
                  {d.status === 'simulated' && <span className="badge badge-yellow">Simulated (Dev)</span>}
                  {d.status === 'unavailable' && <span className="badge badge-red">Unavailable: {d.error || `${d.channel} is not configured`}</span>}
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
