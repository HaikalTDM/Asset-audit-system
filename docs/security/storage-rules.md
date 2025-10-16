# Storage Rules (Guidance)

Align Storage access with Firestore ownership and admin capabilities.

## Recommendations
- Path: `assessments/{userId}/{allPaths=**}`
  - allow read, write: request.auth != null && request.auth.uid == userId && isActiveUser()
  - allow read, delete: admin (no write upload for admin by default)

## Notes
- Consider time-limited download tokens if exposing public links.
- Enforce size/type checks on client before upload.

## Testing
- Upload and delete with both staff and admin; verify denied for other users.
