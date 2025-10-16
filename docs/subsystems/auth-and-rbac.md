# Authentication and RBAC

Role-based access control and auth flows.

## Overview
- Firebase Auth manages sessions; Firestore stores user profiles including role and activity.
- Two roles: staff and admin.
- Secondary Firebase app instance is used to create users as admin without affecting the current session.
- Route protection ensures staff and admin land in their respective tab sets.

## Modules
- `config/firebase.config.ts` — Primary + secondary app initialization; exports auth, adminAuth, db, adminDb, storage.
- `lib/auth/AuthContext.tsx` — Auth state, profile load and sync, signIn/signUp/signOut, adminCreateUser().
- `lib/auth/RoleGuard.tsx` — AdminOnly, StaffOnly, StaffOrAdmin wrappers.
- `lib/auth/RouteProtection.tsx` — Segment-aware redirections between (auth), (tabs), (admin-tabs).

## Flow
1. User signs in → `AuthContext` loads Firestore profile (`users/{uid}`) to resolve role and isActive.
2. RouteProtection reads role and navigates:
   - staff → `(app)/(tabs)`
   - admin → `(app)/(admin-tabs)`
   - unauthenticated → `(auth)`
3. Admin user creation:
   - Uses `adminAuth` (secondary app) to create the new Firebase Auth user.
   - Writes `users/{newUid}` profile with role and flags.
   - Current admin session remains intact (no context switch).

## Permissions (summary)
- Staff: CRUD their own assessments; view only their data and staff features.
- Admin: View all assessments; manage users (role, active, delete); export/import; view metrics.

## UI Surfaces
- Staff tabs: dashboard, capture, assess, history, settings.
- Admin tabs: dashboard, all-assessments, users, settings.
- Users screen: promote/demote, activate/deactivate, delete, password reset email.

## Rules Snapshot Notes
- Firestore rules and Storage rules snapshots included in repo are permissive for development.
- Before production, tighten for least privilege and remove overlapping broad allows.
