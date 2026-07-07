const axios = require('axios');
const pool = require('../db');

/**
 * Send the latest location ping to the ML microservice for anomaly detection.
 * If the ML service flags an anomaly, automatically create an alert.
 */
async function checkAnomaly(userId, { latitude, longitude, speed }) {
  const url = process.env.ML_SERVICE_URL;
  if (!url) return null;

  // Fetch recent history to give the model context
  const history = await pool.query(
    `SELECT latitude, longitude, speed, recorded_at FROM locations
     WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 20`,
    [userId]
  );

  const payload = {
    user_id: userId,
    current: { latitude, longitude, speed },
    history: history.rows
  };

  const response = await axios.post(`${url}/predict/anomaly`, payload, { timeout: 4000 });
  const { is_anomaly, reason } = response.data;

  if (is_anomaly) {
    await pool.query(
      `INSERT INTO alerts (user_id, latitude, longitude, type, status)
       VALUES ($1,$2,$3,'anomaly','active')`,
      [userId, latitude, longitude]
    );
    console.log(`Anomaly detected for user ${userId}: ${reason}`);
    // In a full implementation: trigger notifyContacts here too,
    // possibly after a grace-period check-in prompt to the user.
  }

  return response.data;
}

module.exports = { checkAnomaly };
