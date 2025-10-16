# Playbook: Firebase Setup

Use in conjunction with FIREBASE_SETUP_GUIDE.md. This is a concise operator checklist.

## Steps
1. Create/Select Firebase project.
2. Enable Authentication (Email/Password).
3. Create Web app config; populate in `config/firebase.config.ts` (primary + secondary app).
4. Deploy Firestore and Storage security rules (dev vs prod variants).
5. Create super admin account and Firestore profile.
6. Verify app sign-in and role routing.

## Validation
- Staff sign-in lands in `(app)/(tabs)`.
- Admin sign-in lands in `(app)/(admin-tabs)`.
- Can create staff users from Admin → Users.
