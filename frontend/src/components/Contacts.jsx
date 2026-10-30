import { useState, useEffect } from 'react';
import { Plus, X, Users, Phone, Mail, FlaskConical, AlertCircle, CheckCircle, Info } from 'lucide-react';
import api from '../api';

const getInitials = (name) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

export default function Contacts() {
  const [contacts, setContacts]   = useState([]);
  const [form, setForm]           = useState({ name: '', phone: '', email: '', relation: '', sms_enabled: true, whatsapp_enabled: false });
  const [adding, setAdding]       = useState(false);
  const [status, setStatus]       = useState({ msg: '', type: '' });
  const [loading, setLoading]     = useState(true);
  const [testingId, setTestingId] = useState(null);

  const load = async () => {
    try { const { data } = await api.get('/contacts'); setContacts(data); }
    catch { /* handled */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const showStatus = (msg, type = 'success') => {
    setStatus({ msg, type });
    setTimeout(() => setStatus({ msg: '', type: '' }), 5000);
  };

  const addContact = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contacts', form);
      setForm({ name: '', phone: '', email: '', relation: '', sms_enabled: true, whatsapp_enabled: false });
      setAdding(false);
      showStatus('Contact added with notification consent.');
      load();
    } catch (err) {
      showStatus(err.response?.data?.error || 'Failed to add contact', 'error');
    }
  };

  const deleteContact = async (id) => {
    try { await api.delete(`/contacts/${id}`); load(); }
    catch { /* handled */ }
  };

  const testContactSms = async (c) => {
    setTestingId(c.id);
    try {
      const { data } = await api.post('/contacts/test-sms', { contactId: c.id });
      const s = data.delivery?.status;
      if (s === 'sent')       showStatus(`Live SMS sent to ${c.name} (${c.phone}).`);
      else if (s === 'queued')    showStatus(`SMS accepted for ${c.name}; delivery unconfirmed.`, 'info');
      else if (s === 'simulated') showStatus(`Simulated SMS to ${c.name} — Dev mode active.`, 'info');
      else showStatus(`Delivery failed: ${data.delivery?.error || 'Unknown'}`, 'error');
    } catch (err) {
      showStatus('Test failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div>
      {/* Header row */}
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} · Notified on SOS &amp; journey
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>
          {adding ? <><X size={14} strokeWidth={2.5} /> Cancel</> : <><Plus size={14} strokeWidth={2.5} /> Add contact</>}
        </button>
      </div>

      {/* Consent notice */}
      <div className="msg msg-info" style={{ marginBottom: 14 }}>
        <Info size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Select the channels this contact has agreed to receive. WhatsApp requires an approved Business provider.</span>
      </div>

      {/* Status */}
      {status.msg && (
        <div className={`msg ${status.type === 'success' ? 'msg-success' : status.type === 'error' ? 'msg-error' : 'msg-info'}`} style={{ marginBottom: 14 }}>
          {status.type === 'success' ? <CheckCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
           : status.type === 'error' ? <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
           : <Info size={14} strokeWidth={2} style={{ flexShrink: 0 }} />}
          {status.msg}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="glass-card" style={{ marginBottom: 16, border: '1px solid var(--rose-200)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--text-primary)' }}>New emergency contact</div>
          <form onSubmit={addContact}>
            <div className="input-group">
              <label className="input-label" htmlFor="c-name">Full name *</label>
              <input id="c-name" className="input" placeholder="Priya Sharma" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="c-phone">Phone number *</label>
              <input id="c-phone" className="input" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="c-email">Email (optional)</label>
              <input id="c-email" className="input" type="email" placeholder="priya@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="c-rel">Relationship</label>
              <select id="c-rel" className="input" value={form.relation} onChange={(e) => set('relation', e.target.value)}>
                <option value="">Select…</option>
                <option value="mother">Mother</option>
                <option value="father">Father</option>
                <option value="sister">Sister</option>
                <option value="brother">Brother</option>
                <option value="spouse">Spouse / Partner</option>
                <option value="friend">Friend</option>
                <option value="colleague">Colleague</option>
                <option value="other">Other</option>
              </select>
            </div>
            <fieldset style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: 14 }}>
              <legend className="input-label" style={{ padding: '0 6px' }}>Notification channels</legend>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.sms_enabled} onChange={(e) => set('sms_enabled', e.target.checked)} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>SMS</span>
              </label>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.whatsapp_enabled} onChange={(e) => set('whatsapp_enabled', e.target.checked)} style={{ marginTop: 2 }} />
                <span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>WhatsApp Business</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Requires approved provider/template</span>
                </span>
              </label>
            </fieldset>
            <button className="btn btn-primary" type="submit">Save contact</button>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : contacts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 36 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Users size={22} strokeWidth={1.5} color="var(--text-muted)" />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>No trusted contacts yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Add family and close friends who will receive your live tracking links and emergency alerts.
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
            <Plus size={14} strokeWidth={2.5} /> Add first contact
          </button>
        </div>
      ) : (
        contacts.map((c) => (
          <div key={c.id} className="contact-item">
            <div className="contact-avatar" aria-hidden="true">{getInitials(c.name)}</div>
            <div className="contact-info">
              <div className="contact-name">
                {c.name}
                {c.relation && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>({c.relation})</span>}
              </div>
              <div className="contact-detail" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <Phone size={11} strokeWidth={2} color="var(--text-muted)" />{c.phone}
              </div>
              {c.email && (
                <div className="contact-detail" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={11} strokeWidth={2} color="var(--text-muted)" />{c.email}
                </div>
              )}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                {c.sms_enabled && <span className="badge badge-blue">SMS</span>}
                {c.whatsapp_enabled && <span className="badge badge-green">WhatsApp</span>}
                {!c.sms_enabled && !c.whatsapp_enabled && <span className="badge badge-neutral">No channel</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => testContactSms(c)}
                disabled={testingId === c.id}
                title="Send test SMS"
              >
                {testingId === c.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <FlaskConical size={12} strokeWidth={2} />}
                {testingId === c.id ? '' : 'Test'}
              </button>
              <button className="contact-delete" onClick={() => deleteContact(c.id)} title="Remove contact" aria-label={`Remove ${c.name}`}>
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
