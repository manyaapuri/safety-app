import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Shield, Phone, MapPin, Navigation, Clock, AlertCircle, Lock } from 'lucide-react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const pulsingIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#D81B60;box-shadow:0 0 0 5px rgba(216,27,96,.2),0 0 16px rgba(216,27,96,.4);animation:tp 2s ease-in-out infinite"></div><style>@keyframes tp{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}</style>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const originIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#1E7E50;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.2)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const destIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#B42332;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.2)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export default function TrackPage() {
  const { token } = useParams();
  const [data, setData]           = useState(null);
  const [error, setError]         = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchJourney = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/journeys/track/${token}`).catch(async (err) => {
        if (err.response?.status === 404 || err.response?.status === 410)
          return axios.get(`${BASE_URL}/api/location/track/${token}`);
        throw err;
      });
      setData(res.data);
      setLastUpdate(new Date());
      setError('');
      setIsExpired(false);
    } catch (err) {
      if (err.response?.status === 410) {
        setIsExpired(true);
        setError(err.response?.data?.error || 'This journey has ended and tracking is no longer active.');
      } else {
        setError(err.response?.data?.error || 'Invalid or expired share link.');
      }
    }
  };

  useEffect(() => {
    fetchJourney();
    const interval = setInterval(fetchJourney, 8000);
    return () => clearInterval(interval);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const timeAgo = (date) => {
    if (!date) return '';
    const secs = Math.floor((new Date() - new Date(date)) / 1000);
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(155deg, var(--rose-50) 0%, var(--neutral-0) 55%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: 'var(--r-xl)', background: 'var(--rose-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Shield size={26} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 4 }}>SafeHer</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pune Women's Safety — Private Journey Tracking</p>
        </div>

        {/* Error state */}
        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="msg msg-error" style={{ marginBottom: 12 }}>
              {isExpired
                ? <Lock size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
                : <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />}
              {error}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              For your safety and privacy, live tracking links expire once a trip is completed, cancelled, or past its expiration window.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="tel:112"  className="btn btn-danger btn-sm"    style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', gap: 6 }}><Phone size={13} strokeWidth={2.5} /> Call 112</a>
              <a href="tel:1091" className="btn btn-secondary btn-sm" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', gap: 6 }}><Phone size={13} strokeWidth={2.5} /> Helpline 1091</a>
            </div>
          </div>
        ) : !data ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <span className="spinner" style={{ width: 30, height: 30 }} />
            <p style={{ color: 'var(--text-muted)', marginTop: 16, fontSize: 14 }}>Loading secure journey…</p>
          </div>
        ) : (
          <>
            {/* Journey status card */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="row-between" style={{ marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="live-dot" />
                    {data.userName || 'User'}'s trip
                  </div>
                  {data.location?.recorded_at && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} strokeWidth={2} /> Updated {timeAgo(data.location.recorded_at)}
                    </div>
                  )}
                </div>
                <span className={`badge ${data.status === 'overdue' ? 'badge-amber' : 'badge-green'}`}>
                  {data.status === 'overdue' ? 'Overdue' : 'Live'}
                </span>
              </div>

              {(data.startName || data.endName) && (
                <div style={{ background: 'var(--neutral-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', padding: '10px 12px', marginBottom: 10, fontSize: 13 }}>
                  {data.startName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <MapPin size={12} strokeWidth={2} color="var(--green-600)" style={{ flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)' }}><strong>From:</strong> {data.startName}</span>
                    </div>
                  )}
                  {data.endName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Navigation size={12} strokeWidth={2} color="var(--red-600)" style={{ flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)' }}><strong>To:</strong> {data.endName}</span>
                    </div>
                  )}
                </div>
              )}

              {data.expectedArrival && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={12} strokeWidth={2} color="var(--text-muted)" />
                  <strong>Expected by:</strong>{' '}
                  {new Date(data.expectedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* Map */}
            {data.location ? (
              <div className="map-container" style={{ height: 340, marginBottom: 14 }}>
                <MapContainer center={[data.location.latitude, data.location.longitude]} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {data.startCoords && <Marker position={data.startCoords} icon={originIcon}><Popup>From: {data.startName}</Popup></Marker>}
                  {data.endCoords   && <Marker position={data.endCoords}   icon={destIcon}  ><Popup>To:   {data.endName}</Popup></Marker>}
                  <Marker position={[data.location.latitude, data.location.longitude]} icon={pulsingIcon}>
                    <Popup><strong>{data.userName} (live)</strong><br />Updated {timeAgo(data.location.recorded_at)}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: 20, marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Awaiting GPS ping from user's device…</p>
              </div>
            )}

            {/* Emergency dial */}
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="tel:112"  className="btn btn-danger"    style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', fontSize: 13, gap: 6 }}><Phone size={14} strokeWidth={2.5} /> Emergency 112</a>
              <a href="tel:1091" className="btn btn-secondary" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', fontSize: 13, gap: 6 }}><Phone size={14} strokeWidth={2} /> Helpline 1091</a>
            </div>
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Lock size={11} strokeWidth={2} /> SafeHer Pune — expiring token access control active
        </p>
      </div>
    </div>
  );
}
