# Solar Business Admin Panel

A full-stack administrative platform for managing Rooftop Solar (RTS) installations, National Portal subsidy workflows, and consumer document/photograph verification.

---

## Architecture Overview

- **Backend**: Node.js, Express, PostgreSQL, Multer (multipart/form-data upload processing)
- **Frontend**: React.js (Vite), Tailwind CSS, Lucide Icons, Axios
- **Database**: PostgreSQL with ACID transactions for multi-file record persistence

---

## 1. Database Setup

1. Create a database in PostgreSQL:
   ```sql
   CREATE DATABASE solar_admin_db;
   ```
2. Run the migration script located at `backend/db/schema.sql`:
   ```bash
   psql -U postgres -d solar_admin_db -f backend/db/schema.sql
   ```

---

## 2. Backend Setup & Run

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env` file (copy from `.env.example`):
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=solar_admin_db
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```
4. Start the server:
   ```bash
   npm run dev
   # or
   npm start
   ```
   The backend will be accessible at `http://localhost:5000`.

---

## 3. Frontend Setup & Run

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be accessible at `http://localhost:5173`.

---

## Features & Endpoints Implemented

| Page / Workflow | Method | Endpoint | Description |
|-----------------|--------|----------|-------------|
| **Consumers** | `POST` | `/api/consumers` | Adds new consumer (`name`, `phone_number`, `address`) |
| **Consumers** | `GET` | `/api/consumers` | Lists all consumers |
| **RTS Workflow** | `GET` | `/api/consumers/rts?search=` | Search consumers for RTS survey status |
| **RTS Workflow** | `PATCH` | `/api/consumers/:id/rts` | Update RTS status (`Done` or `not Done`) |
| **National Portal** | `GET` | `/api/consumers/national-portal?search=` | Search consumers for National Portal |
| **National Portal** | `PATCH` | `/api/consumers/:id/national-portal` | Update National Portal status (`Done` or `not Done`) |
| **Documents** | `POST` | `/api/documents` | Accepts `multipart/form-data` with exact Multer limits |
| **Documents** | `GET` | `/api/documents/consumer/:consumerId` | Fetch consumer documents and photos |
