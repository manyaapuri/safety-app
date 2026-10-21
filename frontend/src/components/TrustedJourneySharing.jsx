import { useState, useEffect } from 'react';
import api from '../api';

export default function TrustedJourneySharing({ prefillData, onNavigateToPlanner, onNavigateToContacts }) {
  const [activeJourney, setActiveJourney] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Form state for creating journey
  const [form, setForm] = useState({
    startName: '',
    startLat: null,
    startLng: null,
    endName: '',
    endLat: null,
    endLng: null,
    distanceKm: 5,
    durationMin: 25,
    bufferMinutes: 15
  });

  // Apply prefill if coming from Journey Planner
  useEffect(() => {
    if (prefillData) {
      setForm((prev) => ({
        ...prev,
        startName: prefillData.startName || '',
        startLat: prefillData.startLat || null,
        startLng: prefillData.startLng || null,
        endName: prefillData.endName || '',
        endLat: prefillData.endLat || null,
        endLng: prefillData.endLng || null,
        distanceKm: prefillData.distanceKm || 5,
        durationMin: prefillData.durationMin || 25
      }));
    }
  }, [prefillData]);

  // Load active journey
  const loadActiveJourney = async () => {
    try {
      const { data } = await api.get('/journeys/active');
      if (data.journey) {
        setActiveJourney(data.journey);
        setShareUrl(data.shareUrl || '');
      } else {
        setActiveJourney(null);
        setShareUrl('');
      }
    } catch (e) {
      console.warn('Failed to load active journey:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveJourney();
    const interval = setInterval(loadActiveJourney, 15000);
    return () => clearInterval(interval);
  }, []);

  // Start journey
  const handleStartJourney = async (e) => {
    e.preventDefault();
    if (!form.startName || !form.endName) {
      setStatusMsg('❌ Origin and Destination are required');
      return;
    }
    setActionLoading(true);
    setStatusMsg('');
    try {
      const { data } = await api.post('/journeys', form);
      setActiveJourney(data.journey);
      setShareUrl(data.shareUrl);
      setStatusMsg('✅ Journey started! Secure tracking link dispatched to your trusted contacts.');
    } catch (err) {
      setStatusMsg('❌ ' + (err.response?.data?.error || 'Failed to start journey'));
    } finally {
      setActionLoading(false);
    }
  };

  // Complete journey
  const handleCompleteJourney = async () => {
    if (!activeJourney) return;
    setActionLoading(true);
    try {
      await api.put(`/journeys/${activeJourney.id}/complete`);
      setStatusMsg('✅ Safely arrived! Journey completed and tracking access revoked.');
      setActiveJourney(null);
      setShareUrl('');
    } catch (err) {
      setStatusMsg('❌ Failed to complete journey');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel journey
  const handleCancelJourney = async () => {
    if (!activeJourney) return;
    setActionLoading(true);
    try {
      await api.put(`/journeys/${activeJourney.id}/cancel`);
      setStatusMsg('Journey cancelled. Tracking link has been deactivated.');
      setActiveJourney(null);
      setShareUrl('');
    } catch (err) {
      setStatusMsg('❌ Failed to cancel journey');
    } finally {
      setActionLoading(false);
    }
  };

  // Extend ETA
  const handleExtendJourney = async (mins = 15) => {
    if (!activeJourney) return;
    setActionLoading(true);
    try {
      const { data } = await api.put(`/journeys/${activeJourney.id}/extend`, { additionalMinutes: mins });
      setActiveJourney(data.journey);
      setStatusMsg(`✅ Journey extended by ${mins} minutes. New ETA: ${new Date(data.newExpectedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch {
      setStatusMsg('❌ Failed to extend journey');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>🤝 Trusted Journey Sharing</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Share your trip privately with emergency contacts with automatic overdue alerts.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`msg ${statusMsg.startsWith('✅') ? 'msg-success' : statusMsg.startsWith('❌') ? 'msg-error' : 'msg-info'}`}
          style={{ marginBottom: 14 }}
        >
          {statusMsg}
        </div>
      )}

      {/* Active Journey Card */}
      {activeJourney ? (
        <div className="glass-card glow" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="live-dot" />
                {activeJourney.status === 'overdue' ? '⚠️ OVERDUE' : 'ACTIVE TRIP'}
              </span>
              <div style={{ fontWeight: 800, fontSize: 17, marginTop: 6 }}>{activeJourney.title}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expected By:</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent-cyan)' }}>
                {new Date(activeJourney.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Route path details */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 13 }}>
            <div>📍 <strong>From:</strong> {activeJourney.start_name}</div>
            <div style={{ marginTop: 6 }}>🏁 <strong>To:</strong> {activeJourney.end_name}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              📏 {activeJourney.distance_km} km · Started: {new Date(activeJourney.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Secure Share Link */}
          {shareUrl && (
            <div style={{ marginBottom: 16 }}>
              <label className="input-label">Private Expiring Share Link</label>
              <div className="share-url-wrap">
                <input className="input" readOnly value={shareUrl} onClick={(e) => e.target.select()} />
                <button className="btn btn-primary btn-sm copy-btn" onClick={copyToClipboard}>
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`🛡️ I am traveling in Pune. Track my live journey safely here: ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}
                >
                  💬 Share via WhatsApp
                </a>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                🔒 This link expires automatically when you arrive. Does not expose past location history.
              </div>
            </div>
          )}

          {/* Journey Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="btn btn-success"
              style={{ fontWeight: 800, fontSize: 15 }}
              onClick={handleCompleteJourney}
              disabled={actionLoading}
            >
              ✅ I Have Arrived Safely (End Trip)
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleExtendJourney(15)}
                disabled={actionLoading}
                style={{ flex: 1 }}
              >
                ⏱️ Extend +15 mins
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleCancelJourney}
                disabled={actionLoading}
                style={{ flex: 1, color: 'var(--accent-red)' }}
              >
                ⏹ Cancel Trip
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Start New Journey Card */
        <div className="glass-card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Start a Protected Journey in Pune</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Set your destination and estimated arrival. Your emergency contacts will receive an SMS with a live, private tracking link.
          </p>

          <form onSubmit={handleStartJourney}>
            <div className="input-group">
              <label className="input-label">Origin Location</label>
              <input
                className="input"
                placeholder="e.g. Shivajinagar Bus Stand"
                value={form.startName}
                onChange={(e) => setForm({ ...form, startName: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Destination Location</label>
              <input
                className="input"
                placeholder="e.g. Hinjawadi Phase 1"
                value={form.endName}
                onChange={(e) => setForm({ ...form, endName: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Est. Travel Time (min)</label>
                <input
                  className="input"
                  type="number"
                  min="5"
                  max="300"
                  value={form.durationMin}
                  onChange={(e) => setForm({ ...form, durationMin: parseInt(e.target.value) || 20 })}
                  required
                />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Safety Buffer (min)</label>
                <input
                  className="input"
                  type="number"
                  min="5"
                  max="60"
                  value={form.bufferMinutes}
                  onChange={(e) => setForm({ ...form, bufferMinutes: parseInt(e.target.value) || 15 })}
                  required
                />
              </div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={actionLoading} style={{ width: '100%', marginTop: 6 }}>
              {actionLoading ? <><span className="spinner" /> Starting Journey…</> : '🚀 Start & Notify Trusted Contacts'}
            </button>
          </form>

          {onNavigateToPlanner && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: 8 }}
              onClick={onNavigateToPlanner}
            >
              🗺️ Plan with Pune Route Map & Facilities First
            </button>
          )}
        </div>
      )}

      {/* Trusted Contacts Notice */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>👥 Trusted Emergency Contacts</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Manage the people who receive your journey updates and SOS notifications.
          </div>
        </div>
        {onNavigateToContacts && (
          <button className="btn btn-secondary btn-sm" onClick={onNavigateToContacts}>
            Manage Contacts
          </button>
        )}
      </div>
    </div>
  );
}
