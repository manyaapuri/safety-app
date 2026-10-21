import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const pulsingIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:rgba(139,92,246,0.9);
    box-shadow:0 0 0 6px rgba(139,92,246,0.25),0 0 20px rgba(139,92,246,0.6);
    animation:p 2s ease-in-out infinite"></div>
    <style>@keyframes p{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}</style>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const originIcon = L.divIcon({
  className: '',
  html: `<div style="background:#10b981;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;border:2px solid #fff">📍</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const destIcon = L.divIcon({
  className: '',
  html: `<div style="background:#ef4444;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;border:2px solid #fff">🏁</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

export default function TrackPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchJourney = async () => {
    try {
      // First attempt journey tracking endpoint
      const res = await axios.get(`${BASE_URL}/api/journeys/track/${token}`).catch(async (err) => {
        if (err.response?.status === 404 || err.response?.status === 410) {
          // Fallback to legacy location track
          return axios.get(`${BASE_URL}/api/location/track/${token}`);
        }
        throw err;
      });

      setData(res.data);
      setLastUpdate(new Date());
      setError('');
      setIsExpired(false);
    } catch (err) {
      if (err.response?.status === 410) {
        setIsExpired(true);
        setError(err.response?.data?.error || 'This journey has ended and live tracking is no longer active.');
      } else {
        setError(err.response?.data?.error || 'Invalid or expired share link.');
      }
    }
  };

  useEffect(() => {
    fetchJourney();
    const interval = setInterval(fetchJourney, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const timeAgo = (date) => {
    if (!date) return '';
    const secs = Math.floor((new Date() - new Date(date)) / 1000);
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>🛡️</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 24, background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Urban Guardian
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Pune Women's Safety — Private Journey Tracking
          </p>
        </div>

        {error ? (
          <div className="glass-card" style={{ padding: 24 }}>
            <div className="msg msg-error" style={{ marginBottom: 12 }}>
              <span>{isExpired ? '🔒' : '❌'} {error}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              For your safety and privacy, live tracking links expire once a trip is completed, cancelled, or past its expiration window.
            </p>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                Emergency Contact Lines (Pune / India):
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href="tel:112" className="btn btn-primary btn-sm" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>
                  📞 Call 112 (Police)
                </a>
                <a href="tel:1091" className="btn btn-secondary btn-sm" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>
                  📞 Call 1091 (Women Helpline)
                </a>
              </div>
            </div>
          </div>
        ) : !data ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: 40 }}>
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <p style={{ color: 'var(--text-secondary)', marginTop: 16 }}>Loading secure live journey…</p>
          </div>
        ) : (
          <div>
            {/* Journey Status Card */}
            <div className="glass-card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    <span className="live-dot" /> {data.userName || 'User'}'s Trip
                  </div>
                  {data.location?.recorded_at && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Ping updated {timeAgo(data.location.recorded_at)}
                    </div>
                  )}
                </div>
                <span className={`badge ${data.status === 'overdue' ? 'badge-red' : 'badge-green'}`}>
                  {data.status === 'overdue' ? '⚠️ OVERDUE' : 'LIVE'}
                </span>
              </div>

              {data.startName && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 6, marginBottom: 8 }}>
                  <div>📍 <strong>From:</strong> {data.startName}</div>
                  <div style={{ marginTop: 4 }}>🏁 <strong>To:</strong> {data.endName}</div>
                </div>
              )}

              {data.expectedArrival && (
                <div style={{ fontSize: 12, color: 'var(--accent-cyan)' }}>
                  ⏳ <strong>Expected By:</strong>{' '}
                  {new Date(data.expectedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* Map */}
            {data.location ? (
              <div className="map-container" style={{ height: 380, marginBottom: 14 }}>
                <MapContainer
                  center={[data.location.latitude, data.location.longitude]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap"
                  />
                  {data.startCoords && (
                    <Marker position={data.startCoords} icon={originIcon}>
                      <Popup>Origin: {data.startName}</Popup>
                    </Marker>
                  )}
                  {data.endCoords && (
                    <Marker position={data.endCoords} icon={destIcon}>
                      <Popup>Destination: {data.endName}</Popup>
                    </Marker>
                  )}
                  <Marker position={[data.location.latitude, data.location.longitude]} icon={pulsingIcon}>
                    <Popup>
                      <strong>{data.userName} (Live GPS)</strong><br />
                      Updated {timeAgo(data.location.recorded_at)}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: 20, textAlign: 'center', marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Awaiting GPS ping from user's device…
                </p>
              </div>
            )}

            {/* Emergency Hotline Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href="tel:112"
                className="btn btn-primary"
                style={{ flex: 1, textDecoration: 'none', textAlign: 'center', fontSize: 13 }}
              >
                📞 Emergency 112
              </a>
              <a
                href="tel:1091"
                className="btn btn-secondary"
                style={{ flex: 1, textDecoration: 'none', textAlign: 'center', fontSize: 13 }}
              >
                🛡️ Pune Helpline 1091
              </a>
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
          🔒 Urban Guardian Pune — Expiring token access control active
        </p>
      </div>
    </div>
  );
}
