import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Auth from './components/Auth';
import SOSButton from './components/SOSButton';
import PuneJourneyPlanner from './components/PuneJourneyPlanner';
import TrustedJourneySharing from './components/TrustedJourneySharing';
import PuneFacilitiesDirectory from './components/PuneFacilitiesDirectory';
import CommunityReportsView from './components/CommunityReportsView';
import Contacts from './components/Contacts';
import AlertHistory from './components/AlertHistory';
import PushSetup from './components/PushSetup';

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const TABS = [
  { id: 'sos', icon: '🚨', label: 'SOS' },
  { id: 'planner', icon: '🗺️', label: 'Pune Route' },
  { id: 'journey', icon: '🤝', label: 'Trip Share' },
  { id: 'facilities', icon: '🏛️', label: 'Facilities' },
  { id: 'reports', icon: '📢', label: 'Reports' },
  { id: 'more', icon: '⚙️', label: 'More' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('sos');
  const [journeyPrefill, setJourneyPrefill] = useState(null);
  const [zoneAlert, setZoneAlert] = useState(null);
  const [socket, setSocket] = useState(null);

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  // Socket.io connection
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    const sock = io(API_URL, { auth: { token } });
    setSocket(sock);

    sock.on('zone:alert', (data) => {
      setZoneAlert(data);
      setTimeout(() => setZoneAlert(null), 10000);
    });

    sock.on('journey:overdue', (data) => {
      setZoneAlert({
        title: '⚠️ Journey Overdue Warning',
        message: 'Your active journey has exceeded its scheduled arrival time.'
      });
      setTimeout(() => setZoneAlert(null), 12000);
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

  const handleStartJourneyFromPlanner = (prefill) => {
    setJourneyPrefill(prefill);
    setTab('journey');
  };

  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  const initials = user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'UG';

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: -0.5 }}>Urban Guardian</div>
            <div style={{ fontSize: 10, color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
              Pune Women's Safety
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            {user.name?.split(' ')[0]}
          </div>
          <button
            onClick={logout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              padding: 4,
              color: 'var(--text-muted)'
            }}
            title="Logout"
          >
            ↩
          </button>
        </div>
      </header>

      {/* Floating System Alerts Banner */}
      {zoneAlert && (
        <div className="toast show" style={{ top: 72 }}>
          <div className="msg msg-warning" style={{ borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
            <strong>{zoneAlert.title || '🚨 Caution Alert'}</strong>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {zoneAlert.message || (zoneAlert.zones ? `Entered area: ${zoneAlert.zones.map((z) => z.name).join(', ')}` : '')}
            </div>
          </div>
        </div>
      )}

      {/* Page Body */}
      <div className="page">
        {/* Tab 1: Emergency SOS */}
        {tab === 'sos' && (
          <div>
            <div className="page-title">Emergency Response 🚨</div>
            <div className="page-subtitle">Instant alert dispatch and verified 24/7 Indian emergency hotlines.</div>
            <SOSButton />
          </div>
        )}

        {/* Tab 2: Pune Journey Planner */}
        {tab === 'planner' && (
          <div>
            <PuneJourneyPlanner onStartJourney={handleStartJourneyFromPlanner} />
          </div>
        )}

        {/* Tab 3: Trusted Journey Sharing */}
        {tab === 'journey' && (
          <div>
            <TrustedJourneySharing
              prefillData={journeyPrefill}
              onNavigateToPlanner={() => setTab('planner')}
              onNavigateToContacts={() => setTab('more')}
            />
          </div>
        )}

        {/* Tab 4: Pune Facilities Directory */}
        {tab === 'facilities' && (
          <div>
            <PuneFacilitiesDirectory />
          </div>
        )}

        {/* Tab 5: Community Safety Reports */}
        {tab === 'reports' && (
          <div>
            <CommunityReportsView />
          </div>
        )}

        {/* Tab 6: Settings & Tools */}
        {tab === 'more' && (
          <div>
            <div className="page-title">Tools & Settings ⚙️</div>
            <div className="page-subtitle">Emergency contacts, push notifications, and alert records.</div>

            <Contacts />
            <div style={{ margin: '18px 0' }} />
            <PushSetup />
            <div style={{ margin: '18px 0' }} />
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
