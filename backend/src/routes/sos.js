const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { sendSms, notifyPolice } = require('../services/notificationService');
const { sendPushToUser } = require('../services/pushService');

const router = express.Router();

const PUNE_EMERGENCY_HOTLINES = [
  { name: 'National Emergency', number: '112', description: 'All-in-one Police, Fire & Medical dispatch' },
  { name: 'Pune Women Helpline', number: '1091', description: 'Dedicated Pune Police Bharosa Cell for women' },
  { name: 'Police Control Room', number: '100', description: 'Immediate local police assistance' },
  { name: 'Ambulance & Medical Emergency', number: '108', description: 'Emergency medical service' },
  { name: 'Women in Distress (National)', number: '181', description: 'National Commission for Women 24/7' }
];

// POST /api/sos - Trigger emergency SOS
router.post('/', auth, async (req, res) => {
  try {
    const { latitude, longitude, type, trigger_type, voice_phrase, photo_base64, audio_base64, address } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // 1. SAVE ALERT TO DATABASE FIRST before attempting external delivery
    const alertResult = await pool.query(
      `INSERT INTO alerts (
         user_id, latitude, longitude, type, trigger_type,
         voice_phrase, photo_base64, audio_base64, address, status, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',NOW())
       RETURNING *`,
      [
        req.user.id,
        lat,
        lng,
        type || 'manual',
        trigger_type || type || 'manual',
        voice_phrase || null,
        photo_base64 || null,
        audio_base64 || null,
        address || 'Pune, Maharashtra'
      ]
    );
    const alert = alertResult.rows[0];

    // 2. Retrieve user details and emergency contacts
    const userRes = await pool.query('SELECT name, phone FROM users WHERE id = $1', [req.user.id]);
    const userName = userRes.rows[0]?.name || 'Urban Guardian User';

    const contactsRes = await pool.query(
      'SELECT id, name, phone, email FROM emergency_contacts WHERE user_id = $1',
      [req.user.id]
    );
    const contacts = contactsRes.rows;

    const mapsUrl = `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
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

    const deliveries = [];

    // 3. Deliver SMS to emergency contacts & track state
    const triggerLabel = trigger_type === 'voice' ? 'VOICE SOS' : 'EMERGENCY SOS';
    const smsMessage = `🚨 ${triggerLabel}: ${userName} needs immediate assistance! Location: ${address || 'Pune'}. Live Map: ${mapsUrl}. Sent via Urban Guardian Pune.`;

    for (const c of contacts) {
      const delivery = await sendSms(c.phone, smsMessage);
      deliveries.push({
        contact_id: c.id,
        name: c.name,
        phone: c.phone,
        status: delivery.status,
        provider_ref: delivery.provider_ref || null,
        error: delivery.error || null,
        note: delivery.note || null
      });

      // Record in alert_deliveries table
      await pool.query(
        `INSERT INTO alert_deliveries (alert_id, channel, recipient, status, provider_ref, error_message, attempted_at)
         VALUES ($1,'sms',$2,$3,$4,$5,NOW())`,
        [alert.id, c.phone, delivery.status, delivery.provider_ref || null, delivery.error || null]
      ).catch(() => {});
    }

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
          body: `Alert active at ${lat.toFixed(4)}, ${lng.toFixed(4)}. Emergency services & contacts notified.`,
          tag: `sos-${alert.id}`,
          data: { alertId: alert.id, lat, lng }
        });
      }
    } catch (e) {
      console.warn('[sos/push] Push alert notice failed:', e.message);
    }

    // Update alert status
    const anyContactSent = deliveries.some((d) => d.status === 'sent' || d.status === 'simulated');
    await pool.query(
      'UPDATE alerts SET notified_contacts = $1, notified_police = $2 WHERE id = $3',
      [anyContactSent, notifiedPolice, alert.id]
    );

    // 6. Broadcast via Socket to user's room and active journeys
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user.id}`).emit('sos:triggered', { ...alertInfo, deliveries, policeStatus });
    }

    res.status(201).json({
      alert: {
        ...alert,
        notified_contacts: anyContactSent,
        notified_police: notifiedPolice
      },
      deliveries,
      policeStatus,
      emergencyHotlines: PUNE_EMERGENCY_HOTLINES,
      contactsTotal: contacts.length,
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
    const contactsRes = await pool.query(
      'SELECT id, name, phone FROM emergency_contacts WHERE user_id = $1',
      [req.user.id]
    );

    const mapsUrl = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const userName = userRes.rows[0]?.name || 'User';
    const message = `🚨 EMERGENCY SOS RETRY: ${userName} needs help! Location: ${alert.address || 'Pune'}. Live Map: ${mapsUrl}.`;

    const retryDeliveries = [];
    for (const c of contactsRes.rows) {
      const delivery = await sendSms(c.phone, message);
      retryDeliveries.push({
        contact_id: c.id,
        name: c.name,
        phone: c.phone,
        status: delivery.status,
        provider_ref: delivery.provider_ref || null,
        error: delivery.error || null
      });

      await pool.query(
        `INSERT INTO alert_deliveries (alert_id, channel, recipient, status, provider_ref, error_message, attempted_at)
         VALUES ($1,'sms',$2,$3,$4,$5,NOW())`,
        [alert.id, c.phone, delivery.status, delivery.provider_ref || null, delivery.error || null]
      ).catch(() => {});
    }

    res.json({
      success: true,
      alertId: alert.id,
      retryDeliveries
    });
  } catch (err) {
    console.error('[sos/retry] Error:', err);
    res.status(500).json({ error: 'Failed to retry alert delivery' });
  }
});

// GET /api/sos/deliveries/:id - Get delivery status log for an alert
router.get('/deliveries/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.* FROM alert_deliveries d
       JOIN alerts a ON a.id = d.alert_id
       WHERE d.alert_id = $1 AND a.user_id = $2
       ORDER BY d.attempted_at DESC`,
      [req.params.id, req.user.id]
    );
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
