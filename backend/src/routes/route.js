const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const pool = require('../db');

const router = express.Router();

// POST /api/route/safety - proxy to ML service for route safety scoring
// Body: { points: [{lat, lng}], time_of_day: 'day'|'night' }
router.post('/safety', auth, async (req, res) => {
  const { points, time_of_day } = req.body;
  if (!points || !Array.isArray(points) || points.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 route points' });
  }

  const mlUrl = process.env.ML_SERVICE_URL;
  if (!mlUrl) {
    // Return a mock safe score if ML service not configured
    const score = time_of_day === 'night' ? 55 : 75;
    return res.json({
      safety_score: score,
      notes: 'ML service not configured. Showing placeholder score.',
      is_safe: score >= 60
    });
  }

  try {
    const mlPayload = {
      points: points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      time_of_day: time_of_day || 'day'
    };
    const { data } = await axios.post(`${mlUrl}/predict/route-safety`, mlPayload, {
      timeout: 6000
    });

    // Store query for analytics
    if (points.length >= 2) {
      await pool.query(
        `INSERT INTO route_queries (user_id, start_lat, start_lng, end_lat, end_lng, safety_score, route_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          req.user.id,
          points[0].lat, points[0].lng,
          points[points.length - 1].lat, points[points.length - 1].lng,
          data.safety_score,
          JSON.stringify(data)
        ]
      ).catch(() => {}); // non-blocking
    }

    res.json({ ...data, is_safe: data.safety_score >= 60 });
  } catch (err) {
    console.error('ML route safety error:', err.message);
    res.status(502).json({ error: 'ML service unavailable', details: err.message });
  }
});

// GET /api/route/history - user's past route queries
router.get('/history', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, start_lat, start_lng, end_lat, end_lng, safety_score, created_at
     FROM route_queries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [req.user.id]
  );
  res.json(result.rows);
});

module.exports = router;
