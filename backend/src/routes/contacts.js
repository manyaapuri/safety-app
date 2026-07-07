const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/contacts - list user's emergency contacts
router.get('/', auth, async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, phone, email, relation FROM emergency_contacts WHERE user_id = $1 ORDER BY id',
    [req.user.id]
  );
  res.json(result.rows);
});

// POST /api/contacts - add a contact
router.post('/', auth, async (req, res) => {
  const { name, phone, email, relation } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'name and phone are required' });
  }
  const result = await pool.query(
    `INSERT INTO emergency_contacts (user_id, name, phone, email, relation)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, name, phone, email, relation`,
    [req.user.id, name, phone, email || null, relation || null]
  );
  res.status(201).json(result.rows[0]);
});

// DELETE /api/contacts/:id
router.delete('/:id', auth, async (req, res) => {
  await pool.query(
    'DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  res.json({ success: true });
});

module.exports = router;
