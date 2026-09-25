const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const consumersRouter = require('./routes/consumers');
const documentsRouter = require('./routes/documents');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Serve uploaded files from local disk if present
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. Fallback: Serve uploaded files from Cloud PostgreSQL if local container disk was reset
app.get('/uploads/:filename', async (req, res) => {
  try {
    if (!db.isPgConnected()) {
      return res.status(404).json({ error: 'File not found.' });
    }
    const { filename } = req.params;
    const result = await db.query(
      'SELECT mime_type, file_data FROM uploaded_files WHERE filename = $1;',
      [filename]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found in cloud storage.' });
    }
    const { mime_type, file_data } = result.rows[0];
    res.setHeader('Content-Type', mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.send(file_data);
  } catch (err) {
    console.error('Error serving file from PostgreSQL:', err);
    return res.status(500).json({ error: 'Failed to retrieve file.' });
  }
});

// API Routes
app.use('/api/consumers', consumersRouter);
app.use('/api/documents', documentsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    databaseMode: db.isPgConnected() ? 'PostgreSQL (Cloud/Live)' : 'Local Persistent Store',
    timestamp: new Date().toISOString(),
  });
});

// Serve compiled React Frontend in Production (Unified Full-Stack Deployment)
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Global Error Handler fallback
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: err.message || 'An unexpected error occurred.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`SolarAdmin Pro Server running on http://localhost:${PORT}`);
});
