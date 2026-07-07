import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Auth from './components/Auth';
import SOSButton from './components/SOSButton';
import MapView from './components/MapView';
import Contacts from './components/Contacts';
import SafeZones from './components/SafeZones';
import RouteAdvisor from './components/RouteAdvisor';
import AlertHistory from './components/AlertHistory';
import PushSetup from './components/PushSetup';

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const TABS = [
  { id: 'home', icon: '🛡️', label: 'Home' },
  { id: 'map', icon: '📍', label: 'Map' },
  { id: 'zones', icon: '⚠️', label: 'Zones' },
  { id: 'contacts', icon: '👥', label: 'Contacts' },
  { id: 'settings', icon: '⚙️', label: 'More' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [zones, setZones] = useState([]);
  const [zoneAlert, setZoneAlert] = useState(null);
  const [socket, setSocket] = useState(null);

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  // Socket.io connection and zone alerts
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    const sock = io(API_URL, { auth: { token } });
    setSocket(sock);

    sock.on('zone:alert', (data) => {
      setZoneAlert(data);
      setTimeout(() => setZoneAlert(null), 12000);
    });

    sock.on('sos:triggered', (data) => {
      console.log('SOS broadcasted:', data);
    });

    return () => sock.disconnect();
  }, [user]);

  const handleAuth = (u) => setUser(u);

  const logout = () => {
    socket?.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  const initials = user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <span className="logo">🛡️ Urban Safety</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            {user.name?.split(' ')[0]}
          </div>
          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4, color: 'var(--text-muted)' }}
            title="Logout"
          >
            ↩
          </button>
        </div>
      </header>

      {/* Zone Alert Banner */}
      {zoneAlert && (
        <div
          className="toast show"
          style={{ top: 72 }}
        >
          <div className="msg msg-warning" style={{ borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
            <div>
              <strong>🚨 Danger Zone Alert!</strong>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                You entered: {zoneAlert.zones.map((z) => z.name).join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Content */}
      <div className="page">
        {tab === 'home' && (
          <div>
            <div className="page-title">Stay Safe 👋</div>
            <div className="page-subtitle">
              Hi {user.name?.split(' ')[0]}, your safety network is active.
            </div>
            <PushSetup />
            <SOSButton />
          </div>
        )}

        {tab === 'map' && (
          <div>
            <div className="page-title">Live Map 📍</div>
            <div className="page-subtitle">Real-time GPS tracking and location sharing.</div>
            <MapView zones={zones} />
            <RouteAdvisor />
          </div>
        )}

        {tab === 'zones' && (
          <SafeZones onZonesChange={setZones} />
        )}

        {tab === 'contacts' && (
          <Contacts />
        )}

        {tab === 'settings' && (
          <div>
            <div className="page-title">More ⚙️</div>
            <div className="page-subtitle">Settings and alert history.</div>
            <AlertHistory />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            id={`nav-${t.id}`}
          >
            <span className="nav-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
