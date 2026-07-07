import { useState } from 'react';
import api from '../api';

const SEVERITY_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#fca5a5' },
  high:     { bg: 'rgba(249,115,22,0.15)', border: '#f97316', text: '#fdba74' },
  medium:   { bg: 'rgba(234,179,8,0.12)', border: '#eab308', text: '#fde047' },
  low:      { bg: 'rgba(34,197,94,0.12)', border: '#22c55e', text: '#86efac' },
};

const CATEGORY_ICONS = {
  crime: '🔫', harassment: '😡', accident: '🚗',
  dark_area: '🌑', general: '⚠️'
};

export default function RouteAdvisor() {
  const [startText, setStartText] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endText, setEndText] = useState('');
  const [timeOfDay, setTimeOfDay] = useState(() =>
    new Date().getHours() >= 6 && new Date().getHours() < 20 ? 'day' : 'night'
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Danger zones along the route
  const [routeZones, setRouteZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonesExpanded, setZonesExpanded] = useState(true);

  const useCurrentAsStart = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStartCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStartText('Current Location');
      },
      (err) => setError('Failed to get current location: ' + err.message)
    );
  };

  const geocode = async (query) => {
    if (!query) return null;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.error('Geocoding failed for:', query, e);
    }
    return null;
  };

  const checkRoute = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setRouteZones([]);

    try {
      let finalStart = null;
      if (startText === 'Current Location' && startCoords) {
        finalStart = startCoords;
      } else {
        finalStart = await geocode(startText);
      }

      if (!finalStart) {
        setError('Could not find start location. Please check the spelling/address.');
        setLoading(false);
        return;
      }

      const finalEnd = await geocode(endText);
      if (!finalEnd) {
        setError('Could not find destination. Please check the spelling/address.');
        setLoading(false);
        return;
      }

      // 1. Check route safety score
      const { data } = await api.post('/route/safety', {
        points: [
          { lat: finalStart.lat, lng: finalStart.lng },
          { lat: finalEnd.lat, lng: finalEnd.lng }
        ],
        time_of_day: timeOfDay
      });
      setResult(data);

      // 2. In parallel — fetch danger zones along the route
      setZonesLoading(true);
      try {
        const zonesRes = await api.post('/zones/generate-for-route', {
          startLat: finalStart.lat,
          startLng: finalStart.lng,
          endLat: finalEnd.lat,
          endLng: finalEnd.lng
        });
        setRouteZones(zonesRes.data.zones || []);
      } catch (zErr) {
        console.warn('Could not load route zones:', zErr.message);
        setRouteZones([]);
      } finally {
        setZonesLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check route safety');
    } finally {
      setLoading(false);
    }
  };

  const scoreClass = result
    ? result.safety_score >= 70 ? 'score-safe' : result.safety_score >= 45 ? 'score-medium' : 'score-unsafe'
    : '';

  const scoreLabel = result
    ? result.safety_score >= 70 ? '✅ Safe Route' : result.safety_score >= 45 ? '⚠️ Moderate Risk' : '🚨 Unsafe Route'
    : '';

  // Split zones into risky vs safe landmarks
  const riskyZones = routeZones.filter((z) => !z.safe_landmark);
  const safeLandmarks = routeZones.filter((z) => z.safe_landmark);

  return (
    <div className="glass-card">
      <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>🗺️ Safe Route Advisor</h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Check the safety score and danger zones along a route before you travel.
      </p>

      <form onSubmit={checkRoute}>
        <div className="input-group">
          <label className="input-label">Start Point</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Connaught Place, New Delhi"
            value={startText}
            onChange={(e) => {
              setStartText(e.target.value);
              if (startCoords) setStartCoords(null);
            }}
            required
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={useCurrentAsStart} style={{ marginTop: 6, width: 'auto' }}>
            📍 Use My Location
          </button>
        </div>

        <div className="input-group">
          <label className="input-label">Destination</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Noida Sector 62"
            value={endText}
            onChange={(e) => setEndText(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label">Time of Travel</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['day', 'night'].map((t) => (
              <button
                key={t}
                type="button"
                className={`btn btn-sm ${timeOfDay === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTimeOfDay(t)}
                style={{ flex: 1 }}
              >
                {t === 'day' ? '☀️ Daytime' : '🌙 Nighttime'}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <><span className="spinner" /> Analyzing…</> : '🔍 Check Route Safety'}
        </button>
      </form>

      {error && <div className="msg msg-error" style={{ marginTop: 12 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 20 }}>
          <div className="divider" />

          {/* Safety Score */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{scoreLabel}</span>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>
              {result.safety_score.toFixed(0)}
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>/100</span>
            </span>
          </div>

          <div className="score-bar-wrap">
            <div className={`score-bar-fill ${scoreClass}`} style={{ width: `${result.safety_score}%` }} />
          </div>

          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {result.notes}
          </div>

          {!result.is_safe && (
            <div className="msg msg-warning" style={{ marginTop: 10 }}>
              ⚠️ This route may be risky. Consider travelling during daytime, using a main road, or sharing your location before leaving.
            </div>
          )}

          {/* ─── Danger Zones Along Route ─── */}
          <div style={{ marginTop: 20 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: 10 }}
              onClick={() => setZonesExpanded((v) => !v)}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                🚨 Danger Zones Along Route
                {!zonesLoading && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
                    ({riskyZones.length} found)
                  </span>
                )}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {zonesExpanded ? '▲ hide' : '▼ show'}
              </span>
            </div>

            {zonesExpanded && (
              <>
                {zonesLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    <span className="spinner" style={{ display: 'inline-block', marginRight: 8 }} />
                    Scanning route for danger zones…
                  </div>
                ) : riskyZones.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    ✅ No risky areas detected along this route.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {riskyZones.map((zone) => {
                      const colors = SEVERITY_COLORS[zone.severity] || SEVERITY_COLORS.medium;
                      const mapsLink = `https://www.google.com/maps?q=${zone.latitude},${zone.longitude}`;
                      return (
                        <div
                          key={zone.id}
                          style={{
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 10,
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 10
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <span style={{ fontSize: 15 }}>{CATEGORY_ICONS[zone.category] || '⚠️'}</span>
                              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{zone.name}</span>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 6px',
                                background: colors.border, color: '#000',
                                borderRadius: 4, textTransform: 'uppercase'
                              }}>
                                {zone.severity}
                              </span>
                            </div>
                            {zone.description && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{zone.description}</div>
                            )}
                          </div>
                          <a
                            href={mapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 11, color: 'var(--accent-cyan)', whiteSpace: 'nowrap', textDecoration: 'none' }}
                          >
                            📍 View
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Safe Landmarks */}
                {safeLandmarks.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      🛡️ Safe Landmarks Nearby
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {safeLandmarks.map((z) => (
                        <a
                          key={z.id}
                          href={`https://www.google.com/maps?q=${z.latitude},${z.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 12, padding: '4px 10px',
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid #22c55e',
                            borderRadius: 20, color: '#86efac',
                            textDecoration: 'none'
                          }}
                        >
                          {z.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
