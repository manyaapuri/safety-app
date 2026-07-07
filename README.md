# 🛡️ Urban Safety App v2

A **comprehensive personal safety application** with real-time GPS tracking, voice-activated SOS, camera integration, danger zone alerts, safe route advisor, police integration, and push notifications.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🆘 **Manual SOS** | One-tap SOS with 5-second cancellable countdown |
| 🎙️ **Voice SOS** | Automatic trigger on keywords: "help me", "SOS", "leave me alone", "call police" |
| 📷 **Camera Evidence** | Auto-captures timestamped photo on SOS for evidence |
| 📍 **Real-time GPS** | Continuous high-accuracy GPS tracking via `watchPosition` |
| 🔗 **Location Sharing** | Time-limited share links (30min–8hr) for family/friends |
| 👥 **Emergency Contacts** | SMS alerts to all contacts via Twilio on SOS trigger |
| 🚔 **Police Integration** | Structured POST to configurable police API endpoint |
| 🔔 **Push Notifications** | Web Push (VAPID) — alerts even when app is in background |
| ⚠️ **Danger Zone Alerts** | Geofence-based real-time alerts when entering risky areas |
| 🗺️ **Safe Route Advisor** | ML-powered route safety scoring (day/night aware) |
| 📊 **Anomaly Detection** | ML flags unusual movement patterns (sudden stops, forced transport) |
| 📋 **Alert History** | Full history with resolve/false-alarm actions |
| 🌙 **Dark UI** | Premium glassmorphism dark theme with animations |

---

## 🏗️ Architecture

```
safety-app/
├── backend/              # Node.js + Express + Socket.io
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js         # JWT auth (register/login)
│   │   │   ├── contacts.js     # Emergency contacts CRUD
│   │   │   ├── location.js     # GPS pings + share links + geofence check
│   │   │   ├── sos.js          # SOS trigger (manual/voice/photo)
│   │   │   ├── zones.js        # Danger zone CRUD
│   │   │   ├── push.js         # Web Push subscriptions
│   │   │   └── route.js        # Route safety proxy to ML
│   │   ├── services/
│   │   │   ├── notificationService.js  # SMS (Twilio) + Police API
│   │   │   ├── pushService.js          # Web Push (web-push / VAPID)
│   │   │   ├── mlService.js            # ML anomaly detection bridge
│   │   │   └── zoneService.js          # Haversine geofence check
│   │   ├── sockets/index.js    # Socket.io: live location + zone alerts
│   │   ├── middleware/auth.js  # JWT middleware
│   │   ├── db.js               # PostgreSQL pool
│   │   └── server.js           # Express app entry point
│   ├── schema.sql              # v1 DB schema
│   ├── schema_v2.sql           # v2 additions (zones, push, voice, photo)
│   ├── package.json
│   └── .env.example
│
├── frontend/             # React + Vite + Leaflet
│   ├── public/
│   │   └── sw.js               # Service Worker for push notifications
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth.jsx         # Login / Register
│   │   │   ├── SOSButton.jsx    # SOS with countdown + voice + camera
│   │   │   ├── VoiceSOS.jsx     # Web Speech API keyword detector
│   │   │   ├── CameraCapture.jsx # Camera snapshot for evidence
│   │   │   ├── MapView.jsx      # Live map + location sharing
│   │   │   ├── SafeZones.jsx    # Danger zone management
│   │   │   ├── RouteAdvisor.jsx # Route safety scoring UI
│   │   │   ├── Contacts.jsx     # Emergency contacts
│   │   │   ├── AlertHistory.jsx # SOS alert history
│   │   │   ├── PushSetup.jsx    # Push notification setup
│   │   │   └── TrackPage.jsx    # Public live-tracking view
│   │   ├── App.jsx              # Main app with tabbed navigation
│   │   ├── api.js               # Axios client
│   │   ├── main.jsx             # Entry + SW registration
│   │   └── index.css            # Dark glassmorphism design system
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── ml-service/           # Python FastAPI
    ├── main.py             # Anomaly detection + route safety + zone check
    └── requirements.txt
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+ (with PostGIS extension)

### 1. Database Setup
```bash
psql -U postgres -c "CREATE DATABASE safety_app;"
psql -U postgres -d safety_app -f backend/schema.sql
psql -U postgres -d safety_app -f backend/schema_v2.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm run dev
```

### 3. ML Service
```bash
cd ml-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 6000 --reload
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 🔧 Configuration

Edit `backend/.env`:

```env
PORT=5000
JWT_SECRET=your_long_random_secret

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/safety_app

# Twilio (SMS alerts to emergency contacts)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+10000000000

# Police API (replace with actual police integration URL)
POLICE_API_URL=https://your-police-api.gov.in/alert
POLICE_API_KEY=your_key

# ML Service
ML_SERVICE_URL=http://localhost:6000

# Frontend URL (for share links)
FRONTEND_URL=http://localhost:5173

# Web Push VAPID (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:admin@yourdomain.com
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT |

### SOS
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sos` | Trigger SOS (manual/voice/photo) |
| PUT | `/api/sos/:id/resolve` | Mark resolved / false alarm |
| GET | `/api/sos/history` | Alert history |

### Location
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/location` | Send GPS ping (triggers geofence check) |
| GET | `/api/location/history` | Location history |
| POST | `/api/location/share` | Create share link |
| GET | `/api/location/track/:token` | Public tracking (no auth) |

### Zones
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/zones` | List danger zones |
| POST | `/api/zones` | Add zone |
| DELETE | `/api/zones/:id` | Remove zone |
| POST | `/api/zones/check` | Check if coords in danger zone |

### Push Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/push/vapid-public-key` | Get VAPID public key |
| POST | `/api/push/subscribe` | Subscribe device |
| DELETE | `/api/push/unsubscribe` | Unsubscribe |
| POST | `/api/push/test` | Send test push |

### Route Safety
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/route/safety` | Score a route |
| GET | `/api/route/history` | Past route queries |

---

## 🔌 Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `location:update` | Server → Client | Live GPS update |
| `zone:alert` | Server → Client | Danger zone entered |
| `sos:triggered` | Server → Client | SOS fired |
| `subscribe:user` | Client → Server | Subscribe to user's room |

---

## 🔒 Security Notes

1. **JWT** — All sensitive endpoints require `Authorization: Bearer <token>`
2. **Photos** — Base64 photos stored in DB; consider S3 for production
3. **Police API** — Requires a formal MOU with local law enforcement for production use
4. **Voice** — Runs entirely in browser; audio is never sent to the server
5. **HTTPS required** — Camera, microphone, and push notifications require HTTPS in production

---

## 🌟 Production Checklist

- [ ] Replace placeholder POLICE_API_URL with real endpoint
- [ ] Generate VAPID keys: `npx web-push generate-vapid-keys`
- [ ] Configure Twilio with a real number
- [ ] Enable PostGIS on production DB
- [ ] Deploy with HTTPS (required for camera/mic/push APIs)
- [ ] Train ML models on real incident data for your city
- [ ] Set up S3/GCS for photo storage instead of DB blob
- [ ] Add rate limiting to prevent SOS spam

---

## 📄 License
MIT © Urban Safety App
