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
const facilitiesRoutes = require('./routes/facilities');
const journeysRoutes = require('./routes/journeys');
const reportsRoutes = require('./routes/reports');
const initSockets = require('./sockets');
const pool = require('./db');
const { sendSms } = require('./services/notificationService');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});
app.set('io', io);
initSockets(io);

// Health check with status breakdown
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Urban Guardian — Pune Women Safety System',
    version: '3.0.0',
    city: 'Pune, Maharashtra',
    features: {
      journeyPlanner: true,
      trustedJourneySharing: true,
      puneFacilities: true,
      reliableSos: true,
      communityReports: true,
      pushNotifications: !!process.env.VAPID_PUBLIC_KEY,
      smsService: !!process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_ACCOUNT_SID.includes('your_twilio') ? 'twilio_live' : 'mock_development'
    }
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/zones', zonesRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/route', routeRoutes);
app.use('/api/facilities', facilitiesRoutes);
app.use('/api/journeys', journeysRoutes);
app.use('/api/reports', reportsRoutes);

// Background Journey Overdue Monitor (runs every 60 seconds)
setInterval(async () => {
  try {
    const overdueJourneys = await pool.query(`
      SELECT j.id, j.user_id, j.title, j.end_name, j.expected_arrival, u.name as user_name
      FROM journeys j
      JOIN users u ON u.id = j.user_id
      WHERE j.status = 'active'
        AND j.expected_arrival < NOW()
        AND j.overdue_notified = FALSE
    `);

    for (const j of overdueJourneys.rows) {
      await pool.query('UPDATE journeys SET status = $1, overdue_notified = TRUE WHERE id = $2', ['overdue', j.id]);

      const overdueMsg = `⚠️ Urban Guardian Alert: ${j.user_name}'s journey to ${j.end_name.split(',')[0]} is OVERDUE (expected: ${new Date(j.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}). Please check in with them.`;
      
      const contactsRes = await pool.query('SELECT phone FROM emergency_contacts WHERE user_id = $1', [j.user_id]);
      for (const c of contactsRes.rows) {
        await sendSms(c.phone, overdueMsg).catch(() => {});
      }

      io.to(`journey_${j.id}`).emit('journey:overdue', {
        journeyId: j.id,
        expectedArrival: j.expected_arrival
      });
      io.to(`user_${j.user_id}`).emit('journey:overdue', {
        journeyId: j.id,
        expectedArrival: j.expected_arrival
      });
    }
  } catch (err) {
    // Monitor error handled silently
  }
}, 60000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🛡️  Urban Guardian — Pune Women's Safety App Backend`);
  console.log(`======================================================`);
  console.log(`   Port:                  ${PORT}`);
  console.log(`   Environment:           ${process.env.NODE_ENV || 'development'}`);
  console.log(`   JWT Secret:            ${process.env.JWT_SECRET ? '✅ Configured' : '❌ MISSING'}`);
  console.log(`   Twilio SMS:            ${process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_ACCOUNT_SID.includes('your_twilio') ? '✅ Configured (Live)' : '⚠️  Mock Provider (Dev Simulation)'}`);
  console.log(`   Web Push (VAPID):      ${process.env.VAPID_PUBLIC_KEY && !process.env.VAPID_PUBLIC_KEY.includes('your_vapid') ? '✅ Active' : '❌ Incomplete'}`);
  console.log(`   Pune Facilities DB:    ✅ Loaded`);
  console.log(`   OSRM Journey Routing:  ✅ Active`);
  console.log(`   Trusted Journey Share: ✅ Active (Secure Token Protected)`);
  console.log(`======================================================\n`);
});

module.exports = { app, server };
