-- =========================================================================
-- SQL UPDATE MIGRATION FOR KANDANG PETELUR (V4 - DASHBOARD METRICS & HEALTH CATEGORIES)
-- AMAN UNTUK DATABASE DENGAN DATA SEMI-PROD / REAL (TIDAK MENGHAPUS TABEL)
-- Copy & Paste script ini di Supabase SQL Editor
-- =========================================================================

-- 1. TAMBAH KOLOM DENGAN SAFE ALTER TABLE
ALTER TABLE public.flocks ADD COLUMN IF NOT EXISTS chick_out_date DATE;
ALTER TABLE public.flocks ADD COLUMN IF NOT EXISTS capacity INT NOT NULL DEFAULT 0;
ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS vaccinated_birds_count INT DEFAULT 0;

-- 2. DROP FUNGSI LAMA UNTUK MENGHINDARI ERROR RETURNING TYPE (ERROR 42P13)
DROP FUNCTION IF EXISTS public.create_flock(TEXT, TEXT, TEXT, INT, DATE, INT);
DROP FUNCTION IF EXISTS public.create_flock(TEXT, TEXT, TEXT, INT, DATE, INT, DATE, TEXT);
DROP FUNCTION IF EXISTS public.get_flocks();
DROP FUNCTION IF EXISTS public.get_flock_dashboard_summary(UUID);
DROP FUNCTION IF EXISTS public.get_flock_daily_history(UUID, INT);
DROP FUNCTION IF EXISTS public.update_flock(UUID, TEXT, TEXT, TEXT, INT, DATE, INT);
DROP FUNCTION IF EXISTS public.update_flock(UUID, TEXT, TEXT, TEXT, INT, DATE, INT, DATE, TEXT);
DROP FUNCTION IF EXISTS public.add_health_record(UUID, DATE, TEXT, TEXT, TEXT, INT, TEXT, TEXT);

-- 3. FUNGSI CREATE_FLOCK
CREATE OR REPLACE FUNCTION public.create_flock(
    p_name TEXT,
    p_coop_name TEXT,
    p_strain TEXT,
    p_capacity INT,
    p_chick_in_date DATE,
    p_initial_population INT,
    p_chick_out_date DATE DEFAULT NULL,
    p_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_flock public.flocks%ROWTYPE;
BEGIN
    INSERT INTO public.flocks (name, coop_name, strain, capacity, chick_in_date, chick_out_date, initial_population, status)
    VALUES (p_name, p_coop_name, COALESCE(p_strain, '-'), COALESCE(p_capacity, p_initial_population, 0), p_chick_in_date, p_chick_out_date, p_initial_population, COALESCE(p_status, 'active'))
    RETURNING * INTO v_flock;

    RETURN to_jsonb(v_flock);
END;
$$;

-- 4. FUNGSI GET_FLOCKS
CREATE OR REPLACE FUNCTION public.get_flocks()
RETURNS TABLE (
    id UUID,
    name TEXT,
    coop_name TEXT,
    strain TEXT,
    capacity INT,
    chick_in_date DATE,
    chick_out_date DATE,
    initial_population INT,
    current_population INT,
    total_mortality INT,
    total_culling INT,
    age_weeks INT,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.name,
        f.coop_name,
        f.strain,
        f.capacity,
        f.chick_in_date,
        f.chick_out_date,
        f.initial_population,
        GREATEST(0, f.initial_population - COALESCE(SUM(d.mortality_pcs), 0)::INT - COALESCE(SUM(d.culling_pcs), 0)::INT)::INT AS current_population,
        COALESCE(SUM(d.mortality_pcs), 0)::INT AS total_mortality,
        COALESCE(SUM(d.culling_pcs), 0)::INT AS total_culling,
        GREATEST(1, FLOOR((CURRENT_DATE - f.chick_in_date) / 7.0))::INT AS age_weeks,
        f.status,
        f.created_at
    FROM public.flocks f
    LEFT JOIN public.daily_records d ON f.id = d.flock_id
    GROUP BY f.id
    ORDER BY f.created_at DESC;
END;
$$;

-- 5. FUNGSI GET_FLOCK_DASHBOARD_SUMMARY (DENGAN HDP %, HHP %, MORTALITAS MINGGUAN & BULANAN)
CREATE OR REPLACE FUNCTION public.get_flock_dashboard_summary(p_flock_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_flock public.flocks%ROWTYPE;
    v_today_record public.daily_records%ROWTYPE;
    v_current_pop INT;
    v_initial_pop INT;
    v_total_mort INT;
    v_weekly_mort INT;
    v_monthly_mort INT;
    v_total_cull INT;
    v_total_egg_good_pcs BIGINT;
    v_total_egg_good_kg NUMERIC;
    v_total_egg_bad_pcs BIGINT;
    v_total_egg_bad_kg NUMERIC;
    v_total_feed_kg NUMERIC;
    v_total_days INT;
    v_today_hdp NUMERIC := 0;
    v_today_hhp NUMERIC := 0;
    v_overall_hdp NUMERIC := 0;
    v_overall_hhp NUMERIC := 0;
    v_mortality_rate NUMERIC := 0;
    v_overall_fcr NUMERIC := 0;
BEGIN
    SELECT * INTO v_flock FROM public.flocks WHERE id = p_flock_id;
    IF v_flock.id IS NULL THEN
        RETURN jsonb_build_object('error', 'Flock not found');
    END IF;

    SELECT * INTO v_today_record 
    FROM public.daily_records 
    WHERE flock_id = p_flock_id AND record_date = CURRENT_DATE;

    SELECT 
        COALESCE(SUM(mortality_pcs), 0),
        COALESCE(SUM(CASE WHEN record_date >= CURRENT_DATE - INTERVAL '7 days' THEN mortality_pcs ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN record_date >= CURRENT_DATE - INTERVAL '30 days' THEN mortality_pcs ELSE 0 END), 0),
        COALESCE(SUM(culling_pcs), 0),
        COALESCE(SUM(egg_good_pcs), 0),
        COALESCE(SUM(egg_good_kg), 0),
        COALESCE(SUM(egg_bad_pcs), 0),
        COALESCE(SUM(egg_bad_kg), 0),
        COALESCE(SUM(feed_kg), 0),
        COUNT(*)::INT
    INTO 
        v_total_mort,
        v_weekly_mort,
        v_monthly_mort,
        v_total_cull,
        v_total_egg_good_pcs,
        v_total_egg_good_kg,
        v_total_egg_bad_pcs,
        v_total_egg_bad_kg,
        v_total_feed_kg,
        v_total_days
    FROM public.daily_records 
    WHERE flock_id = p_flock_id;

    v_current_pop := GREATEST(0, v_flock.initial_population - v_total_mort - v_total_cull);
    v_initial_pop := GREATEST(1, v_flock.initial_population);

    IF v_today_record.record_date IS NOT NULL THEN
        IF v_current_pop > 0 THEN
            v_today_hdp := ROUND((v_today_record.egg_good_pcs::NUMERIC / v_current_pop::NUMERIC) * 100.0, 2);
        END IF;
        IF v_initial_pop > 0 THEN
            v_today_hhp := ROUND((v_today_record.egg_good_pcs::NUMERIC / v_initial_pop::NUMERIC) * 100.0, 2);
        END IF;
    END IF;

    IF v_total_days > 0 THEN
        IF v_current_pop > 0 THEN
            v_overall_hdp := ROUND((v_total_egg_good_pcs::NUMERIC / (v_current_pop * v_total_days)::NUMERIC) * 100.0, 2);
        END IF;
        IF v_initial_pop > 0 THEN
            v_overall_hhp := ROUND((v_total_egg_good_pcs::NUMERIC / (v_initial_pop * v_total_days)::NUMERIC) * 100.0, 2);
        END IF;
    END IF;

    v_mortality_rate := ROUND((v_total_mort::NUMERIC / v_initial_pop::NUMERIC) * 100.0, 2);

    IF v_total_egg_good_kg > 0 THEN
        v_overall_fcr := ROUND(v_total_feed_kg / v_total_egg_good_kg, 2);
    END IF;

    RETURN jsonb_build_object(
        'flock', jsonb_build_object(
            'id', v_flock.id,
            'name', v_flock.name,
            'coop_name', v_flock.coop_name,
            'strain', v_flock.strain,
            'capacity', v_flock.capacity,
            'chick_in_date', v_flock.chick_in_date,
            'chick_out_date', v_flock.chick_out_date,
            'initial_population', v_flock.initial_population,
            'current_population', v_current_pop,
            'age_weeks', GREATEST(1, FLOOR((CURRENT_DATE - v_flock.chick_in_date) / 7.0)),
            'status', v_flock.status
        ),
        'today', jsonb_build_object(
            'has_recorded', (v_today_record.record_date IS NOT NULL),
            'record_date', COALESCE(v_today_record.record_date, CURRENT_DATE),
            'egg_good_pcs', COALESCE(v_today_record.egg_good_pcs, 0),
            'egg_good_kg', COALESCE(v_today_record.egg_good_kg, 0),
            'egg_bad_pcs', COALESCE(v_today_record.egg_bad_pcs, 0),
            'egg_bad_kg', COALESCE(v_today_record.egg_bad_kg, 0),
            'mortality_pcs', COALESCE(v_today_record.mortality_pcs, 0),
            'culling_pcs', COALESCE(v_today_record.culling_pcs, 0),
            'feed_kg', COALESCE(v_today_record.feed_kg, 0),
            'hd_percent', v_today_hdp,
            'hdp_percent', v_today_hdp,
            'hhp_percent', v_today_hhp,
            'fcr', COALESCE(v_today_record.fcr, 0),
            'avg_egg_weight_g', COALESCE(v_today_record.avg_egg_weight_g, 0),
            'notes', COALESCE(v_today_record.notes, '')
        ),
        'totals', jsonb_build_object(
            'weekly_mortality', v_weekly_mort,
            'monthly_mortality', v_monthly_mort,
            'total_mortality', v_total_mort,
            'mortality_rate_percent', v_mortality_rate,
            'total_culling', v_total_cull,
            'total_egg_good_pcs', v_total_egg_good_pcs,
            'total_egg_good_kg', ROUND(v_total_egg_good_kg, 2),
            'total_egg_bad_pcs', v_total_egg_bad_pcs,
            'total_egg_bad_kg', ROUND(v_total_egg_bad_kg, 2),
            'total_feed_kg', ROUND(v_total_feed_kg, 2),
            'total_days_recorded', v_total_days,
            'overall_hd_percent', v_overall_hdp,
            'overall_hdp_percent', v_overall_hdp,
            'overall_hhp_percent', v_overall_hhp,
            'overall_fcr', v_overall_fcr
        )
    );
END;
$$;

-- 6. FUNGSI ADD_HEALTH_RECORD
CREATE OR REPLACE FUNCTION public.add_health_record(
    p_flock_id UUID,
    p_record_date DATE,
    p_category TEXT,
    p_item_name TEXT,
    p_dosage TEXT DEFAULT '',
    p_vaccinated_birds_count INT DEFAULT 0,
    p_method TEXT DEFAULT '',
    p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_health public.health_records%ROWTYPE;
BEGIN
    INSERT INTO public.health_records (flock_id, record_date, category, item_name, dosage, vaccinated_birds_count, method, notes)
    VALUES (p_flock_id, p_record_date, p_category, p_item_name, p_dosage, COALESCE(p_vaccinated_birds_count, 0), p_method, p_notes)
    RETURNING * INTO v_health;

    RETURN to_jsonb(v_health);
END;
$$;
