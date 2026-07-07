import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// Pulsing icon
const pulsingIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:rgba(139,92,246,0.9);
    box-shadow:0 0 0 6px rgba(139,92,246,0.25),0 0 20px rgba(139,92,246,0.6);
    animation:p 2s ease-in-out infinite"></div>
    <style>@keyframes p{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}</style>`,
  iconSize: [20, 20], iconAnchor: [10, 10]
});

export default function TrackPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchLocation = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/location/track/${token}`);
      setData(res.data);
      setLastUpdate(new Date());
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load location');
    }
  };

  useEffect(() => {
    fetchLocation();
    const interval = setInterval(fetchLocation, 8000);
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
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🛡️</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 24, background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Live Location Tracking
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Urban Safety App — Shared by a trusted contact</p>
        </div>

        {error ? (
          <div className="glass-card">
            <div className="msg msg-error">
              <span>❌ {error}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
              This share link may have expired. Contact the person directly.
            </p>
          </div>
        ) : !data || !data.location ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: 40 }}>
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <p style={{ color: 'var(--text-secondary)', marginTop: 16 }}>Loading location…</p>
          </div>
        ) : (
          <div>
            {/* Info Card */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    <span className="live-dot" />
                    {data.userName || 'User'}'s Location
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Updated: {timeAgo(data.location.recorded_at)}
                  </div>
                </div>
                <span className="badge badge-green">Live</span>
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div>📍 {data.location.latitude.toFixed(5)}°N</div>
                <div>📍 {data.location.longitude.toFixed(5)}°E</div>
                {data.location.accuracy && <div>🎯 ±{Math.round(data.location.accuracy)}m</div>}
              </div>

              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                ⏳ Link expires: {new Date(data.expiresAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>

            {/* Map */}
            <div className="map-container" style={{ height: 380 }}>
              <MapContainer center={[data.location.latitude, data.location.longitude]} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[data.location.latitude, data.location.longitude]} icon={pulsingIcon}>
                  <Popup>
                    <strong>{data.userName}</strong><br />
                    Updated {timeAgo(data.location.recorded_at)}
                  </Popup>
                </Marker>
              </MapContainer>
            </div>

            {/* External map link */}
            <a
              href={`https://www.google.com/maps?q=${data.location.latitude},${data.location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', marginTop: 4 }}
            >
              🗺️ Open in Google Maps
            </a>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
          🔒 Urban Safety App — This page auto-refreshes every 8 seconds
        </p>
      </div>
    </div>
  );
}
