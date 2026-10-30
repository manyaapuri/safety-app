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
import api from './api';

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const TABS = [
  { id: 'home', icon: '⌂', label: 'Home' },
  { id: 'journey', icon: '↗', label: 'Journey' },
  { id: 'nearby', icon: '⌖', label: 'Nearby' },
  { id: 'contacts', icon: '♡', label: 'Contacts' },
  { id: 'more', icon: '⋯', label: 'More' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [journeyPrefill, setJourneyPrefill] = useState(null);
  const [journeyView, setJourneyView] = useState('plan');
  const [nearbyView, setNearbyView] = useState('facilities');
  const [activeJourney, setActiveJourney] = useState(null);
  const [journeyLoadError, setJourneyLoadError] = useState(false);
  const [zoneAlert, setZoneAlert] = useState(null);
  const [socket, setSocket] = useState(null);

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let mounted = true;
    const loadJourney = async () => {
      try {
        const { data } = await api.get('/journeys/active');
        if (mounted) {
          setActiveJourney(data.journey || null);
          setJourneyLoadError(false);
        }
      } catch {
        if (mounted) setJourneyLoadError(true);
      }
    };
    loadJourney();
    const timer = setInterval(loadJourney, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [user]);

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
    setJourneyView('share');
    setTab('journey');
  };

  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  const initials = user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'SH';

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: -0.5 }}>SafeHer</div>
            <div className="brand-caption">
              Pune personal safety
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a
            href="tel:112"
            className="btn btn-danger btn-sm"
            aria-label="Call India's emergency number 112"
            style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Call 112
          </a>
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
        {tab === 'home' && (
          <div className="home-dashboard">
            <section className="home-welcome">
              <div className="eyebrow"><span className="status-dot" /> YOUR SAFEHER SPACE</div>
              <h1>Go with confidence{user.name ? `, ${user.name.split(' ')[0]}` : ''}.</h1>
              <p>Plan ahead, share your journey with people you trust, and keep emergency help close.</p>
              <button className="btn btn-primary" onClick={() => { setJourneyView('plan'); setTab('journey'); }}>
                Plan a journey <span aria-hidden="true">→</span>
              </button>
            </section>

            <section className={`active-journey-card ${activeJourney ? 'is-active' : ''}`}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">JOURNEY STATUS</span>
                  <h2>{activeJourney ? 'Your trip is in progress' : journeyLoadError ? 'Journey status unavailable' : 'No active journey'}</h2>
                </div>
                {activeJourney && <span className="status-pill">{activeJourney.status === 'overdue' ? 'Check-in overdue' : 'Sharing on'}</span>}
              </div>
              {activeJourney ? (
                <>
                  <div className="journey-route-summary">
                    <span>{activeJourney.start_name}</span><span className="route-line" aria-hidden="true" />
                    <span>{activeJourney.end_name}</span>
                  </div>
                  <div className="journey-meta">Expected arrival {new Date(activeJourney.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <button className="btn btn-secondary" onClick={() => { setJourneyView('share'); setTab('journey'); }}>View journey</button>
                </>
              ) : (
                <div className="empty-journey-row">
                  <span className="soft-icon">↗</span>
                  <p>{journeyLoadError ? 'Check your connection to refresh trip information.' : 'Start sharing when you want someone you trust to follow along.'}</p>
                  <button className="text-button" onClick={() => { setJourneyView('plan'); setTab('journey'); }}>Get started →</button>
                </div>
              )}
            </section>

            <div className="home-section-heading"><div><span className="eyebrow">QUICK ACCESS</span><h2>Here when you need it</h2></div></div>
            <div className="quick-action-grid">
              <button className="quick-action" onClick={() => { setJourneyView('plan'); setTab('journey'); }}><span className="quick-icon rose">↗</span><strong>Plan a route</strong><small>Compare routes and nearby help</small></button>
              <button className="quick-action" onClick={() => { setNearbyView('facilities'); setTab('nearby'); }}><span className="quick-icon lilac">⌖</span><strong>Find nearby help</strong><small>Police, hospitals and transit</small></button>
              <button className="quick-action" onClick={() => setTab('contacts')}><span className="quick-icon peach">♡</span><strong>Trusted contacts</strong><small>Choose who can receive alerts</small></button>
            </div>

            <section className="home-sos-section">
              <div className="home-section-heading"><div><span className="eyebrow">EMERGENCY SUPPORT</span><h2>Help is close</h2></div></div>
              <SOSButton />
            </section>
          </div>
        )}

        {/* Journey planning and sharing */}
        {tab === 'journey' && (
          <div className="feature-page">
            <div className="page-heading-block"><span className="eyebrow">YOUR JOURNEY</span><h1>Plan and share</h1><p>Choose a route, then share trip progress with people you trust.</p></div>
            <div className="segmented-control" role="tablist" aria-label="Journey tools">
              <button role="tab" aria-selected={journeyView === 'plan'} className={journeyView === 'plan' ? 'selected' : ''} onClick={() => setJourneyView('plan')}>Plan route</button>
              <button role="tab" aria-selected={journeyView === 'share'} className={journeyView === 'share' ? 'selected' : ''} onClick={() => setJourneyView('share')}>Share trip</button>
            </div>
            {journeyView === 'plan'
              ? <PuneJourneyPlanner onStartJourney={handleStartJourneyFromPlanner} />
              : <TrustedJourneySharing prefillData={journeyPrefill} onNavigateToPlanner={() => setJourneyView('plan')} onNavigateToContacts={() => setTab('contacts')} />}
          </div>
        )}

        {tab === 'nearby' && (
          <div className="feature-page">
            <div className="page-heading-block"><span className="eyebrow">AROUND YOU</span><h1>Nearby support</h1><p>Explore local facilities and community-submitted concerns.</p></div>
            <div className="segmented-control" role="tablist" aria-label="Nearby information">
              <button role="tab" aria-selected={nearbyView === 'facilities'} className={nearbyView === 'facilities' ? 'selected' : ''} onClick={() => setNearbyView('facilities')}>Facilities</button>
              <button role="tab" aria-selected={nearbyView === 'reports'} className={nearbyView === 'reports' ? 'selected' : ''} onClick={() => setNearbyView('reports')}>Community reports</button>
            </div>
            {nearbyView === 'facilities' ? <PuneFacilitiesDirectory /> : <CommunityReportsView />}
          </div>
        )}

        {tab === 'contacts' && (
          <div className="feature-page">
            <div className="page-heading-block"><span className="eyebrow">YOUR SUPPORT CIRCLE</span><h1>Trusted contacts</h1><p>Choose how your contacts can receive emergency updates.</p></div>
            <Contacts />
          </div>
        )}

        {tab === 'more' && (
          <div className="feature-page">
            <div className="page-heading-block"><span className="eyebrow">PREFERENCES & ACTIVITY</span><h1>More</h1><p>Manage notifications and review recent alert activity.</p></div>
            <PushSetup />
            <div style={{ margin: '18px 0' }} />
            <AlertHistory />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav" aria-label="Main navigation">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            id={`nav-${t.id}`}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <span className="nav-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
