import { useState, useEffect } from 'react';
import { Plus, X, MapPin, ThumbsUp, Flag, AlertCircle, CheckCircle, Info, Lightbulb, AlertTriangle, Navigation } from 'lucide-react';
import api from '../api';

const CATEGORIES = [
  { id: 'poor_lighting',    label: 'Dark / unlit street',    Icon: Lightbulb     },
  { id: 'harassment',       label: 'Reported harassment',    Icon: AlertTriangle },
  { id: 'isolated_street',  label: 'Isolated road',          Icon: Navigation    },
  { id: 'deserted_path',    label: 'Deserted footpath',      Icon: MapPin        },
  { id: 'other',            label: 'Other hazard',           Icon: AlertCircle   },
];

function getCategoryMeta(id) {
  return CATEGORIES.find((c) => c.id === id) || { label: id, Icon: AlertCircle };
}

export default function CommunityReportsView() {
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [status, setStatus]       = useState({ msg: '', type: '' });

  const [form, setForm] = useState({
    title: '', category: 'poor_lighting', description: '', address: '',
    latitude: 18.5204, longitude: 73.8567,
  });

  const showStatus = (msg, type = 'success') => {
    setStatus({ msg, type });
    setTimeout(() => setStatus({ msg: '', type: '' }), 5000);
  };

  const loadReports = async () => {
    try { const { data } = await api.get('/reports'); setReports(data); }
    catch { /* handled */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReports(); }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude, address: f.address || 'My current GPS location' }));
        showStatus('GPS location captured.', 'info');
      },
      (err) => showStatus('Location error: ' + err.message, 'error')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) { showStatus('Title is required.', 'error'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/reports', form);
      showStatus(data.message || 'Report posted.');
      setShowForm(false);
      setForm({ title: '', category: 'poor_lighting', description: '', address: '', latitude: 18.5204, longitude: 73.8567 });
      loadReports();
    } catch (err) {
      showStatus(err.response?.data?.error || 'Failed to submit report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (id) => {
    try { await api.post(`/reports/${id}/confirm`); loadReports(); } catch { /* handled */ }
  };

  const handleAbuse = async (id) => {
    try { await api.post(`/reports/${id}/abuse`); showStatus('Flag registered.', 'info'); loadReports(); } catch { /* handled */ }
  };

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Crowdsourced concerns from Pune
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={14} strokeWidth={2.5} /> Close</> : <><Plus size={14} strokeWidth={2.5} /> Report issue</>}
        </button>
      </div>

      {status.msg && (
        <div className={`msg ${status.type === 'success' ? 'msg-success' : status.type === 'error' ? 'msg-error' : 'msg-info'}`} style={{ marginBottom: 14 }}>
          {status.type === 'success' ? <CheckCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
           : status.type === 'error' ? <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
           : <Info size={14} strokeWidth={2} style={{ flexShrink: 0 }} />}
          {status.msg}
        </div>
      )}

      {/* Submission form */}
      {showForm && (
        <div className="glass-card" style={{ marginBottom: 18, border: '1px solid var(--rose-200)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 14 }}>Report a safety hazard</div>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="rep-cat">Category</label>
              <select id="rep-cat" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="rep-title">Title *</label>
              <input id="rep-title" className="input" placeholder="e.g. Broken streetlights near riverbed road" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="rep-addr">Locality / address</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input id="rep-addr" className="input" placeholder="e.g. Near Shivajinagar railway gate" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={useCurrentLocation} style={{ whiteSpace: 'nowrap' }}>
                  <MapPin size={13} strokeWidth={2} /> GPS
                </button>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="rep-desc">Additional context</label>
              <textarea id="rep-desc" className="input" rows={2} placeholder="Timings, landmarks, or specific observations…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Submitting…</> : 'Post report'}
            </button>
          </form>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
            Duplicate submissions within 150 m are automatically grouped.
          </p>
        </div>
      )}

      {/* Reports list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : reports.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 36 }}>
          <CheckCircle size={28} strokeWidth={1.25} color="var(--green-600)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No active reports</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Report unlit areas or isolated streets to alert others in Pune.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map((r) => {
            const { label, Icon } = getCategoryMeta(r.category);
            return (
              <div key={r.id} className="report-card">
                <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} strokeWidth={1.75} color="var(--amber-600)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.3 }}>{r.title}</div>
                      {r.address && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} strokeWidth={2} color="var(--text-muted)" />{r.address}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="badge badge-amber" style={{ flexShrink: 0, marginLeft: 8 }}>{label}</span>
                </div>

                {r.description && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10, paddingLeft: 46, fontStyle: 'italic' }}>
                    "{r.description}"
                  </p>
                )}

                <div className="row-between" style={{ paddingTop: 10, borderTop: '1px solid var(--border-subtle)', fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ThumbsUp size={11} strokeWidth={2} />
                    {r.verification_count} confirmed
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => handleConfirm(r.id)} style={{ gap: 5 }}>
                      <ThumbsUp size={11} strokeWidth={2} /> Confirm
                    </button>
                    <button className="btn btn-xs" onClick={() => handleAbuse(r.id)} style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-100)', gap: 5 }}>
                      <Flag size={11} strokeWidth={2} /> Flag
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
        Reports expire after 30 days unless confirmed. Always use 112 or 1091 in an emergency.
      </p>
    </div>
  );
}
