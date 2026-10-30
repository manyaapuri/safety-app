import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Home, Navigation, MapPin, Users, MoreHorizontal,
  AlertTriangle, LogOut, Shield, Phone
} from 'lucide-react';
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
  { id: 'home',     Icon: Home,          label: 'Home'     },
  { id: 'journey',  Icon: Navigation,    label: 'Journey'  },
  { id: 'nearby',   Icon: MapPin,        label: 'Nearby'   },
  { id: 'contacts', Icon: Users,         label: 'Contacts' },
  { id: 'more',     Icon: MoreHorizontal,label: 'More'     },
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
        if (mounted) { setActiveJourney(data.journey || null); setJourneyLoadError(false); }
      } catch {
        if (mounted) setJourneyLoadError(true);
      }
    };
    loadJourney();
    const timer = setInterval(loadJourney, 30000);
    return () => { mounted = false; clearInterval(timer); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    const sock = io(API_URL, { auth: { token } });
    setSocket(sock);

    sock.on('zone:alert', (data) => {
      setZoneAlert({ type: 'zone', ...data });
      setTimeout(() => setZoneAlert(null), 10000);
    });

    sock.on('journey:overdue', () => {
      setZoneAlert({ type: 'overdue', message: 'Your active journey has exceeded its scheduled arrival time.' });
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

  if (!user) return <Auth onAuth={handleAuth} />;

  const initials = user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'SH';

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-brand-mark" aria-hidden="true">
            <Shield size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="header-brand-text">SafeHer</div>
            <div className="header-brand-sub">Pune personal safety</div>
          </div>
        </div>

        <div className="header-actions">
          <a
            href="tel:112"
            className="btn btn-danger btn-sm"
            aria-label="Call India emergency number 112"
            style={{ textDecoration: 'none', gap: 6 }}
          >
            <Phone size={14} strokeWidth={2.5} />
            Call 112
          </a>
          <div className="user-chip">
            <div className="user-avatar" aria-hidden="true">{initials}</div>
            {user.name?.split(' ')[0]}
          </div>
          <button
            className="header-icon-btn"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* ── Zone / Overdue Alert Banner ── */}
      {zoneAlert && (
        <div className="toast show" role="alert" aria-live="assertive">
          <div className="msg msg-warning" style={{ borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)' }}>
            <AlertTriangle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong style={{ display: 'block', marginBottom: 2 }}>
                {zoneAlert.type === 'overdue' ? 'Journey Overdue' : 'Caution Area Detected'}
              </strong>
              <span style={{ fontSize: 12 }}>
                {zoneAlert.message || (zoneAlert.zones ? `Entered: ${zoneAlert.zones.map((z) => z.name).join(', ')}` : '')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Body ── */}
      <div className="page">

        {/* HOME */}
        {tab === 'home' && (
          <div className="home-dashboard">
            {/* Welcome */}
            <section className="home-welcome">
              <div className="eyebrow">
                <span className="status-dot" aria-hidden="true" />
                Your SafeHer space
              </div>
              <h1>Go with confidence{user.name ? `, ${user.name.split(' ')[0]}` : ''}.</h1>
              <p>Plan ahead, share your journey with people you trust, and keep emergency help close.</p>
              <button
                className="btn btn-primary"
                style={{ width: 'auto' }}
                onClick={() => { setJourneyView('plan'); setTab('journey'); }}
              >
                <Navigation size={15} strokeWidth={2.5} />
                Plan a journey
              </button>
            </section>

            {/* Active Journey */}
            <section className={`active-journey-card ${activeJourney ? 'is-active' : ''}`}>
              <div className="section-heading">
                <div>
                  <div className="eyebrow">Journey status</div>
                  <h2>
                    {activeJourney
                      ? 'Your trip is in progress'
                      : journeyLoadError
                      ? 'Status unavailable'
                      : 'No active journey'}
                  </h2>
                </div>
                {activeJourney && (
                  <span className={`status-pill ${activeJourney.status === 'overdue' ? 'overdue' : ''}`}>
                    {activeJourney.status === 'overdue' ? 'Check-in overdue' : 'Sharing on'}
                  </span>
                )}
              </div>

              {activeJourney ? (
                <>
                  <div className="journey-route-summary">
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{activeJourney.start_name}</span>
                    <span className="route-line" aria-hidden="true" />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{activeJourney.end_name}</span>
                  </div>
                  <div className="journey-meta">
                    Expected arrival {new Date(activeJourney.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={() => { setJourneyView('share'); setTab('journey'); }}>
                    View journey
                  </button>
                </>
              ) : (
                <div className="empty-journey-row">
                  <div className="soft-icon"><Navigation size={18} strokeWidth={1.75} /></div>
                  <p>{journeyLoadError ? 'Check your connection to refresh trip information.' : 'Start sharing when you want someone you trust to follow along.'}</p>
                  <button className="text-button" onClick={() => { setJourneyView('plan'); setTab('journey'); }}>Get started</button>
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <div>
              <div className="home-section-heading">
                <div>
                  <div className="eyebrow">Quick access</div>
                  <h2>Here when you need it</h2>
                </div>
              </div>
              <div className="quick-action-grid">
                <button className="quick-action" onClick={() => { setJourneyView('plan'); setTab('journey'); }}>
                  <span className="quick-icon rose"><Navigation size={18} strokeWidth={1.75} /></span>
                  <strong>Plan a route</strong>
                  <small>Compare routes and nearby help</small>
                </button>
                <button className="quick-action" onClick={() => { setNearbyView('facilities'); setTab('nearby'); }}>
                  <span className="quick-icon lilac"><MapPin size={18} strokeWidth={1.75} /></span>
                  <strong>Find nearby help</strong>
                  <small>Police, hospitals and transit</small>
                </button>
                <button className="quick-action" onClick={() => setTab('contacts')}>
                  <span className="quick-icon peach"><Users size={18} strokeWidth={1.75} /></span>
                  <strong>Trusted contacts</strong>
                  <small>Choose who receives alerts</small>
                </button>
              </div>
            </div>

            {/* SOS */}
            <section className="home-sos-section">
              <div className="home-section-heading">
                <div>
                  <div className="eyebrow">Emergency support</div>
                  <h2>Help is close</h2>
                </div>
              </div>
              <SOSButton />
            </section>
          </div>
        )}

        {/* JOURNEY */}
        {tab === 'journey' && (
          <div className="feature-page">
            <div className="page-heading-block">
              <div className="eyebrow">Your journey</div>
              <h1>Plan and share</h1>
              <p>Choose a route, then share trip progress with people you trust.</p>
            </div>
            <div className="segmented-control" role="tablist" aria-label="Journey tools">
              <button role="tab" aria-selected={journeyView === 'plan'} className={journeyView === 'plan' ? 'selected' : ''} onClick={() => setJourneyView('plan')}>Plan route</button>
              <button role="tab" aria-selected={journeyView === 'share'} className={journeyView === 'share' ? 'selected' : ''} onClick={() => setJourneyView('share')}>Share trip</button>
            </div>
            {journeyView === 'plan'
              ? <PuneJourneyPlanner onStartJourney={handleStartJourneyFromPlanner} />
              : <TrustedJourneySharing prefillData={journeyPrefill} onNavigateToPlanner={() => setJourneyView('plan')} onNavigateToContacts={() => setTab('contacts')} />}
          </div>
        )}

        {/* NEARBY */}
        {tab === 'nearby' && (
          <div className="feature-page">
            <div className="page-heading-block">
              <div className="eyebrow">Around you</div>
              <h1>Nearby support</h1>
              <p>Explore local facilities and community-submitted concerns.</p>
            </div>
            <div className="segmented-control" role="tablist" aria-label="Nearby information">
              <button role="tab" aria-selected={nearbyView === 'facilities'} className={nearbyView === 'facilities' ? 'selected' : ''} onClick={() => setNearbyView('facilities')}>Facilities</button>
              <button role="tab" aria-selected={nearbyView === 'reports'} className={nearbyView === 'reports' ? 'selected' : ''} onClick={() => setNearbyView('reports')}>Community reports</button>
            </div>
            {nearbyView === 'facilities' ? <PuneFacilitiesDirectory /> : <CommunityReportsView />}
          </div>
        )}

        {/* CONTACTS */}
        {tab === 'contacts' && (
          <div className="feature-page">
            <div className="page-heading-block">
              <div className="eyebrow">Your support circle</div>
              <h1>Trusted contacts</h1>
              <p>Choose how your contacts receive emergency updates.</p>
            </div>
            <Contacts />
          </div>
        )}

        {/* MORE */}
        {tab === 'more' && (
          <div className="feature-page">
            <div className="page-heading-block">
              <div className="eyebrow">Preferences & activity</div>
              <h1>More</h1>
              <p>Manage notifications and review recent alert activity.</p>
            </div>
            <PushSetup />
            <div style={{ height: 16 }} />
            <AlertHistory />
          </div>
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      <nav className="bottom-nav" aria-label="Main navigation">
        {TABS.map(({ id, Icon, label }) => (
          <button
            key={id}
            className={`nav-btn ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <span className="nav-icon">
              <Icon size={22} strokeWidth={tab === id ? 2.25 : 1.75} />
            </span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
