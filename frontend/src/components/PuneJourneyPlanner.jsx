import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../api';

// Pune City Center default coordinates
const PUNE_CENTER = [18.5204, 73.8567];

// Pune Landmark Presets for quick selection
const PUNE_PRESETS = [
  { name: 'Shivajinagar Station', lat: 18.5323, lng: 73.8523 },
  { name: 'Hinjawadi Phase 1 (Infotech Park)', lat: 18.5913, lng: 73.7389 },
  { name: 'Deccan Gymkhana (JM Road)', lat: 18.5196, lng: 73.8407 },
  { name: 'Pune Junction Railway Station', lat: 18.5289, lng: 73.8744 },
  { name: 'Kothrud (Paud Road)', lat: 18.5074, lng: 73.8077 },
  { name: 'Viman Nagar (Airport Road)', lat: 18.5679, lng: 73.9143 },
  { name: 'Swargate Bus Station', lat: 18.5018, lng: 73.8586 },
  { name: 'Baner (High Street)', lat: 18.5583, lng: 73.7801 },
  { name: 'Hadapsar (Magarpatta)', lat: 18.5028, lng: 73.9272 }
];

// Custom icons
const createIcon = (emoji, bg = '#8b5cf6') =>
  L.divIcon({
    className: '',
    html: `<div style="
      background:${bg};
      width:30px;height:30px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;box-shadow:0 2px 10px rgba(0,0,0,0.4);
      border:2px solid #fff;
    ">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

const originIcon = createIcon('📍', '#10b981');
const destIcon = createIcon('🏁', '#ef4444');
const policeIcon = createIcon('🚔', '#3b82f6');
const hospitalIcon = createIcon('🏥', '#ec4899');
const transitIcon = createIcon('🚇', '#f59e0b');
const helpdeskIcon = createIcon('🛡️', '#8b5cf6');

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

export default function PuneJourneyPlanner({ onStartJourney }) {
  const [startQuery, setStartQuery] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endQuery, setEndQuery] = useState('');
  const [endCoords, setEndCoords] = useState(null);
  const [travelMode, setTravelMode] = useState('driving'); // driving | walking
  const [planResult, setPlanResult] = useState(null);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Autocomplete suggestions
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);

  // Use current GPS location
  const useCurrentLocationAsOrigin = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser');
      return;
    }
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStartCoords([pos.coords.latitude, pos.coords.longitude]);
        setStartQuery('My Current Location');
        setStartSuggestions([]);
      },
      (err) => setError('Could not acquire GPS: ' + err.message),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Search Pune locations via backend proxy
  const searchLocations = async (text, setter) => {
    if (!text || text.trim().length < 2) {
      setter([]);
      return;
    }
    try {
      const { data } = await api.get(`/route/search?query=${encodeURIComponent(text)}`);
      setter(data);
    } catch {
      setter([]);
    }
  };

  // Calculate Pune journey route via real OSRM
  const handleCalculateRoute = async (e) => {
    e?.preventDefault();
    setError('');
    setPlanResult(null);

    // Resolve coordinates if entered as text without clicking suggestion
    let origin = startCoords;
    if (!origin && startQuery) {
      const found = PUNE_PRESETS.find((p) => p.name.toLowerCase().includes(startQuery.toLowerCase()));
      if (found) origin = [found.lat, found.lng];
      else {
        const { data } = await api.get(`/route/search?query=${encodeURIComponent(startQuery)}`);
        if (data.length > 0) origin = [data[0].latitude, data[0].longitude];
      }
    }

    let destination = endCoords;
    if (!destination && endQuery) {
      const found = PUNE_PRESETS.find((p) => p.name.toLowerCase().includes(endQuery.toLowerCase()));
      if (found) destination = [found.lat, found.lng];
      else {
        const { data } = await api.get(`/route/search?query=${encodeURIComponent(endQuery)}`);
        if (data.length > 0) destination = [data[0].latitude, data[0].longitude];
      }
    }

    if (!origin) {
      setError('Please select a valid origin in Pune');
      return;
    }
    if (!destination) {
      setError('Please select a valid destination in Pune');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/route/plan', {
        startLat: origin[0],
        startLng: origin[1],
        endLat: destination[0],
        endLng: destination[1],
        mode: travelMode
      });

      setPlanResult(data);
      setSelectedRouteIdx(0);
      setStartCoords(origin);
      setEndCoords(destination);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate journey route. Please check connectivity.');
    } finally {
      setLoading(false);
    }
  };

  const activeRoute = planResult?.routes?.[selectedRouteIdx] || planResult?.routes?.[0];

  return (
    <div className="planner-container">
      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>🗺️ Pune Journey Planner</h2>
          <span className="badge badge-purple">Pune Verified</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Search origin & destination across Pune. View live route geometry, ETAs, and verified police & medical facilities along the path.
        </p>

        {/* Quick Location Chips */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Quick Select Pune Hubs:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PUNE_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 11, padding: '4px 8px' }}
                onClick={() => {
                  if (!startCoords || startQuery === 'My Current Location') {
                    setEndCoords([p.lat, p.lng]);
                    setEndQuery(p.name);
                  } else {
                    setStartCoords([p.lat, p.lng]);
                    setStartQuery(p.name);
                  }
                }}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Origin / Destination Form */}
        <form onSubmit={handleCalculateRoute}>
          {/* Origin */}
          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Origin (Pune)</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="input"
                placeholder="e.g. Shivajinagar or Deccan"
                value={startQuery}
                onChange={(e) => {
                  setStartQuery(e.target.value);
                  setStartCoords(null);
                  searchLocations(e.target.value, setStartSuggestions);
                }}
                required
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={useCurrentLocationAsOrigin}
                title="Use current GPS position"
                style={{ whiteSpace: 'nowrap' }}
              >
                📍 My GPS
              </button>
            </div>
            {startSuggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {startSuggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className="autocomplete-item"
                    onClick={() => {
                      setStartCoords([s.latitude, s.longitude]);
                      setStartQuery(s.display_name.split(',')[0]);
                      setStartSuggestions([]);
                    }}
                  >
                    <strong>{s.display_name.split(',')[0]}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.display_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Destination (Pune)</label>
            <input
              className="input"
              placeholder="e.g. Hinjawadi Phase 1 or Kothrud"
              value={endQuery}
              onChange={(e) => {
                setEndQuery(e.target.value);
                setEndCoords(null);
                searchLocations(e.target.value, setEndSuggestions);
              }}
              required
            />
            {endSuggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {endSuggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className="autocomplete-item"
                    onClick={() => {
                      setEndCoords([s.latitude, s.longitude]);
                      setEndQuery(s.display_name.split(',')[0]);
                      setEndSuggestions([]);
                    }}
                  >
                    <strong>{s.display_name.split(',')[0]}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.display_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mode Selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              className={`btn btn-sm ${travelMode === 'driving' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTravelMode('driving')}
              style={{ flex: 1 }}
            >
              🚗 Cab / Auto / Vehicle
            </button>
            <button
              type="button"
              className={`btn btn-sm ${travelMode === 'walking' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTravelMode('walking')}
              style={{ flex: 1 }}
            >
              🚶 Walking
            </button>
          </div>

          {error && <div className="msg msg-error" style={{ marginBottom: 12 }}>{error}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" /> Calculating OSRM Route…</> : '🔍 Calculate Pune Journey'}
          </button>
        </form>
      </div>

      {/* Map & Results */}
      {planResult && activeRoute && (
        <div>
          {/* Route Options Summary */}
          <div className="glass-card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                Route: {activeRoute.distance_km} km · ~{activeRoute.duration_min} mins
              </div>
              <span className="badge badge-green">OSRM Route</span>
            </div>

            {/* Alternatives if available */}
            {planResult.routes.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {planResult.routes.map((r, idx) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`btn btn-sm ${selectedRouteIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedRouteIdx(idx)}
                    style={{ flex: 1, fontSize: 12 }}
                  >
                    Option {idx + 1}: {r.distance_km} km ({r.duration_min}m)
                  </button>
                ))}
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              🛣️ {activeRoute.summary}
            </div>

            {/* Direct Action: Start Trusted Journey */}
            <button
              className="btn btn-success"
              style={{ width: '100%', fontWeight: 700 }}
              onClick={() => {
                onStartJourney?.({
                  startName: startQuery,
                  startLat: startCoords[0],
                  startLng: startCoords[1],
                  endName: endQuery,
                  endLat: endCoords[0],
                  endLng: endCoords[1],
                  distanceKm: activeRoute.distance_km,
                  durationMin: activeRoute.duration_min
                });
              }}
            >
              🚀 Start & Share This Journey
            </button>
          </div>

          {/* Leaflet Map */}
          <div className="map-container" style={{ height: 420, marginBottom: 16 }}>
            <MapContainer
              center={activeRoute.geometry[0] || PUNE_CENTER}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />
              <FitBounds bounds={activeRoute.geometry} />

              {/* Render Active Route Polyline */}
              <Polyline
                positions={activeRoute.geometry}
                pathOptions={{ color: '#8b5cf6', weight: 5, opacity: 0.9 }}
              />

              {/* Render Inactive Alternative Polyline */}
              {planResult.routes.map((r, idx) => {
                if (idx === selectedRouteIdx) return null;
                return (
                  <Polyline
                    key={r.id}
                    positions={r.geometry}
                    pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.5, dashArray: '6, 8' }}
                  />
                );
              })}

              {/* Origin Marker */}
              {startCoords && (
                <Marker position={startCoords} icon={originIcon}>
                  <Popup>
                    <strong>Origin:</strong> {startQuery}
                  </Popup>
                </Marker>
              )}

              {/* Destination Marker */}
              {endCoords && (
                <Marker position={endCoords} icon={destIcon}>
                  <Popup>
                    <strong>Destination:</strong> {endQuery}
                  </Popup>
                </Marker>
              )}

              {/* Verified Facilities Overlay */}
              {planResult.facilitiesAlongRoute?.map((f) => {
                let icon = helpdeskIcon;
                if (f.category === 'police_station') icon = policeIcon;
                else if (f.category === 'hospital') icon = hospitalIcon;
                else if (f.category === 'metro_station' || f.category === 'bus_terminal') icon = transitIcon;

                return (
                  <Marker key={f.id} position={[f.latitude, f.longitude]} icon={icon}>
                    <Popup>
                      <div style={{ maxWidth: 220 }}>
                        <strong style={{ color: '#8b5cf6' }}>{f.name}</strong>
                        <div style={{ fontSize: 11, margin: '4px 0' }}>{f.address}</div>
                        {f.phone && <div style={{ fontSize: 11, fontWeight: 700 }}>📞 {f.phone}</div>}
                        <div style={{ fontSize: 10, color: '#64748b' }}>🕒 {f.opening_hours}</div>
                        <a
                          href={f.directions_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: 6,
                            fontSize: 11,
                            color: '#06b6d4',
                            textDecoration: 'none',
                            fontWeight: 700
                          }}
                        >
                          🗺️ Navigate in Google Maps
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Verified Facilities Along Corridor */}
          <div className="glass-card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>
              🛡️ Verified Safety Facilities Along Corridor ({planResult.facilitiesAlongRoute?.length || 0})
            </h3>
            {planResult.facilitiesAlongRoute?.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                No major facilities within 2 km of this route stretch. Stay on main roads.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {planResult.facilitiesAlongRoute.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                        {f.category === 'police_station' ? '🚔 ' : f.category === 'hospital' ? '🏥 ' : '🚇 '}
                        {f.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {f.address} · 📞 {f.phone || '24/7'}
                      </div>
                    </div>
                    <a
                      href={f.directions_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      Navigate
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Caution Areas Along Corridor */}
          {planResult.cautionZonesAlongRoute?.length > 0 && (
            <div className="glass-card" style={{ marginBottom: 16, borderLeft: '4px solid var(--accent-yellow)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fde047', marginBottom: 8 }}>
                ⚠️ Factual Caution Areas Along Route ({planResult.cautionZonesAlongRoute.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {planResult.cautionZonesAlongRoute.map((z) => (
                  <div key={z.id} style={{ fontSize: 12 }}>
                    <strong>{z.name}:</strong> <span style={{ color: 'var(--text-secondary)' }}>{z.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Objective Disclaimer */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 8px', lineHeight: 1.5 }}>
            ℹ️ {planResult.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
