import { createClient } from '@supabase/supabase-js';
import { Flock, DailyRecord, HealthRecord, DashboardSummary } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummykey';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const isConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xyzcompany')
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

function getLocalDailyRecords(flockId: string): DailyRecord[] {
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
    return (data || []).filter((f: any) => f && f.id && !f.id.startsWith('flock-demo'));
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
    const todayHdp = currentPop > 0 ? Number(((todayGoodPcs / currentPop) * 100).toFixed(2)) : 0;
    const todayHhp = initialPop > 0 ? Number(((todayGoodPcs / initialPop) * 100).toFixed(2)) : 0;

    const overallHdp = records.length > 0 && currentPop > 0 ? Number(((totalEggGoodPcs / (currentPop * records.length)) * 100).toFixed(2)) : 0;
    const overallHhp = records.length > 0 && initialPop > 0 ? Number(((totalEggGoodPcs / (initialPop * records.length)) * 100).toFixed(2)) : 0;
    const mortRate = initialPop > 0 ? Number(((totalMort / initialPop) * 100).toFixed(2)) : 0;
    const overallFCR = totalEggGoodKg > 0 ? totalFeedKg / totalEggGoodKg : 0;

    return {
      flock: { ...flock, current_population: currentPop },
      today: {
        has_recorded: !!todayRecord,
        record_date: todayRecord?.record_date || todayStr,
        egg_good_pcs: todayGoodPcs,
        egg_good_kg: todayRecord?.egg_good_kg || 0,
        egg_bad_pcs: todayRecord?.egg_bad_pcs || 0,
        egg_bad_kg: todayRecord?.egg_bad_kg || 0,
        mortality_pcs: todayRecord?.mortality_pcs || 0,
        culling_pcs: todayRecord?.culling_pcs || 0,
        feed_kg: todayRecord?.feed_kg || 0,
        hd_percent: todayHdp,
        hdp_percent: todayHdp,
        hhp_percent: todayHhp,
        fcr: todayRecord?.fcr || 0,
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
  if (!isConfigured) {
    return getLocalDailyRecords(flockId).slice(0, limit);
  }
  try {
    const { data, error } = await supabase.rpc('get_flock_daily_history', { p_flock_id: flockId, p_limit: limit });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Using local fallback for daily history:', err);
    return getLocalDailyRecords(flockId).slice(0, limit);
  }
}

export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  if (!isConfigured) {
    const records = getLocalDailyRecords(record.flock_id);
    const existingIndex = records.findIndex((r) => r.record_date === record.record_date);

    const flocks = getLocalFlocks();
    const flock = flocks.find((f) => f.id === record.flock_id);
    const activePop = flock?.current_population || 1000;
    const initialPop = flock?.initial_population || activePop || 1000;

    const hdp = activePop > 0 ? Number(((record.egg_good_pcs / activePop) * 100).toFixed(2)) : 0;
    const hhp = initialPop > 0 ? Number(((record.egg_good_pcs / initialPop) * 100).toFixed(2)) : 0;
    const fcr = record.egg_good_kg > 0 ? Number((record.feed_kg / record.egg_good_kg).toFixed(2)) : 0;
    const avgW = record.egg_good_pcs > 0 ? Number(((record.egg_good_kg * 1000) / record.egg_good_pcs).toFixed(2)) : 0;

    const fullRecord: DailyRecord = {
      ...record,
      hd_percent: hdp,
      hdp_percent: hdp,
      hhp_percent: hhp,
      fcr: fcr,
      avg_egg_weight_g: avgW
    };

    if (existingIndex >= 0) {
      records[existingIndex] = fullRecord;
    } else {
      records.unshift(fullRecord);
    }
    localStorage.setItem(`kandang_daily_${record.flock_id}`, JSON.stringify(records));
    return;
  }

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
}

export async function fetchHealthRecords(flockId: string): Promise<HealthRecord[]> {
  if (!isConfigured) {
    return getLocalHealthRecords(flockId);
  }
  try {
    const { data, error } = await supabase.rpc('get_flock_health_records', { p_flock_id: flockId });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Using local fallback for health records:', err);
    return getLocalHealthRecords(flockId);
  }
}

export async function saveHealthRecord(record: HealthRecord): Promise<void> {
  if (!isConfigured) {
    const records = getLocalHealthRecords(record.flock_id);
    const newRecord = { ...record, id: `h-${Date.now()}` };
    records.unshift(newRecord);
    localStorage.setItem(`kandang_health_${record.flock_id}`, JSON.stringify(records));
    return;
  }

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

