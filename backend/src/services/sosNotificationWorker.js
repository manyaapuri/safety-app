const pool = require('../db');
const { sendSms, sendWhatsApp } = require('./notificationService');

const MAX_ATTEMPTS = 3;
const PROCESSING_LEASE_MS = 60_000;

function buildSosMessage(context) {
  const hasLocation = context.latitude !== null && context.latitude !== undefined
    && context.longitude !== null && context.longitude !== undefined;
  const locationText = hasLocation
    ? `Latest location: ${context.address || `${context.latitude}, ${context.longitude}`}. Map: https://www.google.com/maps?q=${context.latitude},${context.longitude}.`
    : 'The device could not provide a current location.';
  const label = context.trigger_type === 'voice' ? 'VOICE SOS' : 'EMERGENCY SOS';
  return `🚨 ${label}: ${context.name || 'A SafeHer user'} requested assistance. ${locationText} Sent via Urban Guardian Pune.`;
}

async function processSosNotificationQueue(io) {
  const now = Date.now();

  // Recover work abandoned by a process that stopped while sending.
  await pool.query(
    `UPDATE sos_notification_outbox SET status = 'queued', next_attempt_at_ms = $1
     WHERE status = 'processing' AND updated_at_ms < $2`,
    [now, now - PROCESSING_LEASE_MS]
  );

  const candidates = await pool.query(
    `SELECT id FROM sos_notification_outbox
     WHERE status = 'queued' AND next_attempt_at_ms <= $1
     ORDER BY created_at, id LIMIT 25`,
    [now]
  );

  for (const candidate of candidates.rows) {
    const claimed = await pool.query(
      `UPDATE sos_notification_outbox
       SET status = 'processing', attempt_count = attempt_count + 1, updated_at_ms = $1
       WHERE id = $2 AND status = 'queued' RETURNING *`,
      [Date.now(), candidate.id]
    );
    if (!claimed.rows.length) continue;

    const job = claimed.rows[0];
    try {
      const contextResult = await pool.query(
        `SELECT a.id AS alert_id, a.user_id, a.latitude, a.longitude, a.address,
                a.trigger_type, a.created_at, u.name
         FROM alerts a JOIN users u ON u.id = a.user_id WHERE a.id = $1`,
        [job.alert_id]
      );
      if (!contextResult.rows.length) {
        await pool.query(
          `UPDATE sos_notification_outbox SET status = 'failed', last_error = $1, updated_at_ms = $2 WHERE id = $3`,
          ['SOS incident was removed before notification delivery', Date.now(), job.id]
        );
        continue;
      }

      const context = contextResult.rows[0];
      const delivery = job.channel === 'whatsapp'
        ? await sendWhatsApp(job.recipient, {
          userName: context.name,
          location: context.latitude === null || context.latitude === undefined
            ? 'Location unavailable'
            : `${context.latitude}, ${context.longitude}`,
          time: context.created_at
        })
        : await sendSms(job.recipient, buildSosMessage(context));
      const logStatus = delivery.status === 'queued' ? 'accepted' : delivery.status;
      await pool.query(
        `INSERT INTO alert_deliveries (alert_id, channel, recipient, status, provider_ref, error_message, attempted_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [job.alert_id, job.channel, job.recipient, logStatus, delivery.provider_ref || null, delivery.error || null]
      );

      const retry = delivery.status === 'failed' && delivery.retryable && job.attempt_count < MAX_ATTEMPTS;
      const nextAttemptAt = retry ? Date.now() + (10_000 * (2 ** (job.attempt_count - 1))) : 0;
      const outboxStatus = retry ? 'queued' : logStatus;
      await pool.query(
        `UPDATE sos_notification_outbox SET status = $1, next_attempt_at_ms = $2,
             updated_at_ms = $3, provider_ref = $4, last_error = $5
         WHERE id = $6`,
        [outboxStatus, nextAttemptAt, Date.now(), delivery.provider_ref || null, delivery.error || null, job.id]
      );

      if (['sent', 'accepted'].includes(logStatus)) {
        await pool.query('UPDATE alerts SET notified_contacts = TRUE WHERE id = $1', [job.alert_id]);
      }

      io?.to(`user_${contextResult.rows[0].user_id}`).emit('sos:delivery', {
        alertId: job.alert_id,
        contactId: job.contact_id,
        status: outboxStatus,
        attempt: job.attempt_count,
        error: delivery.error || null
      });
    } catch (error) {
      const retry = job.attempt_count < MAX_ATTEMPTS;
      await pool.query(
        `UPDATE sos_notification_outbox SET status = $1, next_attempt_at_ms = $2,
             updated_at_ms = $3, last_error = $4
         WHERE id = $5`,
        [retry ? 'queued' : 'failed', retry ? Date.now() + (10_000 * (2 ** (job.attempt_count - 1))) : 0, Date.now(), error.message, job.id]
      ).catch((updateError) => console.error('[sos/worker] Failed to update outbox item:', updateError.message));
      console.error('[sos/worker] Notification job failed:', error.message);
    }
  }
}

module.exports = { processSosNotificationQueue, buildSosMessage, MAX_ATTEMPTS };
