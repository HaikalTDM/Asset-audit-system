# File Reference

Concise purpose-by-file map for dev-afiq (2025-10-15). Grouped by subsystem. This is a high-level index; see subsystem docs for deeper APIs.

## App routing and screens (`app/`)
- `app/_layout.tsx` — Root providers (Theme, Auth, Offline) + RouteProtection.
- `app/index.tsx` — Initial redirector based on auth/role.
- `app/(auth)/_layout.tsx` — Auth stack layout.
- `app/(auth)/sign-in.tsx` — Sign-in screen.
- `app/(auth)/sign-up.tsx` — Sign-up screen.
- `app/(app)/_layout.tsx` — App stack layout (tabs/admin-tabs/history/review/modal sync).
- `app/(app)/modal.tsx` — Example modal.
- `app/(app)/review.tsx` — Review and save (online → Firestore; offline → SQLite queue).
- `app/(app)/sync-status.tsx` — Sync monitor (pending/failed/progress).
- `app/(app)/(tabs)/_layout.tsx` — Staff tabs layout with guards.
- `app/(app)/(tabs)/index.tsx` — Staff dashboard.
- `app/(app)/(tabs)/capture.tsx` — Capture image + location.
- `app/(app)/(tabs)/assess.tsx` — Enter assessment details.
- `app/(app)/(tabs)/history.tsx` — History list, filters, batch PDF.
- `app/(app)/(tabs)/settings.tsx` — Staff settings.
- `app/(app)/history/index.tsx` — History index list.
- `app/(app)/history/[id].tsx` — Assessment detail, single PDF, delete.
- `app/(app)/(admin-tabs)/_layout.tsx` — Admin tabs layout with guard.
- `app/(app)/(admin-tabs)/index.tsx` — Admin dashboard + matrix.
- `app/(app)/(admin-tabs)/all-assessments.tsx` — Admin list + batch PDF.
- `app/(app)/(admin-tabs)/users.tsx` — Admin user management (create/role/active/delete).
- `app/(app)/(admin-tabs)/settings.tsx` — Admin settings (export/import, storage metrics).

## Components (`components/`)
- `components/themed-text.tsx` — Themed text wrapper.
- `components/themed-view.tsx` — Themed view wrapper.
- `components/external-link.tsx` — External link helper.
- `components/ui/Button.tsx` — Button variants/sizes, responsive.
- `components/ui/Card.tsx` — Card variants.
- `components/ui/Input.tsx` — Labeled input with errors.
- `components/ui/Layout.tsx` — Layout primitives (grid/stack/row/column).
- `components/ui/DateFilterModal.tsx` — Export month/year selector.
- `components/ui/SyncStatusIndicator.tsx` — Header indicator for sync state.
- `components/ui/ZoomImageModal.tsx` — Gesture zoom for images.
- `components/ui/Chip.tsx`, `components/ui/collapsible.tsx`, `components/ui/icon-symbol*.tsx` — Misc UI utilities/icons.

## Config and constants (`config/`, `constants/`, `hooks/`)
- `config/firebase.config.ts` — Firebase init (primary + secondary), exports auth/db/storage.
- `constants/theme.ts` — Color palette and fonts.
- `constants/responsive.ts` — Responsive utilities/spacing/typography.
- `hooks/use-color-scheme*.ts` — Color scheme hooks.
- `hooks/use-theme-color.ts` — Themed color resolver.
- `lib/theme-context.tsx` — Persisted theme preference.

## Auth and RBAC (`lib/auth/`)
- `lib/auth/AuthContext.tsx` — Auth state, profile load, signIn/signUp/signOut, adminCreateUser.
- `lib/auth/RoleGuard.tsx` — Role-based view guards.
- `lib/auth/RouteProtection.tsx` — Segment-level redirection.

## Data services and utilities (`lib/`)
- `lib/firestore.ts` — Users/assessments CRUD, list helpers, cascaded deletes, clear data.
- `lib/firebase.ts` — Minimal alt init placeholder.
- `lib/imageUpload.ts` — Upload with retry, delete by path/URL.
- `lib/pdf/pdfGenerator.ts` — PDF generation (single/batch) + share helpers.
- `lib/exportImport.ts` — CSV export/import, date filters; legacy zip aliases.
- `lib/storageCalculation.ts` — Firestore/Storage metrics (per-user/system) + formatBytes.

## Offline and local storage (`lib/offline/`, `lib/db/`, `lib/db.ts`)
- `lib/db/sqlite.ts` — Offline DB schema (pending_assessments, sync_queue, offline_photos, metadata), stats/cleanup.
- `lib/offline/networkMonitor.ts` — Online + quality monitoring.
- `lib/offline/offlineStorage.ts` — Save/get/delete offline items; pending counts.
- `lib/offline/syncService.ts` — Batch sync pipeline with retries/backoff and progress.
- `lib/offline/OfflineContext.tsx` — Context for sync state, manual sync, retry.
- `lib/db.ts` — Lightweight native local store for assessments/photos.
- `lib/db.web.ts` — Web fallback local store (localStorage).

## Scripts, tests, types (`scripts/`, `__tests__/`, `types/`)
- `__tests__/responsive-typography.test.ts` — Responsive typography tests.
- `scripts/test-storage-calculation.js` — Validates storage metrics features presence in code.
- Other `scripts/*.js` — Manual/dev flow validators.
- `types/expo-file-system-legacy.d.ts` — Typing shim for legacy FS import.

## Top-level docs and rules (`*.md`, `*.txt`)
- Setup/guides: `FIREBASE_SETUP_GUIDE.md`, `OFFLINE_MODE_GUIDE.md`, `PDF_GENERATION_GUIDE.md`, `RBAC_IMPLEMENTATION_SUMMARY.md`, `ADMIN_DELETE_USER_FIX.md`.
- Rules snapshots: `firestore-rules-complete.txt`, `storage-rules-complete.txt`.

---
This file reflects dev-afiq as of 2025-10-15.
