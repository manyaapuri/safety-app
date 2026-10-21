-- =====================================================
-- Urban Guardian — Pune Women's Safety App
-- Schema v3: Pune Facilities, Journeys, Reports & Deliveries
-- Run after schema.sql and schema_v2.sql
-- =====================================================

-- 1. Ensure alerts has audio_base64
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS audio_base64 TEXT;

-- 2. Verified Pune Facilities (Police, Hospitals, Transit hubs)
CREATE TABLE IF NOT EXISTS facilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- police_station | hospital | metro_station | bus_terminal | women_helpdesk
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    phone VARCHAR(50),
    opening_hours VARCHAR(100) DEFAULT '24/7',
    source VARCHAR(100) DEFAULT 'Pune Police / PMC Verified Directory',
    verification_date DATE DEFAULT CURRENT_DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_facilities_coords ON facilities(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_facilities_category ON facilities(category);

-- 3. Journeys & Trusted Trip Sharing
CREATE TABLE IF NOT EXISTS journeys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) DEFAULT 'Pune Journey',
    start_name TEXT NOT NULL,
    start_lat DOUBLE PRECISION NOT NULL,
    start_lng DOUBLE PRECISION NOT NULL,
    end_name TEXT NOT NULL,
    end_lat DOUBLE PRECISION NOT NULL,
    end_lng DOUBLE PRECISION NOT NULL,
    route_geometry TEXT,
    distance_km DOUBLE PRECISION,
    estimated_duration_min INTEGER,
    status VARCHAR(20) DEFAULT 'active', -- active | completed | cancelled | overdue
    expected_arrival TIMESTAMP NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    overdue_notified BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_journeys_user_status ON journeys(user_id, status);

-- 4. Secure Expiring Journey Share Tokens
CREATE TABLE IF NOT EXISTS journey_shares (
    id SERIAL PRIMARY KEY,
    journey_id INTEGER REFERENCES journeys(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_journey_shares_token ON journey_shares(token);

-- 5. Community Safety Reports
CREATE TABLE IF NOT EXISTS community_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- poor_lighting | harassment | isolated_street | deserted_path | other
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active | under_review | resolved | expired
    verification_count INTEGER DEFAULT 0,
    abuse_reports_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_coords ON community_reports(latitude, longitude);

-- 6. SOS Notification Deliveries (Honest State Tracking)
CREATE TABLE IF NOT EXISTS alert_deliveries (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
    channel VARCHAR(30) NOT NULL, -- sms | push | webhook
    recipient VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL, -- pending | sent | delivered | failed | simulated
    provider_ref VARCHAR(100),
    error_message TEXT,
    attempted_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliveries_alert ON alert_deliveries(alert_id);
