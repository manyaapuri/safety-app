const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');
const { distanceMeters } = require('../services/zoneService');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper: Query Overpass API for risky OSM features within a bounding box
// ---------------------------------------------------------------------------
async function fetchRiskyFeaturesFromOSM(south, west, north, east) {
  const bbox = `${south},${west},${north},${east}`;

  // Overpass QL — fetch features associated with risk/danger
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"="police"](${bbox});
      node["amenity"="hospital"](${bbox});
      node["amenity"="pharmacy"](${bbox});
      node["highway"="footway"]["lit"="no"](${bbox});
      node["highway"="path"]["lit"="no"](${bbox});
      node["highway"="alley"](${bbox});
      node["landuse"="industrial"](${bbox});
      node["abandoned"="yes"](${bbox});
      node["disused"="yes"](${bbox});
      node["building"="abandoned"](${bbox});
      way["highway"="footway"]["lit"="no"](${bbox});
      way["highway"="path"]["lit"="no"](${bbox});
      way["highway"="alley"](${bbox});
      way["landuse"="industrial"](${bbox});
    );
    out center;
  `;

  const response = await axios.post(
    'https://overpass-api.de/api/interpreter',
    `data=${encodeURIComponent(query)}`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 25000 }
  );

  return response.data.elements || [];
}

// Map OSM tags to danger zone metadata
function classifyOsmFeature(tags = {}) {
  const amenity = tags.amenity || '';
  const highway = tags.highway || '';
  const landuse = tags.landuse || '';
  const lit = tags.lit || '';
  const abandoned = tags.abandoned || tags.disused || tags.building || '';

  if (amenity === 'police') {
    return { name: 'Police Station Nearby', category: 'general', severity: 'low', emoji: '👮', safe: true };
  }
  if (amenity === 'hospital') {
    return { name: 'Hospital Zone', category: 'general', severity: 'low', emoji: '🏥', safe: true };
  }
  if (highway === 'alley') {
    return { name: 'Isolated Alley', category: 'dark_area', severity: 'high', emoji: '🌑' };
  }
  if ((highway === 'footway' || highway === 'path') && lit === 'no') {
    return { name: 'Unlit Footpath', category: 'dark_area', severity: 'high', emoji: '🌑' };
  }
  if (landuse === 'industrial') {
    return { name: 'Industrial / Isolated Area', category: 'general', severity: 'medium', emoji: '🏭' };
  }
  if (abandoned === 'yes' || abandoned === 'building') {
    return { name: 'Abandoned Structure', category: 'general', severity: 'medium', emoji: '🏚️' };
  }
  return { name: 'Caution Area', category: 'general', severity: 'medium', emoji: '⚠️' };
}

// Deduplicate zones that are very close to each other (within 100m)
function deduplicateZones(zones) {
  const result = [];
  for (const z of zones) {
    const tooClose = result.some(
      (r) => distanceMeters(z.latitude, z.longitude, r.latitude, r.longitude) < 100
    );
    if (!tooClose) result.push(z);
  }
  return result;
}

// GET /api/zones - list active danger zones (global + user's own) filtered by user location
router.get('/', auth, async (req, res) => {
  try {
    let userLat = req.query.latitude ? parseFloat(req.query.latitude) : null;
    let userLng = req.query.longitude ? parseFloat(req.query.longitude) : null;

    if (userLat === null || userLng === null || isNaN(userLat) || isNaN(userLng)) {
      // Fallback: Check database for user's latest location ping
      const locResult = await pool.query(
        `SELECT latitude, longitude FROM locations
         WHERE user_id = $1
         ORDER BY recorded_at DESC LIMIT 1`,
        [req.user.id]
      );
      if (locResult.rows.length > 0) {
        userLat = parseFloat(locResult.rows[0].latitude);
        userLng = parseFloat(locResult.rows[0].longitude);
      } else {
        userLat = null;
        userLng = null;
      }
    }

    const result = await pool.query(
      `SELECT id, name, description, latitude, longitude, radius_meters,
              severity, category, is_global, created_at
       FROM danger_zones
       WHERE active = TRUE AND (is_global = TRUE OR created_by = $1)`,
      [req.user.id]
    );

    let zones = result.rows;

    if (userLat !== null && userLng !== null) {
      // Calculate distances, filter by 10km radius, and sort by proximity
      zones = zones
        .map((zone) => {
          const dist = distanceMeters(userLat, userLng, zone.latitude, zone.longitude);
          return {
            ...zone,
            distance_meters: Math.round(dist)
          };
        })
        .filter((zone) => zone.distance_meters <= 10000) // 10km limit
        .sort((a, b) => a.distance_meters - b.distance_meters);
    } else {
      // Default sort if no location is available
      zones = zones.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const sevA = severityOrder[a.severity] || 0;
        const sevB = severityOrder[b.severity] || 0;
        if (sevB !== sevA) return sevB - sevA;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }

    res.json(zones);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// POST /api/zones - create a user-defined danger zone
router.post('/', auth, async (req, res) => {
  const { name, description, latitude, longitude, radius_meters, severity, category } = req.body;
  if (!name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'name, latitude, longitude are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO danger_zones
         (name, description, latitude, longitude, radius_meters, severity, category, created_by, is_global)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE)
       RETURNING *`,
      [
        name,
        description || null,
        latitude,
        longitude,
        radius_meters || 300,
        severity || 'medium',
        category || 'general',
        req.user.id
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create zone' });
  }
});

// POST /api/zones/generate-for-route
// Body: { startLat, startLng, endLat, endLng }
// Returns danger zones detected via OSM Overpass API along the route
router.post('/generate-for-route', auth, async (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.body;
  if (startLat === undefined || startLng === undefined || endLat === undefined || endLng === undefined) {
    return res.status(400).json({ error: 'startLat, startLng, endLat, endLng are required' });
  }

  try {
    // Build bounding box with 1km padding on each side
    const PAD = 0.01; // ~1.1km
    const south = Math.min(startLat, endLat) - PAD;
    const north = Math.max(startLat, endLat) + PAD;
    const west  = Math.min(startLng, endLng) - PAD;
    const east  = Math.max(startLng, endLng) + PAD;

    // Fetch from Overpass OSM
    let elements = [];
    try {
      elements = await fetchRiskyFeaturesFromOSM(south, west, north, east);
    } catch (osmErr) {
      console.warn('[zones/generate-for-route] Overpass API error:', osmErr.message);
      // Return empty list gracefully — don't crash the frontend
      return res.json({ zones: [], source: 'overpass_unavailable' });
    }

    // Also fetch existing DB zones that fall inside the route bounding box
    const dbResult = await pool.query(
      `SELECT id, name, description, latitude, longitude, radius_meters,
              severity, category, is_global
       FROM danger_zones
       WHERE active = TRUE
         AND (is_global = TRUE OR created_by = $1)
         AND latitude BETWEEN $2 AND $3
         AND longitude BETWEEN $4 AND $5`,
      [req.user.id, south, north, west, east]
    );

    // Convert OSM elements to zone-shaped objects
    const osmZones = elements
      .filter((el) => {
        // Use center for ways, direct coords for nodes
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        return lat !== undefined && lng !== undefined;
      })
      .map((el) => {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        const meta = classifyOsmFeature(el.tags || {});
        return {
          id: `osm-${el.type}-${el.id}`,
          name: el.tags?.name ? `${meta.emoji} ${el.tags.name}` : `${meta.emoji} ${meta.name}`,
          description: el.tags?.['addr:street']
            ? `On ${el.tags['addr:street']}`
            : meta.name,
          latitude: lat,
          longitude: lng,
          radius_meters: 200,
          severity: meta.severity,
          category: meta.category,
          is_global: false,
          source: 'osm',
          safe_landmark: meta.safe || false
        };
      });

    // Merge DB zones + OSM zones, deduplicate by proximity
    const dbZones = dbResult.rows.map((z) => ({ ...z, source: 'db' }));
    const combined = deduplicateZones([...dbZones, ...osmZones]);

    // Limit to 30 zones max, prioritise by severity
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const sorted = combined
      .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))
      .slice(0, 30);

    res.json({ zones: sorted, source: 'osm+db', total: sorted.length });
  } catch (err) {
    console.error('[zones/generate-for-route] Error:', err);
    res.status(500).json({ error: 'Failed to generate zones for route' });
  }
});

// DELETE /api/zones/:id - delete own zone
router.delete('/:id', auth, async (req, res) => {
  await pool.query(
    'UPDATE danger_zones SET active = FALSE WHERE id = $1 AND created_by = $2',
    [req.params.id, req.user.id]
  );
  res.json({ success: true });
});

// POST /api/zones/check - check if a coordinate is in any danger zone
router.post('/check', auth, async (req, res) => {
  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'latitude and longitude required' });
  }
  try {
    const { checkDangerZones } = require('../services/zoneService');
    const triggered = await checkDangerZones(pool, req.user.id, latitude, longitude);
    res.json({ triggered, count: triggered.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Zone check failed' });
  }
});

module.exports = router;
