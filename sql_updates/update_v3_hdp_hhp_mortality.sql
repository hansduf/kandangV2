-- =========================================================================
-- SQL UPDATE MIGRATION FOR KANDANG PETELUR (V3 - HDP, HHP, & MORTALITY)
-- AMAN UNTUK DATABASE DENGAN DATA SEMI-PROD / REAL (TIDAK MENGHAPUS TABEL)
-- Paste langsung script ini di Supabase SQL Editor
-- =========================================================================

-- 1. TAMBAH KOLOM APABILA BELUM ADA (SAFE ALTER TABLE)
ALTER TABLE public.flocks ADD COLUMN IF NOT EXISTS chick_out_date DATE;
ALTER TABLE public.flocks ADD COLUMN IF NOT EXISTS capacity INT NOT NULL DEFAULT 0;
ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS vaccinated_birds_count INT DEFAULT 0;

-- 2. DROP FUNGSI LAMA UNTUK MENGHINDARI ERROR TYPE SIGNATURE (ERROR 42P13)
DROP FUNCTION IF EXISTS public.create_flock(TEXT, TEXT, TEXT, INT, DATE, INT);
DROP FUNCTION IF EXISTS public.create_flock(TEXT, TEXT, TEXT, INT, DATE, INT, DATE, TEXT);
DROP FUNCTION IF EXISTS public.get_flocks();
DROP FUNCTION IF EXISTS public.get_flock_dashboard_summary(UUID);
DROP FUNCTION IF EXISTS public.get_flock_daily_history(UUID, INT);
DROP FUNCTION IF EXISTS public.update_flock(UUID, TEXT, TEXT, TEXT, INT, DATE, INT);
DROP FUNCTION IF EXISTS public.update_flock(UUID, TEXT, TEXT, TEXT, INT, DATE, INT, DATE, TEXT);

-- 3. PERBAARUI FUNGSI CREATE_FLOCK DENGAN CHICK_OUT_DATE & STATUS
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

-- 4. PERBARUI FUNGSI GET_FLOCKS
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
        COALESCE(f.capacity, f.initial_population, 0)::INT AS capacity,
        f.chick_in_date,
        f.chick_out_date,
        f.initial_population,
        (f.initial_population - COALESCE(SUM(d.mortality_pcs), 0)::INT - COALESCE(SUM(d.culling_pcs), 0)::INT) AS current_population,
        COALESCE(SUM(d.mortality_pcs), 0)::INT AS total_mortality,
        COALESCE(SUM(d.culling_pcs), 0)::INT AS total_culling,
        GREATEST(1, FLOOR((COALESCE(f.chick_out_date, CURRENT_DATE) - f.chick_in_date) / 7.0))::INT AS age_weeks,
        f.status,
        f.created_at
    FROM public.flocks f
    LEFT JOIN public.daily_records d ON f.id = d.flock_id
    GROUP BY f.id
    ORDER BY f.created_at DESC;
END;
$$;

-- 5. PERBARUI FUNGSI DASHBOARD SUMMARY (MENGHITUNG HDP, HHP, MORTALITAS MINGGUAN/BULANAN/TOTAL)
CREATE OR REPLACE FUNCTION public.get_flock_dashboard_summary(p_flock_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_flock RECORD;
    v_today_record RECORD;
    v_totals RECORD;
    v_result JSONB;
    v_current_pop INT;
    v_weekly_mort INT := 0;
    v_monthly_mort INT := 0;
    v_today_hdp NUMERIC(5,2) := 0.00;
    v_today_hhp NUMERIC(5,2) := 0.00;
    v_today_fcr NUMERIC(5,2) := 0.00;
    v_today_avg_egg_g NUMERIC(5,2) := 0.00;
    v_overall_hdp NUMERIC(5,2) := 0.00;
    v_overall_hhp NUMERIC(5,2) := 0.00;
    v_overall_fcr NUMERIC(5,2) := 0.00;
    v_mortality_rate NUMERIC(5,2) := 0.00;
BEGIN
    SELECT id, name, coop_name, strain, chick_in_date, chick_out_date, initial_population, status
    INTO v_flock
    FROM public.flocks
    WHERE id = p_flock_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Flock not found');
    END IF;

    SELECT 
        COALESCE(SUM(mortality_pcs), 0)::INT as total_mortality,
        COALESCE(SUM(culling_pcs), 0)::INT as total_culling,
        COALESCE(SUM(egg_good_pcs), 0)::INT as total_egg_good_pcs,
        COALESCE(SUM(egg_good_kg), 0.00)::NUMERIC as total_egg_good_kg,
        COALESCE(SUM(egg_bad_pcs), 0)::INT as total_egg_bad_pcs,
        COALESCE(SUM(egg_bad_kg), 0.00)::NUMERIC as total_egg_bad_kg,
        COALESCE(SUM(feed_kg), 0.00)::NUMERIC as total_feed_kg,
        COUNT(id)::INT as total_days_recorded
    INTO v_totals
    FROM public.daily_records
    WHERE flock_id = p_flock_id;

    SELECT COALESCE(SUM(mortality_pcs), 0)::INT INTO v_weekly_mort
    FROM public.daily_records
    WHERE flock_id = p_flock_id AND record_date >= (CURRENT_DATE - INTERVAL '7 days');

    SELECT COALESCE(SUM(mortality_pcs), 0)::INT INTO v_monthly_mort
    FROM public.daily_records
    WHERE flock_id = p_flock_id AND record_date >= (CURRENT_DATE - INTERVAL '30 days');

    v_current_pop := GREATEST(0, v_flock.initial_population - v_totals.total_mortality - v_totals.total_culling);

    IF v_flock.initial_population > 0 THEN
        v_mortality_rate := ROUND((v_totals.total_mortality::NUMERIC / v_flock.initial_population::NUMERIC) * 100.0, 2);
    END IF;

    SELECT *
    INTO v_today_record
    FROM public.daily_records
    WHERE flock_id = p_flock_id AND record_date = CURRENT_DATE;

    IF v_today_record.id IS NOT NULL THEN
        IF v_current_pop > 0 THEN
            v_today_hdp := ROUND((v_today_record.egg_good_pcs::NUMERIC / v_current_pop::NUMERIC) * 100.0, 2);
        END IF;

        IF v_flock.initial_population > 0 THEN
            v_today_hhp := ROUND((v_today_record.egg_good_pcs::NUMERIC / v_flock.initial_population::NUMERIC) * 100.0, 2);
        END IF;

        IF v_today_record.egg_good_kg > 0 THEN
            v_today_fcr := ROUND(v_today_record.feed_kg / v_today_record.egg_good_kg, 2);
        END IF;

        IF v_today_record.egg_good_pcs > 0 THEN
            v_today_avg_egg_g := ROUND((v_today_record.egg_good_kg * 1000.0) / v_today_record.egg_good_pcs, 2);
        END IF;
    END IF;

    IF v_totals.total_days_recorded > 0 AND v_current_pop > 0 THEN
        v_overall_hdp := ROUND((v_totals.total_egg_good_pcs::NUMERIC / (v_current_pop * v_totals.total_days_recorded)::NUMERIC) * 100.0, 2);
    END IF;

    IF v_totals.total_days_recorded > 0 AND v_flock.initial_population > 0 THEN
        v_overall_hhp := ROUND((v_totals.total_egg_good_pcs::NUMERIC / (v_flock.initial_population * v_totals.total_days_recorded)::NUMERIC) * 100.0, 2);
    END IF;

    IF v_totals.total_egg_good_kg > 0 THEN
        v_overall_fcr := ROUND(v_totals.total_feed_kg / v_totals.total_egg_good_kg, 2);
    END IF;

    v_result := jsonb_build_object(
        'flock', jsonb_build_object(
            'id', v_flock.id,
            'name', v_flock.name,
            'coop_name', v_flock.coop_name,
            'strain', v_flock.strain,
            'chick_in_date', v_flock.chick_in_date,
            'chick_out_date', v_flock.chick_out_date,
            'initial_population', v_flock.initial_population,
            'current_population', v_current_pop,
            'age_weeks', GREATEST(1, FLOOR((COALESCE(v_flock.chick_out_date, CURRENT_DATE) - v_flock.chick_in_date) / 7.0))::INT,
            'status', v_flock.status
        ),
        'today', jsonb_build_object(
            'has_recorded', (v_today_record.id IS NOT NULL),
            'record_date', CURRENT_DATE,
            'egg_good_pcs', COALESCE(v_today_record.egg_good_pcs, 0),
            'egg_good_kg', COALESCE(v_today_record.egg_good_kg, 0.00),
            'egg_bad_pcs', COALESCE(v_today_record.egg_bad_pcs, 0),
            'egg_bad_kg', COALESCE(v_today_record.egg_bad_kg, 0.00),
            'mortality_pcs', COALESCE(v_today_record.mortality_pcs, 0),
            'culling_pcs', COALESCE(v_today_record.culling_pcs, 0),
            'feed_kg', COALESCE(v_today_record.feed_kg, 0.00),
            'hd_percent', v_today_hdp,
            'hdp_percent', v_today_hdp,
            'hhp_percent', v_today_hhp,
            'fcr', v_today_fcr,
            'avg_egg_weight_g', v_today_avg_egg_g,
            'notes', COALESCE(v_today_record.notes, '')
        ),
        'totals', jsonb_build_object(
            'weekly_mortality', v_weekly_mort,
            'monthly_mortality', v_monthly_mort,
            'total_mortality', v_totals.total_mortality,
            'mortality_rate_percent', v_mortality_rate,
            'total_culling', v_totals.total_culling,
            'total_egg_good_pcs', v_totals.total_egg_good_pcs,
            'total_egg_good_kg', v_totals.total_egg_good_kg,
            'total_egg_bad_pcs', v_totals.total_egg_bad_pcs,
            'total_egg_bad_kg', v_totals.total_egg_bad_kg,
            'total_feed_kg', v_totals.total_feed_kg,
            'total_days_recorded', v_totals.total_days_recorded,
            'overall_hd_percent', v_overall_hdp,
            'overall_hdp_percent', v_overall_hdp,
            'overall_hhp_percent', v_overall_hhp,
            'overall_fcr', v_overall_fcr
        )
    );

    RETURN v_result;
END;
$$;

-- 6. PERBARUI FUNGSI GET_FLOCK_DAILY_HISTORY
CREATE OR REPLACE FUNCTION public.get_flock_daily_history(
    p_flock_id UUID,
    p_limit INT DEFAULT 30
)
RETURNS TABLE (
    id UUID,
    record_date DATE,
    egg_good_pcs INT,
    egg_good_kg NUMERIC(8,2),
    egg_bad_pcs INT,
    egg_bad_kg NUMERIC(8,2),
    mortality_pcs INT,
    culling_pcs INT,
    feed_kg NUMERIC(8,2),
    hd_percent NUMERIC(5,2),
    hdp_percent NUMERIC(5,2),
    hhp_percent NUMERIC(5,2),
    fcr NUMERIC(5,2),
    avg_egg_weight_g NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_initial_pop INT;
BEGIN
    SELECT initial_population INTO v_initial_pop FROM public.flocks WHERE id = p_flock_id;

    RETURN QUERY
    WITH cumulative_losses AS (
        SELECT 
            d.id,
            d.record_date,
            d.egg_good_pcs,
            d.egg_good_kg,
            d.egg_bad_pcs,
            d.egg_bad_kg,
            d.mortality_pcs,
            d.culling_pcs,
            d.feed_kg,
            d.notes,
            d.created_at,
            (v_initial_pop - SUM(d.mortality_pcs + d.culling_pcs) OVER (ORDER BY d.record_date ASC))::INT AS active_pop
        FROM public.daily_records d
        WHERE d.flock_id = p_flock_id
    )
    SELECT 
        c.id,
        c.record_date,
        c.egg_good_pcs,
        c.egg_good_kg,
        c.egg_bad_pcs,
        c.egg_bad_kg,
        c.mortality_pcs,
        c.culling_pcs,
        c.feed_kg,
        CASE WHEN c.active_pop > 0 THEN ROUND((c.egg_good_pcs::NUMERIC / c.active_pop::NUMERIC) * 100.0, 2) ELSE 0.00 END AS hd_percent,
        CASE WHEN c.active_pop > 0 THEN ROUND((c.egg_good_pcs::NUMERIC / c.active_pop::NUMERIC) * 100.0, 2) ELSE 0.00 END AS hdp_percent,
        CASE WHEN v_initial_pop > 0 THEN ROUND((c.egg_good_pcs::NUMERIC / v_initial_pop::NUMERIC) * 100.0, 2) ELSE 0.00 END AS hhp_percent,
        CASE WHEN c.egg_good_kg > 0 THEN ROUND(c.feed_kg / c.egg_good_kg, 2) ELSE 0.00 END AS fcr,
        CASE WHEN c.egg_good_pcs > 0 THEN ROUND((c.egg_good_kg * 1000.0) / c.egg_good_pcs, 2) ELSE 0.00 END AS avg_egg_weight_g,
        c.notes,
        c.created_at
    FROM cumulative_losses c
    ORDER BY c.record_date DESC
    LIMIT p_limit;
END;
$$;

-- 7. PERBARUI FUNGSI UPDATE_FLOCK
CREATE OR REPLACE FUNCTION public.update_flock(
    p_id UUID,
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
    UPDATE public.flocks
    SET
        name = COALESCE(p_name, name),
        coop_name = COALESCE(p_coop_name, coop_name),
        strain = COALESCE(p_strain, strain),
        capacity = COALESCE(p_capacity, capacity),
        chick_in_date = COALESCE(p_chick_in_date, chick_in_date),
        chick_out_date = p_chick_out_date,
        initial_population = COALESCE(p_initial_population, initial_population),
        status = COALESCE(p_status, status)
    WHERE id = p_id
    RETURNING * INTO v_flock;

    RETURN to_jsonb(v_flock);
END;
$$;
