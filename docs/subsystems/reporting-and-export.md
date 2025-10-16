# Reporting and Export

PDF generation and CSV export/import.

## Modules
- `lib/pdf/pdfGenerator.ts` — Single/batch PDF via `expo-print`; embeds photos (base64), condition/priority badges; optional branding.
- `lib/exportImport.ts` — CSV export with filters (month/year/date range) and labeled columns; CSV import mapping to assessments.

## UI Entry Points
- Single PDF: `app/(app)/history/[id].tsx` (assessment details screen).
- Batch PDF: `app/(app)/(tabs)/history.tsx`, `app/(app)/(admin-tabs)/all-assessments.tsx`.
- CSV Export (system): `app/(app)/(admin-tabs)/settings.tsx` via DateFilterModal.
- CSV Import (system): `app/(app)/(admin-tabs)/settings.tsx` (admin-only).

## CSV Format
- Header includes: Assessment ID, Date Created, Category, Element, Condition, Condition Label, Priority, Priority Label, Latitude, Longitude, Notes, Photo URL, User ID.
- Import tolerates common header variants; parses dates flexibly; requires category, element, photo_uri.
- Import does not upload images; photo_uri must be resolvable.

## PDF Content
- Single: header, details, condition/priority with badges, matrix score and grade, photo, notes, footer.
- Batch: header, summary (counts and averages), compact assessment cards.

## Error Handling
- Export/Import: surfaces errors via alerts; import aggregates row-level errors.
- PDF: handles image fetch failures gracefully.

## Performance Notes
- Embedding photos increases size; consider excluding for large batches.
- expo-sharing used to share generated files.
