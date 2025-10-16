# Firestore and Storage

Data models, services, and image handling.

## Collections
### users
- Fields: id, email, displayName, role ('admin'|'staff'), isActive, created_at, updated_at.
- Purpose: Profile and RBAC attribution.

### assessments
- Fields: id, userId, created_at, category, element, floorLevel?, condition, priority, damageCategory?, rootCause?, rootCauseDetails?, notes?, latitude?, longitude?, photo_uri.
- Purpose: Core assessment records; photo_uri points to Storage or an external URL.

## Services
- `lib/firestore.ts`
  - User profiles: get/create/update role/active; listAllUsers(); deleteUser() cascades assessments and photos.
  - Assessments: create (with image upload helper), listUserAssessments(), listAllAssessments(), get/update/delete; generate client IDs; clear user/system data.
- `lib/imageUpload.ts`
  - Upload with retry; delete by storage path or by download URL; basic URI validation.

## Image Storage
- Path: `assessments/{userId}/{assessmentId}.jpg` (typical) or alternate filenames.
- Deletes: On assessment delete, Storage image is removed if path is known or resolvable from URL.

## ID Strategy
- Client-generated IDs using date components and timestamps/sequence ensure offline uniqueness and sorting.

## Rules Summary (snapshot)
- Firestore: Auth required; owners can update/delete their docs; admins can perform broader deletes; users may read profiles (dev-friendly).
- Storage: Users read/write their own paths; admins can read/delete across users; active user checks.

## Admin Metrics
- `lib/storageCalculation.ts`: Approximates Firestore doc sizes and sums Storage file sizes; exposes per-user and system totals and formatted values. Consumed in Admin Settings.
