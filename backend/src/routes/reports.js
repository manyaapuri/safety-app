const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/reports - list active community reports in Pune
router.get('/', async (req, res) => {
  try {
    const { category, latitude, longitude, radius_km } = req.query;
    let queryText = `
      SELECT id, title, description, category, latitude, longitude, address,
             status, verification_count, created_at, expires_at
      FROM community_reports
      WHERE status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
    `;
    const params = [];

    if (category) {
      params.push(category);
      queryText += ` AND category = $${params.length}`;
    }

    queryText += ' ORDER BY created_at DESC LIMIT 100';
    const result = await pool.query(queryText, params);
    let reports = result.rows;

    if (latitude !== undefined && longitude !== undefined) {
      const uLat = parseFloat(latitude);
      const uLng = parseFloat(longitude);
      const maxR = parseFloat(radius_km) || 15;

      reports = reports
        .map((r) => {
          const d = haversineKm(uLat, uLng, r.latitude, r.longitude);
          return { ...r, distance_km: Math.round(d * 10) / 10 };
        })
        .filter((r) => r.distance_km <= maxR)
        .sort((a, b) => a.distance_km - b.distance_km);
    }

    res.json(reports);
  } catch (err) {
    console.error('[reports] Error fetching community reports:', err);
    res.status(500).json({ error: 'Failed to fetch community reports' });
  }
});

// POST /api/reports - Submit a community hazard/safety concern
router.post('/', auth, async (req, res) => {
  const { title, description, category, latitude, longitude, address } = req.body;
  if (!title || !category || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'title, category, latitude, and longitude are required' });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  try {
    // 1. Duplicate detection: Check if an active report of the same category exists within 150m
    const existing = await pool.query(
      `SELECT id, latitude, longitude, verification_count
       FROM community_reports
       WHERE status = 'active' AND category = $1
         AND latitude BETWEEN $2 AND $3
         AND longitude BETWEEN $4 AND $5`,
      [category, lat - 0.003, lat + 0.003, lng - 0.003, lng + 0.003]
    );

    const duplicate = existing.rows.find((r) => haversineKm(lat, lng, r.latitude, r.longitude) <= 0.15);
    if (duplicate) {
      // Increment verification count instead of cluttering map with duplicate marker
      const updated = await pool.query(
        `UPDATE community_reports SET verification_count = verification_count + 1
         WHERE id = $1 RETURNING *`,
        [duplicate.id]
      );
      return res.status(200).json({
        ...updated.rows[0],
        duplicate_merged: true,
        message: 'A similar report was already logged nearby. Verification count was incremented.'
      });
    }

    // 2. Insert new report with 30-day expiration
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const result = await pool.query(
      `INSERT INTO community_reports (
         user_id, title, description, category, latitude, longitude, address,
         status, verification_count, abuse_reports_count, expires_at, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'active',1,0,$8,NOW())
       RETURNING *`,
      [
        req.user.id,
        title.trim(),
        description ? description.trim() : null,
        category,
        lat,
        lng,
        address || 'Pune, Maharashtra',
        expiry
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[reports/create] Error:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// POST /api/reports/:id/confirm - Upvote / confirm an active report
router.post('/:id/confirm', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE community_reports SET verification_count = verification_count + 1
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to confirm report' });
  }
});

// POST /api/reports/:id/abuse - Report abuse / inaccurate report
router.post('/:id/abuse', auth, async (req, res) => {
  try {
    const reportRes = await pool.query(
      'SELECT id, abuse_reports_count FROM community_reports WHERE id = $1',
      [req.params.id]
    );
    if (reportRes.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const newAbuseCount = (reportRes.rows[0].abuse_reports_count || 0) + 1;
    const newStatus = newAbuseCount >= 3 ? 'under_review' : 'active';

    const updated = await pool.query(
      `UPDATE community_reports SET abuse_reports_count = $1, status = $2
       WHERE id = $3 RETURNING *`,
      [newAbuseCount, newStatus, req.params.id]
    );

    res.json({
      success: true,
      status: updated.rows[0].status,
      message: newStatus === 'under_review' ? 'Report placed under moderation review.' : 'Flag registered.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to flag report' });
  }
});

module.exports = router;
