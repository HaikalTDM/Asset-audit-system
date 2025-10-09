import { getDatabase } from '../db/sqlite';

/**
 * Sync Queue Management
 * Generic queue for any operations that need to be synced
 */

export type QueueOperation = 'create' | 'update' | 'delete';
export type ResourceType = 'assessment' | 'user' | 'photo';
export type QueueStatus = 'pending' | 'syncing' | 'failed' | 'synced';

export type QueueItem = {
  id: string;
  operation: QueueOperation;
  resourceType: ResourceType;
  resourceId: string;
  data: any;
  createdAt: number;
  syncStatus: QueueStatus;
  errorMessage?: string;
  retryCount: number;
  priority: number; // Higher = more important
};

/**
 * Add item to sync queue
 */
export async function addToSyncQueue(
  operation: QueueOperation,
  resourceType: ResourceType,
  resourceId: string,
  data: any,
  priority: number = 0
): Promise<string> {
  try {
    const db = await getDatabase();
    const queueId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.runAsync(
      `INSERT INTO sync_queue 
       (id, operation, resource_type, resource_id, data, created_at, sync_status, retry_count, priority) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        queueId,
        operation,
        resourceType,
        resourceId,
        JSON.stringify(data),
        Date.now(),
        'pending',
        0,
        priority,
      ]
    );

    console.log('Added to sync queue:', queueId);
    return queueId;
  } catch (error) {
    console.error('Error adding to sync queue:', error);
    throw new Error('Failed to add to sync queue');
  }
}

/**
 * Get next items to sync (prioritized)
 */
export async function getNextSyncItems(limit: number = 5): Promise<QueueItem[]> {
  try {
    const db = await getDatabase();

    const rows = await db.getAllAsync<any>(
      `SELECT * FROM sync_queue 
       WHERE sync_status = 'pending' 
       ORDER BY priority DESC, created_at ASC 
       LIMIT ?`,
      [limit]
    );

    return rows.map((row) => ({
      id: row.id,
      operation: row.operation as QueueOperation,
      resourceType: row.resource_type as ResourceType,
      resourceId: row.resource_id,
      data: JSON.parse(row.data),
      createdAt: row.created_at,
      syncStatus: row.sync_status as QueueStatus,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      priority: row.priority,
    }));
  } catch (error) {
    console.error('Error getting next sync items:', error);
    return [];
  }
}

/**
 * Get all failed sync items
 */
export async function getFailedSyncItems(): Promise<QueueItem[]> {
  try {
    const db = await getDatabase();

    const rows = await db.getAllAsync<any>(
      `SELECT * FROM sync_queue 
       WHERE sync_status = 'failed' 
       ORDER BY created_at DESC`
    );

    return rows.map((row) => ({
      id: row.id,
      operation: row.operation as QueueOperation,
      resourceType: row.resource_type as ResourceType,
      resourceId: row.resource_id,
      data: JSON.parse(row.data),
      createdAt: row.created_at,
      syncStatus: row.sync_status as QueueStatus,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      priority: row.priority,
    }));
  } catch (error) {
    console.error('Error getting failed sync items:', error);
    return [];
  }
}

/**
 * Update queue item status
 */
export async function updateQueueItemStatus(
  id: string,
  status: QueueStatus,
  errorMessage?: string
): Promise<void> {
  try {
    const db = await getDatabase();

    if (status === 'failed') {
      await db.runAsync(
        `UPDATE sync_queue 
         SET sync_status = ?, 
             error_message = ?, 
             retry_count = retry_count + 1 
         WHERE id = ?`,
        [status, errorMessage || null, id]
      );
    } else {
      await db.runAsync(
        `UPDATE sync_queue 
         SET sync_status = ?, 
             error_message = ? 
         WHERE id = ?`,
        [status, errorMessage || null, id]
      );
    }

    console.log(`Updated queue item ${id} status: ${status}`);
  } catch (error) {
    console.error('Error updating queue item status:', error);
    throw error;
  }
}

/**
 * Remove item from sync queue
 */
export async function removeFromSyncQueue(id: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
    console.log('Removed from sync queue:', id);
  } catch (error) {
    console.error('Error removing from sync queue:', error);
    throw error;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  syncing: number;
  failed: number;
  total: number;
}> {
  try {
    const db = await getDatabase();

    const pending = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE sync_status = 'pending'`
    );

    const syncing = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE sync_status = 'syncing'`
    );

    const failed = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE sync_status = 'failed'`
    );

    const total = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE sync_status != 'synced'`
    );

    return {
      pending: pending?.count || 0,
      syncing: syncing?.count || 0,
      failed: failed?.count || 0,
      total: total?.count || 0,
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return { pending: 0, syncing: 0, failed: 0, total: 0 };
  }
}

/**
 * Retry a failed queue item
 */
export async function retryQueueItem(id: string): Promise<void> {
  try {
    const db = await getDatabase();
    
    await db.runAsync(
      `UPDATE sync_queue 
       SET sync_status = 'pending', 
           error_message = NULL 
       WHERE id = ?`,
      [id]
    );

    console.log('Retrying queue item:', id);
  } catch (error) {
    console.error('Error retrying queue item:', error);
    throw error;
  }
}

/**
 * Retry all failed queue items
 */
export async function retryAllFailed(): Promise<number> {
  try {
    const db = await getDatabase();
    
    const result = await db.runAsync(
      `UPDATE sync_queue 
       SET sync_status = 'pending', 
           error_message = NULL 
       WHERE sync_status = 'failed'`
    );

    const count = result.changes || 0;
    console.log(`Retrying ${count} failed queue items`);
    return count;
  } catch (error) {
    console.error('Error retrying all failed:', error);
    return 0;
  }
}

/**
 * Clear synced items older than specified days
 */
export async function clearOldSyncedItems(daysOld: number = 7): Promise<number> {
  try {
    const db = await getDatabase();
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

    const result = await db.runAsync(
      `DELETE FROM sync_queue 
       WHERE sync_status = 'synced' AND created_at < ?`,
      [cutoffTime]
    );

    const count = result.changes || 0;
    console.log(`Cleared ${count} old synced items`);
    return count;
  } catch (error) {
    console.error('Error clearing old synced items:', error);
    return 0;
  }
}

/**
 * Check if a specific resource is in the queue
 */
export async function isInQueue(
  resourceType: ResourceType,
  resourceId: string
): Promise<boolean> {
  try {
    const db = await getDatabase();
    
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue 
       WHERE resource_type = ? AND resource_id = ? AND sync_status != 'synced'`,
      [resourceType, resourceId]
    );

    return (result?.count || 0) > 0;
  } catch (error) {
    console.error('Error checking if in queue:', error);
    return false;
  }
}

/**
 * Get queue items by resource type
 */
export async function getQueueItemsByType(
  resourceType: ResourceType
): Promise<QueueItem[]> {
  try {
    const db = await getDatabase();

    const rows = await db.getAllAsync<any>(
      `SELECT * FROM sync_queue 
       WHERE resource_type = ? AND sync_status != 'synced' 
       ORDER BY priority DESC, created_at ASC`,
      [resourceType]
    );

    return rows.map((row) => ({
      id: row.id,
      operation: row.operation as QueueOperation,
      resourceType: row.resource_type as ResourceType,
      resourceId: row.resource_id,
      data: JSON.parse(row.data),
      createdAt: row.created_at,
      syncStatus: row.sync_status as QueueStatus,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      priority: row.priority,
    }));
  } catch (error) {
    console.error('Error getting queue items by type:', error);
    return [];
  }
}

/**
 * Clear all queue items (for testing/debugging)
 */
export async function clearAllQueueItems(): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM sync_queue');
    console.log('Cleared all queue items');
  } catch (error) {
    console.error('Error clearing all queue items:', error);
    throw error;
  }
}

