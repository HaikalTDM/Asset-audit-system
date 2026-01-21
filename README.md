# Asset Audit System

Web app (Vite + React Router) for capturing asset assessments with photos, working offline in the browser, and syncing to a Node/Express API backed by MySQL/MariaDB. Supports staff and admin roles, PDF and CSV export, and user management.

## Quick start

1) Configure the API server

   cd server
   npm install

   # create a MySQL database named asset_audit (via phpMyAdmin)
   # then create server/.env using server/.env.example

   npm run migrate
   npm run dev

2) Configure the web app

   cd ../web
   npm install

   # web/.env
   VITE_API_URL=http://127.0.0.1:4000

3) Start the app

   npm run dev

## Core features

- Staff workflow: capture photo and location, assess condition and priority, review, save.
- Offline-first: store locally in IndexedDB (Dexie), auto-sync when network allows.
- Backend: Node/Express API + MySQL/MariaDB with JWT auth.
- Admin tools: manage users, view all assessments, export and import CSV, view storage metrics.
- Reporting: single and batch PDF exports.
- Theming: light and dark themes with responsive typography.

## Project structure

- web/                       Vite + React Router web app
- server/                    Express API + MySQL schema + migrations

## Architecture and flows

- Providers live in web/src/main.tsx: ThemeProvider, AuthProvider, OfflineProvider.
- Routing is role-aware for sign-in/up, staff, and admin routes.
- Staff flow: capture -> assess -> review -> save.
  - Online: upload image to the API and create MySQL record.
  - Offline: save to SQLite and copy photo locally for later sync.
- Offline sync: triggered by connectivity changes; batches uploads and retries.
- Admin flow: view all assessments, manage users (create, activate, role change, delete), export/import CSV, view storage metrics.
- Reporting: PDF generation (single and batch) and CSV export/import for system-wide data exchange.

## Data model (MySQL/MariaDB)

- users
  - id, email, password_hash, display_name, role, is_active, photo_url, created_at, updated_at
- assessments
  - id, user_id, created_at, building, floor, room, category, element
  - condition_rating (1-5), priority_rating (1-5)
  - damage_category, root_cause, root_cause_details, notes
  - latitude, longitude, photo_uri, photo_blob, photo_mime

Images are stored in MySQL as a LONGBLOB (photo_blob) with a MIME type (photo_mime) and are served via /assessments/:id/photo.

## Offline storage (IndexedDB)

Pending assessments are stored in IndexedDB via Dexie for offline capture, batching, retry, and sync status reporting.

## Security summary

- JWT auth with role-based access for admin and staff.
- Staff can only access their own assessments; admins can access all.
- File uploads are authenticated and stored in the database.

## Key files

- web/src/main.tsx: root providers
- web/src/lib/auth.tsx: auth state and token handling
- web/src/lib/api.ts: API client
- web/src/lib/offline/*: offline storage and sync
- web/src/lib/pdf.ts: PDF report generation
- server/index.js: REST API
- server/db.js: MySQL connection pool
- server/migrations/001_init.sql: schema

## Scripts and tests

- web npm run lint
- server npm run migrate
- server npm run dev

## Notes

- CSV import expects photo_uri to already be accessible; it does not upload image files.
- Use phpMyAdmin to manage the database if preferred.
