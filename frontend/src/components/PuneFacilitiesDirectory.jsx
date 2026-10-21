import { useState, useEffect } from 'react';
import api from '../api';

const CATEGORIES = [
  { id: '', label: 'All Facilities', icon: '📍' },
  { id: 'police_station', label: 'Police Stations', icon: '🚔' },
  { id: 'hospital', label: 'Hospitals (24/7)', icon: '🏥' },
  { id: 'women_helpdesk', label: 'Women Helpdesks', icon: '🛡️' },
  { id: 'metro_station', label: 'Metro Stations', icon: '🚇' },
  { id: 'bus_terminal', label: 'Transit Hubs', icon: '🚌' }
];

export default function PuneFacilitiesDirectory() {
  const [facilities, setFacilities] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load facilities with optional GPS proximity
  const loadFacilities = async (coords = null) => {
    setLoading(true);
    try {
      let url = '/facilities';
      if (coords) {
        url += `?latitude=${coords[0]}&longitude=${coords[1]}`;
      }
      const { data } = await api.get(url);
      setFacilities(data);
    } catch (e) {
      console.error('Failed to load facilities:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          loadFacilities(coords);
        },
        () => loadFacilities(),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      loadFacilities();
    }
  }, []);

  // Filter facilities
  useEffect(() => {
    let list = [...facilities];
    if (selectedCategory) {
      list = list.filter((f) => f.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.address.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [facilities, selectedCategory, searchQuery]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>🏛️ Pune Verified Facilities</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Directory of verified police stations, 24/7 hospitals, metro hubs, and women support desks in Pune.
        </p>
      </div>

      {/* Category Filter Chips */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 14 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`btn btn-sm ${selectedCategory === c.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap', fontSize: 12 }}
            onClick={() => setSelectedCategory(c.id)}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="input-group" style={{ marginBottom: 16 }}>
        <input
          className="input"
          placeholder="🔍 Search by station name, area (e.g. Deccan, Hinjawadi, Sassoon)…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Facilities List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
          <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No facilities matched your search</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Try searching a different Pune locality or clear the category filter.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((f) => (
            <div key={f.id} className="glass-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                    {f.category === 'police_station' ? '🚔 ' : f.category === 'hospital' ? '🏥 ' : f.category === 'women_helpdesk' ? '🛡️ ' : '🚇 '}
                    {f.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    📍 {f.address}
                  </div>
                </div>
                {f.distance_km !== undefined && (
                  <span className="badge badge-purple" style={{ whiteSpace: 'nowrap' }}>
                    {f.distance_km} km away
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--text-muted)', margin: '8px 0' }}>
                <div>🕒 {f.opening_hours}</div>
                <div>📋 {f.source}</div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {f.phone && (
                  <a
                    href={`tel:${f.phone.split('/')[0].trim()}`}
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: 'none', flex: 1, textAlign: 'center', fontSize: 12 }}
                  >
                    📞 Call {f.phone.split('/')[0].trim()}
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: 'none', flex: 1, textAlign: 'center', fontSize: 12 }}
                >
                  🗺️ Open in Google Maps
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
