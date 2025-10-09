import { getDatabase } from '../db/sqlite';
import type { Assessment } from '../firestore';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Offline Storage Service
 * Manages local storage of assessments that couldn't be synced
 */

export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'synced';

export type OfflineAssessment = {
  id: string;
  assessmentData: Omit<Assessment, 'id'>;
  photos: OfflinePhoto[];
  createdAt: number;
  syncStatus: SyncStatus;
  errorMessage?: string;
  retryCount: number;
  lastRetryAt?: number;
};

export type OfflinePhoto = {
  id: string;
  localUri: string;
  remoteUri?: string;
  uploaded: boolean;
  fileSize?: number;
};

/**
 * Save an assessment for offline sync
 */
export async function saveOfflineAssessment(
  assessment: Omit<Assessment, 'id'>,
  photos: Array<{ id: string; uri: string }>
): Promise<string> {
  try {
    const db = await getDatabase();
    const assessmentId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save assessment to database
    await db.runAsync(
      `INSERT INTO pending_assessments 
       (id, assessment_data, photos, created_at, sync_status, retry_count) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        assessmentId,
        JSON.stringify(assessment),
        JSON.stringify(photos),
        Date.now(),
        'pending',
        0,
      ]
    );

    // Copy photos to permanent offline storage
    for (const photo of photos) {
      await saveOfflinePhoto(assessmentId, photo.id, photo.uri);
    }

    console.log('Saved offline assessment:', assessmentId);
    return assessmentId;
  } catch (error) {
    console.error('Error saving offline assessment:', error);
    throw new Error('Failed to save assessment offline');
  }
}

/**
 * Get all offline assessments
 */
export async function getOfflineAssessments(
  status?: SyncStatus
): Promise<OfflineAssessment[]> {
  try {
    const db = await getDatabase();
    
    let query = 'SELECT * FROM pending_assessments';
    const params: any[] = [];

    if (status) {
      query += ' WHERE sync_status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const rows = await db.getAllAsync(query, params);

    return rows.map((row: any) => ({
      id: row.id,
      assessmentData: JSON.parse(row.assessment_data),
      photos: JSON.parse(row.photos),
      createdAt: row.created_at,
      syncStatus: row.sync_status as SyncStatus,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      lastRetryAt: row.last_retry_at,
    }));
  } catch (error) {
    console.error('Error getting offline assessments:', error);
    return [];
  }
}

/**
 * Get a single offline assessment by ID
 */
export async function getOfflineAssessment(
  id: string
): Promise<OfflineAssessment | null> {
  try {
    const db = await getDatabase();
    
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM pending_assessments WHERE id = ?',
      [id]
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      assessmentData: JSON.parse(row.assessment_data),
      photos: JSON.parse(row.photos),
      createdAt: row.created_at,
      syncStatus: row.sync_status as SyncStatus,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      lastRetryAt: row.last_retry_at,
    };
  } catch (error) {
    console.error('Error getting offline assessment:', error);
    return null;
  }
}

/**
 * Update sync status of an offline assessment
 */
export async function updateSyncStatus(
  id: string,
  status: SyncStatus,
  errorMessage?: string
): Promise<void> {
  try {
    const db = await getDatabase();
    
    const updateData: any = {
      sync_status: status,
      error_message: errorMessage || null,
    };

    if (status === 'failed') {
      // Increment retry count and set retry timestamp
      await db.runAsync(
        `UPDATE pending_assessments 
         SET sync_status = ?, 
             error_message = ?, 
             retry_count = retry_count + 1,
             last_retry_at = ?
         WHERE id = ?`,
        [status, errorMessage || null, Date.now(), id]
      );
    } else {
      await db.runAsync(
        `UPDATE pending_assessments 
         SET sync_status = ?, error_message = ? 
         WHERE id = ?`,
        [status, errorMessage || null, id]
      );
    }

    console.log(`Updated sync status for ${id}: ${status}`);
  } catch (error) {
    console.error('Error updating sync status:', error);
    throw error;
  }
}

/**
 * Delete an offline assessment (after successful sync)
 */
export async function deleteOfflineAssessment(id: string): Promise<void> {
  try {
    const db = await getDatabase();
    
    // Get photos to delete files
    const photos = await db.getAllAsync<{ local_uri: string }>(
      'SELECT local_uri FROM offline_photos WHERE assessment_id = ?',
      [id]
    );

    // Delete photo files
    for (const photo of photos) {
      try {
        await FileSystem.deleteAsync(photo.local_uri, { idempotent: true });
      } catch (error) {
        console.warn('Error deleting photo file:', error);
      }
    }

    // Delete from database
    await db.runAsync('DELETE FROM offline_photos WHERE assessment_id = ?', [id]);
    await db.runAsync('DELETE FROM pending_assessments WHERE id = ?', [id]);

    console.log('Deleted offline assessment:', id);
  } catch (error) {
    console.error('Error deleting offline assessment:', error);
    throw error;
  }
}

/**
 * Get count of pending assessments
 */
export async function getPendingCount(): Promise<number> {
  try {
    const db = await getDatabase();
    
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pending_assessments 
       WHERE sync_status != 'synced'`
    );

    return result?.count || 0;
  } catch (error) {
    console.error('Error getting pending count:', error);
    return 0;
  }
}

/**
 * Save a photo to offline storage
 */
async function saveOfflinePhoto(
  assessmentId: string,
  photoId: string,
  sourceUri: string
): Promise<string> {
  try {
    // Create offline photos directory if it doesn't exist
    const offlineDir = `${FileSystem.documentDirectory}offline_photos/`;
    const dirInfo = await FileSystem.getInfoAsync(offlineDir);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(offlineDir, { intermediates: true });
    }

    // Generate unique filename
    const extension = sourceUri.split('.').pop() || 'jpg';
    const filename = `${assessmentId}_${photoId}.${extension}`;
    const destUri = `${offlineDir}${filename}`;

    // Copy photo to offline storage
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destUri,
    });

    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(destUri);
    const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : undefined;

    // Save to database
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO offline_photos 
       (id, assessment_id, local_uri, uploaded, created_at, file_size) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [photoId, assessmentId, destUri, 0, Date.now(), fileSize || 0]
    );

    console.log('Saved offline photo:', photoId);
    return destUri;
  } catch (error) {
    console.error('Error saving offline photo:', error);
    throw new Error('Failed to save photo offline');
  }
}

/**
 * Get offline photos for an assessment
 */
export async function getOfflinePhotos(
  assessmentId: string
): Promise<OfflinePhoto[]> {
  try {
    const db = await getDatabase();
    
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM offline_photos WHERE assessment_id = ? ORDER BY created_at',
      [assessmentId]
    );

    return rows.map((row) => ({
      id: row.id,
      localUri: row.local_uri,
      remoteUri: row.remote_uri,
      uploaded: Boolean(row.uploaded),
      fileSize: row.file_size,
    }));
  } catch (error) {
    console.error('Error getting offline photos:', error);
    return [];
  }
}

/**
 * Mark a photo as uploaded
 */
export async function markPhotoAsUploaded(
  photoId: string,
  remoteUri: string
): Promise<void> {
  try {
    const db = await getDatabase();
    
    await db.runAsync(
      'UPDATE offline_photos SET uploaded = 1, remote_uri = ? WHERE id = ?',
      [remoteUri, photoId]
    );

    console.log('Marked photo as uploaded:', photoId);
  } catch (error) {
    console.error('Error marking photo as uploaded:', error);
    throw error;
  }
}

/**
 * Clean up old synced assessments
 * Removes assessments that have been synced for more than specified days
 */
export async function cleanupSyncedAssessments(daysOld: number = 7): Promise<number> {
  try {
    const db = await getDatabase();
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

    // Get assessments to delete
    const toDelete = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM pending_assessments 
       WHERE sync_status = 'synced' AND created_at < ?`,
      [cutoffTime]
    );

    // Delete each one (this will also delete photos via deleteOfflineAssessment)
    for (const assessment of toDelete) {
      await deleteOfflineAssessment(assessment.id);
    }

    console.log(`Cleaned up ${toDelete.length} old synced assessments`);
    return toDelete.length;
  } catch (error) {
    console.error('Error cleaning up synced assessments:', error);
    return 0;
  }
}

/**
 * Reset retry count for failed assessments
 * Useful for manual retry after fixing issues
 */
export async function resetRetryCount(id: string): Promise<void> {
  try {
    const db = await getDatabase();
    
    await db.runAsync(
      `UPDATE pending_assessments 
       SET retry_count = 0, sync_status = 'pending', error_message = NULL 
       WHERE id = ?`,
      [id]
    );

    console.log('Reset retry count for:', id);
  } catch (error) {
    console.error('Error resetting retry count:', error);
    throw error;
  }
}

