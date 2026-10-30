import { useState } from 'react';
import { Shield, Mail, Lock, User, Phone, AlertCircle } from 'lucide-react';
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
      const payload = tab === 'login' ? { email: form.email, password: form.password } : form;
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onAuth(data.user);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        (err.code === 'ERR_NETWORK' || !err.response
          ? 'Unable to connect to server. Please ensure the backend is running.'
          : 'Authentication failed. Please check your credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Brand */}
      <div className="auth-brand-mark" aria-hidden="true">
        <Shield size={28} color="#fff" strokeWidth={2.5} />
      </div>
      <h1 className="auth-title">SafeHer</h1>
      <p className="auth-subtitle">
        Your personal safety companion. Plan ahead and stay connected to the people you trust.
      </p>

      <div className="auth-card">
        {/* Tabs */}
        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'login'}
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={tab === 'register'}
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          {tab === 'register' && (
            <div className="input-group">
              <label className="input-label" htmlFor="auth-name">Full name</label>
              <div style={{ position: 'relative' }}>
                <User size={15} strokeWidth={2} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="auth-name"
                  className="input"
                  style={{ paddingLeft: 38 }}
                  type="text"
                  placeholder="Jane Sharma"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="auth-email">Email address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} strokeWidth={2} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="auth-email"
                className="input"
                style={{ paddingLeft: 38 }}
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
                autoComplete={tab === 'login' ? 'username' : 'email'}
              />
            </div>
          </div>

          {tab === 'register' && (
            <div className="input-group">
              <label className="input-label" htmlFor="auth-phone">Phone number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} strokeWidth={2} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="auth-phone"
                  className="input"
                  style={{ paddingLeft: 38 }}
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  required
                  autoComplete="tel"
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="auth-password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} strokeWidth={2} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="auth-password"
                className="input"
                style={{ paddingLeft: 38 }}
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {error && (
            <div className="msg msg-error" style={{ marginBottom: 4 }}>
              <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Please wait…</>
              : tab === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20, maxWidth: 320, lineHeight: 1.5 }}>
        Your data is encrypted and never shared without your consent.
      </p>
    </div>
  );
}
