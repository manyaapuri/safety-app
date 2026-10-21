const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let testUserId = null;
let testContactId = null;
let testJourneyId = null;
let testShareToken = '';
let testAlertId = null;
let testReportId = null;

const uniqueEmail = `pune_test_${Date.now()}@example.com`;

test('1. Health Check Endpoint', async () => {
  const res = await axios.get('http://localhost:5000/health');
  assert.equal(res.status, 200);
  assert.equal(res.data.status, 'ok');
  assert.equal(res.data.city, 'Pune, Maharashtra');
  assert.equal(res.data.features.journeyPlanner, true);
  assert.equal(res.data.features.trustedJourneySharing, true);
  assert.equal(res.data.features.reliableSos, true);
});

test('2. Authentication: User Registration & Duplicate Rejection', async () => {
  // Register
  const regRes = await axios.post(`${BASE_URL}/auth/register`, {
    name: 'Ananya Deshmukh',
    email: uniqueEmail,
    phone: '+919822012345',
    password: 'SecurePassword123!'
  });
  assert.equal(regRes.status, 201);
  assert.ok(regRes.data.token);
  assert.ok(regRes.data.user.id);
  authToken = regRes.data.token;
  testUserId = regRes.data.user.id;

  // Duplicate rejection
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Duplicate',
      email: uniqueEmail,
      phone: '+919822012345',
      password: 'password'
    });
    assert.fail('Should have failed with 409');
  } catch (err) {
    assert.equal(err.response.status, 409);
  }
});

test('3. Authentication: Login & Invalid Credentials Handling', async () => {
  // Valid login
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: uniqueEmail,
    password: 'SecurePassword123!'
  });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.data.token);

  // Invalid password
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: uniqueEmail,
      password: 'WrongPassword'
    });
    assert.fail('Should have failed with 401');
  } catch (err) {
    assert.equal(err.response.status, 401);
  }
});

test('4. Trusted Contacts: Add Contact & Notification Test with Honest Status', async () => {
  const authHeaders = { headers: { Authorization: `Bearer ${authToken}` } };

  // Add contact
  const addRes = await axios.post(
    `${BASE_URL}/contacts`,
    {
      name: 'Sunita Deshmukh',
      phone: '+919822099999',
      email: 'sunita@example.com',
      relation: 'mother'
    },
    authHeaders
  );
  assert.equal(addRes.status, 201);
  assert.equal(addRes.data.name, 'Sunita Deshmukh');
  testContactId = addRes.data.id;

  // Test SMS delivery
  const testSmsRes = await axios.post(
    `${BASE_URL}/contacts/test-sms`,
    { contactId: testContactId },
    authHeaders
  );
  assert.equal(testSmsRes.status, 200);
  assert.ok(testSmsRes.data.delivery);
  // Verify honest delivery status: either 'sent' (live Twilio) or 'simulated' (mock development)
  assert.ok(['sent', 'simulated'].includes(testSmsRes.data.delivery.status));
});

test('5. Pune Facilities: Directory, Category Filtering & Proximity', async () => {
  // Get all facilities
  const facRes = await axios.get(`${BASE_URL}/facilities`);
  assert.equal(facRes.status, 200);
  assert.ok(Array.isArray(facRes.data));
  assert.ok(facRes.data.length >= 15);

  // Filter police stations
  const policeRes = await axios.get(`${BASE_URL}/facilities?category=police_station`);
  assert.ok(policeRes.data.every((f) => f.category === 'police_station'));

  // Nearby assistance lookup from Deccan Gymkhana
  const nearbyRes = await axios.get(`${BASE_URL}/facilities/nearby?latitude=18.5196&longitude=73.8407`);
  assert.equal(nearbyRes.status, 200);
  assert.ok(nearbyRes.data.nearestPolice);
  assert.ok(nearbyRes.data.nearestHospital);
  assert.ok(nearbyRes.data.nearestPolice.distance_km < 3.0);
});

test('6. Pune Journey Planner: Real OSRM Route Calculation', async () => {
  const authHeaders = { headers: { Authorization: `Bearer ${authToken}` } };

  // Route between Shivajinagar (18.5323, 73.8523) and Hinjawadi Phase 1 (18.5913, 73.7389)
  const planRes = await axios.post(
    `${BASE_URL}/route/plan`,
    {
      startLat: 18.5323,
      startLng: 73.8523,
      endLat: 18.5913,
      endLng: 73.7389,
      mode: 'driving'
    },
    authHeaders
  );

  assert.equal(planRes.status, 200);
  assert.ok(planRes.data.routes && planRes.data.routes.length > 0);
  const primary = planRes.data.routes[0];
  assert.ok(primary.distance_km > 5);
  assert.ok(primary.duration_min > 5);
  assert.ok(primary.geometry && primary.geometry.length > 10);
  // Verify corridor facilities are listed factually
  assert.ok(Array.isArray(planRes.data.facilitiesAlongRoute));
});

test('7. Trusted Journey Sharing: Lifecycle & Revocation on Completion', async () => {
  const authHeaders = { headers: { Authorization: `Bearer ${authToken}` } };

  // 1. Start journey
  const startRes = await axios.post(
    `${BASE_URL}/journeys`,
    {
      startName: 'Shivajinagar Station, Pune',
      startLat: 18.5323,
      startLng: 73.8523,
      endName: 'Hinjawadi Phase 1, Pune',
      endLat: 18.5913,
      endLng: 73.7389,
      distanceKm: 14.5,
      durationMin: 35,
      bufferMinutes: 15
    },
    authHeaders
  );

  assert.equal(startRes.status, 201);
  assert.ok(startRes.data.journey.id);
  assert.ok(startRes.data.token);
  testJourneyId = startRes.data.journey.id;
  testShareToken = startRes.data.token;

  // 2. Viewer tracks journey with valid token
  const trackRes = await axios.get(`${BASE_URL}/journeys/track/${testShareToken}`);
  assert.equal(trackRes.status, 200);
  assert.equal(trackRes.data.status, 'active');
  assert.equal(trackRes.data.userName, 'Ananya Deshmukh');

  // 3. Complete journey
  const completeRes = await axios.put(`${BASE_URL}/journeys/${testJourneyId}/complete`, {}, authHeaders);
  assert.equal(completeRes.status, 200);
  assert.equal(completeRes.data.journey.status, 'completed');

  // 4. Verify access is revoked immediately after completion (410 Gone)
  try {
    await axios.get(`${BASE_URL}/journeys/track/${testShareToken}`);
    assert.fail('Should have returned 410 Gone');
  } catch (err) {
    assert.equal(err.response.status, 410);
  }
});

test('8. Reliable SOS: Database Persistence & Honest Delivery States', async () => {
  const authHeaders = { headers: { Authorization: `Bearer ${authToken}` } };

  const sosRes = await axios.post(
    `${BASE_URL}/sos`,
    {
      latitude: 18.5204,
      longitude: 73.8567,
      type: 'manual',
      address: 'Deccan Gymkhana, Pune'
    },
    authHeaders
  );

  assert.equal(sosRes.status, 201);
  assert.ok(sosRes.data.alert.id);
  assert.equal(sosRes.data.alert.status, 'active');
  testAlertId = sosRes.data.alert.id;

  // Verify deliveries are honestly tracked
  assert.ok(Array.isArray(sosRes.data.deliveries));
  assert.equal(sosRes.data.deliveries.length, 1);
  assert.ok(['sent', 'simulated'].includes(sosRes.data.deliveries[0].status));

  // Verify police is NOT falsely claimed
  assert.equal(sosRes.data.policeStatus.dispatched, false);
  assert.ok(sosRes.data.emergencyHotlines.length >= 4);

  // Test retry without duplicate alert
  const retryRes = await axios.post(`${BASE_URL}/sos/${testAlertId}/retry`, {}, authHeaders);
  assert.equal(retryRes.status, 200);
  assert.equal(retryRes.data.alertId, testAlertId);

  // Resolve alert
  const resolveRes = await axios.put(`${BASE_URL}/sos/${testAlertId}/resolve`, { status: 'resolved' }, authHeaders);
  assert.equal(resolveRes.status, 200);
  assert.equal(resolveRes.data.status, 'resolved');
});

test('9. Community Safety Reports: Duplicate Merging & Flagging', async () => {
  const authHeaders = { headers: { Authorization: `Bearer ${authToken}` } };

  // Post new report
  const repRes = await axios.post(
    `${BASE_URL}/reports`,
    {
      title: 'Dark Stretch Along Canal',
      category: 'poor_lighting',
      latitude: 18.5100,
      longitude: 73.8300,
      address: 'Karve Road Canal Path, Pune',
      description: 'Streetlights out for the last 3 days.'
    },
    authHeaders
  );
  assert.equal(repRes.status, 201);
  assert.ok(repRes.data.id);
  testReportId = repRes.data.id;

  // Duplicate submission within 150m should merge & increment verification count
  const dupRes = await axios.post(
    `${BASE_URL}/reports`,
    {
      title: 'Unlit Canal Road',
      category: 'poor_lighting',
      latitude: 18.5101, // ~15m away
      longitude: 73.8301,
      address: 'Karve Road Canal Path, Pune'
    },
    authHeaders
  );
  assert.equal(dupRes.status, 200);
  assert.equal(dupRes.data.duplicate_merged, true);
  assert.equal(dupRes.data.verification_count, 2);

  // Confirm report
  const confRes = await axios.post(`${BASE_URL}/reports/${testReportId}/confirm`, {}, authHeaders);
  assert.equal(confRes.data.verification_count, 3);
});
