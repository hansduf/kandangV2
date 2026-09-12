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
  initial_age_weeks?: number;
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

export interface AppProfile {
  id: string;
  name: string;
  role: 'owner' | 'worker';
  pin?: string | null;
  avatar_color: string;
  phone?: string | null;
  is_active: boolean;
  created_at?: string;
}

export type TaskType = 'daily_record' | 'vaccine' | 'medicine' | 'vitamin' | 'cleaning' | 'feed' | 'custom';
export type RecurrenceType = 'once' | 'daily' | 'interval' | 'days_of_week';

export interface FarmTask {
  id: string;
  title: string;
  description?: string | null;
  task_type: TaskType;
  flock_id?: string | null;
  flock_ids?: string[] | null;
  assigned_to?: string | null; // Profile ID or null (all workers)
  assigned_to_ids?: string[] | null; // Multiple profile IDs
  recurrence_type: RecurrenceType;
  recurrence_interval?: number; // every N days
  days_of_week?: number[]; // [0,1,2,3,4,5,6] (0=Sun, 1=Mon, ...)
  start_date: string;
  end_date?: string | null;
  due_time?: string | null; // e.g. '16:00'
  color?: string; // Hex color code for calendar indicator
  is_active: boolean;
  created_at?: string;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  task_date: string;
  completed_by?: string | null;
  completed_at: string;
  notes?: string | null;
}

export interface FlockTaskStatus {
  flock_id?: string;
  coop_name: string;
  is_done: boolean;
}

export interface DailyTaskView {
  task_id: string;
  title: string;
  description?: string | null;
  task_type: TaskType;
  flock_id?: string | null;
  flock_ids?: string[] | null;
  coop_name?: string | null;
  flock_name?: string | null;
  assigned_to?: string | null;
  assigned_to_ids?: string[] | null;
  assigned_name?: string | null;
  recurrence_type: RecurrenceType;
  recurrence_interval?: number;
  days_of_week?: number[];
  due_time?: string | null;
  color?: string;
  is_completed: boolean;
  completed_at?: string | null;
  completed_by?: string | null;
  completed_by_name?: string | null;
  notes?: string | null;
  flocks_status?: FlockTaskStatus[];
}


