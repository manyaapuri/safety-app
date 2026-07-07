/**
 * Check if a given lat/lng is inside any active danger zones.
 * Returns array of triggered zone objects.
 *
 * @param {object} pool - pg Pool
 * @param {number} userId - current user id
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Array>} triggered zones
 */
async function checkDangerZones(pool, userId, latitude, longitude) {
  // Fetch zones that could apply: global zones + this user's own zones
  const result = await pool.query(
    `SELECT * FROM danger_zones
     WHERE active = TRUE AND (is_global = TRUE OR created_by = $1)`,
    [userId]
  );

  const triggered = [];
  for (const zone of result.rows) {
    const dist = distanceMeters(latitude, longitude, zone.latitude, zone.longitude);
    if (dist <= zone.radius_meters) {
      triggered.push({ ...zone, distance_meters: Math.round(dist) });
    }
  }
  return triggered;
}

/**
 * Haversine distance in meters between two lat/lng points.
 */
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { checkDangerZones, distanceMeters };
