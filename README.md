# Asset Audit System

Field-ready mobile app (Expo + React Native) for capturing asset assessments with photos, working fully offline, and syncing to Firebase when online. Supports staff and admin roles, PDF and CSV export, and user management.

## Quick start

1) Install dependencies

   npm install

2) Create a .env file

   FIREBASE_API_KEY=your_key
   FIREBASE_AUTH_DOMAIN=your_domain
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   EAS_PROJECT_ID=your_eas_project_id

3) Start the app

   npx expo start -c --tunnel

## Core features

- Staff workflow: capture photo and location, assess condition and priority, review, save.
- Offline-first: store locally in SQLite, auto-sync when network quality allows.
- Cloud backend: Firebase Auth, Firestore, Storage.
- Admin tools: manage users, view all assessments, export and import CSV, view storage metrics.
- Reporting: single and batch PDF exports.
- Theming: light and dark themes with responsive typography.

## Project structure

- app/                       File-based routes (auth, staff tabs, admin tabs)
- components/                Shared UI components
- config/                    Firebase initialization
- constants/                 Theme and responsive utilities
- hooks/                     Theme and color-scheme hooks
- lib/                       Auth, Firestore, offline sync, reporting
- assets/                    App icons and images
- scripts/                   Dev and validation scripts
- __tests__/                 Automated tests
- types/                     Type shims

## Architecture and flows

- Providers live in app/_layout.tsx: ThemeProvider, AuthProvider, OfflineProvider, and RouteProtection.
- Routing is role-aware: (auth) for sign-in/up, (tabs) for staff, (admin-tabs) for admins.
- Staff flow: capture -> assess -> review -> save.
  - Online: upload image to Storage and create Firestore doc.
  - Offline: save to SQLite and copy photo locally for later sync.
- Offline sync: triggered by connectivity or foreground changes; batches uploads and writes, retries with backoff, and cleans up local entries.
- Admin flow: view all assessments, manage users (create, activate, role change, delete), export/import CSV, view storage metrics.
- Reporting: PDF generation (single and batch) and CSV export/import for system-wide data exchange.

## Data model (Firestore)

- users
  - id, email, displayName, role: 'admin' | 'staff', isActive, created_at, updated_at
- assessments
  - id, userId, created_at, category, element, floorLevel?
  - condition (1-5), priority (1-5)
  - damageCategory?, rootCause?, rootCauseDetails?, notes?
  - latitude?, longitude?, photo_uri

Images are stored in Firebase Storage at: assessments/{userId}/{assessmentId}.jpg

## Offline storage (SQLite)

Local tables include pending_assessments, sync_queue, offline_photos, and metadata. These support offline capture, batching, retry, and sync status reporting.

## Security rules summary

- Firestore: authenticated users only; users can read and update their own profile; assessment create allowed for any authed user; updates and deletes are owner-scoped; admins have broader delete rights.
- Storage: users can read and write their own files under assessments/{userId}; admins can read and delete across users.

Review and tighten rules for production (least privilege, remove broad permissions).

## Key files

- app/_layout.tsx: root providers and route protection
- lib/auth/AuthContext.tsx: auth state and admin user creation
- lib/auth/RouteProtection.tsx: segment-level guards
- config/firebase.config.ts: Firebase initialization (primary and secondary app)
- lib/firestore.ts: user and assessment CRUD
- lib/offline/*: offline storage, sync service, network monitor
- lib/pdf/pdfGenerator.ts: PDF report generation
- lib/exportImport.ts: CSV export and import
- lib/storageCalculation.ts: storage metrics

## Scripts and tests

- npm run lint
- scripts/test-*.js: manual or static validation helpers
- __tests__/responsive-typography.test.ts: responsive typography tests

## Notes

- A secondary Firebase app instance is used for admin user creation so the current session is not affected.
- CSV import expects photo_uri to already be accessible; it does not upload image files.
