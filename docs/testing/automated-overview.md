# Automated Testing Overview

Current coverage is light; priorities for future tests:

## Unit Tests
- FirestoreService: ID generation, CRUD error handling, cascade delete.
- imageUpload: retry logic and URL/path deletion.
- storageCalculation: document size calc and formatting.

## Integration Tests (mocked Firebase)
- Auth + role resolution path in AuthContext
- Offline save → sync pipeline with progress callbacks

## UI Tests (optional)
- Critical flows: capture→assess→review save; history detail PDF; admin user ops
- Sync Status interactions

## Existing
- `__tests__/responsive-typography.test.ts` validates responsive font scaling.
