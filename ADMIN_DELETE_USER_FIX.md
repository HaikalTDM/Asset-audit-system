# 🔧 Fix "Missing or insufficient permissions" Error

## Quick Fix for Admin User Deletion

If you're getting **"Missing or insufficient permissions"** when trying to delete users as admin, follow these steps:

---

## Step 1: Update Firestore Rules (5 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **asset-audit-v1**
3. Click **Firestore Database** in the left menu
4. Click the **Rules** tab
5. Find this section:

```javascript
// Users collection - user profile management
match /users/{userId} {
  // ... existing rules ...
  
  // Admins can update user roles
  allow update: if request.auth != null && isAdmin() && isActiveUser();
}
```

6. **ADD THIS LINE** after the update rule:

```javascript
// Admins can delete user profiles (for user management)
allow delete: if request.auth != null && isAdmin() && isActiveUser();
```

7. Click **Publish** button

---

## Step 2: Update Storage Rules (5 minutes)

1. Stay in Firebase Console
2. Click **Storage** in the left menu
3. Click the **Rules** tab
4. Find this section:

```javascript
// Assessment images - organized by user
match /assessments/{userId}/{allPaths=**} {
  // Users can read and write their own assessment images
  allow read, write: if request.auth != null && request.auth.uid == userId && isActiveUser();
  
  // Admins can read all assessment images
  allow read: if request.auth != null && isAdmin() && isActiveUser();
}
```

5. **REPLACE** the admin line with:

```javascript
// Admins can read and delete all assessment images
allow read, delete: if request.auth != null && isAdmin() && isActiveUser();
```

6. Click **Publish** button

---

## Step 3: Test It!

1. Reload your app
2. Go to Admin → Users
3. Click the three dots on any user
4. Click **Delete User**
5. Confirm the deletion

✅ It should now work!

---

## What This Fixes

These updated rules allow admins to:
- ✅ Delete user profile documents
- ✅ Delete user assessments
- ✅ Delete user photos from storage
- ✅ Complete user cleanup

---

## Full Rules Reference

For the complete security rules, see `FIREBASE_SECURITY_RULES.md`

---

## Still Having Issues?

If you still get permission errors:

1. **Check you're logged in as admin**
   - Go to Admin Dashboard
   - Verify your role badge shows "ADMIN"

2. **Clear app cache**
   - Close the app completely
   - Restart it

3. **Check Firebase Console**
   - Firestore → Rules → Make sure rules are published
   - Storage → Rules → Make sure rules are published

4. **Wait a moment**
   - Sometimes Firebase rules take 30-60 seconds to propagate

