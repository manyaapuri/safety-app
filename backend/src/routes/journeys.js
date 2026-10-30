const express = require('express');
const { nanoid } = require('nanoid');
const pool = require('../db');
const auth = require('../middleware/auth');
const { sendSms } = require('../services/notificationService');

const router = express.Router();

// Helper to notify contacts on journey events
async function notifyJourneyContacts(userId, message) {
  try {
    const result = await pool.query(
      'SELECT name, phone FROM emergency_contacts WHERE user_id = $1 AND sms_enabled = TRUE',
      [userId]
    );
    for (const c of result.rows) {
      await sendSms(c.phone, message).catch((e) => {
        console.warn(`[journey/sms] Failed to notify ${c.name}:`, e.message);
      });
    }
  } catch (err) {
    console.warn('[journey/sms] Error loading contacts:', err.message);
  }
}

// POST /api/journeys - Start a journey and generate secure share link
router.post('/', auth, async (req, res) => {
  const {
    title,
    startName,
    startLat,
    startLng,
    endName,
    endLat,
    endLng,
    distanceKm,
    durationMin,
    bufferMinutes = 20
  } = req.body;

  if (!startName || !endName || startLat === undefined || endLat === undefined) {
    return res.status(400).json({ error: 'Origin and destination details are required' });
  }

  const sLat = parseFloat(startLat);
  const sLng = parseFloat(startLng);
  const eLat = parseFloat(endLat);
  const eLng = parseFloat(endLng);
  const durMin = parseInt(durationMin, 10) || 30;
  const distKm = parseFloat(distanceKm) || 0;

  // Expected arrival = now + estimated duration + buffer time
  const totalAllocatedMinutes = durMin + parseInt(bufferMinutes, 10);
  const expectedArrival = new Date(Date.now() + totalAllocatedMinutes * 60 * 1000);
  const tokenExpiresAt = new Date(expectedArrival.getTime() + 60 * 60 * 1000); // 1hr post-arrival grace

  try {
    // 1. Create journey
    const journeyResult = await pool.query(
      `INSERT INTO journeys (
         user_id, title, start_name, start_lat, start_lng,
         end_name, end_lat, end_lng, distance_km, estimated_duration_min,
         status, expected_arrival, started_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,NOW())
       RETURNING *`,
      [
        req.user.id,
        title || `Journey to ${endName.split(',')[0]}`,
        startName,
        sLat,
        sLng,
        endName,
        eLat,
        eLng,
        distKm,
        durMin,
        expectedArrival
      ]
    );
    const journey = journeyResult.rows[0];

    // 2. Generate secure expiring token
    const token = nanoid(32);
    await pool.query(
      `INSERT INTO journey_shares (journey_id, token, expires_at, revoked)
       VALUES ($1,$2,$3,FALSE)`,
      [journey.id, token, tokenExpiresAt]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareUrl = `${frontendUrl}/track/${token}`;

    // 3. User info for SMS
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const userName = userRes.rows[0]?.name || 'Your contact';

    const smsText = `🛡️ Urban Guardian: ${userName} has started a journey to ${endName.split(',')[0]} (ETA: ${expectedArrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}). Track live: ${shareUrl}`;
    notifyJourneyContacts(req.user.id, smsText);

    // 4. Broadcast via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user.id}`).emit('journey:started', { journey, shareUrl, token });
    }

    res.status(201).json({
      journey,
      token,
      shareUrl,
      expectedArrival,
      expiresAt: tokenExpiresAt
    });
  } catch (err) {
    console.error('[journeys/create] Error:', err);
    res.status(500).json({ error: 'Failed to create journey' });
  }
});

// GET /api/journeys/active - Get current active journey for authenticated user
router.get('/active', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT j.*, js.token, js.expires_at, js.revoked
       FROM journeys j
       LEFT JOIN journey_shares js ON js.journey_id = j.id AND js.revoked = FALSE
       WHERE j.user_id = $1 AND j.status IN ('active', 'overdue')
       ORDER BY j.started_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ journey: null });
    }

    const row = result.rows[0];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.json({
      journey: row,
      shareUrl: row.token ? `${frontendUrl}/track/${row.token}` : null
    });
  } catch (err) {
    console.error('[journeys/active] Error:', err);
    res.status(500).json({ error: 'Failed to fetch active journey' });
  }
});

// PUT /api/journeys/:id/complete - Mark journey completed safely
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE journeys SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    const journey = result.rows[0];

    // Revoke share token so access expires immediately
    await pool.query(
      'UPDATE journey_shares SET revoked = TRUE WHERE journey_id = $1',
      [journey.id]
    );

    // Notify contacts of safe arrival
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const userName = userRes.rows[0]?.name || 'Your contact';
    notifyJourneyContacts(
      req.user.id,
      `✅ Urban Guardian: ${userName} has safely reached their destination (${journey.end_name.split(',')[0]}). Journey completed.`
    );

    // Notify socket viewers
    const io = req.app.get('io');
    if (io) {
      io.to(`journey_${journey.id}`).emit('journey:completed', { journeyId: journey.id });
      io.to(`user_${req.user.id}`).emit('journey:completed', { journeyId: journey.id });
    }

    res.json({ success: true, journey });
  } catch (err) {
    console.error('[journeys/complete] Error:', err);
    res.status(500).json({ error: 'Failed to complete journey' });
  }
});

// PUT /api/journeys/:id/cancel - Cancel journey
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE journeys SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    const journey = result.rows[0];
    await pool.query('UPDATE journey_shares SET revoked = TRUE WHERE journey_id = $1', [journey.id]);

    const io = req.app.get('io');
    if (io) {
      io.to(`journey_${journey.id}`).emit('journey:cancelled', { journeyId: journey.id });
      io.to(`user_${req.user.id}`).emit('journey:cancelled', { journeyId: journey.id });
    }

    res.json({ success: true, journey });
  } catch (err) {
    console.error('[journeys/cancel] Error:', err);
    res.status(500).json({ error: 'Failed to cancel journey' });
  }
});

// PUT /api/journeys/:id/extend - Extend expected arrival time
router.put('/:id/extend', auth, async (req, res) => {
  const { additionalMinutes = 15 } = req.body;
  const mins = parseInt(additionalMinutes, 10);

  try {
    const jResult = await pool.query(
      'SELECT expected_arrival FROM journeys WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (jResult.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    const currentArrival = new Date(jResult.rows[0].expected_arrival);
    const newArrival = new Date(currentArrival.getTime() + mins * 60 * 1000);
    const newTokenExpiry = new Date(newArrival.getTime() + 60 * 60 * 1000);

    const updated = await pool.query(
      `UPDATE journeys SET expected_arrival = $1, status = 'active'
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [newArrival, req.params.id, req.user.id]
    );

    await pool.query(
      'UPDATE journey_shares SET expires_at = $1 WHERE journey_id = $2',
      [newTokenExpiry, req.params.id]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`journey_${req.params.id}`).emit('journey:extended', { expectedArrival: newArrival });
    }

    res.json({ success: true, journey: updated.rows[0], newExpectedArrival: newArrival });
  } catch (err) {
    console.error('[journeys/extend] Error:', err);
    res.status(500).json({ error: 'Failed to extend journey' });
  }
});

// GET /api/journeys/track/:token - Public but authenticated-token viewer endpoint
router.get('/track/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const shareResult = await pool.query(
      `SELECT js.token, js.expires_at, js.revoked, j.*
       FROM journey_shares js
       JOIN journeys j ON j.id = js.journey_id
       WHERE js.token = $1`,
      [token]
    );

    if (shareResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or non-existent share link.' });
    }

    const share = shareResult.rows[0];

    // Check revocation
    if (share.revoked || share.status === 'completed' || share.status === 'cancelled') {
      return res.status(410).json({
        error: 'This journey has ended and live tracking is no longer active.',
        status: share.status
      });
    }

    // Check expiration
    if (new Date(share.expires_at) < new Date()) {
      return res.status(410).json({
        error: 'This tracking link has expired.',
        status: 'expired'
      });
    }

    // Retrieve ONLY latest GPS location ping to minimize retention and protect history
    const locResult = await pool.query(
      `SELECT latitude, longitude, accuracy, speed, recorded_at
       FROM locations WHERE user_id = $1
       ORDER BY recorded_at DESC LIMIT 1`,
      [share.user_id]
    );

    // Retrieve user's name
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [share.user_id]);
    const userName = userResult.rows[0]?.name || 'User';

    res.json({
      journeyId: share.id,
      userName,
      title: share.title,
      startName: share.start_name,
      startCoords: [share.start_lat, share.start_lng],
      endName: share.end_name,
      endCoords: [share.end_lat, share.end_lng],
      status: share.status,
      expectedArrival: share.expected_arrival,
      expiresAt: share.expires_at,
      location: locResult.rows[0] || null
    });
  } catch (err) {
    console.error('[journeys/track] Error:', err);
    res.status(500).json({ error: 'Failed to fetch journey track data' });
  }
});

// GET /api/journeys/history - past journeys
router.get('/history', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, start_name, end_name, distance_km, estimated_duration_min, status, started_at, completed_at
       FROM journeys WHERE user_id = $1 ORDER BY started_at DESC LIMIT 15`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[journeys/history] Error:', err);
    res.status(500).json({ error: 'Failed to fetch journey history' });
  }
});

module.exports = router;
