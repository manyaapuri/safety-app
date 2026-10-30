import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, AlertCircle, FlaskConical } from 'lucide-react';
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
  const [supported, setSupported]   = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [status, setStatus]         = useState({ msg: '', type: '' });

  const showStatus = (msg, type = 'success') => {
    setStatus({ msg, type });
    setTimeout(() => setStatus({ msg: '', type: '' }), 5000);
  };

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

  const subscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      if (!reg) throw new Error('Service worker not supported');
      await navigator.serviceWorker.ready;
      const { data } = await api.get('/push/vapid-public-key').catch(() => ({ data: { publicKey: null } }));
      if (!data.publicKey) {
        showStatus('Push notifications not configured on server. Set VAPID keys in .env.', 'error');
        return;
      }
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
      await api.post('/push/subscribe', subscription.toJSON());
      setSubscribed(true);
      showStatus('Push notifications enabled.');
    } catch (err) {
      showStatus(err.message || 'Failed to enable push notifications', 'error');
    } finally {
      setLoading(false);
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
      showStatus('Push notifications disabled.', 'info');
    } catch (err) {
      showStatus('Failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    try {
      await api.post('/push/test');
      showStatus('Test notification sent.');
    } catch (e) {
      showStatus('Test failed: ' + (e.response?.data?.error || e.message), 'error');
    }
  };

  return (
    <div className="glass-card">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--r-md)',
            background: subscribed ? 'var(--green-50)' : 'var(--neutral-100)',
            border: `1px solid ${subscribed ? 'var(--green-100)' : 'var(--border-subtle)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Bell size={18} strokeWidth={1.75} color={subscribed ? 'var(--green-600)' : 'var(--text-muted)'} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Push notifications</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              Get alerted even when the app is in the background
            </div>
          </div>
        </div>
        <span className={`badge ${subscribed ? 'badge-green' : 'badge-neutral'}`}>
          {subscribed ? 'Active' : 'Off'}
        </span>
      </div>

      {!supported && (
        <div className="msg msg-warning">
          <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
          Your browser does not support push notifications. Use Chrome or Edge.
        </div>
      )}

      {status.msg && (
        <div className={`msg ${status.type === 'success' ? 'msg-success' : status.type === 'error' ? 'msg-error' : 'msg-info'}`} style={{ marginBottom: 10 }}>
          {status.type === 'success' ? <CheckCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
           : status.type === 'error' ? <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
           : null}
          {status.msg}
        </div>
      )}

      {supported && (
        !subscribed ? (
          <button className="btn btn-primary" onClick={subscribe} disabled={loading}>
            {loading
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Enabling…</>
              : <><Bell size={15} strokeWidth={2} /> Enable push notifications</>}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={sendTest} style={{ flex: 1 }}>
              <FlaskConical size={13} strokeWidth={2} /> Send test
            </button>
            <button className="btn btn-secondary btn-sm" onClick={unsubscribe} disabled={loading} style={{ flex: 1, color: 'var(--red-600)' }}>
              <BellOff size={13} strokeWidth={2} /> Disable
            </button>
          </div>
        )
      )}
    </div>
  );
}
