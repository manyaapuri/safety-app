const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { notifyPolice } = require('../services/notificationService');
const { sendPushToUser } = require('../services/pushService');

const router = express.Router();

const PUNE_EMERGENCY_HOTLINES = [
  { name: 'National Emergency', number: '112', description: 'All-in-one Police, Fire & Medical dispatch' },
  { name: 'Pune Women Helpline', number: '1091', description: 'Dedicated Pune Police Bharosa Cell for women' },
  { name: 'Police Control Room', number: '100', description: 'Immediate local police assistance' },
  { name: 'Ambulance & Medical Emergency', number: '108', description: 'Emergency medical service' },
  { name: 'Women in Distress (National)', number: '181', description: 'National Commission for Women 24/7' }
];

async function enqueueContactNotifications(alertId, contacts) {
  for (const contact of contacts) {
    const channels = [];
    if (contact.sms_enabled !== false && contact.sms_enabled !== 0) channels.push('sms');
    if (contact.whatsapp_enabled === true || contact.whatsapp_enabled === 1) channels.push('whatsapp');
    for (const channel of channels) {
      await pool.query(
        `INSERT INTO sos_notification_outbox (alert_id, contact_id, channel, recipient, status)
         VALUES ($1,$2,$3,$4,'queued') ON CONFLICT DO NOTHING`,
        [alertId, contact.id, channel, contact.phone]
      );
    }
  }
  await pool.query('UPDATE alerts SET notifications_enqueued = TRUE WHERE id = $1', [alertId]);
}

async function getContactDeliverySummaries(alertId) {
  return pool.query(
    `SELECT o.id, o.contact_id, c.name, o.recipient AS phone, o.status,
            o.channel, o.provider_ref, COALESCE(o.last_error, d.error_message) AS error,
            o.attempt_count,
            (SELECT COUNT(*) FROM alert_deliveries ad WHERE ad.alert_id = o.alert_id
              AND ad.recipient = o.recipient AND ad.channel = o.channel) AS logged_attempts
     FROM sos_notification_outbox o
     LEFT JOIN emergency_contacts c ON c.id = o.contact_id
     LEFT JOIN alert_deliveries d ON d.id = (
       SELECT MAX(ad.id) FROM alert_deliveries ad WHERE ad.alert_id = o.alert_id
         AND ad.recipient = o.recipient AND ad.channel = o.channel
     )
     WHERE o.alert_id = $1 ORDER BY o.id`,
    [alertId]
  );
}

// POST /api/sos - Trigger emergency SOS
router.post('/', auth, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, location_recorded_at, type, trigger_type, voice_phrase, photo_base64, audio_base64, address } = req.body;
    const idempotencyKey = req.get('Idempotency-Key') || req.body.idempotency_key || null;
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 1 || idempotencyKey.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) {
      return res.status(400).json({ error: 'A 1–128 character Idempotency-Key is required' });
    }
    const hasLatitude = latitude !== undefined && latitude !== null && latitude !== '';
    const hasLongitude = longitude !== undefined && longitude !== null && longitude !== '';
    if (hasLatitude !== hasLongitude) {
      return res.status(400).json({ error: 'latitude and longitude must be provided together' });
    }

    const lat = hasLatitude ? Number(latitude) : null;
    const lng = hasLongitude ? Number(longitude) : null;
    if (hasLatitude && (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180)) {
      return res.status(400).json({ error: 'latitude and longitude must be valid coordinates' });
    }
    const parsedAccuracy = accuracy == null ? null : Number(accuracy);
    if (parsedAccuracy !== null && (!Number.isFinite(parsedAccuracy) || parsedAccuracy < 0)) {
      return res.status(400).json({ error: 'accuracy must be a non-negative number' });
    }

    // 1. SAVE ALERT TO DATABASE FIRST before attempting external delivery
    const alertResult = await pool.query(
      `INSERT INTO alerts (
         user_id, latitude, longitude, location_accuracy, location_recorded_at, idempotency_key, type, trigger_type,
         voice_phrase, photo_base64, audio_base64, address, status, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',NOW())
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        req.user.id,
        lat,
        lng,
        parsedAccuracy,
        location_recorded_at || null,
        idempotencyKey,
        type || 'manual',
        trigger_type || type || 'manual',
        voice_phrase || null,
        photo_base64 || null,
        audio_base64 || null,
        address || null
      ]
    );
    let alert = alertResult.rows[0];
    if (!alert && idempotencyKey) {
      const existing = await pool.query(
        'SELECT * FROM alerts WHERE user_id = $1 AND idempotency_key = $2',
        [req.user.id, idempotencyKey]
      );
      if (existing.rows.length > 0) {
        alert = existing.rows[0];
        if (!alert.notifications_enqueued) {
          const retryContacts = await pool.query(
            'SELECT id, name, phone, sms_enabled, whatsapp_enabled FROM emergency_contacts WHERE user_id = $1',
            [req.user.id]
          );
          await enqueueContactNotifications(alert.id, retryContacts.rows);
        }
        const deliveriesResult = await getContactDeliverySummaries(alert.id);
        const existingDeliveries = deliveriesResult.rows;
        return res.status(200).json({
          alert,
          deliveries: existingDeliveries,
          policeStatus: { dispatched: Boolean(alert.notified_police), reason: alert.notified_police ? undefined : 'No confirmed dispatch recorded.' },
          contactsTotal: existingDeliveries.length,
          notificationTargets: existingDeliveries.length,
          duplicate: true,
          smsMessage: null
        });
      }
      return res.status(500).json({ error: 'Could not safely determine whether the SOS was already recorded' });
    }

    // 2. Retrieve user details and emergency contacts
    const userRes = await pool.query('SELECT name, phone FROM users WHERE id = $1', [req.user.id]);
    const userName = userRes.rows[0]?.name || 'Urban Guardian User';

    const contactsRes = await pool.query(
      'SELECT id, name, phone, email, sms_enabled, whatsapp_enabled FROM emergency_contacts WHERE user_id = $1',
      [req.user.id]
    );
    const contacts = contactsRes.rows;

    const mapsUrl = lat === null ? null : `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
    const alertInfo = {
      userId: req.user.id,
      userName,
      latitude: lat,
      longitude: lng,
      mapsUrl,
      alertId: alert.id,
      triggerType: trigger_type || 'manual',
      voicePhrase: voice_phrase,
      address
    };

    // 3. Queue each contact notification durably; delivery runs independently.
    await enqueueContactNotifications(alert.id, contacts);
    const deliverySummaries = await getContactDeliverySummaries(alert.id);
    const deliveries = deliverySummaries.rows;

    const triggerLabel = trigger_type === 'voice' ? 'VOICE SOS' : 'EMERGENCY SOS';
    const locationText = mapsUrl
      ? `Latest location: ${address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}. Map: ${mapsUrl}.`
      : 'The device could not provide a current location.';
    const smsMessage = `🚨 ${triggerLabel}: ${userName} requested assistance. ${locationText} Sent via Urban Guardian Pune.`;

    // 4. Honest police check
    const policeStatus = await notifyPolice(alertInfo);
    const notifiedPolice = policeStatus.dispatched;

    // 5. Send Web Push to user's registered devices (if any)
    try {
      const pushSubs = await pool.query(
        'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
        [req.user.id]
      );
      if (pushSubs.rows.length > 0) {
        await sendPushToUser(pushSubs.rows, {
          title: '🚨 Emergency SOS Triggered',
          body: lat === null
            ? 'An emergency SOS was recorded. The device could not provide a current location.'
            : `Alert active at ${lat.toFixed(4)}, ${lng.toFixed(4)}.`,
          tag: `sos-${alert.id}`,
          data: { alertId: alert.id, lat, lng }
        });
      }
    } catch (e) {
      console.warn('[sos/push] Push alert notice failed:', e.message);
    }

    await pool.query(
      'UPDATE alerts SET notified_police = $1 WHERE id = $2',
      [notifiedPolice, alert.id]
    );

    // 6. Broadcast via Socket to user's room and active journeys
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user.id}`).emit('sos:triggered', { ...alertInfo, deliveries, policeStatus });
    }

    res.status(201).json({
      alert: {
        ...alert,
        notified_contacts: false,
        notified_police: notifiedPolice
      },
      deliveries,
      policeStatus,
      emergencyHotlines: PUNE_EMERGENCY_HOTLINES,
      contactsTotal: contacts.length,
      notificationTargets: deliveries.length,
      smsMessage
    });
  } catch (err) {
    console.error('[sos] Error triggering SOS:', err);
    res.status(500).json({ error: 'Failed to process emergency alert. Please use direct emergency calling.' });
  }
});

// POST /api/sos/:id/retry - Retry failed notification deliveries without duplicate alert
router.post('/:id/retry', auth, async (req, res) => {
  try {
    const alertResult = await pool.query(
      'SELECT * FROM alerts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (alertResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = alertResult.rows[0];
    const retried = await pool.query(
      `UPDATE sos_notification_outbox
       SET status = 'queued', next_attempt_at_ms = 0, updated_at_ms = $1, last_error = NULL
       WHERE alert_id = $2 AND channel IN ('sms','whatsapp') AND status = 'failed' AND attempt_count < 3
       RETURNING id, contact_id, recipient AS phone, status, attempt_count`,
      [Date.now(), alert.id]
    );
    const retryDeliveries = retried.rows;

    res.json({
      success: true,
      alertId: alert.id,
      retryDeliveries,
      message: retryDeliveries.length ? 'Failed SMS queued for a bounded retry.' : 'No failed SMS attempts are eligible for retry.'
    });
  } catch (err) {
    console.error('[sos/retry] Error:', err);
    res.status(500).json({ error: 'Failed to retry alert delivery' });
  }
});

// GET /api/sos/deliveries/:id - Get delivery status log for an alert
router.get('/deliveries/:id', auth, async (req, res) => {
  try {
    const owner = await pool.query('SELECT id FROM alerts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!owner.rows.length) return res.status(404).json({ error: 'Alert not found' });
    const result = await getContactDeliverySummaries(req.params.id);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch delivery status log' });
  }
});

// PUT /api/sos/:id/resolve - Mark resolved or false alarm
router.put('/:id/resolve', auth, async (req, res) => {
  const { status } = req.body;
  if (!['resolved', 'false_alarm'].includes(status)) {
    return res.status(400).json({ error: 'status must be resolved or false_alarm' });
  }
  const result = await pool.query(
    `UPDATE alerts SET status = $1, resolved_at = NOW()
     WHERE id = $2 AND user_id = $3 RETURNING *`,
    [status, req.params.id, req.user.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  res.json(result.rows[0]);
});

// GET /api/sos/history - Alert history
router.get('/history', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, latitude, longitude, type, trigger_type, voice_phrase, photo_base64, audio_base64, address,
            status, notified_contacts, notified_police, created_at, resolved_at
     FROM alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json(result.rows);
});

module.exports = router;
