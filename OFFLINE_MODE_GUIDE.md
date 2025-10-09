# 🔄 Offline Mode & Sync - User Guide

## Overview

The Asset Audit System now includes **full offline mode** with automatic synchronization. This allows field inspectors to work without internet connection and have their assessments automatically sync when connection is restored.

---

## 🎯 Key Features

### ✅ **Offline Assessment Creation**
- Create assessments without internet connection
- Photos stored locally on device
- All data saved in local SQLite database
- Automatic sync when connection restored

### ✅ **Automatic Sync**
- Auto-sync when network becomes available
- Auto-sync when app returns to foreground
- Batch processing (5 assessments at a time)
- Retry mechanism with exponential backoff

### ✅ **Sync Status Tracking**
- Real-time network status indicator
- Pending items count badge
- Sync progress tracking
- Detailed sync status screen

### ✅ **Error Handling**
- Graceful fallback to offline mode
- Failed sync retry mechanism
- Detailed error messages
- Manual retry options

---

## 📱 How to Use

### Creating Assessments Offline

1. **Work Normally**
   - No special action needed
   - Capture photos and create assessments as usual
   - If offline, data saves to local database

2. **Offline Confirmation**
   - When offline, you'll see:
     - "Saved Offline" message
     - Explanation that sync will happen automatically
     - Offline indicator in header (red cloud icon)

3. **Automatic Sync**
   - Connect to internet
   - Sync happens automatically within 2 seconds
   - Watch progress in sync indicator

### Monitoring Sync Status

1. **Header Indicator**
   - **Green cloud**: All synced ✅
   - **Orange cloud**: Syncing in progress ⏳
   - **Red cloud**: Offline ❌
   - **Badge number**: Pending items count

2. **Tap Indicator**
   - Tap the sync indicator to open **Sync Status** screen
   - View all pending and failed items
   - See network status and last sync time

3. **Sync Status Screen**
   - Network status and quality
   - Pending assessments list
   - Failed assessments with errors
   - Manual sync button
   - Retry failed button

### Manual Sync

1. **From Sync Status Screen**
   - Tap sync indicator in header
   - Tap "Sync Now" button
   - Watch progress

2. **From Settings**
   - Go to Settings
   - Scroll to "Data Management"
   - View storage metrics
   - Manual sync available

---

## 🧪 Testing Offline Mode

### Test Scenario 1: Basic Offline Creation

1. **Turn off WiFi and mobile data**
2. Create a new assessment:
   - Capture → Photo → Assess → Review → Save
3. **Observe**:
   - "Saved Offline" message appears
   - Red offline indicator in header
   - Pending count badge shows "1"
4. **Turn on internet**
5. **Observe**:
   - Auto-sync starts within 2 seconds
   - Orange syncing indicator
   - Badge disappears when complete
   - Green synced indicator

### Test Scenario 2: Multiple Offline Assessments

1. **Go offline**
2. **Create 5 assessments**
3. **Check Sync Status screen**:
   - Should show all 5 pending
4. **Go online**
5. **Observe**:
   - Batch sync (5 at a time)
   - Progress tracking
   - All sync successfully

### Test Scenario 3: Network Error During Upload

1. **Start online**
2. **Begin creating assessment**
3. **Turn off internet during review/save**
4. **Observe**:
   - Automatic fallback to offline save
   - Assessment saved locally
   - Will sync when reconnected

### Test Scenario 4: Failed Sync Retry

1. **Create assessment offline**
2. **Simulate network error** (very brief connection)
3. **Check Sync Status screen**:
   - Should show failed assessment
   - Error message displayed
   - Retry button available
4. **Tap "Retry"**
5. **Assessment syncs successfully**

---

## 🔧 Technical Details

### Database Structure

**SQLite Tables:**
- `pending_assessments`: Offline assessments awaiting sync
- `sync_queue`: Generic operation queue
- `offline_photos`: Photo metadata and local paths
- `metadata`: Database version and settings

**Storage Location:**
- Database: `assetaudit_offline.db`
- Photos: `DocumentDirectory/offline_photos/`

### Sync Algorithm

1. **Check network status**
2. **Get pending assessments** (max 5 at a time)
3. **For each assessment**:
   a. Mark as "syncing"
   b. Upload photos to Firebase Storage
   c. Create assessment in Firestore
   d. Mark as "synced"
   e. Delete local data
4. **Handle errors**:
   - Retry up to 3 times
   - Exponential backoff delay
   - Mark as "failed" after 3 attempts

### Auto-Sync Triggers

- ✅ Network connection restored
- ✅ App returns to foreground
- ✅ Manual sync button
- ✅ Good network quality detected
- ❌ Poor network quality (skip until better)

### Conflict Resolution

**Strategy**: Client wins (created_at timestamp based)
- Offline assessments keep their original timestamp
- No server-side conflicts (assessments are append-only)
- Custom ID generation prevents ID conflicts

---

## ⚙️ Configuration

### Sync Settings

```typescript
// lib/offline/syncService.ts

MAX_RETRY_ATTEMPTS = 3          // Max retry attempts for failed sync
RETRY_DELAY_MS = 2000           // Initial retry delay
BATCH_SIZE = 5                  // Assessments per batch
EXPONENTIAL_BACKOFF_BASE = 2    // Backoff multiplier
```

### Storage Settings

```typescript
// Auto-cleanup after 7 days
cleanupSyncedAssessments(7)
```

---

## 🐛 Troubleshooting

### Problem: Assessments Not Syncing

**Possible Causes:**
1. Device is offline
2. Poor network quality
3. Firebase permission error
4. Storage quota exceeded

**Solutions:**
1. Check network connection (wifi icon in header)
2. Wait for better connection (yellow = poor)
3. Check Sync Status screen for errors
4. Tap "Retry" on failed items
5. Check Firebase console for quota limits

### Problem: "Failed to Save Photo Offline"

**Possible Causes:**
1. Device storage full
2. Photo file permissions
3. File system error

**Solutions:**
1. Check device storage space
2. Clear old synced assessments (Settings → Clear My Data)
3. Restart app

### Problem: Duplicate Assessments

**Rare Edge Case:**
- Should not happen due to custom ID generation
- If it does:
  1. Check database directly
  2. Report bug with reproduction steps
  3. Manual cleanup via admin dashboard

---

## 📊 Monitoring & Analytics

### Database Statistics

Access via code:
```typescript
import { getDatabaseStats } from '@/lib/db/sqlite';

const stats = await getDatabaseStats();
// {
//   pendingAssessments: number,
//   syncQueueItems: number,
//   offlinePhotos: number
// }
```

### Export Database (Development Only)

```typescript
import { exportDatabaseAsJSON } from '@/lib/db/sqlite';

const json = await exportDatabaseAsJSON();
console.log(json);
```

---

## 🔐 Security Considerations

1. **Local Data Encryption**: Consider encrypting SQLite database for sensitive data
2. **Photo Storage**: Photos stored in app's document directory (not accessible by other apps)
3. **Auto-Delete**: Synced items auto-deleted after 7 days
4. **Manual Clear**: Users can clear all offline data via Settings

---

## 🚀 Performance Tips

1. **Batch Sync**: Don't create 100+ assessments offline at once
2. **Network Quality**: Wait for good connection before manual sync
3. **Photo Size**: Photos auto-compressed before upload
4. **Background Sync**: iOS/Android limitations - works best in foreground

---

## 📝 Best Practices

### For Field Inspectors

✅ **DO:**
- Create assessments normally
- Trust auto-sync
- Check sync status periodically
- Clear old synced data monthly

❌ **DON'T:**
- Force-close app during sync
- Delete photos from device before sync
- Uninstall app with pending items
- Manually edit database files

### For Administrators

✅ **DO:**
- Monitor sync status in admin dashboard
- Check for failed syncs weekly
- Educate users on offline mode
- Set up Firebase storage alerts

❌ **DON'T:**
- Disable offline mode globally
- Force sync on poor connections
- Modify sync queue directly
- Delete Firestore data without checking offline queue

---

## 🔮 Future Enhancements

Potential improvements:
- [ ] Background sync (iOS/Android limitations)
- [ ] Offline photo compression options
- [ ] Selective sync (choose which assessments)
- [ ] Sync scheduling (only at certain times)
- [ ] Offline assessment editing
- [ ] Conflict resolution UI
- [ ] Export offline database backup

---

## 📞 Support

**Issues?**
1. Check this guide first
2. Check Sync Status screen for errors
3. Check Firebase console for limits
4. Clear offline data and retry
5. Contact system administrator

**Report Bugs:**
Include:
- Device type and OS version
- Network conditions
- Error messages from Sync Status screen
- Steps to reproduce
- Screenshot of error

---

## 📜 License & Credits

**Offline Mode Implementation**
- Author: Asset Audit Development Team
- Version: 1.0.0
- Date: 2025

**Dependencies:**
- expo-sqlite
- @react-native-community/netinfo
- @react-native-async-storage/async-storage

---

**🎉 You're all set! Enjoy working offline!**

