import { useState, useRef, useCallback, useEffect } from 'react';
import { Phone, AlertCircle, CheckCircle, RotateCcw, Camera, Mic, ChevronRight } from 'lucide-react';
import api from '../api';
import VoiceSOS from './VoiceSOS';
import CameraCapture from './CameraCapture';

const COUNTDOWN_SECONDS = 5;

const VERIFIED_HOTLINES = [
  { name: 'National Emergency', number: '112',  desc: 'Police / Medical / Fire' },
  { name: 'Women Helpline',     number: '1091', desc: 'Pune Police Bharosa Cell' },
  { name: 'Police Control',     number: '100',  desc: 'Direct Police Control Room' },
  { name: 'Ambulance',          number: '108',  desc: 'Emergency Medical Services' },
];

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true, timeout: 2500, maximumAge: 3000,
    });
  });
}

export default function SOSButton() {
  const [loading, setLoading]               = useState(false);
  const [countdown, setCountdown]           = useState(null);
  const [lastAlert, setLastAlert]           = useState(null);
  const [deliveries, setDeliveries]         = useState([]);
  const [policeStatus, setPoliceStatus]     = useState(null);
  const [statusMsg, setStatusMsg]           = useState('');
  const [statusType, setStatusType]         = useState('');
  const [retrying, setRetrying]             = useState(false);
  const [enableCamera, setEnableCamera]     = useState(false);
  const [capturedPhoto, setCapturedPhoto]   = useState(null);

  const countdownRef      = useRef(null);
  const pendingOptsRef    = useRef(null);
  const cameraRef         = useRef(null);
  const idempotencyKeyRef = useRef(null);

  const hasPendingDeliveries = deliveries.some((d) => ['queued', 'processing'].includes(d.status));

  /* ── Poll delivery status ── */
  useEffect(() => {
    if (!lastAlert?.id || !hasPendingDeliveries) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const { data } = await api.get(`/sos/deliveries/${lastAlert.id}`);
        if (!active || !Array.isArray(data) || !data.length) return;
        setDeliveries(data);
        if (data.every((d) => !['queued', 'processing'].includes(d.status))) {
          const accepted  = data.filter((d) => ['sent', 'accepted'].includes(d.status)).length;
          const simulated = data.filter((d) => d.status === 'simulated').length;
          const failed    = data.filter((d) => d.status === 'failed').length;
          const unavail   = data.filter((d) => d.status === 'unavailable').length;
          setStatusMsg(`Delivery: ${accepted} accepted, ${simulated} simulated, ${failed} failed, ${unavail} unavailable.`);
          setStatusType(failed || unavail ? 'error' : simulated && !accepted ? 'info' : 'success');
        }
      } catch { /* non-critical */ }
    };
    const interval = setInterval(refresh, 1500);
    return () => { active = false; clearInterval(interval); };
  }, [lastAlert?.id, hasPendingDeliveries]);

  const cancelCountdown = useCallback(() => {
    clearInterval(countdownRef.current);
    setCountdown(null);
    pendingOptsRef.current = null;
    setStatusMsg('SOS countdown cancelled.');
    setStatusType('info');
    setTimeout(() => setStatusMsg(''), 3000);
  }, []);

  const dispatchSOS = useCallback(async (opts = {}) => {
    setLoading(true);
    setStatusMsg('Acquiring GPS coordinates…');
    setStatusType('info');
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = globalThis.crypto?.randomUUID?.() || `sos-${Date.now()}`;
    }
    const idempotencyKey = idempotencyKeyRef.current;

    let latitude = null, longitude = null, accuracy = null, locationRecordedAt = null, gpsSuccess = false;
    try {
      const pos = await getCurrentPosition();
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
      accuracy = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null;
      locationRecordedAt = new Date(pos.timestamp || Date.now()).toISOString();
      gpsSuccess = true;
    } catch (gpsErr) {
      console.warn('GPS failed:', gpsErr.message);
      setStatusMsg('GPS unavailable. Sending SOS without location — use direct dial below.');
    }

    let photo = null;
    if (enableCamera && cameraRef.current) {
      try { photo = await cameraRef.current.capture(); setCapturedPhoto(photo); } catch { /* non-critical */ }
    }

    setStatusMsg('Saving alert and dispatching to contacts…');
    try {
      const { data } = await api.post('/sos', {
        latitude, longitude, accuracy, location_recorded_at: locationRecordedAt,
        address: null, type: opts.triggerType || 'manual',
        trigger_type: opts.triggerType || 'manual',
        voice_phrase: opts.voicePhrase || null, photo_base64: photo,
      }, { headers: { 'Idempotency-Key': idempotencyKey } });
      idempotencyKeyRef.current = null;

      setLastAlert(data.alert);
      setDeliveries(data.deliveries || []);
      setPoliceStatus(data.policeStatus || null);

      const sentCount   = (data.deliveries || []).filter((d) => d.status === 'sent').length;
      const queuedCount = (data.deliveries || []).filter((d) => d.status === 'queued').length;
      const simCount    = (data.deliveries || []).filter((d) => d.status === 'simulated').length;
      const failCount   = (data.deliveries || []).filter((d) => d.status === 'failed').length;

      let msg = 'Alert logged. ';
      if (!gpsSuccess)      msg += 'Location unavailable. ';
      if (sentCount > 0)    msg += `${sentCount} SMS sent. `;
      if (queuedCount > 0)  msg += `${queuedCount} SMS queued (delivery unconfirmed). `;
      if (simCount > 0)     msg += `${simCount} simulated (Dev mode). `;
      if (failCount > 0)    msg += `${failCount} delivery failed. `;
      if (data.contactsTotal === 0) msg += 'No emergency contacts configured. ';

      setStatusMsg(msg);
      setStatusType(failCount > 0 ? 'error' : queuedCount > 0 ? 'info' : 'success');
    } catch (err) {
      setStatusMsg(err.response?.data?.error || 'Failed to dispatch SOS. Use direct dial below.');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  }, [enableCamera]);

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

  const handleVoiceTrigger = useCallback((phrase) => {
    dispatchSOS({ triggerType: 'voice', voicePhrase: phrase });
  }, [dispatchSOS]);

  const handleRetryDeliveries = async () => {
    if (!lastAlert) return;
    setRetrying(true);
    try {
      const { data } = await api.post(`/sos/${lastAlert.id}/retry`);
      setDeliveries(data.retryDeliveries || []);
      setStatusMsg(data.retryDeliveries?.length
        ? 'Retry queued. Status will update shortly.'
        : data.message || 'No failed notifications eligible for retry.');
      setStatusType(data.retryDeliveries?.length ? 'info' : 'error');
    } catch (err) {
      setStatusMsg('Retry failed: ' + (err.response?.data?.error || err.message));
      setStatusType('error');
    } finally {
      setRetrying(false); }
  };

  useEffect(() => () => clearInterval(countdownRef.current), []);

  const deliveryStatusLabel = (d) => {
    if (d.status === 'sent')        return <span className="badge badge-green">Delivered</span>;
    if (d.status === 'accepted')    return <span className="badge badge-amber">Accepted (unconfirmed)</span>;
    if (d.status === 'queued')      return <span className="badge badge-amber">Queued</span>;
    if (d.status === 'processing')  return <span className="badge badge-amber">Sending…</span>;
    if (d.status === 'simulated')   return <span className="badge badge-amber">Simulated (Dev)</span>;
    if (d.status === 'unavailable') return <span className="badge badge-red">Unavailable</span>;
    if (d.status === 'failed')      return <span className="badge badge-red">Failed</span>;
    return <span className="badge badge-neutral">{d.status}</span>;
  };

  return (
    <div className="glass-card glow" style={{ marginBottom: 16 }}>
      {/* Header */}
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Emergency SOS</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Pune 24/7 response</div>
        </div>
        <span className="badge badge-red">Live</span>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
        Press to capture your location, alert trusted contacts, and access verified emergency services.
      </p>

      {/* SOS Button */}
      <div className="sos-wrapper">
        <div className="sos-ring-outer">
          {!loading && <><div className="sos-pulse-ring" /><div className="sos-pulse-ring" /></>}
          <button
            className={`sos-btn ${loading ? 'loading' : ''}`}
            onClick={() => startCountdown({ triggerType: 'manual' })}
            disabled={loading || countdown !== null}
            id="sos-main-button"
            aria-label={
              loading ? 'Sending emergency SOS'
              : countdown !== null ? `SOS will send in ${countdown} seconds`
              : 'Start emergency SOS countdown'
            }
          >
            {loading ? (
              <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            ) : countdown !== null ? (
              <span style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, letterSpacing: '-2px' }}>{countdown}</span>
            ) : (
              <>SOS<span className="sos-btn-label">PRESS</span></>
            )}
          </button>
        </div>

        {countdown !== null && (
          <div className="sos-countdown" role="status" aria-live="assertive">
            <div className="countdown-number">{countdown}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Dispatching SOS in {countdown}s
            </div>
            <button className="btn btn-secondary btn-sm" onClick={cancelCountdown} style={{ marginTop: 4 }}>
              Cancel
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
          {statusType === 'success' ? <CheckCircle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
           : statusType === 'error' ? <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
           : null}
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Delivery Breakdown */}
      {deliveries.length > 0 && (
        <div style={{ marginTop: 14, background: 'var(--neutral-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', padding: 12 }}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Delivery status</span>
            {deliveries.some((d) => d.status === 'failed') && (
              <button className="btn btn-secondary btn-xs" onClick={handleRetryDeliveries} disabled={retrying}>
                <RotateCcw size={12} strokeWidth={2} />
                {retrying ? 'Retrying…' : 'Retry failed'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {deliveries.map((d, i) => (
              <div key={i} className="row-between" style={{ fontSize: 12, padding: '6px 8px', background: 'var(--neutral-0)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name || d.phone}</span>
                {deliveryStatusLabel(d)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Police Status */}
      {policeStatus && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', padding: '8px 10px', background: 'var(--neutral-50)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-subtle)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Police dispatch:</strong>{' '}
          {policeStatus.dispatched
            ? <span style={{ color: 'var(--green-600)' }}>Dispatched (Ref: {policeStatus.refId})</span>
            : <span>{policeStatus.reason}</span>}
        </div>
      )}

      {/* Direct Dial */}
      <div style={{ marginTop: 20 }}>
        <div className="section-title" style={{ marginBottom: 10 }}>Direct emergency dial</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {VERIFIED_HOTLINES.map((h) => (
            <a
              key={h.number}
              href={`tel:${h.number}`}
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--neutral-0)',
                border: '1px solid var(--border-default)',
                borderLeft: '3px solid var(--red-600)',
                borderRadius: 'var(--r-md)',
                transition: 'background var(--t-fast) var(--ease)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--red-50)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--neutral-0)'}
            >
              <Phone size={14} strokeWidth={2.5} color="var(--red-600)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{h.number}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{h.name}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="divider" style={{ margin: '18px 0' }} />

      {/* Voice SOS */}
      <VoiceSOS onTrigger={handleVoiceTrigger} disabled={loading} />

      {/* Camera Evidence */}
      <div style={{ marginTop: 14 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Camera size={15} strokeWidth={2} color="var(--text-muted)" />
              Camera evidence
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Capture a photo when SOS is triggered. Off by default.
            </div>
          </div>
          <button
            type="button"
            className={`btn btn-sm ${enableCamera ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setEnableCamera(!enableCamera)}
          >
            {enableCamera ? 'On' : 'Off'}
          </button>
        </div>
        {enableCamera && <CameraCapture ref={cameraRef} onCapture={(b64) => setCapturedPhoto(b64)} />}
      </div>
    </div>
  );
}
