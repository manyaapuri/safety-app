const express = require('express');
const twilio = require('twilio');
const pool = require('../db');

const router = express.Router();

function mapTwilioStatus(status) {
  if (status === 'delivered' || status === 'read') return 'sent';
  if (['failed', 'undelivered', 'canceled'].includes(status)) return 'failed';
  if (['queued', 'accepted', 'sending', 'sent'].includes(status)) return 'accepted';
  return null;
}

// Twilio posts URL-encoded provider status events to this public callback.
router.post('/twilio/status', async (req, res) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const callbackUrl = process.env.TWILIO_STATUS_CALLBACK_URL;
  if (!authToken || !callbackUrl || authToken.includes('your_twilio')) {
    return res.status(503).json({ error: 'Twilio status callback is not configured' });
  }

  const signature = req.get('X-Twilio-Signature');
  if (!signature || !twilio.validateRequest(authToken, signature, callbackUrl, req.body)) {
    return res.status(403).json({ error: 'Invalid Twilio callback signature' });
  }

  const messageSid = req.body.MessageSid;
  const providerStatus = req.body.MessageStatus || req.body.SmsStatus;
  const status = mapTwilioStatus(providerStatus);
  if (!messageSid || !status) return res.status(400).json({ error: 'Missing message reference or unsupported status' });

  const errorMessage = req.body.ErrorCode
    ? `Twilio reported delivery error ${req.body.ErrorCode}`
    : null;
  await pool.query(
    `UPDATE alert_deliveries SET status = $1, error_message = COALESCE($2, error_message)
     WHERE provider_ref = $3`,
    [status, errorMessage, messageSid]
  );
  const updated = await pool.query(
    `UPDATE sos_notification_outbox SET status = $1, last_error = $2, updated_at_ms = $3
     WHERE provider_ref = $4 AND status IN ('accepted','sent')
     RETURNING alert_id, contact_id`,
    [status, errorMessage, Date.now(), messageSid]
  );

  if (updated.rows.length) {
    const alert = await pool.query('SELECT user_id FROM alerts WHERE id = $1', [updated.rows[0].alert_id]);
    if (alert.rows.length) {
      req.app.get('io')?.to(`user_${alert.rows[0].user_id}`).emit('sos:delivery', {
        alertId: updated.rows[0].alert_id,
        contactId: updated.rows[0].contact_id,
        status,
        providerStatus
      });
    }
  }
  return res.sendStatus(204);
});

module.exports = router;
