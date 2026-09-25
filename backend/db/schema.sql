-- ==============================================================================
-- Solar Business Admin Panel - Database Schema
-- Database: PostgreSQL (Neon / Render / Cloud Ready)
-- ==============================================================================

-- 1. Consumers Table
CREATE TABLE IF NOT EXISTS consumers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    rts_status VARCHAR(20) DEFAULT 'not Done' CHECK (rts_status IN ('Done', 'not Done')),
    national_portal_status VARCHAR(20) DEFAULT 'not Done' CHECK (national_portal_status IN ('Done', 'not Done')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Documents Table (Aadhar & Inverter Specifications)
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    consumer_id INTEGER NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
    aadhar_card_url TEXT NOT NULL,
    inverter_capacity VARCHAR(10) NOT NULL CHECK (inverter_capacity IN ('3kW', '4kW', '5kW')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Photos Table (Panel, Inverter, GPS Photos)
CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    consumer_id INTEGER NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('panel_serial_num', 'inverter_serial_num', 'gps_plant')),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Cloud Persistent File Store (Preserves uploaded PDFs/Images across Render container restarts)
CREATE TABLE IF NOT EXISTS uploaded_files (
    filename VARCHAR(255) PRIMARY KEY,
    consumer_id INTEGER REFERENCES consumers(id) ON DELETE CASCADE,
    mime_type VARCHAR(100) NOT NULL,
    file_data BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid querying and search performance
CREATE INDEX IF NOT EXISTS idx_consumers_name ON consumers (name);
CREATE INDEX IF NOT EXISTS idx_consumers_phone ON consumers (phone_number);
CREATE INDEX IF NOT EXISTS idx_consumers_rts_status ON consumers (rts_status);
CREATE INDEX IF NOT EXISTS idx_consumers_np_status ON consumers (national_portal_status);
CREATE INDEX IF NOT EXISTS idx_documents_consumer_id ON documents (consumer_id);
CREATE INDEX IF NOT EXISTS idx_photos_consumer_id ON photos (consumer_id);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos (category);
