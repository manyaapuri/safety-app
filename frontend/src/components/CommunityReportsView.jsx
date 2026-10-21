import { useState, useEffect } from 'react';
import api from '../api';

const CATEGORIES = [
  { id: 'poor_lighting', label: 'Dark / Unlit Street', icon: '🌑' },
  { id: 'harassment', label: 'Reported Harassment', icon: '😡' },
  { id: 'isolated_street', label: 'Isolated Road', icon: '🚧' },
  { id: 'deserted_path', label: 'Deserted Footpath', icon: '🚶‍♀️' },
  { id: 'other', label: 'Other Hazard', icon: '⚠️' }
];

export default function CommunityReportsView() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const [form, setForm] = useState({
    title: '',
    category: 'poor_lighting',
    description: '',
    address: '',
    latitude: 18.5204,
    longitude: 73.8567
  });

  const loadReports = async () => {
    try {
      const { data } = await api.get('/reports');
      setReports(data);
    } catch (e) {
      console.error('Failed to load reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          address: f.address || 'My Current GPS Location'
        }));
        setStatusMsg('📍 GPS location captured.');
      },
      (err) => setStatusMsg('❌ Location error: ' + err.message)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) {
      setStatusMsg('❌ Title is required');
      return;
    }

    setSubmitting(true);
    setStatusMsg('');
    try {
      const { data } = await api.post('/reports', form);
      setStatusMsg(data.message || '✅ Community report posted successfully.');
      setShowForm(false);
      setForm({
        title: '',
        category: 'poor_lighting',
        description: '',
        address: '',
        latitude: 18.5204,
        longitude: 73.8567
      });
      loadReports();
    } catch (err) {
      setStatusMsg('❌ ' + (err.response?.data?.error || 'Failed to submit report'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (id) => {
    try {
      await api.post(`/reports/${id}/confirm`);
      loadReports();
    } catch {
      // ignore
    }
  };

  const handleAbuse = async (id) => {
    try {
      await api.post(`/reports/${id}/abuse`);
      setStatusMsg('Flag registered. Reports with multiple flags are queued for moderation.');
      loadReports();
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>📢 Community Safety Reports</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Crowdsourced safety concerns across Pune (poor lighting, deserted stretches).
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm(!showForm)}
          style={{ whiteSpace: 'nowrap' }}
        >
          {showForm ? '✕ Close' : '+ Report Issue'}
        </button>
      </div>

      {statusMsg && (
        <div
          className={`msg ${statusMsg.startsWith('✅') ? 'msg-success' : statusMsg.startsWith('❌') ? 'msg-error' : 'msg-info'}`}
          style={{ marginBottom: 14 }}
        >
          {statusMsg}
        </div>
      )}

      {/* Submission Form */}
      {showForm && (
        <div className="glass-card" style={{ marginBottom: 18, border: '1px solid var(--accent-purple)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Report a Safety Hazard in Pune</h3>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Issue Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Title / Brief Description *</label>
              <input
                className="input"
                placeholder="e.g. Broken streetlights along riverbed road"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Locality / Address in Pune</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="input"
                  placeholder="e.g. Near Shivajinagar Railway Gate"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={useCurrentLocation}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  📍 Current GPS
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Additional Context (Optional)</label>
              <textarea
                className="input"
                rows="2"
                placeholder="Mention specific timings, landmark references or observations…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? <><span className="spinner" /> Submitting…</> : '📢 Post Verified Report'}
            </button>
          </form>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            ℹ️ Duplicate submissions within 150m are automatically grouped to highlight priority areas without duplicate clutter.
          </div>
        </div>
      )}

      {/* Reports Listing */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : reports.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
          <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No active community reports logged</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Report unlit areas or isolated streets to alert other women traveling in Pune.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map((r) => {
            const cat = CATEGORIES.find((c) => c.id === r.category) || { label: r.category, icon: '⚠️' };
            return (
              <div key={r.id} className="glass-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{cat.icon}</span>
                      <strong style={{ fontSize: 14 }}>{r.title}</strong>
                    </div>
                    {r.address && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        📍 {r.address}
                      </div>
                    )}
                  </div>
                  <span className="badge badge-yellow" style={{ fontSize: 11 }}>
                    {cat.label}
                  </span>
                </div>

                {r.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0', lineHeight: 1.4 }}>
                    "{r.description}"
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'var(--text-muted)' }}>
                  <div>
                    👍 {r.verification_count} user{r.verification_count !== 1 ? 's' : ''} confirmed
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={() => handleConfirm(r.id)}
                    >
                      👍 Confirm Issue
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)' }}
                      onClick={() => handleAbuse(r.id)}
                    >
                      🚩 Flag
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Community Disclaimer */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
        🔒 Community reports represent localized observations and expire after 30 days unless confirmed. Always rely on official emergency numbers (112 / 1091) in dangerous situations.
      </div>
    </div>
  );
}
