const twilio = require('twilio');
const axios = require('axios');

let client = null;
function getClient() {
  if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

/**
 * Normalize a phone number to E.164 format required by Twilio.
 * Handles: "+91 98765 43210", "098765 43210", "9876543210", "+919876543210"
 * Defaults to +91 (India) if no country code is present.
 */
function normalizePhone(raw) {
  if (!raw) return null;
  // Remove all whitespace, dashes, parentheses
  let digits = raw.replace(/[\s\-().]/g, '');
  // Already has a + prefix — trust it as-is
  if (digits.startsWith('+')) return digits;
  // Strip leading 0 (trunk prefix used in India)
  if (digits.startsWith('0')) digits = digits.slice(1);
  // If 10 digits (Indian mobile), prepend +91
  if (digits.length === 10) return `+91${digits}`;
  // If 12 digits and starts with 91, add +
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  // Fallback: add + and hope for the best
  return `+${digits}`;
}

/**
 * Send an SMS alert to a single contact.
 */
async function sendSms(toNumber, message) {
  const c = getClient();
  const normalizedTo = normalizePhone(toNumber);

  if (!c) {
    console.warn(
      `\n⚠️  [SMS NOT SENT] Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are empty in .env)\n` +
      `📱 [SIMULATED SMS] TO: ${normalizedTo}\n💬 MESSAGE: "${message}"\n`
    );
    return { skipped: true, simulated: true, toNumber: normalizedTo, message };
  }

  if (!normalizedTo) {
    console.error(`[SMS] Invalid phone number: "${toNumber}" — skipping.`);
    return { skipped: true, reason: 'invalid_number' };
  }

  console.log(`[SMS] Sending real SMS via Twilio to ${normalizedTo}...`);
  try {
    const result = await c.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: normalizedTo
    });
    console.log(`[SMS] ✅ Sent! SID: ${result.sid}, Status: ${result.status}`);
    return result;
  } catch (err) {
    console.error(`[SMS] ❌ Twilio error sending to ${normalizedTo}:`, err.message);
    throw err;
  }
}

/**
 * Notify a list of emergency contacts about an SOS alert.
 * contacts: [{ name, phone, email }]
 */
async function notifyContacts(contacts, alertInfo) {
  const { userName, latitude, longitude, mapsUrl, triggerType, voicePhrase, address } = alertInfo;

  const triggerLabel =
    triggerType === 'voice' ? 'VOICE-ACTIVATED SOS' :
    triggerType === 'geofence' ? 'DANGEROUS AREA ALERT' :
    triggerType === 'anomaly' ? 'ANOMALY DETECTED' :
    'EMERGENCY SOS';

  const phraseNote = voicePhrase ? ` Keyword heard: "${voicePhrase}".` : '';
  const addressNote = address ? ` Location: ${address}.` : '';

  const message =
    `🚨 ${triggerLabel}: ${userName} needs help!${phraseNote}${addressNote}` +
    ` Track live: ${mapsUrl} (${latitude.toFixed(5)}, ${longitude.toFixed(5)}).` +
    ` Please respond immediately or call emergency services.`;

  const results = await Promise.allSettled(
    contacts.map((c) => sendSms(c.phone, message))
  );
  return { results, message };
}

/**
 * Notify police via partner API integration.
 * NOTE: Real police integration requires a formal MOU with local police systems.
 * Configure POLICE_API_URL and POLICE_API_KEY in .env.
 */
async function notifyPolice(alertInfo) {
  const url = process.env.POLICE_API_URL;
  const apiKey = process.env.POLICE_API_KEY;

  if (!url || url.includes('example-police-integration')) {
    console.warn('[Police] API not configured - logging alert locally:', {
      alertId: alertInfo.alertId,
      user: alertInfo.userName,
      lat: alertInfo.latitude,
      lng: alertInfo.longitude,
      trigger: alertInfo.triggerType
    });
    return { skipped: true };
  }

  const payload = {
    incident_type: 'personal_safety_sos',
    reporter_name: alertInfo.userName,
    latitude: alertInfo.latitude,
    longitude: alertInfo.longitude,
    maps_url: alertInfo.mapsUrl,
    alert_id: alertInfo.alertId,
    trigger: alertInfo.triggerType,
    voice_phrase: alertInfo.voicePhrase || null,
    address: alertInfo.address || null,
    timestamp: new Date().toISOString()
  };

  return axios.post(url, payload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-App-Source': 'UrbanSafetyApp'
    },
    timeout: 5000
  });
}

module.exports = { sendSms, notifyContacts, notifyPolice };
