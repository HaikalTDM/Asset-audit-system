# Firebase Setup & Data Management Guide

## 🔧 Clear Firebase Data for Testing

### Method 1: Using Firebase Console (Recommended)

1. **Go to [Firebase Console](https://console.firebase.google.com)**
2. **Select your `asset-audit-v1` project**
3. **Clear Firestore Data**:
   - Click "Firestore Database"
   - Go to "Data" tab
   - Delete all documents in these collections:
     - `users` (delete all user documents)
     - `assessments` (delete all assessment documents)
   - **WARNING**: This will permanently delete all data

4. **Clear Firebase Authentication Users**:
   - Click "Authentication"
   - Go to "Users" tab
   - Select all users and delete them
   - **WARNING**: This will delete all user accounts

5. **Clear Firebase Storage (Optional)**:
   - Click "Storage"
   - Delete all uploaded images if you want a completely clean start

### Method 2: Using Admin Dashboard (After Fixes)

1. **Sign in as admin**
2. **Go to Admin Settings**
3. **Click "Clear All System Data"**
4. **Confirm the action**

## 👑 Create Super Admin Account

### Option 1: Manual Creation via Firebase Console

1. **Go to Firebase Console → Authentication → Users**
2. **Click "Add User"**
3. **Enter Details**:
   - Email: `admin@gmail.com`
   - Password: `admin123@`
   - Display Name: `MICROCORP ADMIN SDN. BHD.`

4. **Create User Profile in Firestore**:
   - Go to Firestore Database → Data
   - Create collection: `users`
   - Create document with ID: `[the-user-uid-from-auth]`
   - Add fields:
     ```json
     {
       "id": "[user-uid]",
       "email": "admin@gmail.com",
       "displayName": "MICROCORP ADMIN SDN. BHD.",
       "role": "admin",
       "created_at": [current-timestamp],
       "updated_at": [current-timestamp],
       "isActive": true
     }
     ```

### Option 2: Using the App (After Fixes)

1. **Temporarily modify sign-up page** to allow admin creation
2. **Create the admin account**
3. **Revert the sign-up page changes**
4. **Use admin dashboard to manage other users**

### Option 3: Using Firebase Admin SDK (Advanced)

Create a Node.js script to programmatically create the admin account:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createSuperAdmin() {
  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: 'admin@gmail.com',
      password: 'admin123@',
      displayName: 'MICROCORP ADMIN SDN. BHD.',
    });

    // Create user profile in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email: 'admin@gmail.com',
      displayName: 'MICROCORP ADMIN SDN. BHD.',
      role: 'admin',
      created_at: Date.now(),
      updated_at: Date.now(),
      isActive: true,
    });

    console.log('Super admin created successfully:', userRecord.uid);
  } catch (error) {
    console.error('Error creating super admin:', error);
  }
}

createSuperAdmin();
```

## 🧪 Testing Authentication Flow

### Test Sequence:

1. **Clear all data** (users, assessments, storage)
2. **Create super admin account**
3. **Test unauthenticated access**:
   - Open app → Should redirect to sign-in
   - Try accessing app routes directly → Should redirect to sign-in

4. **Test staff registration**:
   - Go to sign-up page
   - Verify no admin role option is visible
   - Create staff account
   - Verify redirect to staff dashboard

5. **Test admin login**:
   - Sign out
   - Sign in with admin credentials
   - Verify redirect to admin dashboard

6. **Test role-based access**:
   - As staff: Try accessing admin routes → Should redirect to staff dashboard
   - As admin: Try accessing staff routes → Should redirect to admin dashboard

7. **Test admin user creation**:
   - Sign in as admin
   - Go to admin dashboard
   - Create new users (both staff and admin)
   - Test new accounts

## 🔒 Security Verification

### Verify These Security Measures:

- [ ] Sign-up page only allows staff role creation
- [ ] Admin accounts can only be created by existing admins
- [ ] Role-based redirects work correctly after sign-in
- [ ] Route protection prevents unauthorized access
- [ ] Staff users cannot access admin features
- [ ] Admin users have full system access

### Test Edge Cases:

- [ ] Direct URL access to protected routes
- [ ] Sign-in with non-existent account
- [ ] Sign-up with existing email
- [ ] Password validation (minimum 6 characters)
- [ ] Confirm password validation
- [ ] Network connectivity issues

## 📝 Post-Setup Checklist

- [ ] Super admin account created and tested
- [ ] All existing data cleared
- [ ] Sign-up security fix verified
- [ ] Role-based navigation working
- [ ] Route protection functioning
- [ ] Admin dashboard accessible to admin
- [ ] Staff dashboard accessible to staff
- [ ] User creation through admin dashboard working

## 🚨 Important Notes

1. **Backup Data**: If you have important data, export it before clearing
2. **Security Rules**: Ensure Firebase security rules are properly deployed
3. **Testing Environment**: Consider using a separate Firebase project for testing
4. **Production Safety**: Never clear production data without proper backups

## 🔄 Rollback Plan

If issues occur:
1. **Restore from backup** (if available)
2. **Recreate super admin account**
3. **Verify Firebase security rules**
4. **Check app configuration**
5. **Review authentication flow logs**
