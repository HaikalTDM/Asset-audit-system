import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getPendingCount } from './db';
import { resetFailedToPending, syncPendingAssessments, type SyncResult } from './sync';

type OfflineContextType = {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  refreshPendingCount: () => Promise<void>;
  manualSync: () => Promise<SyncResult>;
  retryAllFailed: () => Promise<SyncResult>;
};

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPendingCount = async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  };

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    refreshPendingCount();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      manualSync();
    }
  }, [isOnline, pendingCount]);

  const manualSync = async () => {
    if (!isOnline) {
      return { success: false, syncedCount: 0, failedCount: 0, errors: [{ assessmentId: 'network', error: 'Offline' }] };
    }
    try {
      setIsSyncing(true);
      const result = await syncPendingAssessments();
      await refreshPendingCount();
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  const retryAllFailed = async () => {
    await resetFailedToPending();
    return manualSync();
  };

  const value = useMemo(
    () => ({ isOnline, pendingCount, isSyncing, refreshPendingCount, manualSync, retryAllFailed }),
    [isOnline, pendingCount, isSyncing]
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
  return ctx;
}
