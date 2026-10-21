import { useState, useEffect } from 'react';
import api from '../api';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', email: '', relation: '' });
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get('/contacts');
      setContacts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addContact = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contacts', form);
      setForm({ name: '', phone: '', email: '', relation: '' });
      setAdding(false);
      setStatus('✅ Contact added successfully with notification consent.');
      load();
    } catch (err) {
      setStatus('❌ ' + (err.response?.data?.error || 'Failed to add contact'));
    }
    setTimeout(() => setStatus(''), 4000);
  };

  const deleteContact = async (id) => {
    try {
      await api.delete(`/contacts/${id}`);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const testContactSms = async (c) => {
    setTestingId(c.id);
    setStatus('');
    try {
      const { data } = await api.post('/contacts/test-sms', { contactId: c.id });
      if (data.delivery?.status === 'sent') {
        setStatus(`✅ Live SMS dispatched via Twilio to ${c.name} (${c.phone}).`);
      } else if (data.delivery?.status === 'simulated') {
        setStatus(`📱 [Dev Mock Provider] SMS simulated to ${c.name} (${c.phone}). Twilio credentials not configured in .env.`);
      } else {
        setStatus(`❌ Delivery failed: ${data.delivery?.error || 'Unknown error'}`);
      }
    } catch (err) {
      setStatus('❌ Failed to trigger test SMS: ' + (err.response?.data?.error || err.message));
    } finally {
      setTestingId(null);
    }
  };

  const RELATION_ICONS = {
    mother: '👩', father: '👨', sister: '👧', brother: '👦',
    friend: '👫', husband: '💑', wife: '💑', spouse: '💑',
    partner: '💕', colleague: '👔', other: '👤'
  };

  const getIcon = (relation) => {
    if (!relation) return '👤';
    const r = relation.toLowerCase();
    return RELATION_ICONS[r] || '👤';
  };

  const getInitials = (name) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div className="page-title" style={{ fontSize: 22 }}>👥 Trusted Contacts</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} · Notified on SOS & Journey tracking
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>
          {adding ? '✕ Cancel' : '+ Add Contact'}
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 6 }}>
        🔒 <strong>Consent Disclosure:</strong> By adding contacts, you confirm they have consented to receive SMS updates when you begin journeys or trigger an emergency SOS.
      </div>

      {status && (
        <div className={`msg ${status.startsWith('✅') ? 'msg-success' : status.startsWith('❌') ? 'msg-error' : 'msg-info'}`} style={{ marginBottom: 14 }}>
          {status}
        </div>
      )}

      {adding && (
        <div className="glass-card" style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 14, fontWeight: 700 }}>New Emergency Contact</h4>
          <form onSubmit={addContact}>
            <div className="input-group">
              <label className="input-label">Full Name *</label>
              <input className="input" placeholder="e.g. Priya Sharma" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Phone Number *</label>
              <input className="input" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Email (Optional)</label>
              <input className="input" type="email" placeholder="priya@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Relationship</label>
              <select className="input" value={form.relation} onChange={(e) => set('relation', e.target.value)}>
                <option value="">Select relation…</option>
                <option value="mother">Mother</option>
                <option value="father">Father</option>
                <option value="sister">Sister</option>
                <option value="brother">Brother</option>
                <option value="spouse">Spouse/Partner</option>
                <option value="friend">Friend</option>
                <option value="colleague">Colleague</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit">✅ Save Contact With Consent</button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : contacts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600 }}>No trusted contacts added yet</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
            Add family and close friends in Pune who will receive your live tracking links and emergency alerts.
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setAdding(true)}>
            + Add First Contact
          </button>
        </div>
      ) : (
        contacts.map((c) => (
          <div key={c.id} className="contact-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="contact-avatar">
                {getInitials(c.name)}
              </div>
              <div className="contact-info">
                <div className="contact-name">
                  {getIcon(c.relation)} {c.name}
                  {c.relation && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>({c.relation})</span>}
                </div>
                <div className="contact-detail">📞 {c.phone}</div>
                {c.email && <div className="contact-detail">✉️ {c.email}</div>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 11, padding: '4px 8px' }}
                onClick={() => testContactSms(c)}
                disabled={testingId === c.id}
                title="Send test notification SMS"
              >
                {testingId === c.id ? 'Sending…' : '🧪 Test SMS'}
              </button>
              <button className="contact-delete" onClick={() => deleteContact(c.id)} title="Remove contact">
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
