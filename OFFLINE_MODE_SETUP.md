# 🛠️ Offline Mode - Setup & Installation Guide

## Prerequisites

- Expo SDK ~54
- React Native 0.81+
- Firebase project configured
- Node.js 18+ and npm

---

## 📦 Installation Steps

### Step 1: Install Dependencies

```bash
npm install
```

**New dependencies added:**
- `@react-native-community/netinfo@^11.3.0` - Network connectivity detection
- `expo-sqlite` (already included) - Local database
- `@react-native-async-storage/async-storage` (already included) - State persistence

### Step 2: Initialize Database

The database initializes automatically on app start. No manual setup needed!

**Location**: `lib/db/sqlite.ts`
**Database name**: `assetaudit_offline.db`
**Tables**: Automatically created on first launch

### Step 3: Verify Integration

Check that these files exist:
```
✅ lib/db/sqlite.ts
✅ lib/offline/networkMonitor.ts
✅ lib/offline/offlineStorage.ts
✅ lib/offline/syncQueue.ts
✅ lib/offline/syncService.ts
✅ lib/offline/OfflineContext.tsx
✅ components/ui/SyncStatusIndicator.tsx
✅ app/(app)/sync-status.tsx
```

### Step 4: Run the App

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

---

## 🧪 Verify Installation

### Test 1: Database Initialization

1. Open the app
2. Check console for: `"SQLite database opened successfully"`
3. Check console for: `"Database tables created successfully"`

### Test 2: Network Monitoring

1. Open the app
2. Check console for: `"Initializing network monitoring..."`
3. Check console for: `"Initial network status: ..."`
4. Toggle airplane mode
5. Should see: `"Network status changed: ..."`

### Test 3: Offline Context

1. Open the app
2. Check console for: `"Initializing offline mode..."`
3. Header should show sync indicator (top-right)
4. Tap indicator → should open Sync Status screen

### Test 4: Create Offline Assessment

1. Turn off WiFi/Data
2. Create an assessment
3. Should see: "Saved Offline" message
4. Check sync indicator - should show badge with "1"
5. Turn on WiFi/Data
6. Should auto-sync within 2 seconds

---

## 🔧 Configuration

### Network Monitor Settings

**File**: `lib/offline/networkMonitor.ts`

```typescript
// No configuration needed - works out of the box
// Uses NetInfo with default settings
```

### Sync Service Settings

**File**: `lib/offline/syncService.ts`

```typescript
const MAX_RETRY_ATTEMPTS = 3;           // Change retry count
const RETRY_DELAY_MS = 2000;            // Change retry delay
const BATCH_SIZE = 5;                   // Change batch size
const EXPONENTIAL_BACKOFF_BASE = 2;     // Change backoff multiplier
```

### Storage Cleanup Settings

**File**: `lib/offline/offlineStorage.ts`

```typescript
// Auto-cleanup synced items after 7 days
await cleanupSyncedAssessments(7);  // Change days

// Manually clear all
await clearAllOfflineData();
```

---

## 🎨 UI Customization

### Sync Indicator Colors

**File**: `components/ui/SyncStatusIndicator.tsx`

```typescript
// Syncing: Orange (#f59e0b)
// Offline: Red (#ef4444)
// Synced: Green (#10b981)

// Change colors in getStatusInfo()
```

### Compact vs. Full Indicator

```tsx
// Compact (icon only)
<SyncStatusIndicator compact showLabel={false} />

// Full (icon + label)
<SyncStatusIndicator showLabel={true} />
```

---

## 📱 Platform-Specific Setup

### Android

**Permissions**: No extra permissions needed
- Network state: Automatic
- Storage: Automatic (app directory)

**ProGuard**: Add if using release build:
```
-keep class com.facebook.react.modules.network.** { *; }
```

### iOS

**Permissions**: Automatic
- Network: No Info.plist entry needed
- Storage: App directory (automatic)

**Background Sync**: Limited by iOS
- Works in foreground
- Limited background execution

### Web

**Limitations**:
- NetInfo has limited web support
- SQLite fallback to IndexedDB (via Expo)
- May need additional polyfills

**Recommendation**: Use native apps for best offline experience

---

## 🔍 Debugging

### Enable Debug Logs

Uncomment console.log statements in:
```
lib/offline/syncService.ts
lib/offline/offlineStorage.ts  
lib/db/sqlite.ts
```

### View Database Contents

```typescript
import { exportDatabaseAsJSON } from '@/lib/db/sqlite';

const data = await exportDatabaseAsJSON();
console.log(data);
```

### Check Sync Status

```typescript
import { getSyncStatus } from '@/lib/offline/syncService';

const status = await getSyncStatus();
console.log(status);
// { pending: 2, syncing: 0, failed: 1, needsSync: true }
```

### Monitor Network Changes

```typescript
import { subscribeToNetworkChanges } from '@/lib/offline/networkMonitor';

const unsubscribe = subscribeToNetworkChanges((status) => {
  console.log('Network changed:', status);
});

// Later: unsubscribe()
```

---

## ⚠️ Common Issues

### Issue: "Module not found: @react-native-community/netinfo"

**Solution:**
```bash
npm install @react-native-community/netinfo
# Then rebuild
npm start --clear
```

### Issue: "SQLite database failed to open"

**Solution:**
```bash
# Clear app data
# iOS: Delete app and reinstall
# Android: Clear app data in settings
# Web: Clear browser cache
```

### Issue: "Sync never starts"

**Check:**
1. Network connection (check sync status screen)
2. Console for errors
3. Firebase rules (see FIREBASE_SECURITY_RULES.md)
4. Storage quota in Firebase

### Issue: "Offline indicator always red"

**Check:**
1. NetInfo permissions
2. Console for "Network status changed" logs
3. Try toggling airplane mode
4. Restart app

---

## 🚀 Deployment Checklist

### Before Production

- [ ] Test offline mode on real devices
- [ ] Test auto-sync on reconnection
- [ ] Test with poor network (throttling)
- [ ] Test with 50+ offline assessments
- [ ] Test app restart with pending items
- [ ] Test photo upload failures
- [ ] Verify Firebase security rules
- [ ] Set up Firebase storage alerts
- [ ] Document for end users
- [ ] Train support team

### Firebase Setup

- [ ] Security rules deployed
- [ ] Storage rules configured
- [ ] Quota limits checked
- [ ] Monitoring enabled
- [ ] Backup strategy in place

### User Communication

- [ ] In-app tutorial
- [ ] Offline mode badge/icon
- [ ] Clear error messages
- [ ] Support documentation
- [ ] Known limitations documented

---

## 📊 Performance Benchmarks

**Expected Performance:**

| Metric | Value |
|--------|-------|
| Offline save time | < 500ms |
| Photo save time | < 1s |
| Database init | < 2s |
| Sync 1 assessment | 3-5s |
| Sync 10 assessments | 15-30s |
| Sync 50 assessments | 1-3 min |

**Memory Usage:**
- SQLite overhead: ~2-5MB
- Photo storage: Depends on photo size
- Context overhead: ~500KB

---

## 🔐 Security Checklist

- [ ] SQLite database in secure app directory
- [ ] Photos in app directory (not gallery)
- [ ] No sensitive data in console logs (production)
- [ ] Auto-cleanup of synced data
- [ ] Network requests over HTTPS
- [ ] Firebase security rules enforced
- [ ] User authentication required
- [ ] Data validation before sync

---

## 📞 Support & Resources

**Documentation:**
- `OFFLINE_MODE_GUIDE.md` - User guide
- `OFFLINE_MODE_SETUP.md` - This file
- `FIREBASE_SECURITY_RULES.md` - Security setup

**Code Reference:**
- `lib/offline/` - All offline functionality
- `lib/db/sqlite.ts` - Database setup
- `components/ui/SyncStatusIndicator.tsx` - UI component

**External Resources:**
- [Expo SQLite Docs](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [NetInfo Docs](https://github.com/react-native-netinfo/react-native-netinfo)
- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)

---

**✅ Setup Complete!**

You now have a fully functional offline mode with automatic synchronization. Test thoroughly and enjoy working offline!

