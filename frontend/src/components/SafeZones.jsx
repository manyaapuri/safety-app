import { useState, useEffect } from 'react';
import api from '../api';

const SEV_STYLE = {
  critical: { bg: 'rgba(239,68,68,0.15)',  border: '#ef4444', badge: '#ef4444',  text: '#fca5a5' },
  high:     { bg: 'rgba(249,115,22,0.15)', border: '#f97316', badge: '#f97316',  text: '#fdba74' },
  medium:   { bg: 'rgba(234,179,8,0.12)',  border: '#eab308', badge: '#eab308',  text: '#fde047' },
  low:      { bg: 'rgba(34,197,94,0.12)',  border: '#22c55e', badge: '#22c55e',  text: '#86efac' },
};

const CATEGORY_ICONS = {
  crime: '🔫', harassment: '😡', accident: '🚗', dark_area: '🌑', general: '⚠️'
};

const SEVERITY_BADGE = { critical: 'badge-red', high: 'badge-red', medium: 'badge-yellow', low: 'badge-green' };

async function geocode(query) {
  if (!query) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
    );
    const data = await res.json();
    if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) { console.error('Geocoding failed:', e); }
  return null;
}

export default function SafeZones({ onZonesChange }) {
  // ── My saved zones ──────────────────────────────────────────
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', radius_meters: 300, severity: 'medium', category: 'general'
  });
  const [zoneAddress, setZoneAddress] = useState('');
  const [presetCoords, setPresetCoords] = useState(null);

  // ── Route-based zone search ──────────────────────────────────
  const [startText, setStartText] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endText, setEndText] = useState('');
  const [routeZones, setRouteZones] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [routeSearched, setRouteSearched] = useState(false);
  const [showSafe, setShowSafe] = useState(false);

  // ── Load user's saved zones ──────────────────────────────────
  const loadZones = async () => {
    setLoading(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const { data } = await api.get(`/zones?latitude=${latitude}&longitude=${longitude}`);
            setZones(data); onZonesChange?.(data); setLoading(false);
          },
          async () => {
            const { data } = await api.get('/zones');
            setZones(data); onZonesChange?.(data); setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        const { data } = await api.get('/zones');
        setZones(data); onZonesChange?.(data); setLoading(false);
      }
    } catch (e) { console.error(e); setLoading(false); }
  };

  useEffect(() => { loadZones(); }, []);

  // ── Add zone form ─────────────────────────────────────────────
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const useCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPresetCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setZoneAddress('Current Location');
      },
      (err) => { setStatus('❌ ' + err.message); setTimeout(() => setStatus(''), 4000); }
    );
  };

  const addZone = async (e) => {
    e.preventDefault();
    try {
      let coords = zoneAddress === 'Current Location' && presetCoords
        ? presetCoords
        : await geocode(zoneAddress);
      if (!coords) { setStatus('❌ Could not find coordinates for this location.'); setTimeout(() => setStatus(''), 4000); return; }
      await api.post('/zones', { ...form, latitude: coords.lat, longitude: coords.lng, radius_meters: parseInt(form.radius_meters) });
      setStatus('✅ Zone added successfully');
      setAdding(false);
      setForm({ name: '', description: '', radius_meters: 300, severity: 'medium', category: 'general' });
      setZoneAddress(''); setPresetCoords(null);
      loadZones();
    } catch (e) {
      setStatus('❌ Failed: ' + (e.response?.data?.error || e.message));
    }
    setTimeout(() => setStatus(''), 4000);
  };

  const deleteZone = async (id) => {
    try { await api.delete(`/zones/${id}`); loadZones(); } catch (e) { console.error(e); }
  };

  // ── Route search handler ──────────────────────────────────────
  const useCurrentAsStart = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setStartCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStartText('Current Location'); },
      (err) => setRouteError('Failed to get location: ' + err.message)
    );
  };

  const searchRouteZones = async (e) => {
    e.preventDefault();
    setRouteLoading(true);
    setRouteError('');
    setRouteZones([]);
    setRouteSearched(false);
    try {
      let finalStart = startText === 'Current Location' && startCoords ? startCoords : await geocode(startText);
      if (!finalStart) { setRouteError('Could not find start location.'); setRouteLoading(false); return; }
      const finalEnd = await geocode(endText);
      if (!finalEnd) { setRouteError('Could not find destination.'); setRouteLoading(false); return; }

      const { data } = await api.post('/zones/generate-for-route', {
        startLat: finalStart.lat, startLng: finalStart.lng,
        endLat: finalEnd.lat,     endLng: finalEnd.lng
      });
      setRouteZones(data.zones || []);
      setRouteSearched(true);
    } catch (err) {
      setRouteError(err.response?.data?.error || 'Failed to fetch zones for this route.');
    } finally {
      setRouteLoading(false);
    }
  };

  const riskyZones   = routeZones.filter((z) => !z.safe_landmark);
  const safeLandmarks = routeZones.filter((z) => z.safe_landmark);

  return (
    <div>
      {/* ════════════════════════════════════════════════════════
          SECTION 1 — Route-based Danger Zone Search
      ════════════════════════════════════════════════════════ */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <div className="page-title" style={{ fontSize: 20 }}>🗺️ Scan Route for Danger Zones</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Enter your start &amp; destination — we'll detect risky areas along your route.
          </div>
        </div>

        <form onSubmit={searchRouteZones}>
          <div className="input-group">
            <label className="input-label">Start Point</label>
            <input
              className="input"
              placeholder="e.g. Connaught Place, New Delhi"
              value={startText}
              onChange={(e) => { setStartText(e.target.value); if (startCoords) setStartCoords(null); }}
              required
            />
            <button type="button" className="btn btn-secondary btn-sm"
              onClick={useCurrentAsStart} style={{ marginTop: 6, width: 'auto' }}>
              📍 Use My Location
            </button>
          </div>
          <div className="input-group">
            <label className="input-label">Destination</label>
            <input
              className="input"
              placeholder="e.g. Noida Sector 62"
              value={endText}
              onChange={(e) => setEndText(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-danger" type="submit" disabled={routeLoading}
            style={{ width: '100%' }}>
            {routeLoading
              ? <><span className="spinner" /> Scanning for danger zones…</>
              : '🔍 Find Danger Zones on Route'}
          </button>
        </form>

        {routeError && <div className="msg msg-error" style={{ marginTop: 10 }}>{routeError}</div>}

        {/* Results */}
        {routeSearched && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                🚨 Risky Areas Found
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                  ({riskyZones.length} zone{riskyZones.length !== 1 ? 's' : ''})
                </span>
              </span>
            </div>

            {riskyZones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                ✅ No risky areas detected along this route.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {riskyZones.map((zone) => {
                  const s = SEV_STYLE[zone.severity] || SEV_STYLE.medium;
                  return (
                    <div key={zone.id} style={{
                      background: s.bg, border: `1px solid ${s.border}`,
                      borderRadius: 10, padding: '10px 14px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                          <span style={{ fontSize: 16 }}>{CATEGORY_ICONS[zone.category] || '⚠️'}</span>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{zone.name}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px',
                            background: s.badge, color: '#000', borderRadius: 4,
                            textTransform: 'uppercase', letterSpacing: '0.05em'
                          }}>
                            {zone.severity}
                          </span>
                        </div>
                        {zone.description && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{zone.description}</div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                          📐 {zone.radius_meters}m radius
                        </div>
                      </div>
                      <a href={`https://www.google.com/maps?q=${zone.latitude},${zone.longitude}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: 'var(--accent-cyan)', whiteSpace: 'nowrap', textDecoration: 'none', paddingTop: 2 }}>
                        📍 Maps
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Safe Landmarks toggle */}
            {safeLandmarks.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowSafe((v) => !v)}
                  style={{ width: 'auto', marginBottom: 8 }}
                >
                  {showSafe ? '▲ Hide' : '▼ Show'} {safeLandmarks.length} Safe Landmark{safeLandmarks.length !== 1 ? 's' : ''} Nearby
                </button>
                {showSafe && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {safeLandmarks.map((z) => (
                      <a key={z.id}
                        href={`https://www.google.com/maps?q=${z.latitude},${z.longitude}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          fontSize: 12, padding: '4px 12px',
                          background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e',
                          borderRadius: 20, color: '#86efac', textDecoration: 'none'
                        }}>
                        {z.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          SECTION 2 — My Saved Danger Zones
      ════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div className="page-title" style={{ fontSize: 22 }}>⚠️ My Danger Zones</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {zones.length} saved zone{zones.length !== 1 ? 's' : ''} monitored
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>
          {adding ? '✕ Cancel' : '+ Add Zone'}
        </button>
      </div>

      {status && <div className={`msg ${status.startsWith('✅') ? 'msg-success' : 'msg-error'}`}>{status}</div>}

      {adding && (
        <div className="glass-card" style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 14, fontWeight: 700 }}>Mark a Risky Area</h4>
          <form onSubmit={addZone}>
            <div className="input-group">
              <label className="input-label">Zone Name *</label>
              <input className="input" placeholder="e.g. Dark Underpass" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Description</label>
              <input className="input" placeholder="Why is this area risky?" value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Location/Address *</label>
              <input
                className="input"
                placeholder="e.g. Connaught Place, New Delhi"
                value={zoneAddress}
                onChange={(e) => { setZoneAddress(e.target.value); if (presetCoords) setPresetCoords(null); }}
                required
              />
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={useCurrentLocation} style={{ marginBottom: 10, width: 'auto' }}>
              📍 Use My Current Location
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Radius (meters)</label>
                <input className="input" type="number" min="50" max="5000" value={form.radius_meters} onChange={(e) => setField('radius_meters', e.target.value)} />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Severity</label>
                <select className="input" value={form.severity} onChange={(e) => setField('severity', e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setField('category', e.target.value)}>
                <option value="general">General Danger</option>
                <option value="crime">Crime Hotspot</option>
                <option value="harassment">Harassment Area</option>
                <option value="accident">Accident Prone</option>
                <option value="dark_area">Poorly Lit Area</option>
              </select>
            </div>
            <button className="btn btn-danger" type="submit">🚨 Mark as Danger Zone</button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <span className="spinner" />
        </div>
      ) : zones.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No saved danger zones yet.</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Add zones to get alerted when you enter risky areas.</div>
        </div>
      ) : (
        zones.map((zone) => (
          <div key={zone.id} className="glass-card" style={{ padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[zone.category] || '⚠️'}</span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{zone.name}</span>
                  <span className={`badge ${SEVERITY_BADGE[zone.severity] || 'badge-yellow'}`}>{zone.severity}</span>
                  {zone.is_global && <span className="badge badge-purple">Global</span>}
                </div>
                {zone.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{zone.description}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  📍 {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)} · 📐 {zone.radius_meters}m radius
                  {zone.distance_meters !== undefined && (
                    <> · 🏃 {zone.distance_meters >= 1000 ? `${(zone.distance_meters / 1000).toFixed(1)} km` : `${zone.distance_meters} m`} away</>
                  )}
                </div>
              </div>
              {!zone.is_global && (
                <button className="contact-delete" onClick={() => deleteZone(zone.id)} title="Remove zone">✕</button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
