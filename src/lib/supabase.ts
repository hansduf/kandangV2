import { createClient } from '@supabase/supabase-js';
import { Flock, DailyRecord, HealthRecord, DashboardSummary, AppProfile, FarmTask, TaskCompletion, DailyTaskView } from '@/types/database';
import { addToSyncQueue } from './syncQueue';

const DEFAULT_SUPABASE_URL = 'https://jygcjwueflcpwmfzzvon.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_KDgoBXOuCkWem_h8VO5IZw_zPg3-1Ll';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isConfigured = !!(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL) &&
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY) &&
  !supabaseUrl.includes('xyzcompany')
);

// MOCK LOCAL STORAGE FALLBACK DATA FOR PREVIEW MODE IF SUPABASE IS NOT YET CONNECTED
function getLocalFlocks(): Flock[] {
  if (typeof window === 'undefined') return [];
  // Purge legacy storage keys that contained demo data
  localStorage.removeItem('kandang_flocks');
  localStorage.removeItem('kandang_flocks_v2');

  const data = localStorage.getItem('kandang_flocks_v3');
  if (!data) {
    localStorage.setItem('kandang_flocks_v3', JSON.stringify([]));
    return [];
  }
  const parsed: Flock[] = JSON.parse(data);
  // Filter out any leftover demo items automatically
  const cleanFlocks = parsed.filter((f) => f && f.id && !f.id.startsWith('flock-demo'));
  if (cleanFlocks.length !== parsed.length) {
    localStorage.setItem('kandang_flocks_v3', JSON.stringify(cleanFlocks));
  }
  return cleanFlocks;
}

export function getLocalDailyRecords(flockId: string): DailyRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(`kandang_daily_${flockId}`);
  if (!data) {
    localStorage.setItem(`kandang_daily_${flockId}`, JSON.stringify([]));
    return [];
  }
  return JSON.parse(data);
}

function getLocalHealthRecords(flockId: string): HealthRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(`kandang_health_${flockId}`);
  if (!data) {
    localStorage.setItem(`kandang_health_${flockId}`, JSON.stringify([]));
    return [];
  }
  return JSON.parse(data);
}

// API CLIENT FUNCTIONS USING RPC

export async function fetchFlocks(): Promise<Flock[]> {
  if (!isConfigured) {
    return getLocalFlocks();
  }
  try {
    const { data, error } = await supabase.rpc('get_flocks');
    if (error) throw error;
    const clean = (data || []).filter((f: any) => f && f.id && !f.id.startsWith('flock-demo'));
    if (typeof window !== 'undefined' && clean.length > 0) {
      localStorage.setItem('kandang_flocks_v3', JSON.stringify(clean));
    }
    return clean;
  } catch (err) {
    console.warn('Using local fallback for get_flocks:', err);
    return getLocalFlocks();
  }
}

export async function fetchDashboardSummary(flockId: string): Promise<DashboardSummary> {
  if (!isConfigured) {
    const flocks = getLocalFlocks();
    const flock: Flock = flocks.find((f) => f.id === flockId) || {
      id: flockId || 'none',
      name: 'Belum Ada Kandang',
      coop_name: 'Kandang -',
      strain: '-',
      capacity: 0,
      chick_in_date: new Date().toISOString().split('T')[0],
      initial_population: 0,
      current_population: 0,
      age_weeks: 1,
      status: 'active'
    };
    const records = flockId ? getLocalDailyRecords(flockId) : [];
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = records.find((r) => r.record_date === todayStr);

    const now = new Date();
    const date7DaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const date30DaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

    const weeklyMort = records.filter((r) => r.record_date >= date7DaysAgo).reduce((acc, r) => acc + (r.mortality_pcs || 0), 0);
    const monthlyMort = records.filter((r) => r.record_date >= date30DaysAgo).reduce((acc, r) => acc + (r.mortality_pcs || 0), 0);
    const totalMort = records.reduce((acc, r) => acc + (r.mortality_pcs || 0), 0);
    const totalCull = records.reduce((acc, r) => acc + (r.culling_pcs || 0), 0);
    const totalEggGoodPcs = records.reduce((acc, r) => acc + (r.egg_good_pcs || 0), 0);
    const totalEggGoodKg = records.reduce((acc, r) => acc + (r.egg_good_kg || 0), 0);
    const totalFeedKg = records.reduce((acc, r) => acc + (r.feed_kg || 0), 0);
    const totalEggBadPcs = records.reduce((acc, r) => acc + (r.egg_bad_pcs || 0), 0);
    const totalEggBadKg = records.reduce((acc, r) => acc + (r.egg_bad_kg || 0), 0);

    const currentPop = Math.max(0, (flock.initial_population || 0) - totalMort - totalCull);
    const initialPop = flock.initial_population || currentPop || 1;

    const todayGoodPcs = todayRecord?.egg_good_pcs || 0;
    const todayBadPcs = todayRecord?.egg_bad_pcs || 0;
    const todayTotalEggs = todayGoodPcs + todayBadPcs;

    const todayHdp = currentPop > 0 ? Number(((todayTotalEggs / currentPop) * 100).toFixed(2)) : 0;
    const todayHhp = initialPop > 0 ? Number(((todayTotalEggs / initialPop) * 100).toFixed(2)) : 0;

    const totalAllEggs = totalEggGoodPcs + totalEggBadPcs;
    const overallHdp = records.length > 0 && currentPop > 0 ? Number(((totalAllEggs / (currentPop * records.length)) * 100).toFixed(2)) : 0;
    const overallHhp = records.length > 0 && initialPop > 0 ? Number(((totalAllEggs / (initialPop * records.length)) * 100).toFixed(2)) : 0;
    const mortRate = initialPop > 0 ? Number(((totalMort / initialPop) * 100).toFixed(2)) : 0;
    
    // Total All Eggs (Utuh + Retak) for biological FCR
    const totalAllEggKg = totalEggGoodKg + totalEggBadKg;
    const overallFCR = totalAllEggKg > 0 ? totalFeedKg / totalAllEggKg : 0;

    // Today calculations
    const todayGoodKg = todayRecord?.egg_good_kg || 0;
    let todayBadKg = todayRecord?.egg_bad_kg || 0;
    if (todayBadKg === 0 && (todayRecord?.egg_bad_pcs || 0) > 0 && todayGoodPcs > 0 && todayGoodKg > 0) {
      todayBadKg = (todayRecord!.egg_bad_pcs * (todayGoodKg / todayGoodPcs));
    }
    const todayTotalEggKg = todayGoodKg + todayBadKg;
    const todayFeedKg = todayRecord?.feed_kg || 0;
    const todayFcr = todayTotalEggKg > 0 && todayFeedKg > 0 
      ? Number((todayFeedKg / todayTotalEggKg).toFixed(2)) 
      : (todayRecord?.fcr || 0);
    const todayFeedIntake = currentPop > 0 && todayFeedKg > 0 
      ? Number(((todayFeedKg * 1000) / currentPop).toFixed(1)) 
      : (todayRecord?.feed_intake_g || 0);

    return {
      flock: { ...flock, current_population: currentPop },
      today: {
        has_recorded: !!todayRecord,
        record_date: todayRecord?.record_date || todayStr,
        egg_good_pcs: todayGoodPcs,
        egg_good_kg: todayGoodKg,
        egg_bad_pcs: todayRecord?.egg_bad_pcs || 0,
        egg_bad_kg: todayRecord?.egg_bad_kg || 0,
        mortality_pcs: todayRecord?.mortality_pcs || 0,
        culling_pcs: todayRecord?.culling_pcs || 0,
        feed_kg: todayFeedKg,
        feed_morning_kg: todayRecord?.feed_morning_kg || 0,
        feed_afternoon_kg: todayRecord?.feed_afternoon_kg || 0,
        feed_intake_g: todayFeedIntake,
        hd_percent: todayHdp,
        hdp_percent: todayHdp,
        hhp_percent: todayHhp,
        fcr: todayFcr,
        avg_egg_weight_g: todayRecord?.avg_egg_weight_g || 0,
        notes: todayRecord?.notes || ''
      },
      totals: {
        weekly_mortality: weeklyMort,
        monthly_mortality: monthlyMort,
        total_mortality: totalMort,
        mortality_rate_percent: mortRate,
        total_culling: totalCull,
        total_egg_good_pcs: totalEggGoodPcs,
        total_egg_good_kg: Number(totalEggGoodKg.toFixed(2)),
        total_egg_bad_pcs: totalEggBadPcs,
        total_egg_bad_kg: Number(totalEggBadKg.toFixed(2)),
        total_feed_kg: Number(totalFeedKg.toFixed(2)),
        total_days_recorded: records.length,
        overall_hd_percent: overallHdp,
        overall_hdp_percent: overallHdp,
        overall_hhp_percent: overallHhp,
        overall_fcr: Number(overallFCR.toFixed(2))
      }
    };
  }

  try {
    const { data, error } = await supabase.rpc('get_flock_dashboard_summary', { p_flock_id: flockId });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    // Return a safe default instead of recursing (which would infinite loop)
    return {
      flock: { id: flockId, name: '-', coop_name: '-', strain: '-', chick_in_date: '', initial_population: 0, current_population: 0, age_weeks: 1, status: 'active' as const },
      today: { has_recorded: false, record_date: new Date().toISOString().split('T')[0], egg_good_pcs: 0, egg_good_kg: 0, egg_bad_pcs: 0, egg_bad_kg: 0, mortality_pcs: 0, culling_pcs: 0, feed_kg: 0, hd_percent: 0, hdp_percent: 0, hhp_percent: 0, fcr: 0, avg_egg_weight_g: 0, notes: '' },
      totals: { weekly_mortality: 0, monthly_mortality: 0, total_mortality: 0, mortality_rate_percent: 0, total_culling: 0, total_egg_good_pcs: 0, total_egg_good_kg: 0, total_egg_bad_pcs: 0, total_egg_bad_kg: 0, total_feed_kg: 0, total_days_recorded: 0, overall_hd_percent: 0, overall_hdp_percent: 0, overall_hhp_percent: 0, overall_fcr: 0 }
    };
  }
}

export async function fetchDailyHistory(flockId: string, limit: number = 30): Promise<DailyRecord[]> {
  const flocks = getLocalFlocks();
  const flock = flocks.find((f) => f.id === flockId);
  const activePop = flock?.current_population || 0;

  const enrichRecords = (recs: DailyRecord[]): DailyRecord[] => {
    return recs.map((r) => {
      let totalEggKg = (r.egg_good_kg || 0) + (r.egg_bad_kg || 0);
      if ((r.egg_bad_kg || 0) === 0 && (r.egg_bad_pcs || 0) > 0 && (r.egg_good_pcs || 0) > 0 && (r.egg_good_kg || 0) > 0) {
        totalEggKg += ((r.egg_bad_pcs || 0) * (r.egg_good_kg / r.egg_good_pcs));
      }
      const calculatedFcr = totalEggKg > 0 && (r.feed_kg || 0) > 0 ? Number(((r.feed_kg || 0) / totalEggKg).toFixed(2)) : 0;

      let pop = activePop;
      const totalEggs = (r.egg_good_pcs || 0) + (r.egg_bad_pcs || 0);
      const hdp = r.hdp_percent !== undefined && r.hdp_percent !== null ? r.hdp_percent : (r.hd_percent || 0);
      if (pop <= 0 && hdp > 0 && totalEggs > 0) {
        pop = Math.round((totalEggs / hdp) * 100);
      }
      if (pop <= 0 && (r.feed_kg || 0) > 0) {
        pop = 1000;
      }
      const calculatedIntake = pop > 0 && (r.feed_kg || 0) > 0 ? Number(((r.feed_kg * 1000) / pop).toFixed(1)) : 0;

      return {
        ...r,
        fcr: r.fcr || calculatedFcr,
        feed_intake_g: (r.feed_intake_g && r.feed_intake_g > 0) ? r.feed_intake_g : calculatedIntake,
      };
    });
  };

  if (!isConfigured) {
    return enrichRecords(getLocalDailyRecords(flockId).slice(0, limit));
  }
  try {
    const [rpcRes, tableRes] = await Promise.all([
      supabase.rpc('get_flock_daily_history', { p_flock_id: flockId, p_limit: limit }),
      supabase.from('daily_records').select('record_date, feed_morning_kg, feed_afternoon_kg').eq('flock_id', flockId),
    ]);
    if (rpcRes.error) throw rpcRes.error;

    const feedMap = new Map<string, { morning?: number; afternoon?: number }>();
    if (tableRes.data) {
      tableRes.data.forEach((r: any) => {
        feedMap.set(r.record_date, {
          morning: r.feed_morning_kg !== null && r.feed_morning_kg !== undefined ? Number(r.feed_morning_kg) : undefined,
          afternoon: r.feed_afternoon_kg !== null && r.feed_afternoon_kg !== undefined ? Number(r.feed_afternoon_kg) : undefined,
        });
      });
    }

    const localRecords = getLocalDailyRecords(flockId);
    const merged = (rpcRes.data || []).map((r: any) => {
      const dbFeed = feedMap.get(r.record_date);
      const localRec = localRecords.find((l) => l.record_date === r.record_date);

      const morningVal = dbFeed?.morning !== undefined 
        ? dbFeed.morning 
        : (localRec?.feed_morning_kg !== undefined ? localRec.feed_morning_kg : undefined);

      const afternoonVal = dbFeed?.afternoon !== undefined 
        ? dbFeed.afternoon 
        : (localRec?.feed_afternoon_kg !== undefined ? localRec.feed_afternoon_kg : undefined);

      return {
        ...r,
        feed_morning_kg: morningVal,
        feed_afternoon_kg: afternoonVal,
      };
    });

    const enriched = enrichRecords(merged);
    if (typeof window !== 'undefined' && enriched.length > 0) {
      localStorage.setItem(`kandang_daily_${flockId}`, JSON.stringify(enriched));
    }
    return enriched;
  } catch (err) {
    console.warn('Using local fallback for daily history:', err);
    return enrichRecords(getLocalDailyRecords(flockId).slice(0, limit));
  }
}

export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  const records = getLocalDailyRecords(record.flock_id);
  const existingIndex = records.findIndex((r) => r.record_date === record.record_date);

  const flocks = getLocalFlocks();
  const flock = flocks.find((f) => f.id === record.flock_id);
  const activePop = flock?.current_population || 1000;
  const initialPop = flock?.initial_population || activePop || 1000;

  const totalEggs = (record.egg_good_pcs || 0) + (record.egg_bad_pcs || 0);
  const hdp = activePop > 0 ? Number(((totalEggs / activePop) * 100).toFixed(2)) : 0;
  const hhp = initialPop > 0 ? Number(((totalEggs / initialPop) * 100).toFixed(2)) : 0;
  
  // Total egg weight (Utuh + Retak) for FCR
  let totalEggKg = (record.egg_good_kg || 0) + (record.egg_bad_kg || 0);
  if ((record.egg_bad_kg || 0) === 0 && (record.egg_bad_pcs || 0) > 0 && (record.egg_good_pcs || 0) > 0 && (record.egg_good_kg || 0) > 0) {
    totalEggKg += ((record.egg_bad_pcs || 0) * (record.egg_good_kg / record.egg_good_pcs));
  }
  const fcr = totalEggKg > 0 && (record.feed_kg || 0) > 0 ? Number((record.feed_kg / totalEggKg).toFixed(2)) : 0;
  const feedIntake = activePop > 0 && (record.feed_kg || 0) > 0 ? Number(((record.feed_kg * 1000) / activePop).toFixed(1)) : 0;
  const avgW = record.egg_good_pcs > 0 ? Number(((record.egg_good_kg * 1000) / record.egg_good_pcs).toFixed(2)) : 0;

  const fullRecord: DailyRecord = {
    ...record,
    hd_percent: hdp,
    hdp_percent: hdp,
    hhp_percent: hhp,
    fcr: fcr,
    feed_intake_g: feedIntake,
    avg_egg_weight_g: avgW
  };

  if (existingIndex >= 0) {
    records[existingIndex] = fullRecord;
  } else {
    records.unshift(fullRecord);
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(`kandang_daily_${record.flock_id}`, JSON.stringify(records));
  }

  const isOffline = !isConfigured || (typeof navigator !== 'undefined' && !navigator.onLine);
  if (isOffline) {
    addToSyncQueue({ type: 'DAILY_RECORD', payload: record });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('sync-queue-updated'));
    return;
  }

  // Run DB upsert and task completion sync in parallel to eliminate sequential network bottlenecks
  const dbPromise = (async () => {
    try {
      const { error } = await supabase.rpc('upsert_daily_record', {
        p_flock_id: record.flock_id,
        p_record_date: record.record_date,
        p_egg_good_pcs: record.egg_good_pcs,
        p_egg_good_kg: record.egg_good_kg,
        p_egg_bad_pcs: record.egg_bad_pcs,
        p_egg_bad_kg: record.egg_bad_kg,
        p_mortality_pcs: record.mortality_pcs,
        p_culling_pcs: record.culling_pcs,
        p_feed_kg: record.feed_kg,
        p_notes: record.notes || ''
      });
      if (error) throw error;

      // Explicitly update feed_morning_kg and feed_afternoon_kg in Supabase table
      if (record.feed_morning_kg !== undefined || record.feed_afternoon_kg !== undefined) {
        try {
          await supabase
            .from('daily_records')
            .update({
              feed_morning_kg: record.feed_morning_kg || 0,
              feed_afternoon_kg: record.feed_afternoon_kg || 0,
            })
            .eq('flock_id', record.flock_id)
            .eq('record_date', record.record_date);
        } catch (feedUpdateErr) {
          console.warn('Could not update feed split in daily_records:', feedUpdateErr);
        }
      }
    } catch (err) {
      console.warn('Network error saving daily record, queued for sync:', err);
      addToSyncQueue({ type: 'DAILY_RECORD', payload: record });
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('sync-queue-updated'));
    }
  })();

  const taskSyncPromise = (async () => {
    try {
      await checkAndSyncDailyEggTasks(record.record_date, record.flock_id);
      if ((record.feed_kg || 0) > 0 || (record.feed_morning_kg || 0) > 0 || (record.feed_afternoon_kg || 0) > 0) {
        await checkAndSyncFeedTasks(record.record_date, record.flock_id);
      }
    } catch (taskErr) {
      console.warn('Task sync non-critical error:', taskErr);
    }
  })();

  await Promise.all([dbPromise, taskSyncPromise]);
}

export interface SaveFeedParams {
  flock_id: string;
  record_date: string;
  feed_morning_kg?: number;
  feed_afternoon_kg?: number;
  feed_kg: number;
  notes?: string;
}

export async function saveFeedRecord(params: SaveFeedParams): Promise<DailyRecord> {
  const records = getLocalDailyRecords(params.flock_id);
  const existing = records.find((r) => r.record_date === params.record_date);

  const finalMorning = params.feed_morning_kg !== undefined 
    ? params.feed_morning_kg 
    : existing?.feed_morning_kg;
  const finalAfternoon = params.feed_afternoon_kg !== undefined 
    ? params.feed_afternoon_kg 
    : existing?.feed_afternoon_kg;

  const mergedRecord: DailyRecord = {
    flock_id: params.flock_id,
    record_date: params.record_date,
    egg_good_pcs: existing?.egg_good_pcs || 0,
    egg_good_kg: existing?.egg_good_kg || 0,
    egg_bad_pcs: existing?.egg_bad_pcs || 0,
    egg_bad_kg: existing?.egg_bad_kg || 0,
    mortality_pcs: existing?.mortality_pcs || 0,
    culling_pcs: existing?.culling_pcs || 0,
    feed_kg: params.feed_kg,
    feed_morning_kg: finalMorning,
    feed_afternoon_kg: finalAfternoon,
    notes: params.notes || existing?.notes || '',
  };

  await saveDailyRecord(mergedRecord);
  return mergedRecord;
}

export async function fetchHealthRecords(flockId: string): Promise<HealthRecord[]> {
  if (!isConfigured) {
    return getLocalHealthRecords(flockId);
  }
  try {
    const { data, error } = await supabase.rpc('get_flock_health_records', { p_flock_id: flockId });
    if (error) throw error;
    if (typeof window !== 'undefined' && data && data.length > 0) {
      localStorage.setItem(`kandang_health_${flockId}`, JSON.stringify(data));
    }
    return data || [];
  } catch (err) {
    console.warn('Using local fallback for health records:', err);
    return getLocalHealthRecords(flockId);
  }
}

export async function saveHealthRecord(record: HealthRecord): Promise<void> {
  const records = getLocalHealthRecords(record.flock_id);
  const newRecord = { ...record, id: record.id || `h-${Date.now()}` };
  records.unshift(newRecord);
  if (typeof window !== 'undefined') {
    localStorage.setItem(`kandang_health_${record.flock_id}`, JSON.stringify(records));
  }
  await checkAndSyncHealthTasks(record.record_date, record.flock_id, record.category);

  const isOffline = !isConfigured || (typeof navigator !== 'undefined' && !navigator.onLine);
  if (isOffline) {
    addToSyncQueue({ type: 'HEALTH_RECORD', payload: record });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('sync-queue-updated'));
    return;
  }

  try {
    const { error } = await supabase.rpc('add_health_record', {
      p_flock_id: record.flock_id,
      p_record_date: record.record_date,
      p_category: record.category,
      p_item_name: record.item_name,
      p_dosage: record.dosage || '',
      p_vaccinated_birds_count: record.vaccinated_birds_count || 0,
      p_method: record.method || '',
      p_notes: record.notes || ''
    });
    if (error) throw error;
  } catch (err) {
    console.warn('Network error saving health record, queued for sync:', err);
    addToSyncQueue({ type: 'HEALTH_RECORD', payload: record });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('sync-queue-updated'));
  }
}

export async function createFlock(flock: Partial<Flock>): Promise<Flock> {
  const initAge = flock.initial_age_weeks || 1;
  if (!isConfigured) {
    const flocks = getLocalFlocks();
    const newFlock: Flock = {
      id: `flock-${Date.now()}`,
      name: flock.name || 'Angkatan Baru',
      coop_name: flock.coop_name || 'Kandang A',
      strain: flock.strain || '-',
      capacity: flock.capacity || flock.initial_population || 0,
      chick_in_date: flock.chick_in_date || new Date().toISOString().split('T')[0],
      chick_out_date: flock.chick_out_date || null,
      initial_population: flock.initial_population || 0,
      current_population: flock.initial_population || 0,
      initial_age_weeks: initAge,
      total_mortality: 0,
      total_culling: 0,
      age_weeks: initAge,
      status: flock.status || 'active',
      created_at: new Date().toISOString()
    };
    flocks.unshift(newFlock);
    localStorage.setItem('kandang_flocks_v3', JSON.stringify(flocks));
    return newFlock;
  }

  try {
    const { data, error } = await supabase.rpc('create_flock', {
      p_name: flock.name,
      p_coop_name: flock.coop_name,
      p_strain: flock.strain || '-',
      p_capacity: flock.capacity || flock.initial_population || 0,
      p_chick_in_date: flock.chick_in_date,
      p_initial_population: flock.initial_population,
      p_chick_out_date: flock.chick_out_date || null,
      p_status: flock.status || 'active',
      p_initial_age_weeks: initAge
    });
    if (!error && data) return data;
    throw error;
  } catch (err) {
    const { data, error } = await supabase.rpc('create_flock', {
      p_name: flock.name,
      p_coop_name: flock.coop_name,
      p_strain: flock.strain || '-',
      p_capacity: flock.capacity || flock.initial_population || 0,
      p_chick_in_date: flock.chick_in_date,
      p_initial_population: flock.initial_population,
      p_chick_out_date: flock.chick_out_date || null,
      p_status: flock.status || 'active'
    });
    if (error) throw error;
    return data;
  }
}

export async function updateFlock(id: string, flock: Partial<Flock>): Promise<Flock> {
  const initAge = flock.initial_age_weeks || 1;
  if (!isConfigured) {
    const flocks = getLocalFlocks();
    const index = flocks.findIndex((f) => f.id === id);
    if (index === -1) throw new Error('Flock not found');
    const updated: Flock = {
      ...flocks[index],
      ...flock,
      initial_age_weeks: initAge,
      capacity: flock.capacity !== undefined ? flock.capacity : flocks[index].capacity,
      initial_population: flock.initial_population !== undefined ? flock.initial_population : flocks[index].initial_population,
      chick_out_date: flock.chick_out_date !== undefined ? flock.chick_out_date : flocks[index].chick_out_date,
      status: flock.status !== undefined ? flock.status : flocks[index].status,
    };
    flocks[index] = updated;
    localStorage.setItem('kandang_flocks_v3', JSON.stringify(flocks));
    return updated;
  }

  try {
    const { data, error } = await supabase.rpc('update_flock', {
      p_id: id,
      p_name: flock.name,
      p_coop_name: flock.coop_name,
      p_strain: flock.strain || '-',
      p_capacity: flock.capacity || 0,
      p_chick_in_date: flock.chick_in_date,
      p_initial_population: flock.initial_population || 0,
      p_chick_out_date: flock.chick_out_date || null,
      p_status: flock.status || 'active',
      p_initial_age_weeks: initAge
    });
    if (!error && data) return data;
    throw error;
  } catch (err) {
    const { data, error } = await supabase.rpc('update_flock', {
      p_id: id,
      p_name: flock.name,
      p_coop_name: flock.coop_name,
      p_strain: flock.strain || '-',
      p_capacity: flock.capacity || 0,
      p_chick_in_date: flock.chick_in_date,
      p_initial_population: flock.initial_population || 0,
      p_chick_out_date: flock.chick_out_date || null,
      p_status: flock.status || 'active'
    });
    if (error) throw error;
    return data;
  }
}

export async function deleteFlock(id: string): Promise<void> {
  if (!isConfigured) {
    const flocks = getLocalFlocks().filter((f) => f.id !== id);
    localStorage.setItem('kandang_flocks_v3', JSON.stringify(flocks));
    localStorage.removeItem(`kandang_daily_${id}`);
    localStorage.removeItem(`kandang_health_${id}`);
    return;
  }

  const { error } = await supabase.rpc('delete_flock', { p_id: id });
  if (error) throw error;
}

// DYNAMIC CATEGORIES & PRESETS HELPER FUNCTIONS (Persisted in DB / localStorage)
const DEFAULT_HEALTH_CATEGORIES = ['Vaksin', 'Obat', 'Vitamin', 'Desinfektan'];

const DEFAULT_CATEGORY_PRESETS: Record<string, string[]> = {
  Vaksin: ['Vaksin ND-IB', 'Vaksin AI (Flu Burung)', 'Vaksin Coryza', 'Vaksin Gumboro'],
  Obat: ['Antibiotik Koleridin', 'Obat Cacing', 'Amprolium (Berak Darah)', 'Enrofloxacin'],
  Vitamin: ['Egg Stimulant', 'Vita Stress', 'Fortevit', 'Mineral Layer'],
  Desinfektan: ['Medisep Semprot', 'BKT Desinfektan', 'Kapus Desinfektan'],
};

export function fetchCustomCategories(): string[] {
  if (typeof window === 'undefined') return DEFAULT_HEALTH_CATEGORIES;
  const data = localStorage.getItem('kandang_custom_categories');
  if (!data) {
    localStorage.setItem('kandang_custom_categories', JSON.stringify(DEFAULT_HEALTH_CATEGORIES));
    return DEFAULT_HEALTH_CATEGORIES;
  }
  return JSON.parse(data);
}

export function saveCustomCategory(newCategory: string): string[] {
  const current = fetchCustomCategories();
  const trimmed = newCategory.trim();
  if (!trimmed || current.includes(trimmed)) return current;
  const updated = [...current, trimmed];
  if (typeof window !== 'undefined') {
    localStorage.setItem('kandang_custom_categories', JSON.stringify(updated));
  }
  return updated;
}

export function fetchCategoryPresets(category: string): string[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORY_PRESETS[category] || [];
  const data = localStorage.getItem(`kandang_presets_${category}`);
  if (!data) {
    const defaultList = DEFAULT_CATEGORY_PRESETS[category] || [];
    localStorage.setItem(`kandang_presets_${category}`, JSON.stringify(defaultList));
    return defaultList;
  }
  return JSON.parse(data);
}

export function saveCategoryPreset(category: string, newPreset: string): string[] {
  const current = fetchCategoryPresets(category);
  const trimmed = newPreset.trim();
  if (!trimmed || current.includes(trimmed)) return current;
  const updated = [...current, trimmed];
  if (typeof window !== 'undefined') {
    localStorage.setItem(`kandang_presets_${category}`, JSON.stringify(updated));
  }
  return updated;
}

// Helper to validate and normalize UUIDs to avoid 22P02 Postgres errors
export const toValidUuidOrNull = (id?: string | null): string | null => {
  if (!id) return null;
  const trimmed = id.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ? trimmed : null;
};

// ==============================================================================
// PROFILES & MULTI-ROLE (OWNER & WORKER)
// ==============================================================================

const DEFAULT_PROFILES: AppProfile[] = [
  {
    id: 'owner-default',
    name: 'Pemilik',
    role: 'owner',
    pin: '1234',
    avatar_color: '#00684a',
    is_active: true,
  },
  {
    id: 'worker-default-1',
    name: 'Pekerja 1',
    role: 'worker',
    pin: null,
    avatar_color: '#2563eb',
    is_active: true,
  },
];

export async function fetchProfiles(): Promise<AppProfile[]> {
  if (!isConfigured) {
    if (typeof window === 'undefined') return DEFAULT_PROFILES;
    const stored = localStorage.getItem('kandang_profiles');
    if (!stored) {
      localStorage.setItem('kandang_profiles', JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    return JSON.parse(stored);
  }

  try {
    const { data, error } = await supabase
      .from('app_profiles')
      .select('*')
      .eq('is_active', true)
      .order('role', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase fetchProfiles error:', error.message || error);
    } else if (data && data.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('kandang_profiles', JSON.stringify(data));
      }
      return data;
    }
  } catch (err) {
    console.error('Fallback to local profiles due to exception:', err);
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kandang_profiles');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    localStorage.setItem('kandang_profiles', JSON.stringify(DEFAULT_PROFILES));
  }
  return DEFAULT_PROFILES;
}

export async function createProfile(profile: Partial<AppProfile>): Promise<AppProfile> {
  const newProfile: AppProfile = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}`,
    name: profile.name?.trim() || 'Pekerja Baru',
    role: profile.role || 'worker',
    pin: profile.pin || null,
    avatar_color: profile.avatar_color || '#00684a',
    phone: profile.phone?.trim() || null,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  if (isConfigured) {
    try {
      const { data, error } = await supabase
        .from('app_profiles')
        .insert({
          name: newProfile.name,
          role: newProfile.role,
          pin: newProfile.pin,
          avatar_color: newProfile.avatar_color,
          phone: newProfile.phone,
          is_active: true,
        })
        .select()
        .single();
      if (error) {
        console.error('Supabase error inserting app_profile:', error.message || error);
      } else if (data) {
        if (typeof window !== 'undefined') {
          const current = await fetchProfiles();
          const updated = [...current.filter((p) => p.id !== data.id), data];
          localStorage.setItem('kandang_profiles', JSON.stringify(updated));
        }
        return data;
      }
    } catch (err) {
      console.error('Failed insert to supabase app_profiles:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const current = await fetchProfiles();
    const updated = [...current, newProfile];
    localStorage.setItem('kandang_profiles', JSON.stringify(updated));
  }
  return newProfile;
}

export async function updateProfile(id: string, updates: Partial<AppProfile>): Promise<AppProfile> {
  const validUuid = toValidUuidOrNull(id);
  if (isConfigured && validUuid) {
    try {
      const { data, error } = await supabase
        .from('app_profiles')
        .update(updates)
        .eq('id', validUuid)
        .select()
        .single();
      if (error) {
        console.error('Supabase error updating app_profile:', error.message || error);
      } else if (data) {
        if (typeof window !== 'undefined') {
          const current = await fetchProfiles();
          const index = current.findIndex((p) => p.id === validUuid);
          if (index >= 0) {
            current[index] = data;
            localStorage.setItem('kandang_profiles', JSON.stringify(current));
          }
        }
        return data;
      }
    } catch (err) {
      console.error('Failed update to supabase app_profiles:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const current = await fetchProfiles();
    const index = current.findIndex((p) => p.id === id);
    if (index >= 0) {
      current[index] = { ...current[index], ...updates };
      localStorage.setItem('kandang_profiles', JSON.stringify(current));
      return current[index];
    }
  }
  return { id, name: updates.name || '', role: updates.role || 'worker', avatar_color: updates.avatar_color || '#00684a', is_active: true };
}

export async function deleteProfile(id: string): Promise<void> {
  const validUuid = toValidUuidOrNull(id);
  if (isConfigured && validUuid) {
    try {
      const { error } = await supabase
        .from('app_profiles')
        .update({ is_active: false })
        .eq('id', validUuid);
      if (error) {
        console.error('Failed soft-delete in supabase app_profiles:', error.message || error);
      }
    } catch (err) {
      console.error('Failed soft-delete in supabase app_profiles:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const current = await fetchProfiles();
    const updated = current.filter((p) => p.id !== id && (!validUuid || p.id !== validUuid));
    localStorage.setItem('kandang_profiles', JSON.stringify(updated));
  }
}

export async function verifyOwnerPin(profileId: string, inputPin: string): Promise<boolean> {
  const validProfileId = toValidUuidOrNull(profileId);
  if (isConfigured && validProfileId) {
    try {
      const { data, error } = await supabase.rpc('verify_owner_pin', {
        p_profile_id: validProfileId,
        p_pin: inputPin.trim(),
      });
      if (error) {
        console.error('RPC verify_owner_pin error:', error.message || error);
      } else if (data !== null) {
        return Boolean(data);
      }
    } catch (err) {
      console.warn('RPC verify_owner_pin failed, checking local:', err);
    }
  }

  // Local check
  const profiles = await fetchProfiles();
  const owner = profiles.find((p) => p.id === profileId && p.role === 'owner') || profiles.find((p) => p.role === 'owner');
  if (!owner) return inputPin === '1234';
  return (owner.pin || '1234') === inputPin.trim();
}

export async function updateOwnerPin(profileId: string, newPin: string): Promise<void> {
  await updateProfile(profileId, { pin: newPin.trim() });
}

// ==============================================================================
// FARM TASKS & RECURRING ALARMS
// ==============================================================================

// Color Palette for Farm Tasks
export const TASK_COLOR_PALETTE = [
  { name: 'Emerald', hex: '#10b981', label: 'Hijau (Emerald)' },
  { name: 'Cyan', hex: '#06b6d4', label: 'Biru Kehijauan (Cyan)' },
  { name: 'Blue', hex: '#3b82f6', label: 'Biru (Blue)' },
  { name: 'Purple', hex: '#8b5cf6', label: 'Ungu (Purple)' },
  { name: 'Amber', hex: '#f59e0b', label: 'Kuning Jingga (Amber)' },
  { name: 'Pink', hex: '#ec4899', label: 'Merah Muda (Pink)' },
  { name: 'Teal', hex: '#14b8a6', label: 'Hijau Toska (Teal)' },
  { name: 'Indigo', hex: '#6366f1', label: 'Indigo' },
  { name: 'Orange', hex: '#f97316', label: 'Oranye' },
];

export async function fetchTasksForDate(date: string, workerId?: string): Promise<DailyTaskView[]> {
  const [allTasks, allFlocks] = await Promise.all([
    fetchAllTasks(),
    fetchFlocks(),
  ]);

  const colorMap = new Map<string, string>();
  for (const t of allTasks) {
    colorMap.set(t.id, t.color || '#10b981');
  }

  const flockMap = new Map<string, Flock>();
  for (const f of allFlocks) {
    flockMap.set(f.id, f);
  }

  const validWorkerId = toValidUuidOrNull(workerId);

  // Check which flocks have daily records, feed records, and health records on this date
  const recordedEggFlockIds = new Set<string>();
  const recordedFeedMap = new Map<string, { morning: number; afternoon: number; total: number }>();
  const recordedHealthMap = new Map<string, Set<string>>();

  if (isConfigured) {
    try {
      const [drRes, hrRes] = await Promise.all([
        supabase.from('daily_records').select('flock_id, feed_kg, feed_morning_kg, feed_afternoon_kg').eq('record_date', date),
        supabase.from('health_records').select('flock_id, category').eq('record_date', date),
      ]);
      if (drRes.data) {
        drRes.data.forEach((r: any) => {
          recordedEggFlockIds.add(r.flock_id);
          recordedFeedMap.set(r.flock_id, {
            morning: Number(r.feed_morning_kg) || 0,
            afternoon: Number(r.feed_afternoon_kg) || 0,
            total: Number(r.feed_kg) || ((Number(r.feed_morning_kg) || 0) + (Number(r.feed_afternoon_kg) || 0)),
          });
        });
      }
      if (hrRes.data) {
        hrRes.data.forEach((r: any) => {
          const set = recordedHealthMap.get(r.flock_id) || new Set<string>();
          set.add((r.category || '').toLowerCase());
          recordedHealthMap.set(r.flock_id, set);
        });
      }
    } catch (e) {
      console.warn('Error querying daily/health records for task date:', e);
    }
  } else if (typeof window !== 'undefined') {
    allFlocks.forEach((f) => {
      const hist = getLocalDailyRecords(f.id);
      const rec = hist.find((r) => r.record_date === date);
      if (rec) {
        recordedEggFlockIds.add(f.id);
        recordedFeedMap.set(f.id, {
          morning: Number(rec.feed_morning_kg) || 0,
          afternoon: Number(rec.feed_afternoon_kg) || 0,
          total: Number(rec.feed_kg) || ((Number(rec.feed_morning_kg) || 0) + (Number(rec.feed_afternoon_kg) || 0)),
        });
      }
      const hHist = getLocalHealthRecords(f.id);
      const set = new Set<string>();
      hHist.filter((r) => r.record_date === date).forEach((r) => set.add((r.category || '').toLowerCase()));
      recordedHealthMap.set(f.id, set);
    });
  }

  let rawList: DailyTaskView[] = [];

  if (isConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_tasks_for_date', {
        p_date: date,
        p_worker_id: validWorkerId,
      });
      if (error) {
        console.error('RPC get_tasks_for_date error:', error.message || error);
      } else if (data) {
        rawList = data;
      }
    } catch (err) {
      console.warn('RPC get_tasks_for_date failed, using local tasks:', err);
    }
  }

  if (rawList.length === 0) {
    // Local fallback: generate tasks for date
    const storedCompletions = typeof window !== 'undefined' ? localStorage.getItem('kandang_task_completions') : null;
    const completions: TaskCompletion[] = storedCompletions ? JSON.parse(storedCompletions) : [];

    const targetDate = new Date(date);
    const targetDayOfWeek = targetDate.getDay();

    rawList = allTasks.filter((t) => {
      if (!t.is_active) return false;
      if (t.start_date > date) return false;
      if (t.end_date && t.end_date < date) return false;

      // Filter by worker if specified
      if (workerId) {
        const hasSpecificWorker = t.assigned_to || (t.assigned_to_ids && t.assigned_to_ids.length > 0);
        if (hasSpecificWorker) {
          const isDirect = t.assigned_to === workerId;
          const isInList = t.assigned_to_ids && t.assigned_to_ids.includes(workerId);
          if (!isDirect && !isInList) return false;
        }
      }

      if (t.recurrence_type === 'once') return t.start_date === date;
      if (t.recurrence_type === 'daily') return true;
      if (t.recurrence_type === 'days_of_week') return (t.days_of_week || []).includes(targetDayOfWeek);
      if (t.recurrence_type === 'interval') {
        const start = new Date(t.start_date);
        const diffDays = Math.floor((targetDate.getTime() - start.getTime()) / 86400000);
        return diffDays >= 0 && diffDays % Math.max(1, t.recurrence_interval || 1) === 0;
      }
      return true;
    }).map((t) => {
      const isComp = completions.some((c) => c.task_id === t.id && c.task_date === date);
      return {
        task_id: t.id,
        title: t.title,
        description: t.description,
        task_type: t.task_type,
        flock_id: t.flock_id,
        flock_ids: t.flock_ids,
        coop_name: t.flock_id ? flockMap.get(t.flock_id)?.coop_name || null : null,
        flock_name: t.flock_id ? flockMap.get(t.flock_id)?.name || null : null,
        assigned_to: t.assigned_to,
        assigned_to_ids: t.assigned_to_ids,
        recurrence_type: t.recurrence_type,
        recurrence_interval: t.recurrence_interval,
        days_of_week: t.days_of_week,
        due_time: t.due_time,
        color: t.color || '#10b981',
        is_completed: isComp,
      };
    });
  }

  // Active flocks for farm-wide status
  const activeFlocks = allFlocks.filter((f) => f.status === 'active' || !f.status);

  return rawList.map((item: any) => {
    const flock = item.flock_id ? flockMap.get(item.flock_id) : null;
    const coopName = item.coop_name || (flock ? flock.coop_name : null);
    const flockName = item.flock_name || (flock ? flock.name : null);

    let isCompleted = Boolean(item.is_completed);
    let flocksStatus: { flock_id?: string; coop_name: string; is_done: boolean }[] = [];

    // Determine target flocks for this task
    let targetFlocks: Flock[] = [];
    if (item.flock_ids && Array.isArray(item.flock_ids) && item.flock_ids.length > 0) {
      targetFlocks = item.flock_ids.map((id: string) => flockMap.get(id)).filter(Boolean) as Flock[];
    } else if (item.flock_id) {
      const f = flockMap.get(item.flock_id);
      if (f) targetFlocks = [f];
    } else {
      targetFlocks = activeFlocks;
    }

    if (item.task_type === 'daily_record') {
      flocksStatus = targetFlocks.map((f) => ({
        flock_id: f.id,
        coop_name: f.coop_name,
        is_done: recordedEggFlockIds.has(f.id),
      }));
      // Only marked completed if EVERY target flock has recorded
      isCompleted = flocksStatus.length > 0 ? flocksStatus.every((s) => s.is_done) : isCompleted;
    } else if (
      item.task_type === 'vaccine' ||
      item.task_type === 'medicine' ||
      (item.task_type as any) === 'obat' ||
      item.task_type === 'vitamin'
    ) {
      const targetCat = item.task_type === 'vaccine' ? 'vaksin' : item.task_type === 'vitamin' ? 'vitamin' : 'obat';
      flocksStatus = targetFlocks.map((f) => {
        const set = recordedHealthMap.get(f.id);
        const isDone = Boolean(set && Array.from(set).some((c) => c.includes(targetCat)));
        return { flock_id: f.id, coop_name: f.coop_name, is_done: isDone };
      });
      // CRITICAL FIX: ALL target flocks must be done for task to be complete!
      isCompleted = flocksStatus.length > 0 ? flocksStatus.every((s) => s.is_done) : isCompleted;
    } else if (item.task_type === 'feed') {
      const titleLower = (item.title || '').toLowerCase();
      const isMorning = titleLower.includes('pagi');
      const isAfternoon = titleLower.includes('sore');

      flocksStatus = targetFlocks.map((f) => {
        const feedInfo = recordedFeedMap.get(f.id);
        let isDone = false;
        if (feedInfo) {
          if (isMorning) {
            isDone = feedInfo.morning > 0 || (feedInfo.total > 0 && feedInfo.afternoon === 0);
          } else if (isAfternoon) {
            isDone = feedInfo.afternoon > 0;
          } else {
            isDone = feedInfo.total > 0 || feedInfo.morning > 0 || feedInfo.afternoon > 0;
          }
        }
        return { flock_id: f.id, coop_name: f.coop_name, is_done: isDone };
      });
      isCompleted = flocksStatus.length > 0 ? flocksStatus.every((s) => s.is_done) : isCompleted;
    }

    return {
      ...item,
      coop_name: coopName,
      flock_name: flockName,
      color: item.color || colorMap.get(item.task_id) || '#10b981',
      is_completed: isCompleted,
      flocks_status: flocksStatus.length > 0 ? flocksStatus : undefined,
    };
  });
}

export async function toggleTaskCompletion(
  taskId: string,
  date: string,
  workerId?: string,
  notes?: string
): Promise<boolean> {
  const validTaskId = toValidUuidOrNull(taskId);
  const validWorkerId = toValidUuidOrNull(workerId);
  const isOffline = !isConfigured || !validTaskId || (typeof navigator !== 'undefined' && !navigator.onLine);

  if (!isOffline && validTaskId) {
    try {
      const { data, error } = await supabase.rpc('toggle_task_completion', {
        p_task_id: validTaskId,
        p_date: date,
        p_worker_id: validWorkerId,
        p_notes: notes || null,
      });
      if (error) {
        console.error('RPC toggle_task_completion error:', error.message || error);
      } else if (data !== null) {
        return Boolean(data);
      }
    } catch (err) {
      console.warn('RPC toggle_task_completion failed, updating locally & queueing:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kandang_task_completions');
    let completions: TaskCompletion[] = stored ? JSON.parse(stored) : [];
    const index = completions.findIndex((c) => c.task_id === taskId && c.task_date === date);
    let newCompletedState = false;
    if (index >= 0) {
      completions.splice(index, 1);
      newCompletedState = false;
    } else {
      completions.push({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tc-${Date.now()}`,
        task_id: taskId,
        task_date: date,
        completed_by: workerId || null,
        completed_at: new Date().toISOString(),
        notes: notes || null,
      });
      newCompletedState = true;
    }
    localStorage.setItem('kandang_task_completions', JSON.stringify(completions));
    addToSyncQueue({
      type: 'TASK_COMPLETION',
      payload: { taskId, date, isCompleted: newCompletedState, workerId, notes },
    });
    window.dispatchEvent(new Event('sync-queue-updated'));
    return newCompletedState;
  }
  return true;
}

export async function setTaskCompletion(
  taskId: string,
  date: string,
  isCompleted: boolean,
  workerId?: string,
  notes?: string
): Promise<void> {
  const validTaskId = toValidUuidOrNull(taskId);
  const validWorkerId = toValidUuidOrNull(workerId);

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kandang_task_completions');
    let completions: TaskCompletion[] = stored ? JSON.parse(stored) : [];
    const index = completions.findIndex((c) => c.task_id === taskId && c.task_date === date);

    if (isCompleted) {
      if (index === -1) {
        completions.push({
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tc-${Date.now()}`,
          task_id: taskId,
          task_date: date,
          completed_by: workerId || null,
          completed_at: new Date().toISOString(),
          notes: notes || null,
        });
      }
    } else {
      if (index >= 0) {
        completions.splice(index, 1);
      }
    }
    localStorage.setItem('kandang_task_completions', JSON.stringify(completions));
  }

  const isOffline = !isConfigured || !validTaskId || (typeof navigator !== 'undefined' && !navigator.onLine);
  if (isOffline) {
    addToSyncQueue({
      type: 'TASK_COMPLETION',
      payload: { taskId, date, isCompleted, workerId, notes },
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('sync-queue-updated'));
    return;
  }

  try {
    if (isCompleted) {
      const { error } = await supabase.from('task_completions').upsert(
        {
          task_id: validTaskId,
          task_date: date,
          completed_by: validWorkerId,
          notes: notes || null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'task_id,task_date' }
      );
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('task_completions')
        .delete()
        .match({ task_id: validTaskId, task_date: date });
      if (error) throw error;
    }
  } catch (err) {
    console.warn('Network error setting task completion, queued for sync:', err);
    addToSyncQueue({
      type: 'TASK_COMPLETION',
      payload: { taskId, date, isCompleted, workerId, notes },
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('sync-queue-updated'));
  }
}


export async function checkAndSyncDailyEggTasks(
  recordDate: string,
  savedFlockId: string,
  workerId?: string
): Promise<void> {
  try {
    const tasksForDate = await fetchTasksForDate(recordDate, workerId);
    const eggTasks = tasksForDate.filter((t) => t.task_type === 'daily_record');
    if (eggTasks.length === 0) return;

    // Fetch all active flocks to check farm-wide record completion
    const allFlocks = await fetchFlocks();
    const activeFlocks = allFlocks.filter((f) => f.status === 'active' || !f.status);

    for (const task of eggTasks) {
      let targetFlockIds: string[] = [];
      if (task.flock_ids && task.flock_ids.length > 0) {
        targetFlockIds = task.flock_ids;
      } else if (task.flock_id) {
        targetFlockIds = [task.flock_id];
      } else {
        targetFlockIds = activeFlocks.map((f) => f.id);
      }

      // Check if all target flocks have daily records for recordDate
      const allDone = await Promise.all(
        targetFlockIds.map(async (fid) => {
          if (fid === savedFlockId) return true;
          const hist = await fetchDailyHistory(fid, 60);
          return hist.some((r) => r.record_date === recordDate);
        })
      );

      const isAllTargetDone = targetFlockIds.length > 0 && allDone.every(Boolean);
      await setTaskCompletion(task.task_id, recordDate, isAllTargetDone, workerId);
    }
  } catch (err) {
    console.warn('Failed to sync daily egg tasks:', err);
  }
}

export async function checkAndSyncHealthTasks(
  recordDate: string,
  flockId: string,
  category: string,
  workerId?: string
): Promise<void> {
  try {
    const tasksForDate = await fetchTasksForDate(recordDate, workerId);
    const catLower = (category || '').toLowerCase();

    const healthTasks = tasksForDate.filter((t) => {
      if (catLower.includes('vaksin') && t.task_type === 'vaccine') return true;
      if (catLower.includes('obat') && (t.task_type === 'medicine' || (t.task_type as any) === 'obat')) return true;
      if (catLower.includes('vitamin') && t.task_type === 'vitamin') return true;
      return false;
    });

    if (healthTasks.length === 0) return;

    const allFlocks = await fetchFlocks();
    const activeFlocks = allFlocks.filter((f) => f.status === 'active' || !f.status);

    for (const t of healthTasks) {
      let targetFlockIds: string[] = [];
      if (t.flock_ids && t.flock_ids.length > 0) {
        targetFlockIds = t.flock_ids;
      } else if (t.flock_id) {
        targetFlockIds = [t.flock_id];
      } else {
        targetFlockIds = activeFlocks.map((f) => f.id);
      }

      // If the saved flock is not even one of the target flocks, skip
      if (!targetFlockIds.includes(flockId)) continue;

      const allDone = await Promise.all(
        targetFlockIds.map(async (fid) => {
          if (fid === flockId) return true;
          if (isConfigured) {
            const { data } = await supabase
              .from('health_records')
              .select('id, category')
              .eq('flock_id', fid)
              .eq('record_date', recordDate);
            return Boolean(data && data.some((r: any) => (r.category || '').toLowerCase().includes(catLower)));
          } else if (typeof window !== 'undefined') {
            const hHist = getLocalHealthRecords(fid);
            return hHist.some((r: any) => r.record_date === recordDate && (r.category || '').toLowerCase().includes(catLower));
          }
          return false;
        })
      );

      const isAllTargetDone = targetFlockIds.length > 0 && allDone.every(Boolean);
      await setTaskCompletion(t.task_id, recordDate, isAllTargetDone, workerId);
    }
  } catch (err) {
    console.warn('Failed to sync health tasks:', err);
  }
}

export async function checkAndSyncFeedTasks(
  recordDate: string,
  flockId: string,
  workerId?: string
): Promise<void> {
  try {
    const tasksForDate = await fetchTasksForDate(recordDate, workerId);
    const feedTasks = tasksForDate.filter((t) => t.task_type === 'feed');
    if (feedTasks.length === 0) return;

    const allFlocks = await fetchFlocks();
    const activeFlocks = allFlocks.filter((f) => f.status === 'active' || !f.status);

    for (const t of feedTasks) {
      let targetFlockIds: string[] = [];
      if (t.flock_ids && t.flock_ids.length > 0) {
        targetFlockIds = t.flock_ids;
      } else if (t.flock_id) {
        targetFlockIds = [t.flock_id];
      } else {
        targetFlockIds = activeFlocks.map((f) => f.id);
      }

      // If the saved flock is not part of the target flocks, skip
      if (!targetFlockIds.includes(flockId)) continue;

      const titleLower = (t.title || '').toLowerCase();
      const isMorning = titleLower.includes('pagi');
      const isAfternoon = titleLower.includes('sore');

      const allDone = await Promise.all(
        targetFlockIds.map(async (fid) => {
          let rec: any = null;
          if (isConfigured) {
            const { data } = await supabase
              .from('daily_records')
              .select('feed_kg, feed_morning_kg, feed_afternoon_kg')
              .eq('flock_id', fid)
              .eq('record_date', recordDate)
              .maybeSingle();
            rec = data;
          } else if (typeof window !== 'undefined') {
            const hist = getLocalDailyRecords(fid);
            rec = hist.find((r) => r.record_date === recordDate);
          }

          if (!rec) return false;
          const morning = Number(rec.feed_morning_kg) || 0;
          const afternoon = Number(rec.feed_afternoon_kg) || 0;
          const total = Number(rec.feed_kg) || (morning + afternoon);

          if (isMorning) return morning > 0 || (total > 0 && afternoon === 0);
          if (isAfternoon) return afternoon > 0;
          return total > 0 || morning > 0 || afternoon > 0;
        })
      );

      const isAllTargetDone = targetFlockIds.length > 0 && allDone.every(Boolean);
      await setTaskCompletion(t.task_id, recordDate, isAllTargetDone, workerId);
    }
  } catch (err) {
    console.warn('Failed to sync feed tasks:', err);
  }
}

export interface DayTaskIndicator {
  task_id: string;
  title: string;
  color: string;
  is_completed: boolean;
}

export interface MonthDayTaskStatus {
  total: number;
  completed: number;
  tasks: DayTaskIndicator[];
}

export async function fetchMonthTaskStatus(
  year: number,
  month: number, // 0-indexed (0 = Jan, 11 = Dec)
  workerId?: string
): Promise<Record<string, MonthDayTaskStatus>> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result: Record<string, MonthDayTaskStatus> = {};

  const [allTasks, allFlocks] = await Promise.all([fetchAllTasks(), fetchFlocks()]);
  if (allTasks.length === 0) return result;

  const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  let completions: TaskCompletion[] = [];
  const recordedEggFlocksByDate = new Map<string, Set<string>>(); // date -> Set<flockId>
  const recordedHealthByDate = new Map<string, Map<string, Set<string>>>(); // date -> flockId -> Set<catLower>

  if (isConfigured) {
    try {
      const [compRes, dailyRes, healthRes] = await Promise.all([
        supabase
          .from('task_completions')
          .select('*')
          .gte('task_date', startStr)
          .lte('task_date', endStr),
        supabase
          .from('daily_records')
          .select('flock_id, record_date')
          .gte('record_date', startStr)
          .lte('record_date', endStr),
        supabase
          .from('health_records')
          .select('flock_id, record_date, category')
          .gte('record_date', startStr)
          .lte('record_date', endStr),
      ]);

      if (!compRes.error && compRes.data) completions = compRes.data;
      if (!dailyRes.error && dailyRes.data) {
        dailyRes.data.forEach((r: any) => {
          if (!recordedEggFlocksByDate.has(r.record_date)) {
            recordedEggFlocksByDate.set(r.record_date, new Set());
          }
          recordedEggFlocksByDate.get(r.record_date)!.add(r.flock_id);
        });
      }
      if (!healthRes.error && healthRes.data) {
        healthRes.data.forEach((r: any) => {
          if (!recordedHealthByDate.has(r.record_date)) {
            recordedHealthByDate.set(r.record_date, new Map());
          }
          const fMap = recordedHealthByDate.get(r.record_date)!;
          if (!fMap.has(r.flock_id)) {
            fMap.set(r.flock_id, new Set());
          }
          fMap.get(r.flock_id)!.add((r.category || '').toLowerCase());
        });
      }
    } catch (err) {
      console.warn('Failed to fetch month task data from supabase, fallback to local:', err);
    }
  }

  if (completions.length === 0 && typeof window !== 'undefined') {
    const stored = localStorage.getItem('kandang_task_completions');
    if (stored) {
      const allComp: TaskCompletion[] = JSON.parse(stored);
      completions = allComp.filter((c) => c.task_date >= startStr && c.task_date <= endStr);
    }
  }

  if (typeof window !== 'undefined' && recordedEggFlocksByDate.size === 0) {
    allFlocks.forEach((f) => {
      const hist = getLocalDailyRecords(f.id);
      hist.forEach((r) => {
        if (r.record_date >= startStr && r.record_date <= endStr) {
          if (!recordedEggFlocksByDate.has(r.record_date)) {
            recordedEggFlocksByDate.set(r.record_date, new Set());
          }
          recordedEggFlocksByDate.get(r.record_date)!.add(f.id);
        }
      });
      const hHist = getLocalHealthRecords(f.id);
      hHist.forEach((r) => {
        if (r.record_date >= startStr && r.record_date <= endStr) {
          if (!recordedHealthByDate.has(r.record_date)) {
            recordedHealthByDate.set(r.record_date, new Map());
          }
          const fMap = recordedHealthByDate.get(r.record_date)!;
          if (!fMap.has(f.id)) fMap.set(f.id, new Set());
          fMap.get(f.id)!.add((r.category || '').toLowerCase());
        }
      });
    });
  }

  const compSet = new Set<string>();
  for (const c of completions) {
    compSet.add(`${c.task_id}_${c.task_date}`);
  }

  const activeFlocks = allFlocks.filter((f) => f.status === 'active' || !f.status);

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const targetDate = new Date(year, month, d);
    const targetDayOfWeek = targetDate.getDay();

    const dayTasks: DayTaskIndicator[] = [];

    for (const t of allTasks) {
      if (!t.is_active) continue;
      if (t.start_date > dateStr) continue;
      if (t.end_date && t.end_date < dateStr) continue;

      // Filter by worker (assigned_to or assigned_to_ids)
      if (workerId) {
        const hasSpecificWorker = t.assigned_to || (t.assigned_to_ids && t.assigned_to_ids.length > 0);
        if (hasSpecificWorker) {
          const isDirect = t.assigned_to === workerId;
          const isInList = t.assigned_to_ids && t.assigned_to_ids.includes(workerId);
          if (!isDirect && !isInList) continue;
        }
      }

      let isDue = false;
      if (t.recurrence_type === 'once') {
        isDue = t.start_date === dateStr;
      } else if (t.recurrence_type === 'daily') {
        isDue = true;
      } else if (t.recurrence_type === 'days_of_week') {
        isDue = (t.days_of_week || []).includes(targetDayOfWeek);
      } else if (t.recurrence_type === 'interval') {
        const start = new Date(t.start_date);
        const diffDays = Math.floor((targetDate.getTime() - start.getTime()) / 86400000);
        isDue = diffDays >= 0 && diffDays % Math.max(1, t.recurrence_interval || 1) === 0;
      } else {
        isDue = true;
      }

      if (isDue) {
        let isDone = compSet.has(`${t.id}_${dateStr}`);

        // Also cross-verify with daily egg records
        if (!isDone && t.task_type === 'daily_record') {
          const eggDoneFlocks = recordedEggFlocksByDate.get(dateStr) || new Set<string>();
          let targetFids: string[] = [];
          if (t.flock_ids && t.flock_ids.length > 0) targetFids = t.flock_ids;
          else if (t.flock_id) targetFids = [t.flock_id];
          else targetFids = activeFlocks.map((f) => f.id);

          if (targetFids.length > 0 && targetFids.every((fid) => eggDoneFlocks.has(fid))) {
            isDone = true;
          }
        }

        // Also cross-verify with health records
        if (!isDone && (t.task_type === 'vaccine' || t.task_type === 'medicine' || (t.task_type as any) === 'obat' || t.task_type === 'vitamin')) {
          const targetCat = t.task_type === 'vaccine' ? 'vaksin' : t.task_type === 'vitamin' ? 'vitamin' : 'obat';
          const hMap = recordedHealthByDate.get(dateStr);
          let targetFids: string[] = [];
          if (t.flock_ids && t.flock_ids.length > 0) targetFids = t.flock_ids;
          else if (t.flock_id) targetFids = [t.flock_id];
          else targetFids = activeFlocks.map((f) => f.id);

          if (targetFids.length > 0 && hMap && targetFids.every((fid) => {
            const catSet = hMap.get(fid);
            return catSet && Array.from(catSet).some((c) => c.includes(targetCat));
          })) {
            isDone = true;
          }
        }

        dayTasks.push({
          task_id: t.id,
          title: t.title,
          color: t.color || '#10b981',
          is_completed: isDone,
        });
      }
    }

    if (dayTasks.length > 0) {
      result[dateStr] = {
        total: dayTasks.length,
        completed: dayTasks.filter((t) => t.is_completed).length,
        tasks: dayTasks,
      };
    }
  }

  return result;
}

export async function createFarmTask(task: Partial<FarmTask>): Promise<FarmTask> {
  const cleanFlockId = toValidUuidOrNull(task.flock_id);
  const cleanAssignedTo = toValidUuidOrNull(task.assigned_to);

  const newTask: FarmTask = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}`,
    title: task.title?.trim() || 'Tugas Baru',
    description: task.description?.trim() || null,
    task_type: task.task_type || 'custom',
    flock_id: cleanFlockId,
    flock_ids: task.flock_ids && task.flock_ids.length > 0 ? task.flock_ids : null,
    assigned_to: cleanAssignedTo,
    assigned_to_ids: task.assigned_to_ids && task.assigned_to_ids.length > 0 ? task.assigned_to_ids : null,
    recurrence_type: task.recurrence_type || 'daily',
    recurrence_interval: task.recurrence_interval || 1,
    days_of_week: task.days_of_week || [],
    start_date: task.start_date || new Date().toISOString().split('T')[0],
    end_date: task.end_date || null,
    due_time: task.due_time || '16:00',
    color: task.color || '#10b981',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  // Anti-duplication safeguard: check if identical active task already exists in Supabase
  if (isConfigured) {
    try {
      const { data: existingDup } = await supabase
        .from('farm_tasks')
        .select('*')
        .eq('is_active', true)
        .eq('title', newTask.title)
        .eq('task_type', newTask.task_type)
        .limit(1);

      if (existingDup && existingDup.length > 0) {
        const match = existingDup[0];
        if (
          match.recurrence_type === newTask.recurrence_type &&
          match.start_date === newTask.start_date
        ) {
          console.warn('Prevented duplicate clone insertion for:', newTask.title);
          return match;
        }
      }
    } catch (e) {}

    try {
      const { data, error } = await supabase
        .from('farm_tasks')
        .insert({
          title: newTask.title,
          description: newTask.description,
          task_type: newTask.task_type,
          flock_id: cleanFlockId,
          flock_ids: newTask.flock_ids,
          assigned_to: cleanAssignedTo,
          assigned_to_ids: newTask.assigned_to_ids,
          recurrence_type: newTask.recurrence_type,
          recurrence_interval: newTask.recurrence_interval,
          days_of_week: newTask.days_of_week,
          start_date: newTask.start_date,
          end_date: newTask.end_date,
          due_time: newTask.due_time,
          color: newTask.color,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error inserting farm_tasks:', error.message || error);
      } else if (data) {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('kandang_tasks');
          const tasks: FarmTask[] = stored ? JSON.parse(stored) : [];
          const filtered = tasks.filter((t) => t.id !== data.id && t.id !== newTask.id);
          filtered.unshift(data);
          localStorage.setItem('kandang_tasks', JSON.stringify(filtered));
        }
        return data;
      }
    } catch (err) {
      console.error('Failed insert to supabase farm_tasks:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kandang_tasks');
    const tasks: FarmTask[] = stored ? JSON.parse(stored) : [];
    tasks.unshift(newTask);
    localStorage.setItem('kandang_tasks', JSON.stringify(tasks));
  }
  return newTask;
}

export async function fetchAllTasks(): Promise<FarmTask[]> {
  if (isConfigured) {
    try {
      const { data, error } = await supabase
        .from('farm_tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch from supabase farm_tasks:', error.message || error);
      } else if (data) {
        const deletedIds = typeof window !== 'undefined'
          ? new Set<string>(JSON.parse(localStorage.getItem('kandang_deleted_tasks') || '[]'))
          : new Set<string>();

        // Auto-Deduplicate: Clean up all multiplied / cloned tasks caused by previous loop
        const seenKeys = new Map<string, FarmTask>();
        const duplicateIdsToDeactivate: string[] = [];

        for (const task of data) {
          if (deletedIds.has(task.id)) {
            duplicateIdsToDeactivate.push(task.id);
            continue;
          }

          // Generate composite signature
          const sig = `${(task.title || '').trim().toLowerCase()}|${task.task_type}|${task.recurrence_type}|${task.due_time || ''}|${task.start_date || ''}`;
          if (seenKeys.has(sig)) {
            duplicateIdsToDeactivate.push(task.id);
          } else {
            seenKeys.set(sig, task);
          }
        }

        const uniqueTasks = Array.from(seenKeys.values());

        // Background cleanup: soft-delete all identified duplicate clones in Supabase
        if (duplicateIdsToDeactivate.length > 0 && isConfigured) {
          const validIds = duplicateIdsToDeactivate.map(toValidUuidOrNull).filter(Boolean);
          if (validIds.length > 0) {
            (async () => {
              try {
                await supabase
                  .from('farm_tasks')
                  .update({ is_active: false })
                  .in('id', validIds);
                console.log(`Auto-cleaned ${validIds.length} duplicate cloned tasks from Supabase.`);
              } catch (err) {
                console.warn('Background cleanup of duplicate tasks:', err);
              }
            })();
          }
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('kandang_tasks', JSON.stringify(uniqueTasks));
        }
        return uniqueTasks;
      }
    } catch (err) {
      console.error('Exception fetching farm_tasks from Supabase:', err);
    }
  }

  // Local / offline fallback
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('kandang_tasks');
  if (stored) {
    try {
      const parsed: FarmTask[] = JSON.parse(stored);
      if (parsed.length > 0) {
        // Also deduplicate local
        const seen = new Set<string>();
        const unique = parsed.filter((t) => {
          const sig = `${(t.title || '').trim().toLowerCase()}|${t.task_type}|${t.recurrence_type}|${t.start_date || ''}`;
          if (seen.has(sig)) return false;
          seen.add(sig);
          return true;
        });
        return unique;
      }
    } catch (e) {}
  }

  // Guaranteed default seed task if completely empty
  const defaultTasks: FarmTask[] = [
    {
      id: 'task-egg-default',
      title: 'Catat Produksi Telur & Pakan',
      description: 'Hitung jumlah butir telur utuh, rusak, dan timbangan sore ini',
      task_type: 'daily_record',
      recurrence_type: 'daily',
      due_time: '16:30',
      start_date: '2026-01-01',
      color: '#10b981', // Emerald
      is_active: true,
    },
  ];
  if (typeof window !== 'undefined') {
    localStorage.setItem('kandang_tasks', JSON.stringify(defaultTasks));
  }
  return defaultTasks;
}

export async function updateFarmTask(id: string, updates: Partial<FarmTask>): Promise<FarmTask> {
  const cleanPayload: any = { ...updates };
  if ('flock_id' in cleanPayload) cleanPayload.flock_id = toValidUuidOrNull(cleanPayload.flock_id);
  if ('flock_ids' in cleanPayload) cleanPayload.flock_ids = cleanPayload.flock_ids && cleanPayload.flock_ids.length > 0 ? cleanPayload.flock_ids : null;
  if ('assigned_to' in cleanPayload) cleanPayload.assigned_to = toValidUuidOrNull(cleanPayload.assigned_to);
  if ('assigned_to_ids' in cleanPayload) cleanPayload.assigned_to_ids = cleanPayload.assigned_to_ids && cleanPayload.assigned_to_ids.length > 0 ? cleanPayload.assigned_to_ids : null;

  const validUuid = toValidUuidOrNull(id);

  if (isConfigured) {
    if (validUuid) {
      try {
        const { data, error } = await supabase
          .from('farm_tasks')
          .update(cleanPayload)
          .eq('id', validUuid)
          .select()
          .single();

        if (error) {
          console.error('Supabase updateFarmTask error:', error.message || error);
        } else if (data) {
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('kandang_tasks');
            if (stored) {
              const tasks: FarmTask[] = JSON.parse(stored);
              const index = tasks.findIndex((t) => t.id === validUuid);
              if (index >= 0) {
                tasks[index] = data;
                localStorage.setItem('kandang_tasks', JSON.stringify(tasks));
              }
            }
          }
          return data;
        }
      } catch (err) {
        console.error('Failed update in supabase farm_tasks:', err);
      }
    } else {
      // If task ID is non-UUID, check if an existing task with same title already exists before creating
      try {
        const { data: existing } = await supabase
          .from('farm_tasks')
          .select('id')
          .eq('is_active', true)
          .eq('title', updates.title || 'Tugas Baru')
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase.from('farm_tasks').update(cleanPayload).eq('id', existing[0].id);
          return { id: existing[0].id, ...cleanPayload } as FarmTask;
        }

        const created = await createFarmTask({
          title: updates.title || 'Tugas Baru',
          description: updates.description,
          task_type: updates.task_type || 'custom',
          flock_id: cleanPayload.flock_id,
          assigned_to: cleanPayload.assigned_to,
          recurrence_type: updates.recurrence_type || 'daily',
          recurrence_interval: updates.recurrence_interval,
          days_of_week: updates.days_of_week,
          start_date: updates.start_date || new Date().toISOString().split('T')[0],
          end_date: updates.end_date,
          due_time: updates.due_time || '16:00',
          color: updates.color || '#10b981',
        });
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('kandang_tasks');
          if (stored) {
            const tasks: FarmTask[] = JSON.parse(stored);
            const filtered = tasks.filter((t) => t.id !== id && t.id !== created.id);
            filtered.unshift(created);
            localStorage.setItem('kandang_tasks', JSON.stringify(filtered));
          }
        }
        return created;
      } catch (err) {
        console.error('Failed to upsert non-uuid task to Supabase:', err);
      }
    }
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kandang_tasks');
    if (stored) {
      const tasks: FarmTask[] = JSON.parse(stored);
      const index = tasks.findIndex((t) => t.id === id);
      if (index >= 0) {
        tasks[index] = { ...tasks[index], ...cleanPayload };
        localStorage.setItem('kandang_tasks', JSON.stringify(tasks));
        return tasks[index];
      }
    }
  }
  return { id, title: updates.title || '', task_type: updates.task_type || 'custom', recurrence_type: updates.recurrence_type || 'daily', start_date: '', color: updates.color || '#06b6d4', is_active: true } as FarmTask;
}

export async function deleteTask(
  id: string,
  asOfDate?: string,
  forceDelete: boolean = false
): Promise<{ preservedPast: boolean }> {
  const validUuid = toValidUuidOrNull(id);
  const today = new Date().toISOString().split('T')[0];
  const cutoff = asOfDate || today;
  let preservedPast = false;

  // 1. Find existing task to check start_date and recurrence_type
  let existingTask: FarmTask | null = null;
  if (isConfigured && validUuid) {
    try {
      const { data } = await supabase.from('farm_tasks').select('*').eq('id', validUuid).maybeSingle();
      if (data) existingTask = data;
    } catch (err) {
      console.warn('Failed to query farm_task before delete:', err);
    }
  }

  if (!existingTask && typeof window !== 'undefined') {
    const stored = localStorage.getItem('kandang_tasks');
    if (stored) {
      const tasks: FarmTask[] = JSON.parse(stored);
      existingTask = tasks.find((t) => t.id === id || (validUuid && t.id === validUuid)) || null;
    }
  }

  // If NOT forceDelete and asOfDate is specified (calendar revocation mode)
  if (!forceDelete && asOfDate) {
    const hasStarted = existingTask && existingTask.start_date && existingTask.start_date <= cutoff;
    const isRecurring = existingTask ? existingTask.recurrence_type !== 'once' : true;
    const isPastOnce = existingTask && existingTask.recurrence_type === 'once' && existingTask.start_date < cutoff;

    if (isPastOnce) {
      return { preservedPast: true };
    }

    if (hasStarted && isRecurring) {
      preservedPast = true;
      if (isConfigured && validUuid) {
        try {
          const { error } = await supabase
            .from('farm_tasks')
            .update({ end_date: cutoff, is_active: true })
            .eq('id', validUuid);
          if (error) {
            console.error('Supabase update end_date error:', error.message || error);
          }
        } catch (err) {
          console.error('Failed to update end_date in supabase:', err);
        }
      }

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('kandang_tasks');
        if (stored) {
          const tasks: FarmTask[] = JSON.parse(stored);
          const updated = tasks.map((t) => {
            if (t.id === id || (validUuid && t.id === validUuid)) {
              return { ...t, end_date: cutoff, is_active: true };
            }
            return t;
          });
          localStorage.setItem('kandang_tasks', JSON.stringify(updated));
        }
      }

      return { preservedPast: true };
    }
  }

  // Full soft-delete (from task manager CRUD list or unstarted task)
  if (isConfigured && validUuid) {
    try {
      const { error } = await supabase
        .from('farm_tasks')
        .update({ is_active: false })
        .eq('id', validUuid);
      if (error) {
        console.error('Supabase soft-delete farm_tasks error:', error.message || error);
      }
    } catch (err) {
      console.error('Failed soft-delete in supabase farm_tasks:', err);
    }
  }

  if (typeof window !== 'undefined') {
    // 1. Remove from local active tasks cache
    const stored = localStorage.getItem('kandang_tasks');
    if (stored) {
      const tasks: FarmTask[] = JSON.parse(stored);
      const filtered = tasks.filter((t) => t.id !== id && (!validUuid || t.id !== validUuid));
      localStorage.setItem('kandang_tasks', JSON.stringify(filtered));
    }

    // 2. Add to deleted IDs set so it will NEVER be resurrected on page refresh
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem('kandang_deleted_tasks') || '[]');
      if (!deletedList.includes(id)) deletedList.push(id);
      if (validUuid && !deletedList.includes(validUuid)) deletedList.push(validUuid);
      localStorage.setItem('kandang_deleted_tasks', JSON.stringify(deletedList));
    } catch (e) {}
  }

  return { preservedPast: false };
}
