export interface Flock {
  id: string;
  name: string;
  coop_name: string;
  strain: string;
  chick_in_date: string;
  initial_population: number;
  current_population: number;
  total_mortality?: number;
  total_culling?: number;
  age_weeks: number;
  status: 'active' | 'archived';
  created_at?: string;
}

export interface DailyRecord {
  id?: string;
  flock_id: string;
  record_date: string;
  egg_good_pcs: number;
  egg_good_kg: number;
  egg_bad_pcs: number;
  egg_bad_kg: number;
  mortality_pcs: number;
  culling_pcs: number;
  feed_kg: number;
  hd_percent?: number;
  fcr?: number;
  avg_egg_weight_g?: number;
  notes?: string;
  created_at?: string;
}

export interface HealthRecord {
  id?: string;
  flock_id: string;
  record_date: string;
  category: 'Vaksin' | 'Obat' | 'Vitamin' | 'Desinfektan';
  item_name: string;
  dosage?: string;
  method?: 'Air Minum' | 'Injeksi' | 'Tetes Mata' | 'Pakan' | 'Semprot' | string;
  notes?: string;
  created_at?: string;
}

export interface DashboardSummary {
  flock: Flock;
  today: {
    has_recorded: boolean;
    record_date: string;
    egg_good_pcs: number;
    egg_good_kg: number;
    egg_bad_pcs: number;
    egg_bad_kg: number;
    mortality_pcs: number;
    culling_pcs: number;
    feed_kg: number;
    hd_percent: number;
    fcr: number;
    avg_egg_weight_g: number;
    notes: string;
  };
  totals: {
    total_mortality: number;
    total_culling: number;
    total_egg_good_pcs: number;
    total_egg_good_kg: number;
    total_egg_bad_pcs: number;
    total_egg_bad_kg: number;
    total_feed_kg: number;
    total_days_recorded: number;
    overall_hd_percent: number;
    overall_fcr: number;
  };
}
