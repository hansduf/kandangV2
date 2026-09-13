import { supabase, isConfigured } from './supabase';
import { DailyRecord, HealthRecord } from '@/types/database';

export type SyncItemType = 'DAILY_RECORD' | 'HEALTH_RECORD' | 'TASK_COMPLETION' | 'FLOCK_UPDATE';

export interface SyncQueueItem {
  id: string;
  type: SyncItemType;
  payload: any;
  authorId?: string;
  authorName?: string;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  errorMessage?: string;
  retryCount: number;
}

const STORAGE_KEY = 'kandang_sync_queue';
const LAST_SYNC_KEY = 'kandang_last_synced_at';

export function getSyncQueue(): SyncQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading sync queue:', err);
    return [];
  }
}

export function saveSyncQueue(queue: SyncQueueItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Error saving sync queue:', err);
  }
}

export function getLastSyncedAt(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_SYNC_KEY);
}

export function setLastSyncedAt(dateIso: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_SYNC_KEY, dateIso);
}

export function addToSyncQueue(item: {
  type: SyncItemType;
  payload: any;
  authorId?: string;
  authorName?: string;
}): SyncQueueItem {
  const queue = getSyncQueue();
  const newItem: SyncQueueItem = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: item.type,
    payload: item.payload,
    authorId: item.authorId,
    authorName: item.authorName,
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };

  // Cek apakah item serupa yang masih pending sudah ada di antrean untuk di-merge
  if (newItem.type === 'DAILY_RECORD') {
    const existingIndex = queue.findIndex(
      (q) =>
        q.type === 'DAILY_RECORD' &&
        q.payload.flock_id === newItem.payload.flock_id &&
        q.payload.record_date === newItem.payload.record_date &&
        q.status === 'pending'
    );
    if (existingIndex >= 0) {
      // Perbarui item yang ada
      queue[existingIndex] = {
        ...queue[existingIndex],
        payload: {
          ...queue[existingIndex].payload,
          ...newItem.payload,
        },
        authorName: newItem.authorName || queue[existingIndex].authorName,
        createdAt: new Date().toISOString(),
      };
      saveSyncQueue(queue);
      return queue[existingIndex];
    }
  }

  queue.push(newItem);
  saveSyncQueue(queue);
  return newItem;
}

export function removeFromSyncQueue(id: string): void {
  const queue = getSyncQueue().filter((item) => item.id !== id);
  saveSyncQueue(queue);
}

/**
 * Memproses seluruh antrean sinkronisasi secara FIFO dengan Resolusi Konflik (Conflict Resolution)
 */
export async function processSyncQueue(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
}> {
  if (!isConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { total: 0, succeeded: 0, failed: 0 };
  }

  const queue = getSyncQueue();
  if (queue.length === 0) {
    return { total: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;
  const updatedQueue: SyncQueueItem[] = [];

  for (const item of queue) {
    if (item.status === 'synced') continue;

    item.status = 'syncing';
    try {
      if (item.type === 'DAILY_RECORD') {
        const record = item.payload as DailyRecord;

        // Cek apakah sudah ada catatan sebelumnya di Supabase untuk flock & tanggal ini (Conflict Detection)
        let mergedNotes = record.notes || '';
        const { data: existingRecord } = await supabase
          .from('daily_records')
          .select('*')
          .eq('flock_id', record.flock_id)
          .eq('record_date', record.record_date)
          .maybeSingle();

        if (existingRecord) {
          // Tabrakan / Conflict: Ada data sebelumnya
          const timeStr = new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const author = item.authorName || 'Petugas';

          // Audit log jika angka berbeda
          const diffParts: string[] = [];
          if (existingRecord.egg_good_pcs !== record.egg_good_pcs && record.egg_good_pcs != null) {
            diffParts.push(`Telur: ${existingRecord.egg_good_pcs} -> ${record.egg_good_pcs}`);
          }
          if (existingRecord.feed_kg !== record.feed_kg && record.feed_kg != null) {
            diffParts.push(`Pakan: ${existingRecord.feed_kg} -> ${record.feed_kg}kg`);
          }

          if (diffParts.length > 0) {
            const auditMsg = `[Sync ${timeStr} oleh ${author}: ${diffParts.join(', ')}]`;
            mergedNotes = mergedNotes ? `${mergedNotes} | ${auditMsg}` : auditMsg;
          }
        }

        const { error } = await supabase.rpc('upsert_daily_record', {
          p_flock_id: record.flock_id,
          p_record_date: record.record_date,
          p_egg_good_pcs: record.egg_good_pcs ?? 0,
          p_egg_good_kg: record.egg_good_kg ?? 0,
          p_egg_bad_pcs: record.egg_bad_pcs ?? 0,
          p_egg_bad_kg: record.egg_bad_kg ?? 0,
          p_mortality_pcs: record.mortality_pcs ?? 0,
          p_culling_pcs: record.culling_pcs ?? 0,
          p_feed_kg: record.feed_kg ?? 0,
          p_notes: mergedNotes,
        });

        if (error) throw error;
        succeeded++;
      } else if (item.type === 'TASK_COMPLETION') {
        const { taskId, date, isCompleted, workerId, notes } = item.payload;
        if (isCompleted) {
          const { error } = await supabase.from('task_completions').upsert(
            {
              task_id: taskId,
              task_date: date,
              completed_by: workerId || null,
              notes: notes || null,
              completed_at: item.createdAt || new Date().toISOString(),
            },
            { onConflict: 'task_id,task_date' }
          );
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('task_completions')
            .delete()
            .match({ task_id: taskId, task_date: date });
          if (error) throw error;
        }
        succeeded++;
      } else if (item.type === 'HEALTH_RECORD') {
        const record = item.payload as HealthRecord;
        // Cek duplikasi kesehatan (deduplication)
        const { data: existingHealth } = await supabase
          .from('health_records')
          .select('id')
          .eq('flock_id', record.flock_id)
          .eq('record_date', record.record_date)
          .eq('category', record.category)
          .eq('item_name', record.item_name)
          .maybeSingle();

        if (!existingHealth) {
          const { error } = await supabase.rpc('add_health_record', {
            p_flock_id: record.flock_id,
            p_record_date: record.record_date,
            p_category: record.category,
            p_item_name: record.item_name,
            p_dosage: record.dosage || '',
            p_vaccinated_birds_count: record.vaccinated_birds_count || 0,
            p_method: record.method || '',
            p_notes: record.notes || '',
          });
          if (error) throw error;
        }
        succeeded++;
      }
    } catch (err: any) {
      console.error(`Gagal menyinkronkan item ${item.id}:`, err);
      item.status = 'failed';
      item.errorMessage = err?.message || 'Gagal terhubung ke database';
      item.retryCount = (item.retryCount || 0) + 1;
      failed++;
      updatedQueue.push(item);
    }
  }

  saveSyncQueue(updatedQueue);
  setLastSyncedAt(new Date().toISOString());

  return {
    total: queue.length,
    succeeded,
    failed,
  };
}
