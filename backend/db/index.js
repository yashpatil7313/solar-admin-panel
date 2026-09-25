const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Support both Cloud DATABASE_URL (Neon, Render, Supabase, Railway) and individual DB_* env vars
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'solar_admin_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      connectionTimeoutMillis: 2000,
    };

const pgPool = new Pool(poolConfig);

let isPgAvailable = false;

// Path for local persistent fallback store (clean initial state without fake test data)
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbFilePath = path.join(dataDir, 'local_db.json');

function getLocalData() {
  if (!fs.existsSync(dbFilePath)) {
    const initial = {
      consumerSeq: 1,
      documentSeq: 1,
      photoSeq: 1,
      consumers: [],
      documents: [],
      photos: [],
    };
    fs.writeFileSync(dbFilePath, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
  } catch (e) {
    return {
      consumerSeq: 1,
      documentSeq: 1,
      photoSeq: 1,
      consumers: [],
      documents: [],
      photos: [],
    };
  }
}

function saveLocalData(data) {
  fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2));
}

// Check PostgreSQL connection and auto-initialize tables on startup
async function initDb() {
  try {
    const client = await pgPool.connect();
    console.log('Connected to PostgreSQL database successfully.');
    isPgAvailable = true;

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('PostgreSQL tables (consumers, documents, photos) verified and ready.');
    }
    client.release();
  } catch (err) {
    console.warn('\n[DATABASE INFO]');
    console.warn('No active PostgreSQL connection detected yet (set DATABASE_URL in .env for Cloud Postgres).');
    console.warn('Using persistent local database at backend/data/local_db.json.\n');
    isPgAvailable = false;
  }
}

initDb();

// Local fallback query processor
function executeLocalQuery(text, params = []) {
  const data = getLocalData();
  const trimmed = text.trim().replace(/\s+/g, ' ');

  // 1. INSERT INTO consumers
  if (trimmed.startsWith('INSERT INTO consumers')) {
    const newConsumer = {
      id: data.consumerSeq++,
      name: params[0],
      phone_number: params[1],
      address: params[2],
      rts_status: 'not Done',
      national_portal_status: 'not Done',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.consumers.push(newConsumer);
    saveLocalData(data);
    return { rows: [newConsumer], rowCount: 1 };
  }

  // 2. SELECT FROM consumers
  if (trimmed.startsWith('SELECT') && trimmed.includes('FROM consumers')) {
    let list = [...data.consumers];

    if (params.length > 0 && params[0] && trimmed.includes('ILIKE')) {
      const search = String(params[0]).replace(/%/g, '').toLowerCase();
      list = list.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(search)) ||
          (c.phone_number && c.phone_number.toLowerCase().includes(search)) ||
          (c.address && c.address.toLowerCase().includes(search))
      );
    } else if (trimmed.includes('WHERE id = $1') && params.length === 1) {
      list = list.filter((c) => c.id === parseInt(params[0], 10));
    }

    list.sort((a, b) => b.id - a.id);
    return { rows: list, rowCount: list.length };
  }

  // 3. UPDATE consumers RTS status
  if (trimmed.startsWith('UPDATE consumers') && trimmed.includes('rts_status = $1')) {
    const newStatus = params[0];
    const consumerId = parseInt(params[1], 10);
    const consumer = data.consumers.find((c) => c.id === consumerId);
    if (!consumer) return { rows: [], rowCount: 0 };
    consumer.rts_status = newStatus;
    consumer.updated_at = new Date().toISOString();
    saveLocalData(data);
    return { rows: [consumer], rowCount: 1 };
  }

  // 4. UPDATE consumers National Portal status
  if (trimmed.startsWith('UPDATE consumers') && trimmed.includes('national_portal_status = $1')) {
    const newStatus = params[0];
    const consumerId = parseInt(params[1], 10);
    const consumer = data.consumers.find((c) => c.id === consumerId);
    if (!consumer) return { rows: [], rowCount: 0 };
    consumer.national_portal_status = newStatus;
    consumer.updated_at = new Date().toISOString();
    saveLocalData(data);
    return { rows: [consumer], rowCount: 1 };
  }

  // 5. INSERT INTO documents
  if (trimmed.startsWith('INSERT INTO documents')) {
    const newDoc = {
      id: data.documentSeq++,
      consumer_id: parseInt(params[0], 10),
      aadhar_card_url: params[1],
      inverter_capacity: params[2],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.documents.push(newDoc);
    saveLocalData(data);
    return { rows: [newDoc], rowCount: 1 };
  }

  // 6. INSERT INTO photos
  if (trimmed.startsWith('INSERT INTO photos')) {
    const newPhoto = {
      id: data.photoSeq++,
      consumer_id: parseInt(params[0], 10),
      document_id: params[1] ? parseInt(params[1], 10) : null,
      category: params[2],
      file_url: params[3],
      file_name: params[4],
      mime_type: params[5],
      file_size_bytes: params[6],
      created_at: new Date().toISOString(),
    };
    data.photos.push(newPhoto);
    saveLocalData(data);
    return { rows: [newPhoto], rowCount: 1 };
  }

  // 7. SELECT FROM documents
  if (trimmed.startsWith('SELECT') && trimmed.includes('FROM documents')) {
    const consumerId = parseInt(params[0], 10);
    const docs = data.documents.filter((d) => d.consumer_id === consumerId);
    return { rows: docs, rowCount: docs.length };
  }

  // 8. SELECT FROM photos
  if (trimmed.startsWith('SELECT') && trimmed.includes('FROM photos')) {
    const consumerId = parseInt(params[0], 10);
    const photos = data.photos.filter((p) => p.consumer_id === consumerId);
    return { rows: photos, rowCount: photos.length };
  }

  // 9. DELETE FROM consumers WHERE id = $1 (with CASCADE to documents & photos)
  if (trimmed.startsWith('DELETE FROM consumers')) {
    const consumerId = parseInt(params[0], 10);
    const index = data.consumers.findIndex((c) => c.id === consumerId);
    if (index === -1) return { rows: [], rowCount: 0 };
    const [deletedConsumer] = data.consumers.splice(index, 1);
    data.documents = data.documents.filter((d) => d.consumer_id !== consumerId);
    data.photos = data.photos.filter((p) => p.consumer_id !== consumerId);
    saveLocalData(data);
    return { rows: [deletedConsumer], rowCount: 1 };
  }

  // 10. DELETE FROM documents WHERE id = $1 (with CASCADE to photos)
  if (trimmed.startsWith('DELETE FROM documents')) {
    const docId = parseInt(params[0], 10);
    const index = data.documents.findIndex((d) => d.id === docId);
    if (index === -1) return { rows: [], rowCount: 0 };
    const [deletedDoc] = data.documents.splice(index, 1);
    data.photos = data.photos.filter((p) => p.document_id !== docId);
    saveLocalData(data);
    return { rows: [deletedDoc], rowCount: 1 };
  }

  // 11. DELETE FROM photos WHERE id = $1
  if (trimmed.startsWith('DELETE FROM photos')) {
    const photoId = parseInt(params[0], 10);
    const index = data.photos.findIndex((p) => p.id === photoId);
    if (index === -1) return { rows: [], rowCount: 0 };
    const [deletedPhoto] = data.photos.splice(index, 1);
    saveLocalData(data);
    return { rows: [deletedPhoto], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

const unifiedPool = {
  async query(text, params = []) {
    if (isPgAvailable) {
      return pgPool.query(text, params);
    }
    return executeLocalQuery(text, params);
  },

  async connect() {
    if (isPgAvailable) {
      return pgPool.connect();
    }
    return {
      query: async (text, params = []) => {
        if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(text.trim())) {
          return { rows: [], rowCount: 0 };
        }
        return executeLocalQuery(text, params);
      },
      release: () => {},
    };
  },
};

module.exports = {
  query: (text, params) => unifiedPool.query(text, params),
  pool: unifiedPool,
  isPgConnected: () => isPgAvailable,
};
