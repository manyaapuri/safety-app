const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { sendPushToUser } = require('../services/pushService');

const router = express.Router();

// GET /api/push/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push not configured' });
  res.json({ publicKey: key });
});

// POST /api/push/subscribe - save a push subscription
router.post('/subscribe', auth, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = $3, auth = $4`,
      [req.user.id, endpoint, keys.p256dh, keys.auth]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// DELETE /api/push/unsubscribe - remove push subscription
router.delete('/unsubscribe', auth, async (req, res) => {
  const { endpoint } = req.body;
  await pool.query(
    'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
    [req.user.id, endpoint]
  );
  res.json({ success: true });
});

// POST /api/push/test - send a test push to self
router.post('/test', auth, async (req, res) => {
  const subs = await pool.query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [req.user.id]
  );
  if (subs.rows.length === 0) {
    return res.status(404).json({ error: 'No push subscriptions found' });
  }
  await sendPushToUser(subs.rows, {
    title: '🛡️ Safety App Test',
    body: 'Push notifications are working correctly!',
    tag: 'test'
  });
  res.json({ success: true, sent: subs.rows.length });
});

module.exports = router;
