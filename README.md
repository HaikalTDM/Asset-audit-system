# Asset Audit System

Field-ready mobile app (Expo + React Native) for capturing asset assessments with photos, working fully offline, and syncing to a Node/Express API backed by MySQL/MariaDB. Supports staff and admin roles, PDF and CSV export, and user management.

## Quick start

1) Install app dependencies

   npm install

2) Configure the API server

   cd server
   npm install

   # create a MySQL database named asset_audit (via phpMyAdmin)
   # then create server/.env using server/.env.example

   npm run migrate
   npm run dev

3) Configure the app

   # .env
   EXPO_PUBLIC_API_URL=http://127.0.0.1:4000

4) Start the app

   npx expo start

## Core features

- Staff workflow: capture photo and location, assess condition and priority, review, save.
- Offline-first: store locally in SQLite, auto-sync when network quality allows.
- Backend: Node/Express API + MySQL/MariaDB with JWT auth.
- Admin tools: manage users, view all assessments, export and import CSV, view storage metrics.
- Reporting: single and batch PDF exports.
- Theming: light and dark themes with responsive typography.

## Project structure

- app/                       File-based routes (auth, staff tabs, admin tabs)
- components/                Shared UI components
- constants/                 Theme and responsive utilities
- hooks/                     Theme and color-scheme hooks
- lib/                       Auth, API service, offline sync, reporting
- assets/                    App icons and images
- scripts/                   Dev and validation scripts
- server/                    Express API + MySQL schema + migrations
- __tests__/                 Automated tests
- types/                     Type shims

## Architecture and flows

- Providers live in app/_layout.tsx: ThemeProvider, AuthProvider, OfflineProvider, and RouteProtection.
- Routing is role-aware: (auth) for sign-in/up, (tabs) for staff, (admin-tabs) for admins.
- Staff flow: capture -> assess -> review -> save.
  - Online: upload image to the API and create MySQL record.
  - Offline: save to SQLite and copy photo locally for later sync.
- Offline sync: triggered by connectivity or foreground changes; batches uploads and writes, retries with backoff, and cleans up local entries.
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

## Offline storage (SQLite)

Local tables include pending_assessments, sync_queue, offline_photos, and metadata. These support offline capture, batching, retry, and sync status reporting.

## Security summary

- JWT auth with role-based access for admin and staff.
- Staff can only access their own assessments; admins can access all.
- File uploads are authenticated and stored in the database.

## Key files

- app/_layout.tsx: root providers and route protection
- lib/auth/AuthContext.tsx: auth state and token handling
- lib/firestore.ts: API-backed CRUD (kept name for compatibility)
- lib/offline/*: offline storage, sync service, network monitor
- lib/pdf/pdfGenerator.ts: PDF report generation
- lib/exportImport.ts: CSV export and import
- lib/storageCalculation.ts: storage metrics via API
- server/index.js: REST API
- server/db.js: MySQL connection pool
- server/migrations/001_init.sql: schema

## Scripts and tests

- npm run lint
- server npm run migrate
- server npm run dev
- scripts/test-*.js: manual or static validation helpers
- __tests__/responsive-typography.test.ts: responsive typography tests

## Notes

- CSV import expects photo_uri to already be accessible; it does not upload image files.
- Use phpMyAdmin to manage the database if preferred.
