import { useState, useEffect } from 'react';
import api from '../api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function PushSetup() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window);
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    setSubscribed(!!sub);
  };

  const registerSW = async () => {
    if (!('serviceWorker' in navigator)) return null;
    return navigator.serviceWorker.register('/sw.js');
  };

  const subscribe = async () => {
    setLoading(true);
    setStatus('');
    try {
      // Register service worker
      const reg = await registerSW();
      if (!reg) throw new Error('Service worker not supported');

      await navigator.serviceWorker.ready;

      // Get VAPID public key from backend
      const { data } = await api.get('/push/vapid-public-key').catch(() => ({ data: { publicKey: null } }));
      if (!data.publicKey) {
        setStatus('Push notifications not configured on server. Enable VAPID keys in .env');
        setLoading(false);
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey)
      });

      await api.post('/push/subscribe', subscription.toJSON());
      setSubscribed(true);
      setStatus('✅ Push notifications enabled!');
    } catch (err) {
      setStatus('❌ ' + (err.message || 'Failed to enable push notifications'));
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api.delete('/push/unsubscribe', { data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setStatus('Push notifications disabled');
    } catch (err) {
      setStatus('Failed: ' + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const sendTest = async () => {
    try {
      await api.post('/push/test');
      setStatus('✅ Test notification sent!');
    } catch (e) {
      setStatus('❌ Test failed: ' + (e.response?.data?.error || e.message));
    }
    setTimeout(() => setStatus(''), 4000);
  };

  if (!supported) {
    return (
      <div className="glass-card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 28 }}>🔔</span>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Push Notifications</div>
            <div className="msg msg-warning" style={{ margin: 0 }}>
              Your browser doesn't support push notifications. Use Chrome or Edge for this feature.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>🔔 Push Notifications</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Get alerted even when the app is in the background
          </div>
        </div>
        <span className={`badge ${subscribed ? 'badge-green' : 'badge-yellow'}`}>
          {subscribed ? '● Active' : '○ Off'}
        </span>
      </div>

      {status && (
        <div className={`msg ${status.startsWith('✅') ? 'msg-success' : status.startsWith('❌') ? 'msg-error' : 'msg-info'}`} style={{ marginBottom: 10 }}>
          {status}
        </div>
      )}

      {!subscribed ? (
        <button className="btn btn-primary" onClick={subscribe} disabled={loading}>
          {loading ? <><span className="spinner" /> Enabling…</> : '🔔 Enable Push Notifications'}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={sendTest} style={{ flex: 1 }}>
            🧪 Send Test
          </button>
          <button className="btn btn-sm" onClick={unsubscribe} style={{ flex: 1, background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)' }}>
            🔕 Disable
          </button>
        </div>
      )}
    </div>
  );
}
