import { createClient } from '@supabase/supabase-js';
import { Flock, DailyRecord, HealthRecord, DashboardSummary, AppProfile, FarmTask, TaskCompletion, DailyTaskView } from '@/types/database';

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

    if (error || !data || data.length === 0) {
      // If table doesn't exist yet, fallback to local storage
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('kandang_profiles');
        if (stored) return JSON.parse(stored);
        localStorage.setItem('kandang_profiles', JSON.stringify(DEFAULT_PROFILES));
      }
      return DEFAULT_PROFILES;
    }
    return data;
  } catch (err) {
    console.warn('Fallback to local profiles:', err);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('kandang_profiles');
      if (stored) return JSON.parse(stored);
    }
    return DEFAULT_PROFILES;
  }
}

export async function createProfile(profile: Partial<AppProfile>): Promise<AppProfile> {
  const newProfile: AppProfile = {
    id: `p-${Date.now()}`,
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
      if (!error && data) return data;
    } catch (err) {
      console.warn('Failed insert to supabase app_profiles, saving to local storage:', err);
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
  if (isConfigured) {
    try {
      const { data, error } = await supabase
        .from('app_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {
      console.warn('Failed update to supabase app_profiles, saving to local storage:', err);
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
  if (isConfigured) {
    try {
      const { error } = await supabase
        .from('app_profiles')
        .update({ is_active: false })
        .eq('id', id);
      if (!error) return;
    } catch (err) {
      console.warn('Failed soft-delete in supabase, deleting from local storage:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const current = await fetchProfiles();
    const updated = current.filter((p) => p.id !== id);
    localStorage.setItem('kandang_profiles', JSON.stringify(updated));
  }
}

export async function verifyOwnerPin(profileId: string, inputPin: string): Promise<boolean> {
  if (isConfigured) {
    try {
      const { data, error } = await supabase.rpc('verify_owner_pin', {
        p_profile_id: profileId,
        p_pin: inputPin.trim(),
      });
      if (!error && data !== null) return Boolean(data);
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

export async function fetchTasksForDate(date: string, workerId?: string): Promise<DailyTaskView[]> {
  if (isConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_tasks_for_date', {
        p_date: date,
        p_worker_id: workerId || null,
      });
      if (!error && data) return data;
    } catch (err) {
      console.warn('RPC get_tasks_for_date failed, using local tasks:', err);
    }
  }

  // Local fallback: generate tasks for date
  if (typeof window === 'undefined') return [];
  const storedTasks = localStorage.getItem('kandang_tasks');
  const allTasks: FarmTask[] = storedTasks ? JSON.parse(storedTasks) : [
    {
      id: 'task-egg-default',
      title: 'Catat Produksi Telur & Pakan',
      description: 'Hitung jumlah butir telur utuh, rusak, dan timbangan sore ini',
      task_type: 'daily_record',
      recurrence_type: 'daily',
      due_time: '16:30',
      start_date: '2026-01-01',
      is_active: true,
    }
  ];

  const storedCompletions = localStorage.getItem('kandang_task_completions');
  const completions: TaskCompletion[] = storedCompletions ? JSON.parse(storedCompletions) : [];

  const targetDate = new Date(date);
  const targetDayOfWeek = targetDate.getDay();

  return allTasks.filter((t) => {
    if (!t.is_active) return false;
    if (t.start_date > date) return false;
    if (t.end_date && t.end_date < date) return false;
    if (workerId && t.assigned_to && t.assigned_to !== workerId) return false;

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
      assigned_to: t.assigned_to,
      recurrence_type: t.recurrence_type,
      recurrence_interval: t.recurrence_interval,
      days_of_week: t.days_of_week,
      due_time: t.due_time,
      is_completed: isComp,
    };
  });
}

export async function toggleTaskCompletion(
  taskId: string,
  date: string,
  workerId?: string,
  notes?: string
): Promise<boolean> {
  if (isConfigured) {
    try {
      const { data, error } = await supabase.rpc('toggle_task_completion', {
        p_task_id: taskId,
        p_date: date,
        p_worker_id: workerId || null,
        p_notes: notes || null,
      });
      if (!error && data !== null) return Boolean(data);
    } catch (err) {
      console.warn('RPC toggle_task_completion failed, updating locally:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kandang_task_completions');
    let completions: TaskCompletion[] = stored ? JSON.parse(stored) : [];
    const index = completions.findIndex((c) => c.task_id === taskId && c.task_date === date);
    if (index >= 0) {
      completions.splice(index, 1);
      localStorage.setItem('kandang_task_completions', JSON.stringify(completions));
      return false;
    } else {
      completions.push({
        id: `tc-${Date.now()}`,
        task_id: taskId,
        task_date: date,
        completed_by: workerId || null,
        completed_at: new Date().toISOString(),
        notes: notes || null,
      });
      localStorage.setItem('kandang_task_completions', JSON.stringify(completions));
      return true;
    }
  }
  return true;
}

export async function createFarmTask(task: Partial<FarmTask>): Promise<FarmTask> {
  const newTask: FarmTask = {
    id: `task-${Date.now()}`,
    title: task.title?.trim() || 'Tugas Baru',
    description: task.description?.trim() || null,
    task_type: task.task_type || 'custom',
    flock_id: task.flock_id || null,
    assigned_to: task.assigned_to || null,
    recurrence_type: task.recurrence_type || 'daily',
    recurrence_interval: task.recurrence_interval || 1,
    days_of_week: task.days_of_week || [],
    start_date: task.start_date || new Date().toISOString().split('T')[0],
    end_date: task.end_date || null,
    due_time: task.due_time || '16:00',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  if (isConfigured) {
    try {
      const { data, error } = await supabase
        .from('farm_tasks')
        .insert({
          title: newTask.title,
          description: newTask.description,
          task_type: newTask.task_type,
          flock_id: newTask.flock_id,
          assigned_to: newTask.assigned_to,
          recurrence_type: newTask.recurrence_type,
          recurrence_interval: newTask.recurrence_interval,
          days_of_week: newTask.days_of_week,
          start_date: newTask.start_date,
          end_date: newTask.end_date,
          due_time: newTask.due_time,
          is_active: true,
        })
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {
      console.warn('Failed insert to supabase farm_tasks, saving to local storage:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kandang_tasks');
    const tasks: FarmTask[] = stored ? JSON.parse(stored) : [];
    tasks.push(newTask);
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
      if (!error && data) return data;
    } catch (err) {
      console.warn('Failed to fetch from supabase farm_tasks, using local:', err);
    }
  }

  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('kandang_tasks');
  return stored ? JSON.parse(stored) : [];
}

export async function updateFarmTask(id: string, updates: Partial<FarmTask>): Promise<FarmTask> {
  if (isConfigured) {
    try {
      const { data, error } = await supabase
        .from('farm_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {
      console.warn('Failed update in supabase farm_tasks, updating locally:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kandang_tasks');
    if (stored) {
      const tasks: FarmTask[] = JSON.parse(stored);
      const index = tasks.findIndex((t) => t.id === id);
      if (index >= 0) {
        tasks[index] = { ...tasks[index], ...updates };
        localStorage.setItem('kandang_tasks', JSON.stringify(tasks));
        return tasks[index];
      }
    }
  }
  return { id, title: updates.title || '', task_type: updates.task_type || 'custom', recurrence_type: updates.recurrence_type || 'daily', start_date: '', is_active: true } as FarmTask;
}

export async function deleteTask(id: string): Promise<void> {
  if (isConfigured) {
    try {
      const { error } = await supabase
        .from('farm_tasks')
        .update({ is_active: false })
        .eq('id', id);
      if (!error) return;
    } catch (err) {
      console.warn('Failed soft-delete in supabase farm_tasks, deleting from local:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kandang_tasks');
    if (stored) {
      const tasks: FarmTask[] = JSON.parse(stored);
      const filtered = tasks.filter((t) => t.id !== id);
      localStorage.setItem('kandang_tasks', JSON.stringify(filtered));
    }
  }
}



