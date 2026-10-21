import { useState } from 'react';
import api from '../api';

export default function Auth({ onAuth }) {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
      const payload = tab === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onAuth(data.user);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        (err.code === 'ERR_NETWORK' || !err.response
          ? 'Unable to connect to server. Please ensure the backend is running.'
          : 'Authentication failed. Please check your credentials.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-logo">🛡️</div>
      <h1 className="auth-title">Urban Safety</h1>
      <p className="auth-subtitle">Your personal safety companion — always alert, always ready.</p>

      <div className="auth-card">
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>
            Sign In
          </button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>
            Sign Up
          </button>
        </div>

        <form onSubmit={submit}>
          {tab === 'register' && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input" type="text" placeholder="Jane Doe" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="jane@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>

          {tab === 'register' && (
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input className="input" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={(e) => set('password', e.target.value)} required />
          </div>

          {error && <div className="msg msg-error">⚠️ {error}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <><span className="spinner" /> Please wait…</> : tab === 'login' ? '🔓 Sign In' : '🚀 Create Account'}
          </button>
        </form>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20, padding: '0 20px' }}>
        🔒 Your data is encrypted and never shared without consent.
      </p>
    </div>
  );
}
