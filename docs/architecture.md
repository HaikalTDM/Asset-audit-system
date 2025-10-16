# Architecture Overview

High-level view of providers, flows, and data paths.

## Providers and Contexts
- ThemeProvider (lib/theme-context.tsx)
- AuthProvider (lib/auth/AuthContext.tsx)
- OfflineProvider (lib/offline/OfflineContext.tsx)

Rendered in `app/_layout.tsx` with `RouteProtection` gating segments.

## Primary Flows
1. Auth & Role Routing
   - Firebase Auth session → load Firestore profile → route to staff/admin tabs.
2. Staff Capture → Assess → Review → Save
   - Online: upload image → create Firestore doc.
   - Offline: save to SQLite + local photo → later sync.
3. Offline Sync
   - Triggers: connectivity/foreground/manual.
   - Pipeline: batch items → upload photos → create docs → cleanup.
4. Admin Operations
   - View all assessments; manage users; export/import; storage metrics.
5. Reporting
   - Single/batch PDFs; system-wide CSV exports; CSV import.

## Data and Storage
- Firestore: users, assessments.
- Storage: assessments/{userId}/{assessmentId}.jpg.
- Local (offline): SQLite tables plus photo copies.

## Error Handling & Resilience
- Network quality gating and retries with backoff.
- Fallbacks from online write to offline save.
- Clear UI feedback (SyncStatusIndicator, Sync Status screen).

## Diagrams (ASCII)

Auth/Route → Tabs

 [App launch]
      |
  Providers + RouteProtection
      |
  ┌───────────────┐
  │ Authenticated?│──No──> (auth)
  └───────┬───────┘
          │Yes
   Load user profile
          │
  ┌───────┴────────┐
  │ role == staff  │──> (app)/(tabs)
  │ role == admin  │──> (app)/(admin-tabs)
  └────────────────┘

Offline Sync

 [Pending items]
      |
  Network ok?
   Yes  No→ defer
      |
  Batch (size=5)
      |
 Upload photo(s)
      |
 Create Firestore doc
      |
  Cleanup local
      |
   Next batch

## Data Lifecycle (Assessment)

1) Capture
- Input: photoUri, optional GPS
- Output: params passed to Assess screen

2) Assess
- Input: category, element, condition (1–5), priority (1–5), optional details
- Output: params passed to Review

3) Review → Save
- Online path:
  - Upload image to Storage
  - Write assessment doc to Firestore (includes photo_uri)
- Offline path:
  - Save to SQLite `pending_assessments`, copy photo locally
  - Increment pending count in OfflineContext

4) Sync (when applicable)
- Upload photos → create Firestore docs → cleanup local
- Progress surfaced in OfflineContext; errors retained for retry

5) Consume
- History lists fetch via FirestoreService
- Details screen enables single PDF export or delete (cascades image)

## Module Interaction Map (simplified)

Screens → FirestoreService / imageUpload
       → OfflineContext → offlineStorage / syncService → sqlite / Storage / Firestore

AuthContext → RouteProtection → (auth)/(tabs)/(admin-tabs)

Admin Settings → exportImport / storageCalculation / FirestoreService
