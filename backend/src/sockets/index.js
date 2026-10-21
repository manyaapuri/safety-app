const jwt = require('jsonwebtoken');
const pool = require('../db');

function initSockets(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // Allow anonymous (viewers must authenticate with journey token)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
    } catch (err) {
      // Invalid JWT token - treat as anonymous viewer
    }
    next();
  });

  io.on('connection', (socket) => {
    // Authenticated user joins their own private room
    if (socket.user) {
      socket.join(`user_${socket.user.id}`);
    }

    // Secure journey subscription: Viewer must present a valid, active share token
    socket.on('subscribe:journey', async (payload, callback) => {
      const token = typeof payload === 'string' ? payload : payload?.token;
      if (!token) {
        if (typeof callback === 'function') callback({ error: 'Token required' });
        return;
      }

      try {
        const result = await pool.query(
          `SELECT js.token, js.expires_at, js.revoked, j.id as journey_id, j.user_id, j.status
           FROM journey_shares js
           JOIN journeys j ON j.id = js.journey_id
           WHERE js.token = $1`,
          [token]
        );

        if (result.rows.length === 0) {
          if (typeof callback === 'function') callback({ error: 'Invalid share token' });
          return;
        }

        const share = result.rows[0];
        if (share.revoked || share.status === 'completed' || share.status === 'cancelled') {
          if (typeof callback === 'function') callback({ error: 'Journey is no longer active' });
          return;
        }

        if (new Date(share.expires_at) < new Date()) {
          if (typeof callback === 'function') callback({ error: 'Share link has expired' });
          return;
        }

        socket.join(`journey_${share.journey_id}`);
        if (typeof callback === 'function') callback({ success: true, journeyId: share.journey_id });
      } catch (err) {
        console.error('[socket/subscribe:journey] Error:', err);
        if (typeof callback === 'function') callback({ error: 'Subscription failed' });
      }
    });

    // Secure legacy share token subscription
    socket.on('subscribe:share', async (payload, callback) => {
      const token = typeof payload === 'string' ? payload : payload?.token;
      if (!token) return;

      try {
        const result = await pool.query(
          'SELECT user_id, expires_at FROM share_tokens WHERE token = $1',
          [token]
        );
        if (result.rows.length > 0 && new Date(result.rows[0].expires_at) > new Date()) {
          socket.join(`share_${token}`);
          if (typeof callback === 'function') callback({ success: true });
        }
      } catch (err) {
        // ignore
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
}

module.exports = initSockets;
