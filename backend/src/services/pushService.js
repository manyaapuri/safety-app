const webpush = require('web-push');

// VAPID keys must be generated once: npx web-push generate-vapid-keys
// Then set in .env
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@safetyapp.com';

let pushConfigured = false;
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  pushConfigured = true;
}

/**
 * Send a Web Push notification to a single subscription object.
 * @param {object} subscription - { endpoint, keys: { p256dh, auth } }
 * @param {object} payload - { title, body, data? }
 */
async function sendPushNotification(subscription, payload) {
  if (!pushConfigured) {
    console.warn('[Push] VAPID not configured - skipping push notification:', payload.title);
    return { skipped: true };
  }
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title || '🛡️ Safety Alert',
        body: payload.body || '',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: payload.data || {},
        tag: payload.tag || 'safety-alert',
        requireInteraction: true,
        actions: [
          { action: 'view', title: 'View Location' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      })
    );
    return { sent: true };
  } catch (err) {
    if (err.statusCode === 410) {
      // Subscription expired — caller should delete it from DB
      return { expired: true, endpoint: subscription.endpoint };
    }
    throw err;
  }
}

/**
 * Send push notifications to all subscriptions for a user.
 * @param {Array} subscriptions - rows from push_subscriptions table
 * @param {object} payload - { title, body, data? }
 */
async function sendPushToUser(subscriptions, payload) {
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        },
        payload
      )
    )
  );
  return results;
}

module.exports = { sendPushNotification, sendPushToUser, pushConfigured };
