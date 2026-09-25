const express = require('express');
const router = express.Router();
const db = require('../db');
const { handleUploadMiddleware } = require('../middleware/upload');

// ==============================================================================
// 4. Documents Upload Page: POST /api/documents
// Accepts multipart/form-data with strict validation:
// - Aadhar card: 1 file (image or pdf)
// - Panel photos: max 10 files
// - Inverter photos: max 2 files
// - GPS photos: max 2 files
// - Inverter capacity: '3kW' | '4kW' | '5kW'
// ==============================================================================
router.post('/', handleUploadMiddleware, async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { consumer_id, inverter_capacity } = req.body;

    // 1. Validate Consumer ID
    if (!consumer_id) {
      return res.status(400).json({ error: 'Consumer ID is required.' });
    }

    const consumerCheck = await client.query('SELECT id, name FROM consumers WHERE id = $1', [consumer_id]);
    if (consumerCheck.rows.length === 0) {
      return res.status(404).json({ error: `Consumer with ID ${consumer_id} not found.` });
    }

    // 2. Validate Inverter Capacity (Strictly '3kW', '4kW', '5kW')
    const allowedCapacities = ['3kW', '4kW', '5kW'];
    if (!inverter_capacity || !allowedCapacities.includes(inverter_capacity)) {
      return res.status(400).json({
        error: "Inverter capacity is required and must be exactly one of: '3kW', '4kW', '5kW'."
      });
    }

    // 3. Validate Aadhar Card Presence
    if (!req.files || !req.files['aadhar_card'] || req.files['aadhar_card'].length === 0) {
      return res.status(400).json({ error: 'Aadhar card file is required.' });
    }

    const aadharFile = req.files['aadhar_card'][0];
    const aadharUrl = `/uploads/${aadharFile.filename}`;

    // Begin DB Transaction
    await client.query('BEGIN');

    // Helper to persist file binary into Cloud PostgreSQL (survives Render container restarts)
    const persistFileToPostgres = async (fileObj) => {
      if (db.isPgConnected() && fileObj && fileObj.path && fs.existsSync(fileObj.path)) {
        const fileBuffer = fs.readFileSync(fileObj.path);
        await client.query(
          `INSERT INTO uploaded_files (filename, consumer_id, mime_type, file_data)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (filename) DO NOTHING;`,
          [fileObj.filename, consumer_id, fileObj.mimetype, fileBuffer]
        );
      }
    };

    // 4. Insert into documents table
    const insertDocQuery = `
      INSERT INTO documents (consumer_id, aadhar_card_url, inverter_capacity)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const docResult = await client.query(insertDocQuery, [consumer_id, aadharUrl, inverter_capacity]);
    const documentId = docResult.rows[0].id;
    await persistFileToPostgres(aadharFile);

    // 5. Insert Photos (Panel, Inverter, GPS)
    const insertedPhotos = [];
    const photoCategories = [
      { field: 'panel_photos', category: 'panel_serial_num' },
      { field: 'inverter_photos', category: 'inverter_serial_num' },
      { field: 'gps_photos', category: 'gps_plant' }
    ];

    for (const item of photoCategories) {
      const files = req.files[item.field] || [];
      for (const file of files) {
        const fileUrl = `/uploads/${file.filename}`;
        const insertPhotoQuery = `
          INSERT INTO photos (consumer_id, document_id, category, file_url, file_name, mime_type, file_size_bytes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *;
        `;
        const photoResult = await client.query(insertPhotoQuery, [
          consumer_id,
          documentId,
          item.category,
          fileUrl,
          file.originalname,
          file.mimetype,
          file.size
        ]);
        await persistFileToPostgres(file);
        insertedPhotos.push(photoResult.rows[0]);
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Documents and photos uploaded successfully.',
      document: docResult.rows[0],
      photosCount: insertedPhotos.length,
      photos: insertedPhotos
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during document upload transaction:', error);
    return res.status(500).json({ error: 'Internal Server Error during upload processing.' });
  } finally {
    client.release();
  }
});

// GET /api/documents/consumer/:consumerId - Fetch all documents and photos for a consumer
router.get('/consumer/:consumerId', async (req, res) => {
  try {
    const { consumerId } = req.params;

    const docResult = await db.query(
      'SELECT * FROM documents WHERE consumer_id = $1 ORDER BY created_at DESC',
      [consumerId]
    );

    const photosResult = await db.query(
      'SELECT * FROM photos WHERE consumer_id = $1 ORDER BY created_at ASC',
      [consumerId]
    );

    return res.json({
      documents: docResult.rows,
      photos: photosResult.rows
    });
  } catch (error) {
    console.error('Error fetching consumer documents:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

const fs = require('fs');
const path = require('path');

// DELETE /api/documents/:id - Delete a document submission and its linked photos
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM documents WHERE id = $1 RETURNING *;', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document record not found.' });
    }

    const deletedDoc = result.rows[0];
    if (deletedDoc.aadhar_card_url) {
      const fullPath = path.join(__dirname, '..', deletedDoc.aadhar_card_url.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.warn('Could not unlink file:', fullPath);
        }
      }
    }

    return res.json({
      message: `Document submission #${id} deleted successfully.`,
      document: deletedDoc,
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/documents/photo/:photoId - Delete an individual photo
router.delete('/photo/:photoId', async (req, res) => {
  try {
    const { photoId } = req.params;

    const result = await db.query('DELETE FROM photos WHERE id = $1 RETURNING *;', [photoId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found.' });
    }

    const deletedPhoto = result.rows[0];
    if (deletedPhoto.file_url) {
      const fullPath = path.join(__dirname, '..', deletedPhoto.file_url.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.warn('Could not unlink photo file:', fullPath);
        }
      }
    }

    return res.json({
      message: `Photo #${photoId} deleted successfully.`,
      photo: deletedPhoto,
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

