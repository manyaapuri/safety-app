import { useState, useEffect } from 'react';
import api from '../api';

export default function AlertHistory() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const TRIGGER_LABELS = {
    manual: { icon: '🆘', label: 'Manual SOS', color: 'badge-red' },
    voice: { icon: '🎙️', label: 'Voice Triggered', color: 'badge-purple' },
    auto_keyword: { icon: '🔊', label: 'Keyword Detected', color: 'badge-purple' },
    anomaly: { icon: '📊', label: 'Anomaly Detected', color: 'badge-yellow' },
    geofence: { icon: '🚧', label: 'Risky Area', color: 'badge-yellow' }
  };

  const load = async () => {
    try {
      const { data } = await api.get('/sos/history');
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id, status) => {
    try {
      await api.put(`/sos/${id}/resolve`, { status });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-title" style={{ fontSize: 22, marginBottom: 4 }}>📋 Alert History</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        {alerts.length} alert{alerts.length !== 1 ? 's' : ''} total
      </div>

      {alerts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ color: 'var(--text-secondary)' }}>No alerts triggered yet.</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Stay safe out there!</div>
        </div>
      ) : (
        alerts.map((alert) => {
          const tInfo = TRIGGER_LABELS[alert.trigger_type] || TRIGGER_LABELS.manual;
          return (
            <div
              key={alert.id}
              className={`alert-item ${alert.status === 'resolved' ? 'resolved' : alert.status === 'false_alarm' ? 'false_alarm' : ''}`}
            >
              <div className="alert-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{tInfo.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{tInfo.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(alert.created_at).toLocaleString('en-IN', {
                        dateStyle: 'medium', timeStyle: 'short'
                      })}
                    </div>
                  </div>
                </div>
                <div>
                  {alert.status === 'active' && <span className="badge badge-red">Active</span>}
                  {alert.status === 'resolved' && <span className="badge badge-green">Resolved</span>}
                  {alert.status === 'false_alarm' && <span className="badge" style={{ background: 'rgba(148,163,184,0.15)', color: 'var(--text-muted)', border: '1px solid rgba(148,163,184,0.2)' }}>False Alarm</span>}
                </div>
              </div>

              {alert.address && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.5 }}>
                  📍 {alert.address.length > 80 ? alert.address.slice(0, 80) + '…' : alert.address}
                </div>
              )}

              {alert.voice_phrase && (
                <div style={{ fontSize: 12, color: 'var(--accent-purple-light)', marginBottom: 6 }}>
                  🎙️ Keyword: "{alert.voice_phrase}"
                </div>
              )}

              {alert.photo_base64 && (
                <div style={{ marginTop: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>📷 Captured Evidence:</div>
                  <img src={alert.photo_base64} alt="Evidence snapshot" style={{ width: '100%', maxWidth: 240, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              )}

              {alert.audio_base64 && (
                <div style={{ marginTop: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>🎙️ Audio Evidence:</div>
                  <audio src={alert.audio_base64} controls style={{ width: '100%', height: 32, borderRadius: 6 }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginBottom: alert.status === 'active' ? 10 : 0 }}>
                {alert.notified_contacts && <span className="badge badge-cyan">Contacts ✓</span>}
                {alert.notified_police && <span className="badge badge-purple">Police ✓</span>}
                {alert.latitude !== null && alert.latitude !== undefined
                  && alert.longitude !== null && alert.longitude !== undefined ? (
                    <a
                      href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-purple-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      🗺️ View on Map
                    </a>
                  ) : (
                    <span aria-label="Location unavailable">📍 Location unavailable</span>
                  )}
              </div>

              {alert.status === 'active' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-success btn-sm" onClick={() => resolve(alert.id, 'resolved')} style={{ flex: 1 }}>
                    ✓ Mark Resolved
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => resolve(alert.id, 'false_alarm')} style={{ flex: 1 }}>
                    False Alarm
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
