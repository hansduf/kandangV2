'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSyncQueue, processSyncQueue, getLastSyncedAt, SyncQueueItem } from '@/lib/syncQueue';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  queue: SyncQueueItem[];
  syncNow: () => Promise<void>;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (open: boolean) => void;
  refreshQueue: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedState] = useState<string | null>(null);
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  const refreshQueue = useCallback(() => {
    const q = getSyncQueue();
    setQueue(q);
    setPendingCount(q.filter((item) => item.status !== 'synced').length);
    setLastSyncedState(getLastSyncedAt());
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      refreshQueue();
      return;
    }

    setIsSyncing(true);
    try {
      await processSyncQueue();
    } catch (err) {
      console.error('Error in syncNow:', err);
    } finally {
      setIsSyncing(false);
      refreshQueue();
    }
  }, [isSyncing, refreshQueue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    refreshQueue();

    const handleOnline = () => {
      setIsOnline(true);
      // Begitu tersambung kembali ke internet, jalankan auto-sync!
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshQueue();
    };

    const handleQueueChange = () => {
      refreshQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-queue-updated', handleQueueChange);

    // Polling periodik setiap 30 detik untuk sync jika ada pending
    const interval = setInterval(() => {
      if (navigator.onLine && getSyncQueue().length > 0) {
        syncNow();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-queue-updated', handleQueueChange);
      clearInterval(interval);
    };
  }, [syncNow, refreshQueue]);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        lastSyncedAt,
        queue,
        syncNow,
        isSyncModalOpen,
        setIsSyncModalOpen,
        refreshQueue,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
