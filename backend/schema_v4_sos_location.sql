-- SOS must remain recordable when the device cannot provide GPS.
ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE alerts ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE alerts ALTER COLUMN longitude DROP NOT NULL;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS location_recorded_at TIMESTAMP;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS notifications_enqueued BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_user_idempotency
    ON alerts(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS sos_notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES emergency_contacts(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL DEFAULT 'sms',
    recipient VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at_ms BIGINT NOT NULL DEFAULT 0,
    updated_at_ms BIGINT NOT NULL DEFAULT 0,
    provider_ref VARCHAR(100),
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(alert_id, contact_id, channel)
);
CREATE INDEX IF NOT EXISTS idx_sos_outbox_ready
    ON sos_notification_outbox(status, next_attempt_at_ms);
