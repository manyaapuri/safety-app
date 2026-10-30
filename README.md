# 🛡️ Urban Guardian — Pune Women's Safety App

A practical, production-grade women's journey-safety platform tailored specifically for **Pune, Maharashtra**, featuring real-time OSRM route geometry, trusted journey sharing with automatic overdue alerts, a verified Pune facilities database, reliable emergency SOS with honest delivery tracking, and community safety reporting.

---

## ✨ Features & Architecture

| Feature | Description |
|---------|-------------|
| 🗺️ **Pune Journey Planner** | Real-world OSRM routing engine with live geometry, distance (km), and ETAs across Pune hubs (Shivajinagar, Hinjawadi, Deccan, Kothrud, Viman Nagar, etc.). Displays alternative routes and verified municipal facilities along the corridor without arbitrary "safety scores". |
| 🤝 **Trusted Journey Sharing** | Start journeys with origin, destination, and expected arrival time. Generates secure, expiring share tokens (`/track/:token`) for trusted contacts. Includes live trip extension, trip cancellation, and automatic overdue alerting. Access is immediately revoked upon trip completion to protect privacy. |
| 🚨 **Reliable Emergency SOS** | Accessible SOS button with 5-second cancellable countdown. Persists alert to database first before attempting external delivery. Delivers SMS via Twilio or Dev Mock Provider, records honest delivery states (`sent`, `simulated`, `failed`), and provides one-tap direct calling to verified Indian hotlines (112, 1091, 100, 108). Optional camera evidence toggle (disabled by default). |
| 🏛️ **Pune Verified Facilities** | Comprehensive verified database of Pune Police stations (Headquarters, Deccan, Shivajinagar, Hinjawadi, Kothrud), 24/7 emergency hospitals (Sassoon, KEM, Sahyadri, Ruby Hall, Jupiter), transit hubs (Pune Junction, Swargate), Metro interchange stations, and the Pune Police Bharosa Cell (Women's Helpline). Includes proximity distance and direct Google Maps navigation links. |
| 📢 **Community Safety Reports** | Crowd-sourced hazard reporting (poor street lighting, harassment, isolated roads) with duplicate merging within 150m, community verification upvoting, abuse flagging, and 30-day auto-expiration. |
| 👥 **Trusted Contacts** | Emergency contacts with explicit consent disclosure, direct relation tags, and an on-demand test notification workflow. |
| 🔔 **Web Push & Reliability** | Web Push (VAPID) service worker notifications, startup environment variable validation, and secure Socket.io room subscription with token verification. |

---

## 🏗️ Technical Architecture

```
safety-app/
├── backend/                  # Node.js + Express + Socket.io
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js             # JWT authentication (register/login)
│   │   │   ├── contacts.js         # Emergency contacts CRUD & test SMS
│   │   │   ├── facilities.js       # Pune facilities directory & nearby lookup
│   │   │   ├── journeys.js         # Trusted trip sharing, lifecycle & tracking
│   │   │   ├── location.js         # Real-time GPS pings & room broadcasts
│   │   │   ├── push.js             # Web Push subscription & test push
│   │   │   ├── reports.js          # Community hazard reports & moderation
│   │   │   ├── route.js            # OSRM routing engine & Pune search
│   │   │   ├── sos.js              # Reliable SOS, delivery logs & retry
│   │   │   └── zones.js            # Pune caution areas & geofences
│   │   ├── services/
│   │   │   ├── notificationService.js # Twilio SMS & Mock Dev Provider
│   │   │   ├── pushService.js         # Web Push (web-push / VAPID)
│   │   │   ├── mlService.js           # ML anomaly detection bridge
│   │   │   └── zoneService.js         # Proximity checks
│   │   ├── sockets/index.js        # Secure token-verified Socket.io rooms
│   │   ├── middleware/auth.js      # JWT Bearer token authentication
│   │   ├── db.js                   # Universal dual-mode DB (PostgreSQL + SQLite)
│   │   └── server.js               # Express entrypoint & overdue trip monitor
│   ├── tests/
│   │   └── api.test.js             # Automated integration test suite
│   ├── schema.sql                  # PostgreSQL v1 schema
│   ├── schema_v2.sql               # PostgreSQL v2 schema
│   ├── schema_v3_pune.sql          # PostgreSQL v3 Pune schema
│   ├── schema_v4_sos_location.sql  # PostgreSQL migration: SOS without GPS
│   └── package.json
│
├── frontend/                 # React 18 + Vite + Leaflet
│   ├── src/
│   │   ├── components/
│   │   │   ├── PuneJourneyPlanner.jsx      # OSRM map planner & facilities overlay
│   │   │   ├── TrustedJourneySharing.jsx   # Trip lifecycle & private share link
│   │   │   ├── SOSButton.jsx               # Reliable SOS with 112/1091 hotlines
│   │   │   ├── PuneFacilitiesDirectory.jsx # Police, hospital & transit directory
│   │   │   ├── CommunityReportsView.jsx    # Hazard reports & duplicate merging
│   │   │   ├── Contacts.jsx                # Emergency contacts & test SMS
│   │   │   ├── TrackPage.jsx               # Secure private viewer page
│   │   │   ├── AlertHistory.jsx            # SOS history & resolution
│   │   │   ├── PushSetup.jsx               # Browser push notification setup
│   │   │   └── Auth.jsx                    # Login & Register with clear errors
│   │   ├── App.jsx                         # Main app shell & navigation
│   │   ├── api.js                          # Axios interceptors & auto-logout
│   │   └── index.css                       # Glassmorphism dark UI design system
│   └── public/sw.js                        # Push notification service worker
│
└── ml-service/               # Python FastAPI
    └── main.py               # Movement anomaly detection heuristics
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node.js v24)
- **Database**: 
  - Works **out-of-the-box with zero setup** via built-in SQLite (`safety_app.sqlite`).
  - Or connect any local or cloud PostgreSQL instance (PostGIS optional) by setting `DATABASE_URL`.

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```
The backend will validate environment variables and start on **http://localhost:5000**.
- If PostgreSQL is not running on port 5432, it automatically initializes the local embedded SQLite database and seeds 19 verified Pune safety facilities.
- Twilio defaults to a clearly-labeled **Mock Notification Provider** for development so SMS alerts can be tested locally without needing external API credits.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## 🧪 Running Automated Tests

A comprehensive integration test suite covers all critical workflows:
- User registration and duplicate rejection
- Authentication & invalid credentials handling (401)
- Emergency contacts & test SMS delivery (honest status)
- Pune facilities directory, category filtering & proximity search
- Real OSRM route calculation across Pune
- Trusted journey sharing lifecycle and instant token revocation upon arrival (410 Gone)
- SOS database persistence, delivery logs, and retry without duplicate alert
- Community safety report submission, duplicate merging within 150m, and abuse flagging

Run the test suite:
```bash
cd backend
npm test
```

---

## ⚙️ Environment Variables & Credentials Reference

Configure in `backend/.env`:

| Variable | Description | Default / Mode |
|----------|-------------|----------------|
| `PORT` | Backend listening port | `5000` |
| `JWT_SECRET` | Secret key for signing auth tokens | Min 32 chars |
| `DATABASE_URL` | PostgreSQL connection string | Defaults to SQLite fallback if unreachable |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID for live SMS alerts | Set to real SID for live SMS; leave as mock for dev |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Set to real token for live SMS |
| `TWILIO_FROM_NUMBER` | Twilio registered phone number | e.g. `+1234567890` |
| `SMS_PROVIDER` | `mock`, `twilio`, or `disabled` | `mock` in development; production fails closed when Twilio is unavailable |
| `TWILIO_STATUS_CALLBACK_URL` | Public HTTPS callback URL for Twilio delivery events | Optional; configure `/api/notifications/twilio/status` |
| `WHATSAPP_PROVIDER` | `disabled`, `mock`, or `twilio` | `disabled` until Business sender/template approval |
| `TWILIO_WHATSAPP_FROM` | Approved WhatsApp sender | `whatsapp:+...` |
| `TWILIO_WHATSAPP_CONTENT_SID` | Approved Twilio WhatsApp content template SID | `HX...` |
| `VAPID_PUBLIC_KEY` | Web Push Public Key | Generated via `web-push` |
| `VAPID_PRIVATE_KEY` | Web Push Private Key | Generated via `web-push` |
| `POLICE_API_URL` | Official Police dispatch webhook | Placeholder (requires formal MoU with Pune Police) |
| `FRONTEND_URL` | Public frontend URL for share links | `http://localhost:5173` |

For an existing PostgreSQL database, apply `backend/schema_v4_sos_location.sql` before deploying a version that records SOS incidents without GPS. The built-in SQLite database upgrades this schema automatically on startup.

SOS contact messages are written to a durable outbox and processed independently of the request. Contacts default to SMS enabled and WhatsApp disabled; WhatsApp must be opted into per contact. To enable WhatsApp, configure `WHATSAPP_PROVIDER=twilio`, an approved `TWILIO_WHATSAPP_FROM`, and the approved content template SID. The template must use `{{1}}` for the user's name, `{{2}}` for the location text, and `{{3}}` for the incident time. Set `TWILIO_STATUS_CALLBACK_URL` to the public HTTPS URL of the callback route to receive signed Twilio status events. Provider accounts, approved templates, live credentials, and real-device delivery have not been verified by this repository change.

---

## 🔒 Safety & Privacy Principles

1. **No Synthetic Safety Scores**: The app does not invent arbitrary scores (e.g. "82% safe") without validated incident data. Instead, it provides objective route geometry, distance, travel duration, and highlights verified municipal safety facilities along the corridor.
2. **Strict Location Privacy**: Real-time tracking links are time-limited, expiring, and revoked immediately upon trip completion. Viewers cannot access past location history.
3. **Honest Delivery States**: The app distinguishes between live Twilio SMS (`sent`), development simulation (`simulated`), and delivery errors (`failed`). Police dispatch is never falsely claimed.
4. **Emergency Calling Fallback**: When connectivity or notifications fail, one-tap direct dialing for Indian emergency numbers (`112`, `1091`, `100`, `108`) is prominently available.
