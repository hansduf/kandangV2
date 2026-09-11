export interface Flock {
  id: string;
  name: string;
  coop_name: string;
  strain: string;
  capacity?: number;
  chick_in_date: string;
  chick_out_date?: string | null;
  initial_population: number;
  current_population: number;
  total_mortality?: number;
  total_culling?: number;
  age_weeks: number;
  status: 'active' | 'archived' | 'checked_out';
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
  hd_percent?: number; // Hen-Day Production % (HDP)
  hdp_percent?: number; // Hen-Day Production % = (Telur Utuh / Populasi Hidup) * 100
  hhp_percent?: number; // Hen-Housed Production % = (Telur Utuh / Populasi Awal) * 100
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
  vaccinated_birds_count?: number;
  method?: 'Air Minum' | 'Injeksi / Suntik' | 'Tetes Mata' | 'Campur Pakan' | 'Semprot / Fogging' | 'Tetes Mulut' | string;
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
    hd_percent: number; // HDP
    hdp_percent: number;
    hhp_percent: number;
    fcr: number;
    avg_egg_weight_g: number;
    notes: string;
  };
  totals: {
    weekly_mortality: number;
    monthly_mortality: number;
    total_mortality: number;
    mortality_rate_percent: number;
    total_culling: number;
    total_egg_good_pcs: number;
    total_egg_good_kg: number;
    total_egg_bad_pcs: number;
    total_egg_bad_kg: number;
    total_feed_kg: number;
    total_days_recorded: number;
    overall_hd_percent: number;
    overall_hdp_percent: number;
    overall_hhp_percent: number;
    overall_fcr: number;
  };
}
