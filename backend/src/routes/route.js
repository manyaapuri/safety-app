const express = require('express');
const axios = require('axios');
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

// Distance from point to line segment
function distToSegmentKm(pLat, pLng, vLat, vLng, wLat, wLng) {
  const l2 = (wLat - vLat) * (wLat - vLat) + (wLng - vLng) * (wLng - vLng);
  if (l2 === 0) return haversineKm(pLat, pLng, vLat, vLng);
  let t = ((pLat - vLat) * (wLat - vLat) + (pLng - vLng) * (wLng - vLng)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projLat = vLat + t * (wLat - vLat);
  const projLng = vLng + t * (wLng - vLng);
  return haversineKm(pLat, pLng, projLat, projLng);
}

// Check if a point is within thresholdKm of a polyline
function isPointNearPolyline(lat, lng, polyline, thresholdKm = 1.2) {
  const step = Math.max(1, Math.floor(polyline.length / 50));
  for (let i = 0; i < polyline.length - 1; i += step) {
    const nextIdx = Math.min(i + step, polyline.length - 1);
    const d = distToSegmentKm(
      lat, lng,
      polyline[i][0], polyline[i][1],
      polyline[nextIdx][0], polyline[nextIdx][1]
    );
    if (d <= thresholdKm) return true;
  }
  return false;
}

// GET /api/route/search - Pune geocoding proxy with bounded Pune viewbox
router.get('/search', async (req, res) => {
  const { query } = req.query;
  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    const searchQuery = `${query.trim()}, Pune, Maharashtra`;
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&viewbox=73.60,18.75,74.05,18.35&bounded=0&limit=6`;
    
    const response = await axios.get(nominatimUrl, {
      headers: { 'User-Agent': 'UrbanGuardian-PuneSafetyApp/2.0' },
      timeout: 5000
    });

    const results = (response.data || []).map((item) => ({
      name: item.display_name.split(',')[0],
      display_name: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type
    }));

    res.json(results);
  } catch (err) {
    console.warn('[route/search] Nominatim search warning:', err.message);
    res.json([]);
  }
});

// POST /api/route/plan - Real OSRM Route planning for Pune
router.post('/plan', auth, async (req, res) => {
  const { startLat, startLng, endLat, endLng, mode = 'driving' } = req.body;
  if (startLat === undefined || startLng === undefined || endLat === undefined || endLng === undefined) {
    return res.status(400).json({ error: 'startLat, startLng, endLat, and endLng are required' });
  }

  const sLat = parseFloat(startLat);
  const sLng = parseFloat(startLng);
  const eLat = parseFloat(endLat);
  const eLng = parseFloat(endLng);

  try {
    const osrmProfile = mode === 'walking' ? 'foot' : 'driving';
    const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson&alternatives=true&steps=false`;

    let routes = [];
    try {
      const osrmRes = await axios.get(osrmUrl, { timeout: 7000 });
      if (osrmRes.data && osrmRes.data.routes && osrmRes.data.routes.length > 0) {
        routes = osrmRes.data.routes.map((r, idx) => ({
          id: `route-${idx + 1}`,
          is_primary: idx === 0,
          summary: r.legs?.[0]?.summary || (idx === 0 ? 'Primary Route via Main Road' : `Alternative Route ${idx}`),
          distance_km: Math.round((r.distance / 1000) * 10) / 10,
          duration_min: Math.max(1, Math.round(r.duration / 60)),
          // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
          geometry: r.geometry.coordinates.map(([lon, lat]) => [lat, lon])
        }));
      }
    } catch (osrmErr) {
      console.warn('[route/plan] OSRM service error:', osrmErr.message);
    }

    // Fallback: If external OSRM times out, generate a straight-line route with estimated distance
    if (routes.length === 0) {
      const straightDist = haversineKm(sLat, sLng, eLat, eLng);
      const estDistance = Math.round(straightDist * 1.3 * 10) / 10;
      const estDuration = Math.round((estDistance / (mode === 'walking' ? 4.5 : 25)) * 60);
      routes = [
        {
          id: 'route-fallback',
          is_primary: true,
          summary: 'Direct Path (Routing provider temporarily unreachable)',
          distance_km: estDistance,
          duration_min: Math.max(2, estDuration),
          geometry: [
            [sLat, sLng],
            [(sLat + eLat) / 2, (sLng + eLng) / 2],
            [eLat, eLng]
          ]
        }
      ];
    }

    // Retrieve verified facilities and danger zones near primary route corridor
    const primaryPolyline = routes[0].geometry;
    const facilitiesResult = await pool.query('SELECT * FROM facilities WHERE active = TRUE');
    const zonesResult = await pool.query('SELECT * FROM danger_zones WHERE active = TRUE');

    const facilitiesAlongRoute = facilitiesResult.rows
      .filter((f) => isPointNearPolyline(f.latitude, f.longitude, primaryPolyline, 2.0))
      .map((f) => ({
        ...f,
        directions_url: `https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}`
      }));

    const cautionZonesAlongRoute = zonesResult.rows
      .filter((z) => isPointNearPolyline(z.latitude, z.longitude, primaryPolyline, 1.5));

    // Save query history without arbitrary safety scores
    await pool.query(
      `INSERT INTO route_queries (user_id, start_lat, start_lng, end_lat, end_lng, safety_score, route_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        req.user.id,
        sLat, sLng, eLat, eLng,
        null,
        JSON.stringify({ routes_count: routes.length, distance_km: routes[0].distance_km })
      ]
    ).catch(() => {});

    res.json({
      routes,
      facilitiesAlongRoute,
      cautionZonesAlongRoute,
      emergencyContactsAvailable: true,
      disclaimer: 'Route geometry and ETA are provided by OpenStreetMap/OSRM. Facility markers indicate verified municipal safety locations. Factual corridor information is displayed without synthetic scoring.'
    });
  } catch (err) {
    console.error('[route/plan] Route planning failure:', err);
    res.status(500).json({ error: 'Failed to calculate journey route' });
  }
});

// GET /api/route/history - user's past queries
router.get('/history', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, start_lat, start_lng, end_lat, end_lng, created_at
     FROM route_queries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [req.user.id]
  );
  res.json(result.rows);
});

module.exports = router;
