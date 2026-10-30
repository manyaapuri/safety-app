import { useState, useEffect } from 'react';
import { Navigation, Users, Copy, Check, MessageCircle, Clock, MapPin, CheckCircle, X, AlertCircle, Info, ChevronRight } from 'lucide-react';
import api from '../api';

export default function TrustedJourneySharing({ prefillData, onNavigateToPlanner, onNavigateToContacts }) {
  const [activeJourney, setActiveJourney] = useState(null);
  const [shareUrl, setShareUrl]           = useState('');
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus]               = useState({ msg: '', type: '' });
  const [copied, setCopied]               = useState(false);

  const [form, setForm] = useState({
    startName: '', startLat: null, startLng: null,
    endName: '',   endLat: null,   endLng: null,
    distanceKm: 5, durationMin: 25, bufferMinutes: 15,
  });

  const showStatus = (msg, type = 'success') => {
    setStatus({ msg, type });
    setTimeout(() => setStatus({ msg: '', type: '' }), 6000);
  };

  useEffect(() => {
    if (prefillData) {
      setForm((prev) => ({
        ...prev,
        startName: prefillData.startName || '',
        startLat:  prefillData.startLat  || null,
        startLng:  prefillData.startLng  || null,
        endName:   prefillData.endName   || '',
        endLat:    prefillData.endLat    || null,
        endLng:    prefillData.endLng    || null,
        distanceKm: prefillData.distanceKm || 5,
        durationMin: prefillData.durationMin || 25,
      }));
    }
  }, [prefillData]);

  const loadActiveJourney = async () => {
    try {
      const { data } = await api.get('/journeys/active');
      setActiveJourney(data.journey || null);
      setShareUrl(data.shareUrl || '');
    } catch { /* handled */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadActiveJourney();
    const interval = setInterval(loadActiveJourney, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleStartJourney = async (e) => {
    e.preventDefault();
    if (!form.startName || !form.endName) { showStatus('Origin and destination are required.', 'error'); return; }
    setActionLoading(true);
    try {
      const { data } = await api.post('/journeys', form);
      setActiveJourney(data.journey);
      setShareUrl(data.shareUrl);
      showStatus('Journey started. Secure tracking link sent to your trusted contacts.');
    } catch (err) {
      showStatus(err.response?.data?.error || 'Failed to start journey.', 'error');
    } finally { setActionLoading(false); }
  };

  const handleCompleteJourney = async () => {
    if (!activeJourney) return;
    setActionLoading(true);
    try {
      await api.put(`/journeys/${activeJourney.id}/complete`);
      showStatus('Safely arrived. Journey completed and tracking access revoked.');
      setActiveJourney(null); setShareUrl('');
    } catch { showStatus('Failed to complete journey.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleCancelJourney = async () => {
    if (!activeJourney) return;
    setActionLoading(true);
    try {
      await api.put(`/journeys/${activeJourney.id}/cancel`);
      showStatus('Journey cancelled. Tracking link deactivated.', 'info');
      setActiveJourney(null); setShareUrl('');
    } catch { showStatus('Failed to cancel journey.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleExtendJourney = async (mins = 15) => {
    if (!activeJourney) return;
    setActionLoading(true);
    try {
      const { data } = await api.put(`/journeys/${activeJourney.id}/extend`, { additionalMinutes: mins });
      setActiveJourney(data.journey);
      showStatus(`Journey extended by ${mins} min. New ETA: ${new Date(data.newExpectedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch { showStatus('Failed to extend journey.', 'error'); }
    finally { setActionLoading(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>;

  return (
    <div>
      {status.msg && (
        <div className={`msg ${status.type === 'success' ? 'msg-success' : status.type === 'error' ? 'msg-error' : 'msg-info'}`} style={{ marginBottom: 14 }}>
          {status.type === 'success' ? <CheckCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
           : status.type === 'error'  ? <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
           : <Info size={14} strokeWidth={2} style={{ flexShrink: 0 }} />}
          {status.msg}
        </div>
      )}

      {/* Active journey */}
      {activeJourney ? (
        <div className="glass-card" style={{ borderColor: activeJourney.status === 'overdue' ? 'var(--amber-100)' : 'var(--rose-200)', marginBottom: 16 }}>
          {/* Status header */}
          <div className="row-between" style={{ marginBottom: 14 }}>
            <div>
              <span className={`badge ${activeJourney.status === 'overdue' ? 'badge-amber' : 'badge-green'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <span className="live-dot" style={{ background: activeJourney.status === 'overdue' ? 'var(--amber-600)' : undefined }} />
                {activeJourney.status === 'overdue' ? 'Overdue' : 'Active trip'}
              </span>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {activeJourney.title}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expected by</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--rose-600)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {new Date(activeJourney.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Route */}
          <div style={{ background: 'var(--neutral-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <MapPin size={13} strokeWidth={2} color="var(--green-600)" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)' }}><strong>From:</strong> {activeJourney.start_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Navigation size={13} strokeWidth={2} color="var(--red-600)" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)' }}><strong>To:</strong> {activeJourney.end_name}</span>
            </div>
            {activeJourney.distance_km && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} strokeWidth={2} />
                {activeJourney.distance_km} km · Started {new Date(activeJourney.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          {/* Share link */}
          {shareUrl && (
            <div style={{ marginBottom: 14 }}>
              <label className="input-label">Private expiring share link</label>
              <div className="share-url-wrap" style={{ marginBottom: 8 }}>
                <input className="input" readOnly value={shareUrl} onClick={(e) => e.target.select()} style={{ fontSize: 12 }} />
                <button className="btn btn-primary btn-sm copy-btn" onClick={copyToClipboard}>
                  {copied ? <><Check size={13} strokeWidth={2.5} /> Copied</> : <><Copy size={13} strokeWidth={2} /> Copy</>}
                </button>
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`I'm traveling in Pune. Follow my journey safely here: ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: 'none', gap: 6 }}
              >
                <MessageCircle size={13} strokeWidth={2} /> Share via WhatsApp
              </a>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                Link expires automatically when you arrive. Does not expose past location history.
              </p>
            </div>
          )}

          {/* Actions */}
          <button className="btn btn-success" style={{ fontWeight: 800, marginBottom: 8 }} onClick={handleCompleteJourney} disabled={actionLoading}>
            <CheckCircle size={16} strokeWidth={2.5} /> I have arrived safely
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => handleExtendJourney(15)} disabled={actionLoading} style={{ flex: 1 }}>
              <Clock size={13} strokeWidth={2} /> Extend +15 min
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleCancelJourney} disabled={actionLoading} style={{ flex: 1, color: 'var(--red-600)' }}>
              <X size={13} strokeWidth={2} /> Cancel trip
            </button>
          </div>
        </div>
      ) : (
        /* Start journey form */
        <div className="glass-card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>Start a protected journey</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Set your destination and estimated arrival. Trusted contacts will receive an SMS with a live private tracking link.
          </p>
          <form onSubmit={handleStartJourney}>
            <div className="input-group">
              <label className="input-label" htmlFor="js-start">Origin</label>
              <input id="js-start" className="input" placeholder="e.g. Shivajinagar Bus Stand" value={form.startName} onChange={(e) => setForm({ ...form, startName: e.target.value })} required />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="js-end">Destination</label>
              <input id="js-end" className="input" placeholder="e.g. Hinjawadi Phase 1" value={form.endName} onChange={(e) => setForm({ ...form, endName: e.target.value })} required />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label" htmlFor="js-dur">Travel time (min)</label>
                <input id="js-dur" className="input" type="number" min="5" max="300" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: parseInt(e.target.value) || 25 })} required />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label" htmlFor="js-buf">Safety buffer (min)</label>
                <input id="js-buf" className="input" type="number" min="5" max="60" value={form.bufferMinutes} onChange={(e) => setForm({ ...form, bufferMinutes: parseInt(e.target.value) || 15 })} required />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={actionLoading}>
              {actionLoading
                ? <><span className="spinner" style={{ width: 15, height: 15 }} /> Starting…</>
                : <><Navigation size={15} strokeWidth={2.5} /> Start &amp; notify contacts</>}
            </button>
          </form>

          {onNavigateToPlanner && (
            <button type="button" className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={onNavigateToPlanner}>
              Plan with route map first <ChevronRight size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      {/* Contacts notice */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--rose-50)', border: '1px solid var(--rose-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={16} strokeWidth={1.75} color="var(--rose-600)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Trusted contacts</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Manage who receives journey updates</div>
          </div>
        </div>
        {onNavigateToContacts && (
          <button className="btn btn-secondary btn-sm" onClick={onNavigateToContacts}>Manage</button>
        )}
      </div>
    </div>
  );
}
