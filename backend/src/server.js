require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const contactsRoutes = require('./routes/contacts');
const locationRoutes = require('./routes/location');
const sosRoutes = require('./routes/sos');
const zonesRoutes = require('./routes/zones');
const pushRoutes = require('./routes/push');
const routeRoutes = require('./routes/route');
const initSockets = require('./sockets');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased for base64 photo uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});
app.set('io', io);
initSockets(io);

app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0' }));

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/zones', zonesRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/route', routeRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🛡️  Safety app backend v2 running on port ${PORT}`);
  console.log(`   Push configured: ${!!process.env.VAPID_PUBLIC_KEY}`);
  console.log(`   Twilio configured: ${!!process.env.TWILIO_ACCOUNT_SID}`);
  console.log(`   Police API: ${process.env.POLICE_API_URL || 'not configured'}`);
});
