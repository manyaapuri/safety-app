import { useState, useEffect } from 'react';
import { AlertCircle, Mic, BarChart2, MapPin, CheckCircle, Clock, MapIcon, Image, Volume2 } from 'lucide-react';
import api from '../api';

const TRIGGER_META = {
  manual:       { Icon: AlertCircle, label: 'Manual SOS',       color: 'badge-red'   },
  voice:        { Icon: Mic,         label: 'Voice triggered',   color: 'badge-rose'  },
  auto_keyword: { Icon: Mic,         label: 'Keyword detected',  color: 'badge-rose'  },
  anomaly:      { Icon: BarChart2,   label: 'Anomaly detected',  color: 'badge-amber' },
  geofence:     { Icon: MapPin,      label: 'Risky area',        color: 'badge-amber' },
};

export default function AlertHistory() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const { data } = await api.get('/sos/history'); setAlerts(data); }
    catch { /* handled */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id, status) => {
    try { await api.put(`/sos/${id}/resolve`, { status }); load(); }
    catch { /* handled */ }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>;

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <div className="page-title" style={{ fontSize: 20 }}>Alert history</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} total
          </div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--green-50)', border: '1px solid var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <CheckCircle size={24} strokeWidth={1.5} color="var(--green-600)" />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>No alerts triggered</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Stay safe out there.</div>
        </div>
      ) : (
        alerts.map((alert) => {
          const meta = TRIGGER_META[alert.trigger_type] || TRIGGER_META.manual;
          const { Icon } = meta;
          return (
            <div
              key={alert.id}
              className={`alert-item ${alert.status === 'resolved' ? 'resolved' : alert.status === 'false_alarm' ? 'false_alarm' : ''}`}
            >
              {/* Top row */}
              <div className="alert-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--neutral-50)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} strokeWidth={2} color="var(--text-secondary)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{meta.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} strokeWidth={2} />
                      {new Date(alert.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
                <div>
                  {alert.status === 'active'      && <span className="badge badge-red">Active</span>}
                  {alert.status === 'resolved'    && <span className="badge badge-green">Resolved</span>}
                  {alert.status === 'false_alarm' && <span className="badge badge-neutral">False alarm</span>}
                </div>
              </div>

              {/* Address */}
              {alert.address && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 5, lineHeight: 1.5 }}>
                  <MapPin size={12} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1, color: 'var(--text-muted)' }} />
                  {alert.address.length > 90 ? alert.address.slice(0, 90) + '…' : alert.address}
                </div>
              )}

              {/* Voice phrase */}
              {alert.voice_phrase && (
                <div style={{ fontSize: 12, color: 'var(--rose-700)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Mic size={12} strokeWidth={2} />
                  Keyword: "{alert.voice_phrase}"
                </div>
              )}

              {/* Photo evidence */}
              {alert.photo_base64 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Image size={11} strokeWidth={2} /> Captured evidence
                  </div>
                  <img src={alert.photo_base64} alt="Alert evidence" style={{ width: '100%', maxWidth: 220, borderRadius: 'var(--r-md)', border: '1px solid var(--border-default)' }} />
                </div>
              )}

              {/* Audio evidence */}
              {alert.audio_base64 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Volume2 size={11} strokeWidth={2} /> Audio evidence
                  </div>
                  <audio src={alert.audio_base64} controls style={{ width: '100%', height: 36, borderRadius: 'var(--r-sm)' }} />
                </div>
              )}

              {/* Notification badges + map link */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: alert.status === 'active' ? 12 : 0 }}>
                {alert.notified_contacts && <span className="badge badge-blue">Contacts notified</span>}
                {alert.notified_police   && <span className="badge badge-rose">Police notified</span>}
                {alert.latitude != null && alert.longitude != null ? (
                  <a
                    href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--blue-600)', textDecoration: 'none' }}
                  >
                    <MapIcon size={11} strokeWidth={2} /> View on map
                  </a>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} strokeWidth={2} /> Location unavailable
                  </span>
                )}
              </div>

              {/* Resolve actions */}
              {alert.status === 'active' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-success btn-sm" onClick={() => resolve(alert.id, 'resolved')} style={{ flex: 1 }}>
                    <CheckCircle size={13} strokeWidth={2} /> Mark resolved
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => resolve(alert.id, 'false_alarm')} style={{ flex: 1 }}>
                    False alarm
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
