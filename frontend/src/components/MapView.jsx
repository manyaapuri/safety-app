import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../api';

// Fix leaflet default marker icon path issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const pulsingIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:rgba(139,92,246,0.9);
    box-shadow:0 0 0 6px rgba(139,92,246,0.25), 0 0 20px rgba(139,92,246,0.6);
    animation:mapPulse 2s ease-in-out infinite;
  "></div>
  <style>@keyframes mapPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}</style>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const zoneColors = { critical: '#ff4444', high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

function MapCenterer({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

export default function MapView({ zones = [] }) {
  const [position, setPosition] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [hours, setHours] = useState(2);
  const [error, setError] = useState('');
  const [zoneAlerts, setZoneAlerts] = useState([]);
  const intervalRef = useRef(null);
  const watchRef = useRef(null);

  const sendPing = async (pos) => {
    try {
      await api.post('/location', {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed
      });
      setPosition([pos.coords.latitude, pos.coords.longitude]);
    } catch (e) {
      console.error('Ping failed:', e);
    }
  };

  const startTracking = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser.');
      return;
    }
    // Use watchPosition for real-time GPS
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => sendPing(pos),
      (err) => setError('Location error: ' + err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    // Also send pings every 8s via interval as a fallback
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendPing, () => {}, { enableHighAccuracy: true });
    }, 8000);
    setTracking(true);
  };

  const stopTracking = () => {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    clearInterval(intervalRef.current);
    setTracking(false);
    setShareUrl('');
  };

  const createShareLink = async () => {
    try {
      const { data } = await api.post('/location/share', { hours });
      setShareUrl(data.shareUrl);
    } catch {
      setError('Failed to create share link');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  useEffect(() => () => stopTracking(), []);

  const defaultCenter = position || [20.5937, 78.9629]; // India center

  return (
    <div>
      {/* Map */}
      <div className="map-container">
        <MapContainer center={defaultCenter} zoom={position ? 15 : 5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />
          {position && (
            <>
              <MapCenterer center={position} />
              <Marker position={position} icon={pulsingIcon}>
                <Popup>
                  <strong>📍 Your Location</strong><br />
                  {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </Popup>
              </Marker>
            </>
          )}
          {/* Danger zone circles */}
          {zones.map((zone) => (
            <Circle
              key={zone.id}
              center={[zone.latitude, zone.longitude]}
              radius={zone.radius_meters}
              pathOptions={{
                color: zoneColors[zone.severity] || '#ef4444',
                fillColor: zoneColors[zone.severity] || '#ef4444',
                fillOpacity: 0.15,
                weight: 2
              }}
            >
              <Popup>
                <strong>⚠️ {zone.name}</strong><br />
                Severity: {zone.severity}<br />
                {zone.description}
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      </div>

      {/* Tracking Controls */}
      <div className="glass-card">
        <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>
          {tracking ? <><span className="live-dot" />Live Tracking</> : '📡 Location Sharing'}
        </h3>

        <div style={{ display: 'flex', gap: 8 }}>
          {!tracking ? (
            <button className="btn btn-primary" onClick={startTracking} style={{ flex: 1 }}>
              ▶ Start Live Tracking
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopTracking} style={{ flex: 1 }}>
              ⏹ Stop Tracking
            </button>
          )}
        </div>

        {tracking && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <label className="input-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Share for:</label>
              <select className="input" value={hours} onChange={(e) => setHours(+e.target.value)} style={{ margin: 0 }}>
                <option value={0.5}>30 minutes</option>
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
              </select>
              <button className="btn btn-secondary btn-sm" onClick={createShareLink}>
                Generate
              </button>
            </div>

            {shareUrl && (
              <div>
                <div className="share-url-wrap">
                  <input className="input" readOnly value={shareUrl} onClick={(e) => e.target.select()} />
                  <button className="btn btn-primary btn-sm copy-btn" onClick={copyLink}>
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
                <div className="msg msg-success" style={{ marginTop: 6, fontSize: 12 }}>
                  ✅ Family/friends can track you with this link (expires in {hours}h)
                </div>
              </div>
            )}
          </div>
        )}

        {position && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            📍 {position[0].toFixed(5)}°N, {position[1].toFixed(5)}°E
          </div>
        )}

        {error && <div className="msg msg-error" style={{ marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  );
}
