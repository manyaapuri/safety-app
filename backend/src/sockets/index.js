const jwt = require('jsonwebtoken');

function initSockets(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // allow anonymous (e.g. public live-tracking viewers)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
    } catch (err) {
      // invalid token - treat as anonymous viewer
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Authenticated user joins their own room to broadcast location updates
    if (socket.user) {
      socket.join(`user_${socket.user.id}`);
    }

    // A trusted contact / viewer subscribes to a specific user's room
    // by share token verification (handled via REST, then they pass userId here)
    socket.on('subscribe:user', (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
}

module.exports = initSockets;
