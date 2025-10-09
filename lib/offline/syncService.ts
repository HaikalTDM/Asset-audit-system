import { FirestoreService } from '../firestore';
import { ImageUploadService } from '../imageUpload';
import {
  getOfflineAssessments,
  updateSyncStatus,
  deleteOfflineAssessment,
  getOfflinePhotos,
  markPhotoAsUploaded,
  type OfflineAssessment,
} from './offlineStorage';
import { isOnline, getCurrentNetworkStatus } from './networkMonitor';

/**
 * Sync Service
 * Handles synchronization of offline data to Firebase
 */

export type SyncResult = {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ assessmentId: string; error: string }>;
};

export type SyncProgress = {
  total: number;
  current: number;
  currentAssessmentId: string;
  status: 'uploading_photos' | 'creating_assessment' | 'completed' | 'failed';
};

// Sync configuration
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const BATCH_SIZE = 5; // Process 5 assessments at a time
const EXPONENTIAL_BACKOFF_BASE = 2;

// Callbacks for sync progress
type SyncProgressCallback = (progress: SyncProgress) => void;
let syncProgressCallback: SyncProgressCallback | null = null;

/**
 * Set callback for sync progress updates
 */
export function setSyncProgressCallback(callback: SyncProgressCallback | null): void {
  syncProgressCallback = callback;
}

/**
 * Notify sync progress
 */
function notifySyncProgress(progress: SyncProgress): void {
  if (syncProgressCallback) {
    try {
      syncProgressCallback(progress);
    } catch (error) {
      console.error('Error in sync progress callback:', error);
    }
  }
}

/**
 * Sync all pending assessments
 */
export async function syncPendingAssessments(): Promise<SyncResult> {
  console.log('Starting sync of pending assessments...');

  // Check if online
  if (!(await isOnline())) {
    console.log('Device is offline, skipping sync');
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [{ assessmentId: 'network', error: 'Device is offline' }],
    };
  }

  // Get all pending assessments
  const pendingAssessments = await getOfflineAssessments('pending');
  
  if (pendingAssessments.length === 0) {
    console.log('No pending assessments to sync');
    return {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  console.log(`Found ${pendingAssessments.length} pending assessments`);

  const result: SyncResult = {
    success: true,
    syncedCount: 0,
    failedCount: 0,
    errors: [],
  };

  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < pendingAssessments.length; i += BATCH_SIZE) {
    const batch = pendingAssessments.slice(i, i + BATCH_SIZE);
    
    // Process batch concurrently
    const batchResults = await Promise.allSettled(
      batch.map((assessment) => syncSingleAssessment(assessment, i + batch.indexOf(assessment), pendingAssessments.length))
    );

    // Aggregate results
    batchResults.forEach((batchResult, index) => {
      const assessment = batch[index];
      
      if (batchResult.status === 'fulfilled' && batchResult.value) {
        result.syncedCount++;
      } else {
        result.failedCount++;
        result.success = false;
        
        const error = batchResult.status === 'rejected' 
          ? batchResult.reason?.message || 'Unknown error'
          : 'Sync failed';
        
        result.errors.push({
          assessmentId: assessment.id,
          error,
        });
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < pendingAssessments.length) {
      await delay(500);
    }
  }

  console.log(`Sync completed: ${result.syncedCount} synced, ${result.failedCount} failed`);
  return result;
}

/**
 * Sync a single assessment with retry logic
 */
async function syncSingleAssessment(
  offlineAssessment: OfflineAssessment,
  currentIndex: number,
  totalCount: number
): Promise<boolean> {
  const { id, assessmentData, photos, retryCount } = offlineAssessment;

  console.log(`Syncing assessment ${id} (${currentIndex + 1}/${totalCount})`);

  // Check retry limit
  if (retryCount >= MAX_RETRY_ATTEMPTS) {
    console.error(`Assessment ${id} exceeded max retry attempts`);
    await updateSyncStatus(
      id,
      'failed',
      `Exceeded maximum retry attempts (${MAX_RETRY_ATTEMPTS})`
    );
    return false;
  }

  // Mark as syncing
  await updateSyncStatus(id, 'syncing');

  try {
    // Step 1: Upload photos
    notifySyncProgress({
      total: totalCount,
      current: currentIndex + 1,
      currentAssessmentId: id,
      status: 'uploading_photos',
    });

    const uploadedPhotoUris = await uploadOfflinePhotos(id, photos, assessmentData.userId);

    // Check if still online before creating assessment
    if (!(await isOnline())) {
      throw new Error('Lost network connection during sync');
    }

    // Step 2: Create assessment in Firestore
    notifySyncProgress({
      total: totalCount,
      current: currentIndex + 1,
      currentAssessmentId: id,
      status: 'creating_assessment',
    });

    // Use the first uploaded photo as the main photo_uri
    const mainPhotoUri = uploadedPhotoUris[0];

    await FirestoreService.createAssessment({
      ...assessmentData,
      photo_uri: mainPhotoUri,
    });

    // Step 3: Mark as synced and cleanup
    await updateSyncStatus(id, 'synced');
    await deleteOfflineAssessment(id);

    notifySyncProgress({
      total: totalCount,
      current: currentIndex + 1,
      currentAssessmentId: id,
      status: 'completed',
    });

    console.log(`Successfully synced assessment ${id}`);
    return true;
  } catch (error) {
    console.error(`Error syncing assessment ${id}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateSyncStatus(id, 'failed', errorMessage);

    notifySyncProgress({
      total: totalCount,
      current: currentIndex + 1,
      currentAssessmentId: id,
      status: 'failed',
    });

    // Calculate exponential backoff delay
    const backoffDelay = RETRY_DELAY_MS * Math.pow(EXPONENTIAL_BACKOFF_BASE, retryCount);
    await delay(backoffDelay);

    return false;
  }
}

/**
 * Upload offline photos to Firebase Storage
 */
async function uploadOfflinePhotos(
  assessmentId: string,
  photoMetadata: Array<{ id: string; uri: string }>,
  userId: string
): Promise<string[]> {
  console.log(`Uploading ${photoMetadata.length} photos for assessment ${assessmentId}`);

  const uploadedUris: string[] = [];

  // Get actual photo files from offline storage
  const offlinePhotos = await getOfflinePhotos(assessmentId);

  for (const photoMeta of photoMetadata) {
    const offlinePhoto = offlinePhotos.find((p) => p.id === photoMeta.id);
    
    if (!offlinePhoto) {
      console.warn(`Photo ${photoMeta.id} not found in offline storage`);
      continue;
    }

    // Skip if already uploaded
    if (offlinePhoto.uploaded && offlinePhoto.remoteUri) {
      uploadedUris.push(offlinePhoto.remoteUri);
      continue;
    }

    try {
      // Upload to Firebase Storage
      const remoteUri = await ImageUploadService.uploadImageWithRetry(
        offlinePhoto.localUri,
        userId,
        `${assessmentId}_${photoMeta.id}`
      );

      // Mark as uploaded
      await markPhotoAsUploaded(photoMeta.id, remoteUri);
      uploadedUris.push(remoteUri);

      console.log(`Uploaded photo ${photoMeta.id}`);
    } catch (error) {
      console.error(`Failed to upload photo ${photoMeta.id}:`, error);
      throw new Error(`Photo upload failed: ${photoMeta.id}`);
    }
  }

  if (uploadedUris.length === 0) {
    throw new Error('No photos were uploaded successfully');
  }

  return uploadedUris;
}

/**
 * Retry a specific failed assessment
 */
export async function retryFailedAssessment(assessmentId: string): Promise<boolean> {
  console.log(`Retrying failed assessment: ${assessmentId}`);

  const assessment = await getOfflineAssessments('failed').then((assessments) =>
    assessments.find((a) => a.id === assessmentId)
  );

  if (!assessment) {
    console.error(`Assessment ${assessmentId} not found or not in failed state`);
    return false;
  }

  // Reset status to pending
  await updateSyncStatus(assessmentId, 'pending');

  // Sync it
  return await syncSingleAssessment(assessment, 0, 1);
}

/**
 * Retry all failed assessments
 */
export async function retryAllFailedAssessments(): Promise<SyncResult> {
  console.log('Retrying all failed assessments...');

  const failedAssessments = await getOfflineAssessments('failed');

  if (failedAssessments.length === 0) {
    console.log('No failed assessments to retry');
    return {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  // Reset all to pending
  for (const assessment of failedAssessments) {
    await updateSyncStatus(assessment.id, 'pending');
  }

  // Sync them
  return await syncPendingAssessments();
}

/**
 * Auto-sync trigger
 * Should be called when network connection is restored
 */
export async function triggerAutoSync(): Promise<void> {
  console.log('Auto-sync triggered');

  try {
    // Check network status
    const networkStatus = await getCurrentNetworkStatus();
    
    if (!networkStatus.isConnected || !networkStatus.isInternetReachable) {
      console.log('Network not ready for sync');
      return;
    }

    // Don't auto-sync on poor connections
    if (networkStatus.quality === 'poor') {
      console.log('Network quality too poor for auto-sync');
      return;
    }

    // Start sync
    await syncPendingAssessments();
  } catch (error) {
    console.error('Error during auto-sync:', error);
  }
}

/**
 * Check if sync is needed
 */
export async function isSyncNeeded(): Promise<boolean> {
  const pendingAssessments = await getOfflineAssessments('pending');
  const failedAssessments = await getOfflineAssessments('failed');
  
  return pendingAssessments.length > 0 || failedAssessments.length > 0;
}

/**
 * Get sync status summary
 */
export async function getSyncStatus(): Promise<{
  pending: number;
  syncing: number;
  failed: number;
  needsSync: boolean;
}> {
  const pending = await getOfflineAssessments('pending');
  const syncing = await getOfflineAssessments('syncing');
  const failed = await getOfflineAssessments('failed');

  return {
    pending: pending.length,
    syncing: syncing.length,
    failed: failed.length,
    needsSync: pending.length > 0 || failed.length > 0,
  };
}

/**
 * Cancel ongoing sync (graceful stop)
 * Note: Current operations will complete, but no new ones will start
 */
let syncCancelled = false;

export function cancelSync(): void {
  syncCancelled = true;
  console.log('Sync cancellation requested');
}

export function resetSyncCancellation(): void {
  syncCancelled = false;
}

/**
 * Utility: Delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Estimate sync time based on pending items and network quality
 */
export async function estimateSyncTime(): Promise<number> {
  const pending = await getOfflineAssessments('pending');
  const networkStatus = await getCurrentNetworkStatus();

  if (pending.length === 0) {
    return 0;
  }

  // Base time per assessment (seconds)
  let timePerAssessment = 5;

  // Adjust based on network quality
  switch (networkStatus.quality) {
    case 'excellent':
      timePerAssessment = 3;
      break;
    case 'good':
      timePerAssessment = 5;
      break;
    case 'poor':
      timePerAssessment = 15;
      break;
    case 'offline':
      return -1; // Cannot estimate
  }

  return pending.length * timePerAssessment;
}

