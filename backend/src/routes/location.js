const express = require('express');
const { nanoid } = require('nanoid');
const pool = require('../db');
const auth = require('../middleware/auth');
const { checkDangerZones } = require('../services/zoneService');
const { sendPushToUser } = require('../services/pushService');

const router = express.Router();

// POST /api/location - record a GPS ping
// Body: { latitude, longitude, accuracy?, speed? }
router.post('/', auth, async (req, res) => {
  const { latitude, longitude, accuracy, speed } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'latitude and longitude required' });
  }

  await pool.query(
    `INSERT INTO locations (user_id, latitude, longitude, accuracy, speed)
     VALUES ($1,$2,$3,$4,$5)`,
    [req.user.id, latitude, longitude, accuracy || null, speed || null]
  );

  const io = req.app.get('io');
  const locationData = {
    userId: req.user.id,
    latitude,
    longitude,
    accuracy,
    speed,
    timestamp: new Date().toISOString()
  };

  if (io) {
    // Broadcast to authenticated user's personal channel
    io.to(`user_${req.user.id}`).emit('location:update', locationData);

    // Broadcast to active journey channel if traveling
    pool.query(
      "SELECT id FROM journeys WHERE user_id = $1 AND status IN ('active', 'overdue') LIMIT 1",
      [req.user.id]
    ).then((res) => {
      if (res.rows.length > 0) {
        io.to(`journey_${res.rows[0].id}`).emit('location:update', locationData);
      }
    }).catch(() => {});
  }

  // Danger zone check (async, non-blocking)
  checkDangerZones(pool, req.user.id, latitude, longitude)
    .then(async (triggered) => {
      if (triggered.length > 0) {
        // Emit zone alert via socket
        io.to(`user_${req.user.id}`).emit('zone:alert', {
          zones: triggered,
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        });

        // Send push notification for each triggered zone
        try {
          const pushSubs = await pool.query(
            'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
            [req.user.id]
          );
          if (pushSubs.rows.length > 0) {
            const zoneNames = triggered.map((z) => z.name).join(', ');
            await sendPushToUser(pushSubs.rows, {
              title: '⚠️ Risky Area Detected',
              body: `You have entered: ${zoneNames}. Stay alert and move to a safe area.`,
              tag: 'zone-alert',
              data: { zones: triggered.map((z) => z.id), latitude, longitude }
            });
          }
        } catch (e) {
          // non-critical
        }
      }
    })
    .catch(() => {});

  // ML anomaly detection (fire and forget)
  const { checkAnomaly } = require('../services/mlService');
  checkAnomaly(req.user.id, { latitude, longitude, speed }).catch(() => {});

  res.json({ success: true });
});

// GET /api/location/history
router.get('/history', auth, async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  const result = await pool.query(
    `SELECT latitude, longitude, accuracy, speed, recorded_at
     FROM locations WHERE user_id = $1
     ORDER BY recorded_at DESC LIMIT $2`,
    [req.user.id, limit]
  );
  res.json(result.rows);
});

// POST /api/location/share - create a time-limited share link
router.post('/share', auth, async (req, res) => {
  const hours = parseFloat(req.body.hours) || 1;
  const token = nanoid(24);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO share_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)`,
    [req.user.id, token, expiresAt]
  );

  const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/track/${token}`;
  res.json({ token, shareUrl, expiresAt });
});

// GET /api/location/track/:token - public endpoint for shared tracking (no auth)
router.get('/track/:token', async (req, res) => {
  const tokenResult = await pool.query(
    `SELECT user_id, expires_at FROM share_tokens WHERE token = $1`,
    [req.params.token]
  );

  if (tokenResult.rows.length === 0) {
    return res.status(404).json({ error: 'Invalid share link' });
  }

  const { user_id, expires_at } = tokenResult.rows[0];
  if (new Date(expires_at) < new Date()) {
    return res.status(410).json({ error: 'This share link has expired' });
  }

  const locResult = await pool.query(
    `SELECT latitude, longitude, accuracy, speed, recorded_at
     FROM locations WHERE user_id = $1
     ORDER BY recorded_at DESC LIMIT 1`,
    [user_id]
  );

  const userResult = await pool.query(
    `SELECT name FROM users WHERE id = $1`,
    [user_id]
  );

  res.json({
    userId: user_id,
    userName: userResult.rows[0]?.name || 'User',
    expiresAt: expires_at,
    location: locResult.rows[0] || null
  });
});

module.exports = router;
