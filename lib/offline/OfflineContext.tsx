import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDatabase } from '../db/sqlite';
import {
  initNetworkMonitoring,
  useNetworkStatus,
  subscribeToNetworkChanges,
  type NetworkStatus,
} from './networkMonitor';
import {
  syncPendingAssessments,
  retryFailedAssessment,
  retryAllFailedAssessments,
  getSyncStatus,
  triggerAutoSync,
  setSyncProgressCallback,
  type SyncResult,
  type SyncProgress,
} from './syncService';
import { getPendingCount, cleanupSyncedAssessments } from './offlineStorage';

/**
 * Offline Context
 * Manages offline mode state and synchronization
 */

type OfflineContextType = {
  // Network status
  isOnline: boolean;
  networkQuality: NetworkStatus['quality'];
  networkStatus: NetworkStatus;

  // Sync status
  pendingCount: number;
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
  lastSyncTime: number | null;
  syncError: string | null;

  // Actions
  manualSync: () => Promise<SyncResult>;
  retrySync: (assessmentId?: string) => Promise<void>;
  refreshPendingCount: () => Promise<void>;

  // Offline mode
  isOfflineMode: boolean;
  enableOfflineMode: () => void;
  disableOfflineMode: () => void;
};

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

/**
 * Hook to use offline context
 */
export function useOffline(): OfflineContextType {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}

/**
 * Offline Provider Component
 */
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  // Network status
  const networkStatus = useNetworkStatus();
  const isOnline = networkStatus.isConnected && networkStatus.isInternetReachable === true;

  // Sync state
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Offline mode (manual override)
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  /**
   * Initialize database and network monitoring
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        console.log('Initializing offline mode...');

        // Initialize SQLite database
        await initDatabase();
        console.log('SQLite database initialized');

        // Initialize network monitoring
        const unsubscribe = initNetworkMonitoring();

        // Load last sync time
        const lastSync = await AsyncStorage.getItem('lastSyncTime');
        if (lastSync && mounted) {
          setLastSyncTime(parseInt(lastSync, 10));
        }

        // Load pending count
        await refreshPendingCount();

        // Cleanup old synced assessments
        await cleanupSyncedAssessments(7);

        return unsubscribe;
      } catch (error) {
        console.error('Error initializing offline mode:', error);
      }
    };

    const unsubscribePromise = initialize();

    return () => {
      mounted = false;
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  }, []);

  /**
   * Refresh pending count
   */
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
      
      // Persist to AsyncStorage for quick access
      await AsyncStorage.setItem('pendingCount', count.toString());
    } catch (error) {
      console.error('Error refreshing pending count:', error);
    }
  }, []);

  /**
   * Auto-sync when network becomes available
   */
  useEffect(() => {
    if (isOnline && !isSyncing && pendingCount > 0 && !isOfflineMode) {
      console.log('Network available, triggering auto-sync...');
      
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        triggerAutoSync().then(() => {
          refreshPendingCount();
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, isSyncing, pendingCount, isOfflineMode, refreshPendingCount]);

  /**
   * Sync on app foreground (if needed)
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isOnline && pendingCount > 0 && !isOfflineMode) {
        console.log('App foregrounded, checking for pending sync...');
        triggerAutoSync().then(() => {
          refreshPendingCount();
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isOnline, pendingCount, isOfflineMode, refreshPendingCount]);

  /**
   * Set up sync progress callback
   */
  useEffect(() => {
    setSyncProgressCallback((progress: SyncProgress) => {
      setSyncProgress(progress);
    });

    return () => {
      setSyncProgressCallback(null);
    };
  }, []);

  /**
   * Manual sync trigger
   */
  const manualSync = useCallback(async (): Promise<SyncResult> => {
    if (isSyncing) {
      console.log('Sync already in progress');
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ assessmentId: 'sync', error: 'Sync already in progress' }],
      };
    }

    if (!isOnline) {
      console.log('Device is offline');
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ assessmentId: 'network', error: 'Device is offline' }],
      };
    }

    try {
      setIsSyncing(true);
      setSyncError(null);

      const result = await syncPendingAssessments();

      // Update last sync time
      const now = Date.now();
      setLastSyncTime(now);
      await AsyncStorage.setItem('lastSyncTime', now.toString());

      // Refresh pending count
      await refreshPendingCount();

      if (!result.success && result.errors.length > 0) {
        setSyncError(result.errors[0].error);
      }

      return result;
    } catch (error) {
      console.error('Error during manual sync:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(errorMessage);
      
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ assessmentId: 'sync', error: errorMessage }],
      };
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [isSyncing, isOnline, refreshPendingCount]);

  /**
   * Retry sync
   */
  const retrySync = useCallback(async (assessmentId?: string): Promise<void> => {
    if (isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    if (!isOnline) {
      console.log('Device is offline');
      return;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);

      if (assessmentId) {
        // Retry specific assessment
        await retryFailedAssessment(assessmentId);
      } else {
        // Retry all failed
        await retryAllFailedAssessments();
      }

      // Update last sync time
      const now = Date.now();
      setLastSyncTime(now);
      await AsyncStorage.setItem('lastSyncTime', now.toString());

      // Refresh pending count
      await refreshPendingCount();
    } catch (error) {
      console.error('Error during retry sync:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(errorMessage);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [isSyncing, isOnline, refreshPendingCount]);

  /**
   * Enable offline mode (prevents auto-sync)
   */
  const enableOfflineMode = useCallback(() => {
    setIsOfflineMode(true);
    AsyncStorage.setItem('offlineMode', 'true');
    console.log('Offline mode enabled');
  }, []);

  /**
   * Disable offline mode (allows auto-sync)
   */
  const disableOfflineMode = useCallback(() => {
    setIsOfflineMode(false);
    AsyncStorage.setItem('offlineMode', 'false');
    console.log('Offline mode disabled');
    
    // Trigger sync if there are pending items
    if (isOnline && pendingCount > 0) {
      triggerAutoSync().then(() => {
        refreshPendingCount();
      });
    }
  }, [isOnline, pendingCount, refreshPendingCount]);

  /**
   * Load offline mode preference
   */
  useEffect(() => {
    AsyncStorage.getItem('offlineMode').then((value) => {
      if (value === 'true') {
        setIsOfflineMode(true);
      }
    });
  }, []);

  const value: OfflineContextType = {
    // Network status
    isOnline,
    networkQuality: networkStatus.quality,
    networkStatus,

    // Sync status
    pendingCount,
    isSyncing,
    syncProgress,
    lastSyncTime,
    syncError,

    // Actions
    manualSync,
    retrySync,
    refreshPendingCount,

    // Offline mode
    isOfflineMode,
    enableOfflineMode,
    disableOfflineMode,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

/**
 * Hook to check if device is in offline mode
 */
export function useIsOffline(): boolean {
  const { isOnline } = useOffline();
  return !isOnline;
}

/**
 * Hook to get pending sync count
 */
export function usePendingCount(): number {
  const { pendingCount } = useOffline();
  return pendingCount;
}

/**
 * Hook to check if sync is in progress
 */
export function useIsSyncing(): boolean {
  const { isSyncing } = useOffline();
  return isSyncing;
}

