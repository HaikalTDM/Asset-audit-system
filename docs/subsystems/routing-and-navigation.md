# Routing and Navigation (expo-router)

## Structure
- File-based routes under `app/` organized by segments and tab groups.
- Role-aware navigation using segment guards and context.

## Segments
- `(auth)` — Sign-in/up flow; shown when unauthenticated.
- `(app)` — Main application area; contains:
  - `(tabs)` — Staff tabs: index, capture, assess, history, settings.
  - `(admin-tabs)` — Admin tabs: index, all-assessments, users, settings.
  - `history/` — Shared history list + `[id]` detail.
  - `review.tsx` — Review and save (pre-submit summary).
  - `sync-status.tsx` — Sync monitor screen.
  - `modal.tsx` — Example modal.

## Layouts
- `app/_layout.tsx` wraps the entire app with Theme, Auth, and Offline providers and applies `RouteProtection`.
- `app/(auth)/_layout.tsx` defines the auth stack.
- `app/(app)/_layout.tsx` defines the primary stack that can push history/review/modal atop tabs.
- `app/(app)/(tabs)/_layout.tsx` and `app/(app)/(admin-tabs)/_layout.tsx` define tab navigators guarded by role.

## Guards
- `lib/auth/RouteProtection.tsx` reads the auth state and role to redirect:
  - unauthenticated → `(auth)`
  - staff → `(app)/(tabs)`
  - admin → `(app)/(admin-tabs)`
- `lib/auth/RoleGuard.tsx` provides component-level guards: AdminOnly, StaffOnly, StaffOrAdmin.

## Flows
- Launch → providers rendered → RouteProtection resolves target segment.
- Staff:
  - index → capture → assess → review → save → history.
  - can navigate to history details and export PDF.
- Admin:
  - dashboard → all-assessments/users/settings.
  - exports and system operations in settings.

## Deep Linking & Headers
- expo-router handles deep links based on file paths; headers configured per screen stack with `Stack.Screen`.

## Notes
- Back navigation between Assess/Review/History is tailored to maintain flow.
- SyncStatusIndicator in headers links to `sync-status` for transparency.
