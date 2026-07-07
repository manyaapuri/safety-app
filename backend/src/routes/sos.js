const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { notifyContacts, notifyPolice } = require('../services/notificationService');
const { sendPushToUser } = require('../services/pushService');

const router = express.Router();

// POST /api/sos - trigger an emergency SOS alert
// Body: { latitude, longitude, type?, trigger_type?, voice_phrase?, photo_base64?, audio_base64?, address? }
router.post('/', auth, async (req, res) => {
  try {
    const { latitude, longitude, type, trigger_type, voice_phrase, photo_base64, audio_base64, address } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'latitude and longitude required' });
    }

    // 1. Create the alert record
    const alertResult = await pool.query(
      `INSERT INTO alerts (user_id, latitude, longitude, type, trigger_type, voice_phrase, photo_base64, audio_base64, address, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active') RETURNING *`,
      [
        req.user.id, latitude, longitude,
        type || 'manual',
        trigger_type || type || 'manual',
        voice_phrase || null,
        photo_base64 || null,
        audio_base64 || null,
        address || null
      ]
    );
    const alert = alertResult.rows[0];

    // 2. Get user info and emergency contacts
    const userResult = await pool.query('SELECT name, phone FROM users WHERE id = $1', [req.user.id]);
    const userName = userResult.rows[0]?.name || 'A user';

    const contactsResult = await pool.query(
      'SELECT name, phone, email FROM emergency_contacts WHERE user_id = $1',
      [req.user.id]
    );
    const contacts = contactsResult.rows;

    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const addressStr = address ? ` Address: ${address}.` : '';
    const alertInfo = {
      userId: req.user.id, userName, latitude, longitude,
      mapsUrl, alertId: alert.id, triggerType: trigger_type || 'manual',
      voicePhrase: voice_phrase, address
    };

    let notifiedContacts = false;
    let notifiedPolice = false;
    let smsMessage = null;

    // 3. Notify contacts via SMS
    if (contacts.length > 0) {
      try {
        const notifyResult = await notifyContacts(contacts, alertInfo);
        notifiedContacts = true;
        if (notifyResult && notifyResult.message) {
          smsMessage = notifyResult.message;
        }
      } catch (e) {
        console.error('Contact notification failed:', e.message);
      }
    }

    // 4. Police notification
    try {
      await notifyPolice(alertInfo);
      notifiedPolice = true;
    } catch (err) {
      console.error('Police notification failed:', err.message);
    }

    // 5. Web Push notification to user's own devices
    try {
      const pushSubs = await pool.query(
        'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
        [req.user.id]
      );
      if (pushSubs.rows.length > 0) {
        const triggerLabel = trigger_type === 'voice' ? '🎙️ Voice SOS' :
          trigger_type === 'geofence' ? '🚨 Risky Area' : '🆘 SOS';
        await sendPushToUser(pushSubs.rows, {
          title: `${triggerLabel} Alert Sent`,
          body: `Your emergency alert has been sent.${addressStr} ${contacts.length} contact(s) notified.`,
          tag: `sos-${alert.id}`,
          data: { alertId: alert.id, lat: latitude, lng: longitude }
        });
      }
    } catch (e) {
      console.error('Self push failed:', e.message);
    }

    await pool.query(
      `UPDATE alerts SET notified_contacts = $1, notified_police = $2 WHERE id = $3`,
      [notifiedContacts, notifiedPolice, alert.id]
    );

    // 6. Broadcast via socket to family/friends watching live
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('sos:triggered', { ...alertInfo, smsMessage });

    res.status(201).json({
      alert: { ...alert, notified_contacts: notifiedContacts, notified_police: notifiedPolice },
      contactsNotified: contacts.length,
      smsMessage: smsMessage
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to trigger SOS' });
  }
});

// PUT /api/sos/:id/resolve
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

// PUT /api/sos/:id/audio - attach audio recording to an alert
router.put('/:id/audio', auth, async (req, res) => {
  try {
    const { audio_base64 } = req.body;
    if (!audio_base64) {
      return res.status(400).json({ error: 'audio_base64 required' });
    }
    const result = await pool.query(
      `UPDATE alerts SET audio_base64 = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [audio_base64, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ success: true, alert: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save audio' });
  }
});

// GET /api/sos/history
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
