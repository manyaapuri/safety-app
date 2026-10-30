import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Navigation, Car, PersonStanding, ShieldCheck, Building2, Train, AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react';
import api from '../api';

const PUNE_CENTER = [18.5204, 73.8567];

const PUNE_PRESETS = [
  { name: 'Shivajinagar Station',        lat: 18.5323, lng: 73.8523 },
  { name: 'Hinjawadi Phase 1',           lat: 18.5913, lng: 73.7389 },
  { name: 'Deccan Gymkhana (JM Road)',   lat: 18.5196, lng: 73.8407 },
  { name: 'Pune Junction Railway',       lat: 18.5289, lng: 73.8744 },
  { name: 'Kothrud (Paud Road)',         lat: 18.5074, lng: 73.8077 },
  { name: 'Viman Nagar',                 lat: 18.5679, lng: 73.9143 },
  { name: 'Swargate Bus Station',        lat: 18.5018, lng: 73.8586 },
  { name: 'Baner High Street',           lat: 18.5583, lng: 73.7801 },
  { name: 'Hadapsar Magarpatta',         lat: 18.5028, lng: 73.9272 },
];

const makeIcon = (color, size = 28) => L.divIcon({
  className: '',
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.22);border:2px solid #fff;"></div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
});

const originIcon = makeIcon('#1E7E50');
const destIcon   = makeIcon('#B42332');
const policeIcon = makeIcon('#1D5EA8');
const hospIcon   = makeIcon('#B42332', 24);
const transitIcon= makeIcon('#92600A', 24);
const otherIcon  = makeIcon('#7D6876', 22);

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds?.length >= 2) map.fitBounds(bounds, { padding: [40, 40] });
  }, [bounds, map]);
  return null;
}

export default function PuneJourneyPlanner({ onStartJourney }) {
  const [startQuery, setStartQuery]   = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endQuery, setEndQuery]       = useState('');
  const [endCoords, setEndCoords]     = useState(null);
  const [travelMode, setTravelMode]   = useState('driving');
  const [planResult, setPlanResult]   = useState(null);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions]     = useState([]);

  const useCurrentLocationAsOrigin = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setStartCoords([pos.coords.latitude, pos.coords.longitude]); setStartQuery('My current location'); setStartSuggestions([]); },
      (err) => setError('Could not acquire GPS: ' + err.message),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const searchLocations = async (text, setter) => {
    if (!text || text.trim().length < 2) { setter([]); return; }
    try { const { data } = await api.get(`/route/search?query=${encodeURIComponent(text)}`); setter(data); }
    catch { setter([]); }
  };

  const handleCalculateRoute = async (e) => {
    e?.preventDefault();
    setError(''); setPlanResult(null);

    let origin = startCoords;
    if (!origin && startQuery) {
      const found = PUNE_PRESETS.find((p) => p.name.toLowerCase().includes(startQuery.toLowerCase()));
      if (found) origin = [found.lat, found.lng];
      else {
        try { const { data } = await api.get(`/route/search?query=${encodeURIComponent(startQuery)}`); if (data.length) origin = [data[0].latitude, data[0].longitude]; } catch { /* handled */ }
      }
    }
    let destination = endCoords;
    if (!destination && endQuery) {
      const found = PUNE_PRESETS.find((p) => p.name.toLowerCase().includes(endQuery.toLowerCase()));
      if (found) destination = [found.lat, found.lng];
      else {
        try { const { data } = await api.get(`/route/search?query=${encodeURIComponent(endQuery)}`); if (data.length) destination = [data[0].latitude, data[0].longitude]; } catch { /* handled */ }
      }
    }

    if (!origin)      { setError('Please select a valid origin in Pune.'); return; }
    if (!destination) { setError('Please select a valid destination in Pune.'); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/route/plan', { startLat: origin[0], startLng: origin[1], endLat: destination[0], endLng: destination[1], mode: travelMode });
      setPlanResult(data);
      setSelectedRouteIdx(0);
      setStartCoords(origin);
      setEndCoords(destination);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate route. Check connectivity.');
    } finally {
      setLoading(false);
    }
  };

  const activeRoute = planResult?.routes?.[selectedRouteIdx] || planResult?.routes?.[0];

  const facilityIcon = (f) => {
    if (f.category === 'police_station') return policeIcon;
    if (f.category === 'hospital')       return hospIcon;
    if (f.category === 'metro_station' || f.category === 'bus_terminal') return transitIcon;
    return otherIcon;
  };

  return (
    <div className="planner-container">
      {/* Search form */}
      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Route planner</div>
          <span className="badge badge-rose">Pune</span>
        </div>

        {/* Preset chips */}
        <div style={{ marginBottom: 14 }}>
          <div className="section-title" style={{ marginBottom: 6 }}>Quick select</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PUNE_PRESETS.map((p) => (
              <button key={p.name} type="button" className="btn btn-secondary btn-xs"
                onClick={() => {
                  if (!startCoords) { setStartCoords([p.lat, p.lng]); setStartQuery(p.name); }
                  else { setEndCoords([p.lat, p.lng]); setEndQuery(p.name); }
                }}>
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCalculateRoute}>
          {/* Origin */}
          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label" htmlFor="jp-start">Origin</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <MapPin size={14} strokeWidth={2} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--green-600)', pointerEvents: 'none' }} />
                <input id="jp-start" className="input" style={{ paddingLeft: 34 }} placeholder="e.g. Shivajinagar" value={startQuery}
                  onChange={(e) => { setStartQuery(e.target.value); setStartCoords(null); searchLocations(e.target.value, setStartSuggestions); }} required />
                {startSuggestions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {startSuggestions.map((s, i) => (
                      <div key={i} className="autocomplete-item" onClick={() => { setStartCoords([s.latitude, s.longitude]); setStartQuery(s.display_name.split(',')[0]); setStartSuggestions([]); }}>
                        <strong style={{ fontSize: 13 }}>{s.display_name.split(',')[0]}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.display_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={useCurrentLocationAsOrigin} title="Use current GPS" style={{ whiteSpace: 'nowrap', gap: 5 }}>
                <Navigation size={13} strokeWidth={2} /> GPS
              </button>
            </div>
          </div>

          {/* Destination */}
          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label" htmlFor="jp-end">Destination</label>
            <div style={{ position: 'relative' }}>
              <Navigation size={14} strokeWidth={2} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--red-600)', pointerEvents: 'none' }} />
              <input id="jp-end" className="input" style={{ paddingLeft: 34 }} placeholder="e.g. Hinjawadi Phase 1" value={endQuery}
                onChange={(e) => { setEndQuery(e.target.value); setEndCoords(null); searchLocations(e.target.value, setEndSuggestions); }} required />
              {endSuggestions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {endSuggestions.map((s, i) => (
                    <div key={i} className="autocomplete-item" onClick={() => { setEndCoords([s.latitude, s.longitude]); setEndQuery(s.display_name.split(',')[0]); setEndSuggestions([]); }}>
                      <strong style={{ fontSize: 13 }}>{s.display_name.split(',')[0]}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.display_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mode */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button type="button" className={`btn btn-sm ${travelMode === 'driving' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTravelMode('driving')} style={{ flex: 1, gap: 6 }}>
              <Car size={14} strokeWidth={2} /> Vehicle
            </button>
            <button type="button" className={`btn btn-sm ${travelMode === 'walking' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTravelMode('walking')} style={{ flex: 1, gap: 6 }}>
              <PersonStanding size={14} strokeWidth={2} /> Walking
            </button>
          </div>

          {error && (
            <div className="msg msg-error" style={{ marginBottom: 12 }}>
              <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />{error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 15, height: 15 }} /> Calculating…</> : <><Search size={15} strokeWidth={2} /> Calculate route</>}
          </button>
        </form>
      </div>

      {/* Results */}
      {planResult && activeRoute && (
        <>
          {/* Summary card */}
          <div className="glass-card" style={{ marginBottom: 14 }}>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {activeRoute.distance_km} km · {activeRoute.duration_min} min
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{activeRoute.summary}</div>
              </div>
              <span className="badge badge-green">OSRM route</span>
            </div>

            {planResult.routes.length > 1 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {planResult.routes.map((r, idx) => (
                  <button key={r.id} type="button"
                    className={`btn btn-sm ${selectedRouteIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedRouteIdx(idx)} style={{ flex: 1, fontSize: 12 }}>
                    Option {idx + 1}: {r.distance_km} km
                  </button>
                ))}
              </div>
            )}

            <button className="btn btn-success" style={{ fontWeight: 700 }}
              onClick={() => onStartJourney?.({ startName: startQuery, startLat: startCoords[0], startLng: startCoords[1], endName: endQuery, endLat: endCoords[0], endLng: endCoords[1], distanceKm: activeRoute.distance_km, durationMin: activeRoute.duration_min })}>
              <Navigation size={15} strokeWidth={2.5} /> Start &amp; share this journey
            </button>
          </div>

          {/* Map */}
          <div className="map-container" style={{ height: 380, marginBottom: 14 }}>
            <MapContainer center={activeRoute.geometry[0] || PUNE_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitBounds bounds={activeRoute.geometry} />
              <Polyline positions={activeRoute.geometry} pathOptions={{ color: '#D81B60', weight: 5, opacity: .9 }} />
              {planResult.routes.map((r, idx) => idx === selectedRouteIdx ? null : (
                <Polyline key={r.id} positions={r.geometry} pathOptions={{ color: '#CFC1CA', weight: 4, opacity: .5, dashArray: '6 8' }} />
              ))}
              {startCoords && <Marker position={startCoords} icon={originIcon}><Popup><strong>From:</strong> {startQuery}</Popup></Marker>}
              {endCoords   && <Marker position={endCoords}   icon={destIcon}  ><Popup><strong>To:</strong>   {endQuery}</Popup></Marker>}
              {planResult.facilitiesAlongRoute?.map((f) => (
                <Marker key={f.id} position={[f.latitude, f.longitude]} icon={facilityIcon(f)}>
                  <Popup>
                    <strong>{f.name}</strong>
                    <div style={{ fontSize: 11, margin: '4px 0', color: '#5a3d50' }}>{f.address}</div>
                    {f.phone && <div style={{ fontSize: 11, fontWeight: 700 }}>{f.phone}</div>}
                    {f.directions_url && <a href={f.directions_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#1D5EA8', display: 'block', marginTop: 4 }}>Get directions</a>}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Facilities along route */}
          <div className="glass-card" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={15} strokeWidth={2} color="var(--green-600)" />
              Safety facilities along corridor ({planResult.facilitiesAlongRoute?.length || 0})
            </div>
            {!planResult.facilitiesAlongRoute?.length ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No major facilities within 2 km of this route. Stay on main roads.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {planResult.facilitiesAlongRoute.map((f) => (
                  <div key={f.id} className="row-between" style={{ fontSize: 13, padding: '10px 12px', background: 'var(--neutral-50)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{f.phone || '24/7'}</div>
                    </div>
                    <a href={f.directions_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-xs" style={{ textDecoration: 'none', gap: 4 }}>
                      <Navigation size={11} strokeWidth={2} /> Go
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Caution zones */}
          {planResult.cautionZonesAlongRoute?.length > 0 && (
            <div className="glass-card" style={{ marginBottom: 14, borderLeft: '3px solid var(--amber-600)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--amber-600)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={15} strokeWidth={2} />
                Caution areas along route ({planResult.cautionZonesAlongRoute.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {planResult.cautionZonesAlongRoute.map((z) => (
                  <div key={z.id} style={{ fontSize: 12 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{z.name}:</strong>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>{z.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {planResult.disclaimer && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, padding: '0 4px' }}>{planResult.disclaimer}</p>
          )}
        </>
      )}
    </div>
  );
}
