const express = require('express');
const router = express.Router();
const db = require('../db');

// ==============================================================================
// 1. Consumers Page: POST /api/consumers
// Create a new consumer (Name, Phone Number, Address)
// ==============================================================================
router.post('/', async (req, res) => {
  try {
    const { name, phone_number, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!phone_number || !phone_number.trim()) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ error: 'Address is required.' });
    }

    const query = `
      INSERT INTO consumers (name, phone_number, address, rts_status, national_portal_status)
      VALUES ($1, $2, $3, 'not Done', 'not Done')
      RETURNING *;
    `;
    const values = [name.trim(), phone_number.trim(), address.trim()];
    const result = await db.query(query, values);

    return res.status(201).json({
      message: 'Consumer created successfully',
      consumer: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating consumer:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/consumers - Get all consumers (useful for dropdown selection in Documents page)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM consumers ORDER BY id DESC;');
    return res.json({ consumers: result.rows });
  } catch (error) {
    console.error('Error fetching consumers:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==============================================================================
// 2. RTS Page:
// GET /api/consumers/rts?search=query
// PATCH /api/consumers/:id/rts
// ==============================================================================
router.get('/rts', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT id, name, phone_number, address, rts_status, created_at FROM consumers';
    const params = [];

    if (search && search.trim() !== '') {
      query += ` WHERE name ILIKE $1 OR phone_number ILIKE $1 OR address ILIKE $1`;
      params.push(`%${search.trim()}%`);
    }

    query += ' ORDER BY id DESC;';
    const result = await db.query(query, params);

    return res.json({ consumers: result.rows });
  } catch (error) {
    console.error('Error fetching RTS consumers:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.patch('/:id/rts', async (req, res) => {
  try {
    const { id } = req.params;
    const { rts_status } = req.body;

    if (!['Done', 'not Done'].includes(rts_status)) {
      return res.status(400).json({
        error: "Invalid RTS status. Allowed values are 'Done' and 'not Done'."
      });
    }

    const query = `
      UPDATE consumers
      SET rts_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const result = await db.query(query, [rts_status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consumer not found.' });
    }

    return res.json({
      message: 'RTS status updated successfully',
      consumer: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating RTS status:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==============================================================================
// 3. National Portal Page:
// GET /api/consumers/national-portal?search=query
// PATCH /api/consumers/:id/national-portal
// ==============================================================================
router.get('/national-portal', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT id, name, phone_number, address, national_portal_status, created_at FROM consumers';
    const params = [];

    if (search && search.trim() !== '') {
      query += ` WHERE name ILIKE $1 OR phone_number ILIKE $1 OR address ILIKE $1`;
      params.push(`%${search.trim()}%`);
    }

    query += ' ORDER BY id DESC;';
    const result = await db.query(query, params);

    return res.json({ consumers: result.rows });
  } catch (error) {
    console.error('Error fetching National Portal consumers:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.patch('/:id/national-portal', async (req, res) => {
  try {
    const { id } = req.params;
    const { national_portal_status } = req.body;

    if (!['Done', 'not Done'].includes(national_portal_status)) {
      return res.status(400).json({
        error: "Invalid National Portal status. Allowed values are 'Done' and 'not Done'."
      });
    }

    const query = `
      UPDATE consumers
      SET national_portal_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const result = await db.query(query, [national_portal_status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consumer not found.' });
    }

    return res.json({
      message: 'National Portal status updated successfully',
      consumer: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating National Portal status:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

const fs = require('fs');
const path = require('path');

// ==============================================================================
// DELETE /api/consumers/:id - Delete consumer & cascade remove documents/photos
// ==============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch associated documents and photos to remove physical files from disk
    const docsRes = await db.query('SELECT * FROM documents WHERE consumer_id = $1', [id]);
    const photosRes = await db.query('SELECT * FROM photos WHERE consumer_id = $1', [id]);

    // Delete consumer (PostgreSQL ON DELETE CASCADE and local adapter both remove child records)
    const result = await db.query('DELETE FROM consumers WHERE id = $1 RETURNING *;', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consumer not found.' });
    }

    // Safely unlink uploaded files from disk
    const filesToRemove = [
      ...docsRes.rows.map((d) => d.aadhar_card_url),
      ...photosRes.rows.map((p) => p.file_url),
    ].filter(Boolean);

    for (const fileUrl of filesToRemove) {
      const fullPath = path.join(__dirname, '..', fileUrl.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (unlinkErr) {
          console.warn('Could not unlink file:', fullPath, unlinkErr.message);
        }
      }
    }

    return res.json({
      message: `Consumer #${id} and all associated records deleted successfully.`,
      consumer: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting consumer:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

