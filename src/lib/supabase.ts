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
const DEMO_FLOCK: Flock = {
  id: 'flock-demo-1',
  name: 'Angkatan 12 - Layer Alpha',
  coop_name: 'Kandang A',
  strain: 'Isa Brown',
  chick_in_date: '2026-05-01',
  initial_population: 2000,
  current_population: 1982,
  total_mortality: 18,
  total_culling: 0,
  age_weeks: 18,
  status: 'active',
  created_at: new Date().toISOString()
};

function getLocalFlocks(): Flock[] {
  if (typeof window === 'undefined') return [DEMO_FLOCK];
  const data = localStorage.getItem('kandang_flocks');
  if (!data) {
    localStorage.setItem('kandang_flocks', JSON.stringify([DEMO_FLOCK]));
    return [DEMO_FLOCK];
  }
  return JSON.parse(data);
}

function getLocalDailyRecords(flockId: string): DailyRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(`kandang_daily_${flockId}`);
  if (!data) {
    const initialRecords: DailyRecord[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const eggPcs = Math.floor(1730 + Math.random() * 80);
      const eggKg = Number((eggPcs * 0.0625).toFixed(2));
      const feedKg = Number((230 + Math.random() * 5).toFixed(2));
      const mort = Math.random() > 0.75 ? 1 : 0;
      
      const activePop = 1982;
      const hd = Number(((eggPcs / activePop) * 100).toFixed(2));
      const fcr = Number((feedKg / eggKg).toFixed(2));
      const avgW = Number(((eggKg * 1000) / eggPcs).toFixed(2));

      initialRecords.push({
        flock_id: flockId,
        record_date: dateStr,
        egg_good_pcs: eggPcs,
        egg_good_kg: eggKg,
        egg_bad_pcs: 14,
        egg_bad_kg: 0.85,
        mortality_pcs: mort,
        culling_pcs: 0,
        feed_kg: feedKg,
        hd_percent: hd,
        fcr: fcr,
        avg_egg_weight_g: avgW,
        notes: i === 0 ? 'Kondisi ayam sehat, nafsu makan normal.' : ''
      });
    }
    localStorage.setItem(`kandang_daily_${flockId}`, JSON.stringify(initialRecords));
    return initialRecords;
  }
  return JSON.parse(data);
}

function getLocalHealthRecords(flockId: string): HealthRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(`kandang_health_${flockId}`);
  if (!data) {
    const initialHealth: HealthRecord[] = [
      {
        id: 'h-1',
        flock_id: flockId,
        record_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        category: 'Vitamin',
        item_name: 'Egg Stimulant Vita',
        dosage: '100g / 200L Air',
        method: 'Air Minum',
        notes: 'Pemberian vitamin rutin pemicu telur'
      },
      {
        id: 'h-2',
        flock_id: flockId,
        record_date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
        category: 'Vaksin',
        item_name: 'Vaksin ND-IB Booster',
        dosage: '2000 Dosis',
        method: 'Air Minum',
        notes: 'Vaksinasi booster rutin umur 16 minggu'
      }
    ];
    localStorage.setItem(`kandang_health_${flockId}`, JSON.stringify(initialHealth));
    return initialHealth;
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
    return data || [];
  } catch (err) {
    console.warn('Using local fallback for get_flocks:', err);
    return getLocalFlocks();
  }
}

export async function fetchDashboardSummary(flockId: string): Promise<DashboardSummary> {
  if (!isConfigured) {
    const flocks = getLocalFlocks();
    const flock = flocks.find((f) => f.id === flockId) || DEMO_FLOCK;
    const records = getLocalDailyRecords(flockId);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = records.find((r) => r.record_date === todayStr) || records[0];

    const totalMort = records.reduce((acc, r) => acc + (r.mortality_pcs || 0), 0);
    const totalCull = records.reduce((acc, r) => acc + (r.culling_pcs || 0), 0);
    const totalEggGoodPcs = records.reduce((acc, r) => acc + (r.egg_good_pcs || 0), 0);
    const totalEggGoodKg = records.reduce((acc, r) => acc + (r.egg_good_kg || 0), 0);
    const totalFeedKg = records.reduce((acc, r) => acc + (r.feed_kg || 0), 0);
    const totalEggBadPcs = records.reduce((acc, r) => acc + (r.egg_bad_pcs || 0), 0);
    const totalEggBadKg = records.reduce((acc, r) => acc + (r.egg_bad_kg || 0), 0);

    const overallHD = records.length > 0 ? (totalEggGoodPcs / (flock.current_population * records.length)) * 100 : 0;
    const overallFCR = totalEggGoodKg > 0 ? totalFeedKg / totalEggGoodKg : 0;

    return {
      flock,
      today: {
        has_recorded: !!todayRecord,
        record_date: todayRecord?.record_date || todayStr,
        egg_good_pcs: todayRecord?.egg_good_pcs || 0,
        egg_good_kg: todayRecord?.egg_good_kg || 0,
        egg_bad_pcs: todayRecord?.egg_bad_pcs || 0,
        egg_bad_kg: todayRecord?.egg_bad_kg || 0,
        mortality_pcs: todayRecord?.mortality_pcs || 0,
        culling_pcs: todayRecord?.culling_pcs || 0,
        feed_kg: todayRecord?.feed_kg || 0,
        hd_percent: todayRecord?.hd_percent || 0,
        fcr: todayRecord?.fcr || 0,
        avg_egg_weight_g: todayRecord?.avg_egg_weight_g || 0,
        notes: todayRecord?.notes || ''
      },
      totals: {
        total_mortality: totalMort,
        total_culling: totalCull,
        total_egg_good_pcs: totalEggGoodPcs,
        total_egg_good_kg: Number(totalEggGoodKg.toFixed(2)),
        total_egg_bad_pcs: totalEggBadPcs,
        total_egg_bad_kg: Number(totalEggBadKg.toFixed(2)),
        total_feed_kg: Number(totalFeedKg.toFixed(2)),
        total_days_recorded: records.length,
        overall_hd_percent: Number(overallHD.toFixed(2)),
        overall_fcr: Number(overallFCR.toFixed(2))
      }
    };
  }

  try {
    const { data, error } = await supabase.rpc('get_flock_dashboard_summary', { p_flock_id: flockId });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Using local fallback for dashboard summary:', err);
    return fetchDashboardSummary(flockId);
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

    const activePop = 1982;
    const hd = Number(((record.egg_good_pcs / activePop) * 100).toFixed(2));
    const fcr = record.egg_good_kg > 0 ? Number((record.feed_kg / record.egg_good_kg).toFixed(2)) : 0;
    const avgW = record.egg_good_pcs > 0 ? Number(((record.egg_good_kg * 1000) / record.egg_good_pcs).toFixed(2)) : 0;

    const fullRecord: DailyRecord = {
      ...record,
      hd_percent: hd,
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
    p_method: record.method || '',
    p_notes: record.notes || ''
  });
  if (error) throw error;
}

export async function createFlock(flock: Partial<Flock>): Promise<Flock> {
  if (!isConfigured) {
    const flocks = getLocalFlocks();
    const newFlock: Flock = {
      id: `flock-${Date.now()}`,
      name: flock.name || 'Angkatan Baru',
      coop_name: flock.coop_name || 'Kandang A',
      strain: flock.strain || 'Isa Brown',
      chick_in_date: flock.chick_in_date || new Date().toISOString().split('T')[0],
      initial_population: flock.initial_population || 1000,
      current_population: flock.initial_population || 1000,
      total_mortality: 0,
      total_culling: 0,
      age_weeks: 1,
      status: 'active',
      created_at: new Date().toISOString()
    };
    flocks.unshift(newFlock);
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

