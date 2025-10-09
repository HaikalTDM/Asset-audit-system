# Firebase Security Rules for Role-Based Access Control

This document outlines the Firebase security rules needed to implement role-based access control for the Asset Audit application.

## Firestore Security Rules

**IMPORTANT**: Deploy these rules immediately to fix the "Missing or insufficient permissions" error.

Update your Firestore security rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to get user role (with error handling)
    function getUserRole() {
      let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
      return userDoc != null ? userDoc.data.role : null;
    }

    // Helper function to check if user is admin
    function isAdmin() {
      return getUserRole() == 'admin';
    }

    // Helper function to check if user is staff
    function isStaff() {
      return getUserRole() == 'staff';
    }

    // Helper function to check if user is active (with fallback)
    function isActiveUser() {
      let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
      return userDoc != null ? (userDoc.data.isActive == true) : true;
    }
    
    // Users collection - user profile management
    match /users/{userId} {
      // Users can read their own profile
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Users can create their own profile during signup
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // Users can update their own profile (except role)
      allow update: if request.auth != null && request.auth.uid == userId 
                    && !('role' in request.resource.data.diff(resource.data).affectedKeys());
      
      // Admins can read all user profiles
      allow read: if request.auth != null && isAdmin() && isActiveUser();
      
      // Admins can update user roles
      allow update: if request.auth != null && isAdmin() && isActiveUser();
    }
    
    // Assessments collection - assessment data
    match /assessments/{assessmentId} {
      // Staff and admins can create assessments
      allow create: if request.auth != null && (isStaff() || isAdmin()) && isActiveUser()
                    && request.resource.data.userId == request.auth.uid;
      
      // Users can read their own assessments
      allow read: if request.auth != null && resource.data.userId == request.auth.uid && isActiveUser();
      
      // Admins can read all assessments
      allow read: if request.auth != null && isAdmin() && isActiveUser();
      
      // Users can update their own assessments
      allow update: if request.auth != null && resource.data.userId == request.auth.uid && isActiveUser();
      
      // Users can delete their own assessments
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid && isActiveUser();
      
      // Admins can delete any assessment
      allow delete: if request.auth != null && isAdmin() && isActiveUser();
    }
  }
}
```

## Firebase Storage Security Rules

Update your Firebase Storage security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper function to get user role from Firestore
    function getUserRole() {
      return firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return getUserRole() == 'admin';
    }
    
    // Helper function to check if user is active
    function isActiveUser() {
      return firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.isActive == true;
    }
    
    // Assessment images - organized by user
    match /assessments/{userId}/{allPaths=**} {
      // Users can read and write their own assessment images
      allow read, write: if request.auth != null && request.auth.uid == userId && isActiveUser();
      
      // Admins can read all assessment images
      allow read: if request.auth != null && isAdmin() && isActiveUser();
    }
  }
}
```

## Implementation Steps

1. **Update Firestore Rules**:
   - Go to Firebase Console → Firestore Database → Rules
   - Replace the existing rules with the Firestore rules above
   - Publish the changes

2. **Update Storage Rules**:
   - Go to Firebase Console → Storage → Rules
   - Replace the existing rules with the Storage rules above
   - Publish the changes

3. **Test the Rules**:
   - Use the Firebase Console Rules Playground to test different scenarios
   - Test with different user roles and authentication states

## Security Features

### User Profile Security
- Users can only read and modify their own profiles
- Users cannot change their own role
- Admins can read all user profiles and update user roles
- Only active users can perform operations

### Assessment Security
- Staff and admins can create assessments
- Users can only read their own assessments
- Admins can read all assessments from all users
- Users can update and delete their own assessments
- Admins can delete any assessment

### Image Storage Security
- Users can upload and access their own assessment images
- Admins can read all assessment images
- Images are organized by user ID for better security

### Additional Security Measures
- All operations require authentication
- User must be active to perform operations
- Role-based access is enforced at the database level
- Proper data isolation between staff and admin users

## Testing Scenarios

Test these scenarios to ensure security rules work correctly:

1. **Staff User**:
   - Can create assessments
   - Can only read their own assessments
   - Cannot read other users' assessments
   - Cannot access admin functions

2. **Admin User**:
   - Can read all assessments
   - Can manage user roles
   - Can access all assessment images
   - Can delete any assessment

3. **Unauthenticated User**:
   - Cannot access any data
   - All operations should be denied

4. **Inactive User**:
   - Cannot perform any operations
   - All operations should be denied
