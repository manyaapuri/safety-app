const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { sendSms } = require('../services/notificationService');

const router = express.Router();

// GET /api/contacts - list user's emergency contacts
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone, email, relation FROM emergency_contacts WHERE user_id = $1 ORDER BY id',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// POST /api/contacts - add a contact
router.post('/', auth, async (req, res) => {
  const { name, phone, email, relation } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'name and phone are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO emergency_contacts (user_id, name, phone, email, relation)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, phone, email, relation`,
      [req.user.id, name.trim(), phone.trim(), email ? email.trim() : null, relation || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// POST /api/contacts/test-sms - send a test SMS to an emergency contact
router.post('/test-sms', auth, async (req, res) => {
  const { contactId, phone } = req.body;

  try {
    let targetPhone = phone;
    let contactName = 'Test Contact';

    if (contactId) {
      const c = await pool.query(
        'SELECT name, phone FROM emergency_contacts WHERE id = $1 AND user_id = $2',
        [contactId, req.user.id]
      );
      if (c.rows.length === 0) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      targetPhone = c.rows[0].phone;
      contactName = c.rows[0].name;
    } else if (!targetPhone) {
      const c = await pool.query(
        'SELECT name, phone FROM emergency_contacts WHERE user_id = $1 LIMIT 1',
        [req.user.id]
      );
      if (c.rows.length === 0) {
        return res.status(400).json({ error: 'No emergency contacts found to test. Please add a contact first.' });
      }
      targetPhone = c.rows[0].phone;
      contactName = c.rows[0].name;
    }

    const testMessage = `🛡️ Urban Guardian (Pune Safety App): Test message for ${contactName}. If you receive this, emergency contact notifications are working.`;
    const delivery = await sendSms(targetPhone, testMessage);

    res.json({
      success: delivery.status !== 'failed',
      delivery,
      phone: targetPhone,
      contactName
    });
  } catch (err) {
    console.error('[contacts/test-sms] Error:', err);
    res.status(500).json({ error: 'Failed to execute test SMS' });
  }
});

module.exports = router;
