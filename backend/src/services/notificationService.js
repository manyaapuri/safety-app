
const twilio = require("twilio");
const axios = require("axios");

let client = null;

// Initialize Twilio only when valid-looking credentials exist.
function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token || !/^AC[a-f0-9]{32}$/i.test(sid) || token.length < 32 || token.includes("your_twilio")) {
    return null;
  }

  if (!client) {
    client = twilio(sid, token);
  }

  return client;
}

function getSmsMode() {
  if (process.env.SMS_PROVIDER === 'mock') return process.env.NODE_ENV === 'production' ? 'unavailable' : 'mock_development';
  const configured = Boolean(getClient() && normalizePhone(process.env.TWILIO_FROM_NUMBER));
  if (configured && process.env.SMS_PROVIDER !== 'disabled') return 'twilio_live';
  if (process.env.NODE_ENV === 'production' || process.env.SMS_PROVIDER === 'twilio') return 'unavailable';
  return 'mock_development';
}

function getWhatsAppMode() {
  if (process.env.WHATSAPP_PROVIDER === 'mock') return process.env.NODE_ENV === 'production' ? 'unavailable' : 'mock_development';
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM?.replace(/^whatsapp:/, '');
  const configured = Boolean(
    process.env.WHATSAPP_PROVIDER === 'twilio'
      && getClient()
      && normalizePhone(whatsappFrom)
      && /^HX[a-f0-9]{32}$/i.test(process.env.TWILIO_WHATSAPP_CONTENT_SID || '')
  );
  return configured ? 'twilio_live' : 'unavailable';
}

function retryableProviderError(error) {
  return error.status === 429
    || error.status >= 500
    || ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND'].includes(error.code);
}

function normalizeProviderStatus(result) {
  if (result.status === 'delivered') return 'sent';
  if (['failed', 'undelivered'].includes(result.status)) return 'failed';
  return 'queued';
}

/**
 * Normalize a phone number to international E.164 format.
 * Assumes Indian numbers when no country code is supplied.
 */
function normalizePhone(raw) {
  if (!raw || typeof raw !== "string") return null;

  let digits = raw.trim().replace(/[\s\-().]/g, "");

  if (!digits) return null;

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  } else if (digits.length === 10) {
    digits = "91" + digits;
  }

  // Basic E.164 validation: country code plus subscriber number.
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    return null;
  }

  return "+" + digits;
}

/**
 * Send SMS through Twilio or simulate delivery during development.
 *
 * Returns:
 * sent      = provider confirms delivery
 * simulated = mock provider only
 * failed    = delivery attempt failed
 * queued    = accepted by Twilio but not confirmed delivered
 */
async function sendSms(toNumber, message) {
  const normalizedTo = normalizePhone(toNumber);

  if (!normalizedTo) {
    return {
      status: "failed",
      channel: "sms",
      recipient: toNumber || null,
      error: "Invalid or missing recipient phone number"
    };
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return {
      status: "failed",
      channel: "sms",
      recipient: normalizedTo,
      error: "SMS message cannot be empty"
    };
  }

  const mode = getSmsMode();
  if (mode === 'mock_development') {
    console.log(
      `[MOCK SMS] To: ${normalizedTo}\nMessage: ${message}`
    );

    return {
      status: "simulated",
      channel: "sms",
      recipient: normalizedTo,
      provider_ref: `mock-${Date.now()}`,
      note: "No real SMS was sent."
    };
  }

  if (mode !== 'twilio_live') {
    return {
      status: 'failed',
      channel: 'sms',
      recipient: normalizedTo,
      error: 'SMS provider is unavailable or incompletely configured',
      retryable: false
    };
  }

  try {
    const result = await getClient().messages.create({
      from: process.env.TWILIO_FROM_NUMBER,
      to: normalizedTo,
      body: message.trim(),
      ...(process.env.TWILIO_STATUS_CALLBACK_URL
        ? { statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL }
        : {})
    });

    // An API acceptance is not the same as confirmed delivery.
    const status = normalizeProviderStatus(result);

    return {
      status,
      channel: "sms",
      recipient: normalizedTo,
      provider_ref: result.sid,
      provider_status: result.status,
      retryable: false
    };
  } catch (error) {
    console.error("[Twilio SMS] Delivery attempt failed:", error.message);

    return {
      status: "failed",
      channel: "sms",
      recipient: normalizedTo,
      error: error.message,
      retryable: retryableProviderError(error)
    };
  }
}

/** Send using an approved Twilio WhatsApp Business content template. */
async function sendWhatsApp(toNumber, { userName, location, time } = {}) {
  const normalizedTo = normalizePhone(toNumber);
  if (!normalizedTo) {
    return { status: 'failed', channel: 'whatsapp', recipient: toNumber || null, error: 'Invalid or missing recipient phone number', retryable: false };
  }

  const mode = getWhatsAppMode();
  if (mode === 'mock_development') {
    console.log(`[MOCK WHATSAPP] To: whatsapp:${normalizedTo}\nNo real WhatsApp message was sent.`);
    return { status: 'simulated', channel: 'whatsapp', recipient: normalizedTo, provider_ref: `mock-wa-${Date.now()}`, note: 'No real WhatsApp message was sent.' };
  }
  if (mode !== 'twilio_live') {
    return { status: 'unavailable', channel: 'whatsapp', recipient: normalizedTo, error: 'WhatsApp Business provider is unavailable or incompletely configured', retryable: false };
  }

  const from = process.env.TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
    ? process.env.TWILIO_WHATSAPP_FROM
    : `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;
  try {
    const result = await getClient().messages.create({
      from,
      to: `whatsapp:${normalizedTo}`,
      contentSid: process.env.TWILIO_WHATSAPP_CONTENT_SID,
      contentVariables: JSON.stringify({
        1: userName || 'A SafeHer user',
        2: location || 'Location unavailable',
        3: time || new Date().toISOString()
      }),
      ...(process.env.TWILIO_STATUS_CALLBACK_URL
        ? { statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL }
        : {})
    });
    return {
      status: normalizeProviderStatus(result),
      channel: 'whatsapp',
      recipient: normalizedTo,
      provider_ref: result.sid,
      provider_status: result.status,
      retryable: false
    };
  } catch (error) {
    console.error('[Twilio WhatsApp] Delivery attempt failed:', error.message);
    return {
      status: 'failed',
      channel: 'whatsapp',
      recipient: normalizedTo,
      error: error.message,
      retryable: retryableProviderError(error)
    };
  }
}

/**
 * Optional official police API integration.
 * A configured endpoint must be an authorized integration.
 */
async function notifyPolice(alertInfo = {}) {
  const url = process.env.POLICE_API_URL;
  const apiKey = process.env.POLICE_API_KEY;

  if (
    !url ||
    url.includes("example-police-integration") ||
    url.includes("replace_me")
  ) {
    return {
      dispatched: false,
      reason:
        "Official police integration is not configured. " +
        "Use verified emergency calling options when needed."
    };
  }

  try {
    const payload = {
      incident_type: "personal_safety_sos",
      city: "Pune",
      reporter_name: alertInfo.userName || null,
      latitude: alertInfo.latitude ?? null,
      longitude: alertInfo.longitude ?? null,
      maps_url: alertInfo.mapsUrl || null,
      alert_id: alertInfo.alertId || null,
      trigger: alertInfo.triggerType || null,
      address: alertInfo.address || null,
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(url, payload, {
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        "Content-Type": "application/json",
        "X-App-Source": "UrbanGuardian-Pune"
      },
      timeout: 5000
    });

    return {
      dispatched: true,
      statusCode: response.status,
      refId: response.data?.incident_id || null
    };
  } catch (error) {
    console.warn("[Police API] Request failed:", error.message);

    return {
      dispatched: false,
      reason: `Police endpoint request failed: ${error.message}`
    };
  }
}

module.exports = {
  sendSms,
  sendWhatsApp,
  notifyPolice,
  normalizePhone,
  getSmsMode,
  getWhatsAppMode
};
