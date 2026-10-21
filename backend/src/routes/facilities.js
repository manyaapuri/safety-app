const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Haversine distance in km
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

// GET /api/facilities - list facilities with optional category filter
router.get('/', async (req, res) => {
  try {
    const { category, latitude, longitude, radius_km } = req.query;
    let queryText = 'SELECT * FROM facilities WHERE active = TRUE';
    const params = [];

    if (category) {
      params.push(category);
      queryText += ` AND category = $${params.length}`;
    }

    queryText += ' ORDER BY name ASC';
    const result = await pool.query(queryText, params);
    let facilities = result.rows;

    // Optional proximity filter & distance calculation
    if (latitude !== undefined && longitude !== undefined) {
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      const maxRadius = parseFloat(radius_km) || 15;

      facilities = facilities.map((f) => {
        const dist = haversineKm(userLat, userLng, f.latitude, f.longitude);
        return {
          ...f,
          distance_km: Math.round(dist * 10) / 10,
          directions_url: `https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}`
        };
      });

      if (radius_km) {
        facilities = facilities.filter((f) => f.distance_km <= maxRadius);
      }

      facilities.sort((a, b) => a.distance_km - b.distance_km);
    }

    res.json(facilities);
  } catch (err) {
    console.error('[facilities] Error fetching facilities:', err);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
});

// GET /api/facilities/nearby - find closest assistance by category
router.get('/nearby', async (req, res) => {
  const { latitude, longitude } = req.query;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'latitude and longitude required' });
  }

  try {
    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);
    const result = await pool.query('SELECT * FROM facilities WHERE active = TRUE');
    const facilities = result.rows;

    const policeStations = [];
    const hospitals = [];
    const transitHubs = [];
    const womenDesks = [];

    for (const f of facilities) {
      const dist = haversineKm(userLat, userLng, f.latitude, f.longitude);
      const item = {
        ...f,
        distance_km: Math.round(dist * 10) / 10,
        directions_url: `https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}`
      };
      if (f.category === 'police_station') policeStations.push(item);
      else if (f.category === 'hospital') hospitals.push(item);
      else if (f.category === 'metro_station' || f.category === 'bus_terminal') transitHubs.push(item);
      else if (f.category === 'women_helpdesk') womenDesks.push(item);
    }

    const sortFn = (a, b) => a.distance_km - b.distance_km;
    policeStations.sort(sortFn);
    hospitals.sort(sortFn);
    transitHubs.sort(sortFn);
    womenDesks.sort(sortFn);

    res.json({
      nearestPolice: policeStations[0] || null,
      nearestHospital: hospitals[0] || null,
      nearestTransit: transitHubs[0] || null,
      nearestWomenHelpdesk: womenDesks[0] || null,
      allPolice: policeStations.slice(0, 5),
      allHospitals: hospitals.slice(0, 5)
    });
  } catch (err) {
    console.error('[facilities/nearby] Error:', err);
    res.status(500).json({ error: 'Failed to find nearby facilities' });
  }
});

// POST /api/facilities - add new facility (authenticated)
router.post('/', auth, async (req, res) => {
  const { name, category, address, latitude, longitude, phone, opening_hours, source } = req.body;
  if (!name || !category || !address || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'name, category, address, latitude, longitude are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO facilities (name, category, address, latitude, longitude, phone, opening_hours, source, verification_date, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE,TRUE) RETURNING *`,
      [
        name,
        category,
        address,
        parseFloat(latitude),
        parseFloat(longitude),
        phone || null,
        opening_hours || '24/7',
        source || 'Community Contributed / Pending Verification'
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[facilities/create] Error:', err);
    res.status(500).json({ error: 'Failed to create facility' });
  }
});

module.exports = router;
