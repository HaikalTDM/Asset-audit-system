# Storage Metrics

Measuring Firestore and Storage usage.

## Module
- `lib/storageCalculation.ts` — Calculates Firestore document size (approximate) and Firebase Storage usage per user and for the whole system; formats sizes.

## Admin UI
- `app/(app)/(admin-tabs)/settings.tsx` displays:
  - Total assessments
  - Image count
  - Firestore data size (formatted)
  - Image storage size (formatted)
  - Total size and last updated timestamp

## Implementation Notes
- Firestore size uses type-aware sizing and UTF-8 text length estimates.
- Storage size uses `listAll` and `getMetadata` for each file.
- Exposes formatted helpers via `formatBytes`.

## Limitations
- Firestore sizing is approximate; refer to Google’s billing docs for exact methodology.
- Storage listing may be slow for very large buckets; pagination may be needed at scale.
