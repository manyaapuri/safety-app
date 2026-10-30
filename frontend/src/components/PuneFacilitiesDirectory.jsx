import { useState, useEffect } from 'react';
import { Search, Phone, Navigation, MapPin, ShieldCheck, Building2, Train, Bus, AlertCircle } from 'lucide-react';
import api from '../api';

const CATEGORIES = [
  { id: '',                label: 'All',             Icon: MapPin       },
  { id: 'police_station',  label: 'Police',          Icon: ShieldCheck  },
  { id: 'hospital',        label: 'Hospitals',       Icon: Building2    },
  { id: 'women_helpdesk',  label: 'Women helpdesk',  Icon: ShieldCheck  },
  { id: 'metro_station',   label: 'Metro',           Icon: Train        },
  { id: 'bus_terminal',    label: 'Transit',         Icon: Bus          },
];

function categoryIcon(category, size = 16) {
  const props = { size, strokeWidth: 1.75, color: 'var(--text-muted)' };
  if (category === 'police_station')  return <ShieldCheck {...props} color="var(--blue-600)" />;
  if (category === 'hospital')        return <Building2 {...props} color="var(--red-600)" />;
  if (category === 'women_helpdesk')  return <ShieldCheck {...props} color="var(--rose-600)" />;
  if (category === 'metro_station')   return <Train {...props} color="var(--amber-600)" />;
  if (category === 'bus_terminal')    return <Bus {...props} color="var(--green-600)" />;
  return <MapPin {...props} />;
}

function categoryBg(category) {
  if (category === 'police_station')  return { bg: 'var(--blue-50)',   border: 'var(--blue-100)' };
  if (category === 'hospital')        return { bg: 'var(--red-50)',    border: 'var(--red-100)'  };
  if (category === 'women_helpdesk')  return { bg: 'var(--rose-50)',   border: 'var(--rose-200)' };
  if (category === 'metro_station')   return { bg: 'var(--amber-50)',  border: 'var(--amber-100)'};
  if (category === 'bus_terminal')    return { bg: 'var(--green-50)',  border: 'var(--green-100)'};
  return { bg: 'var(--neutral-50)', border: 'var(--border-subtle)' };
}

export default function PuneFacilitiesDirectory() {
  const [facilities, setFacilities]           = useState([]);
  const [filtered, setFiltered]               = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery]         = useState('');
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');

  const loadFacilities = async (coords = null) => {
    setLoading(true);
    try {
      let url = '/facilities';
      if (coords) url += `?latitude=${coords[0]}&longitude=${coords[1]}`;
      const { data } = await api.get(url);
      setFacilities(data);
    } catch {
      setError('Could not load facilities. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadFacilities([pos.coords.latitude, pos.coords.longitude]),
        () => loadFacilities(),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      loadFacilities();
    }
  }, []);

  useEffect(() => {
    let list = [...facilities];
    if (selectedCategory) list = list.filter((f) => f.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.address.toLowerCase().includes(q));
    }
    setFiltered(list);
  }, [facilities, selectedCategory, searchQuery]);

  return (
    <div>
      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none' }}>
        {CATEGORIES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`btn btn-sm ${selectedCategory === id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap', gap: 6 }}
            onClick={() => setSelectedCategory(id)}
          >
            <Icon size={13} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="input-group" style={{ marginBottom: 14, position: 'relative' }}>
        <Search size={15} strokeWidth={2} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          className="input"
          style={{ paddingLeft: 38 }}
          placeholder="Search by name or area (e.g. Deccan, Hinjawadi)…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error && (
        <div className="msg msg-error" style={{ marginBottom: 14 }}>
          <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />{error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 32 }}>
          <Search size={28} strokeWidth={1.25} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No facilities matched</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Try a different Pune locality or clear the filter.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((f) => {
            const { bg, border } = categoryBg(f.category);
            return (
              <div key={f.id} className="facility-card">
                <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {categoryIcon(f.category)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.3 }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                        <MapPin size={11} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1, color: 'var(--text-muted)' }} />
                        <span style={{ lineHeight: 1.4 }}>{f.address}</span>
                      </div>
                    </div>
                  </div>
                  {f.distance_km !== undefined && (
                    <span className="badge badge-blue" style={{ flexShrink: 0, marginLeft: 8 }}>{f.distance_km} km</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, flexWrap: 'wrap' }}>
                  <span>{f.opening_hours}</span>
                  <span style={{ color: 'var(--border-strong)' }}>·</span>
                  <span>{f.source}</span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {f.phone && (
                    <a
                      href={`tel:${f.phone.split('/')[0].trim()}`}
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}
                    >
                      <Phone size={13} strokeWidth={2.5} />
                      {f.phone.split('/')[0].trim()}
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: 'none', flex: 1, justifyContent: 'center' }}
                  >
                    <Navigation size={13} strokeWidth={2} />
                    Directions
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
