-- =====================================================
-- Urban Safety App — Schema v2 (additive migrations)
-- Run after schema.sql
-- =====================================================

-- Add voice/photo fields to alerts table
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(30) DEFAULT 'manual';
-- trigger_type: manual | voice | auto_keyword | anomaly | geofence
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS photo_base64 TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS voice_phrase VARCHAR(255);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS address TEXT;

-- Danger / risky zones (admin or user-defined geofences)
CREATE TABLE IF NOT EXISTS danger_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters DOUBLE PRECISION NOT NULL DEFAULT 300,
    severity VARCHAR(20) DEFAULT 'medium',  -- low | medium | high | critical
    category VARCHAR(50) DEFAULT 'general', -- crime | harassment | accident | dark_area
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_global BOOLEAN DEFAULT FALSE,        -- TRUE = visible to all users
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_danger_zones_location ON danger_zones(latitude, longitude);

-- Web Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Route safety cache (optional; store scored routes)
CREATE TABLE IF NOT EXISTS route_queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_lat DOUBLE PRECISION,
    start_lng DOUBLE PRECISION,
    end_lat DOUBLE PRECISION,
    end_lng DOUBLE PRECISION,
    safety_score DOUBLE PRECISION,
    route_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Check-in system (user can set a timer; if not checked in, alert fires)
CREATE TABLE IF NOT EXISTS check_ins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expected_at TIMESTAMP NOT NULL,
    destination TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending | checked_in | missed
    alert_id INTEGER REFERENCES alerts(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed some global danger zone examples (optional, remove for production)
INSERT INTO danger_zones (name, description, latitude, longitude, radius_meters, severity, category, is_global)
VALUES
  ('Sample High-Risk Zone 1', 'Historical incident hotspot', 28.6139, 77.2090, 400, 'high', 'crime', TRUE),
  ('Sample Dark Alley Zone', 'Poorly lit area, avoid at night', 28.6200, 77.2200, 200, 'medium', 'dark_area', TRUE)
ON CONFLICT DO NOTHING;
