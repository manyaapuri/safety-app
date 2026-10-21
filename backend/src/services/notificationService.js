
const twilio = require("twilio");
const axios = require("axios");

let client = null;

// Initialize Twilio only when valid-looking credentials exist.
function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token || sid.includes("your_twilio") ||
      token.includes("your_twilio")) {
    return null;
  }

  if (!client) {
    client = twilio(sid, token);
  }

  return client;
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

  const from = process.env.TWILIO_FROM_NUMBER;
  const c = getClient();

  // Use mock mode only when explicitly configured or when Twilio
  // is not configured. Set SMS_PROVIDER=mock for local development.
  const mockMode = process.env.SMS_PROVIDER === "mock";

  if (mockMode || !c || !from) {
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

  try {
    const result = await c.messages.create({
      from,
      to: normalizedTo,
      body: message.trim()
    });

    // An API acceptance is not the same as confirmed delivery.
    const status =
      result.status === "delivered"
        ? "sent"
        : ["failed", "undelivered"].includes(result.status)
          ? "failed"
          : "queued";

    return {
      status,
      channel: "sms",
      recipient: normalizedTo,
      provider_ref: result.sid,
      provider_status: result.status
    };
  } catch (error) {
    console.error("[Twilio SMS] Delivery attempt failed:", error.message);

    return {
      status: "failed",
      channel: "sms",
      recipient: normalizedTo,
      error: error.message
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
  notifyPolice,
  normalizePhone
};
