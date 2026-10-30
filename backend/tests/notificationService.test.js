const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getSmsMode,
  getWhatsAppMode,
  sendSms,
  sendWhatsApp
} = require('../src/services/notificationService');

const PROVIDER_ENV = [
  'NODE_ENV',
  'SMS_PROVIDER',
  'WHATSAPP_PROVIDER',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
  'TWILIO_WHATSAPP_FROM',
  'TWILIO_WHATSAPP_CONTENT_SID'
];
const previousEnv = Object.fromEntries(PROVIDER_ENV.map((key) => [key, process.env[key]]));

function clearProviderEnv() {
  for (const key of PROVIDER_ENV) delete process.env[key];
}

test('SMS explicit development mock is labelled simulated', async () => {
  clearProviderEnv();
  process.env.NODE_ENV = 'development';
  process.env.SMS_PROVIDER = 'mock';
  assert.equal(getSmsMode(), 'mock_development');
  const result = await sendSms('+919876543210', 'Test notification');
  assert.equal(result.status, 'simulated');
});

test('SMS fails closed when Twilio is selected but configuration is incomplete', async () => {
  clearProviderEnv();
  process.env.NODE_ENV = 'development';
  process.env.SMS_PROVIDER = 'twilio';
  assert.equal(getSmsMode(), 'unavailable');
  const result = await sendSms('+919876543210', 'Test notification');
  assert.equal(result.status, 'failed');
  assert.equal(result.retryable, false);
});

test('production never falls back to simulated SMS without provider configuration', async () => {
  clearProviderEnv();
  process.env.NODE_ENV = 'production';
  assert.equal(getSmsMode(), 'unavailable');
  const result = await sendSms('+919876543210', 'Test notification');
  assert.equal(result.status, 'failed');
});

test('WhatsApp remains unavailable until an approved Business provider is configured', async () => {
  clearProviderEnv();
  process.env.NODE_ENV = 'development';
  process.env.WHATSAPP_PROVIDER = 'disabled';
  assert.equal(getWhatsAppMode(), 'unavailable');
  const result = await sendWhatsApp('+919876543210', { userName: 'Test User' });
  assert.equal(result.status, 'unavailable');
});

test('restore environment configuration', () => {
  clearProviderEnv();
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value !== undefined) process.env[key] = value;
  }
  assert.ok(true);
});
