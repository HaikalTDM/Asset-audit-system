import * as SQLite from 'expo-sqlite';

/**
 * SQLite Database Manager for Offline Mode
 * Handles local storage of assessments and sync queue
 */

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

// Database version for migrations
const DATABASE_VERSION = 1;

/**
 * Initialize the SQLite database
 * Creates tables if they don't exist
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    if (db) {
      return db;
    }

    // Open or create database
    db = await SQLite.openDatabaseAsync('assetaudit_offline.db');

    console.log('SQLite database opened successfully');

    // Create tables
    await createTables(db);

    // Run migrations if needed
    await runMigrations(db);

    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw new Error('Failed to initialize offline database');
  }
}

/**
 * Get the database instance
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    return await initDatabase();
  }
  return db;
}

/**
 * Create database tables
 */
async function createTables(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Table for pending assessments
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_assessments (
        id TEXT PRIMARY KEY,
        assessment_data TEXT NOT NULL,
        photos TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_retry_at INTEGER
      );
    `);

    // Table for sync queue (generic operations)
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        operation TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        priority INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Table for offline photos
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_photos (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL,
        local_uri TEXT NOT NULL,
        remote_uri TEXT,
        uploaded INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        file_size INTEGER,
        FOREIGN KEY (assessment_id) REFERENCES pending_assessments(id)
      );
    `);

    // Table for metadata and settings
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create indexes for performance
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_pending_assessments_status 
      ON pending_assessments(sync_status);
    `);

    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status 
      ON sync_queue(sync_status, priority DESC);
    `);

    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_offline_photos_assessment 
      ON offline_photos(assessment_id);
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

/**
 * Run database migrations
 */
async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Get current version
    const result = await database.getFirstAsync<{ value: string }>(
      'SELECT value FROM metadata WHERE key = ?',
      ['db_version']
    );

    const currentVersion = result ? parseInt(result.value, 10) : 0;

    if (currentVersion < DATABASE_VERSION) {
      console.log(`Running migrations from version ${currentVersion} to ${DATABASE_VERSION}`);

      // Future migrations will go here
      // if (currentVersion < 2) {
      //   await migration_v2(database);
      // }

      // Update version
      await database.runAsync(
        'INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)',
        ['db_version', DATABASE_VERSION.toString(), Date.now()]
      );

      console.log('Database migrations completed');
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

/**
 * Clear all offline data (for testing/debugging)
 */
export async function clearAllOfflineData(): Promise<void> {
  try {
    const database = await getDatabase();
    
    await database.execAsync('DELETE FROM pending_assessments;');
    await database.execAsync('DELETE FROM sync_queue;');
    await database.execAsync('DELETE FROM offline_photos;');
    
    console.log('All offline data cleared');
  } catch (error) {
    console.error('Error clearing offline data:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  pendingAssessments: number;
  syncQueueItems: number;
  offlinePhotos: number;
  totalSize?: number;
}> {
  try {
    const database = await getDatabase();

    const pending = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM pending_assessments WHERE sync_status != ?',
      ['synced']
    );

    const queue = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue WHERE sync_status != ?',
      ['synced']
    );

    const photos = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM offline_photos WHERE uploaded = 0'
    );

    return {
      pendingAssessments: pending?.count || 0,
      syncQueueItems: queue?.count || 0,
      offlinePhotos: photos?.count || 0,
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {
      pendingAssessments: 0,
      syncQueueItems: 0,
      offlinePhotos: 0,
    };
  }
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  try {
    if (db) {
      await db.closeAsync();
      db = null;
      console.log('Database closed');
    }
  } catch (error) {
    console.error('Error closing database:', error);
  }
}

/**
 * Export database for debugging (development only)
 */
export async function exportDatabaseAsJSON(): Promise<string> {
  try {
    const database = await getDatabase();

    const pendingAssessments = await database.getAllAsync('SELECT * FROM pending_assessments');
    const syncQueue = await database.getAllAsync('SELECT * FROM sync_queue');
    const offlinePhotos = await database.getAllAsync('SELECT * FROM offline_photos');

    return JSON.stringify({
      pendingAssessments,
      syncQueue,
      offlinePhotos,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  } catch (error) {
    console.error('Error exporting database:', error);
    throw error;
  }
}

