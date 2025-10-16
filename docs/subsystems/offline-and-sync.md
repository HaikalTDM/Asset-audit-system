# Offline and Sync Subsystem

End-to-end description of how offline capture and synchronization work.

## Overview
- Save assessments offline when there’s no or poor connectivity.
- Auto-sync when online with quality good enough; show progress and errors.
- Batch uploads with retries and exponential backoff; clean up after success.

## Key Modules
- `lib/db/sqlite.ts` — Tables: `pending_assessments`, `sync_queue`, `offline_photos`, `metadata`; stats/export/cleanup helpers.
- `lib/offline/networkMonitor.ts` — Connectivity and network quality checks.
- `lib/offline/offlineStorage.ts` — Write/read/update/delete offline assessment payloads and photos; pending counts.
- `lib/offline/syncService.ts` — Batch sync pipeline; upload photos to Storage, create Firestore docs, progress callback, error handling.
- `lib/offline/OfflineContext.tsx` — React context exposing: isOnline, networkQuality, pendingCount, isSyncing, syncProgress, lastSyncTime, manualSync(), retrySync().
- `app/(app)/sync-status.tsx` — UI screen for status, manual sync and retry; lists pending/failed.
- `components/ui/SyncStatusIndicator.tsx` — Header indicator and tap-through.

## Data Flow
1. Review screen saves assessment:
   - Online → `FirestoreService.createAssessmentWithImageUpload()` uploads photo then writes document.
   - Offline → `saveOfflineAssessment()` stores assessment in SQLite and copies photo to app files; increments pending.
2. Network state changes or app foreground → OfflineContext triggers `syncPendingAssessments()`.
3. Sync pipeline (per batch):
   - Mark item syncing; upload its photos (retry with backoff).
   - Create Firestore document; link photo URI.
   - On success: mark synced and remove local artifacts; update progress.
   - On failure: record error, increment retryCount; move to failed after max attempts.
4. UI reflects:
   - Indicator colors (offline/red, syncing/orange, synced/green) with pending count badge.
   - Sync Status screen shows lists, progress bar, retry buttons, last sync time.

## Triggers
- Connectivity restored and quality not poor.
- App returns to foreground.
- Manual actions: Sync Now, Retry Failed, Retry single.

## Configuration (examples)
- Batch size: 5
- Max retries: 3
- Initial retry delay: 2000ms
- Backoff base: 2

## Error Handling
- Network or upload failure → retry with exponential backoff.
- Permission errors → surfaced in Sync Status; user can retry.
- Persistent failures → remain in "failed" with retry option and resetRetryCount.

## Cleanup
- After successful sync, remove local records and photo copies.
- Optional time-based cleanup of synced items to reclaim storage.

## Edge Cases
- Very poor network: sync deferred.
- Duplicate prevention: client-generated IDs and append-only creation.
- App closed during sync: safe to resume; items retain state.

## Related Services
- Firestore and Storage operations via `lib/firestore.ts` and `lib/imageUpload.ts`.
- Role guards do not affect sync; all writes occur under the signed-in user.
