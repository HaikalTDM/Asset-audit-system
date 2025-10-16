# Firestore Rules (Guidance)

These are guidance notes to harden from the permissive dev snapshot in repo.

## Goals
- Least privilege: users only access their data; admins have explicit elevated rights.
- Avoid overlapping broad `allow` rules.

## Recommendations
- Users collection:
  - allow read: only self or admin
  - allow create: self
  - allow update: self (limited fields) or admin (role/isActive)
  - allow delete: admin only
- Assessments collection:
  - allow create: authenticated
  - allow read: owner or admin
  - allow update/delete: owner or admin (delete)

## Helper functions
- `isAdmin()` reads `users/{uid}.role == 'admin'`.
- `isOwner(resource)` checks `resource.data.userId == request.auth.uid`.
- `isActiveUser()` gates access.

## Testing
- Verify with admin/non-admin accounts and inactive users.
