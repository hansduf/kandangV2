-- =========================================================================
-- SQL UPDATE v13 - HITUNG HDP & HHP MENYERTAKAN TELUR RUSAK / RETAK
-- =========================================================================
-- Dalam ilmu peternakan layer / ayam petelur:
-- Telur retak / rusak (egg_bad_pcs) tetap merupakan hasil produksi biologis ayam.
-- Kerusakan kulit telur terjadi saat/setelah peneluran (handling/cangkang tipis).
-- Oleh karena itu, HDP (Hen-Day Production) & HHP (Hen-Housed Production)
-- dihitung dari TOTAL TELUR (Telur Utuh + Telur Retak/Rusak):
-- Total Telur = egg_good_pcs + egg_bad_pcs
-- HDP (%) = (Total Telur / Populasi Aktif) * 100%
-- HHP (%) = (Total Telur / Populasi Awal) * 100%
--
-- Jalankan skrip ini di Supabase SQL Editor.
-- =========================================================================

-- 1. DROP FUNGSI LAMA
DROP FUNCTION IF EXISTS public.get_flock_dashboard_summary(UUID);
DROP FUNCTION IF EXISTS public.get_flock_daily_history(UUID, INT);

-- 2. CREATE OR REPLACE FUNCTION: get_flock_dashboard_summary
CREATE OR REPLACE FUNCTION public.get_flock_dashboard_summary(p_flock_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
    v_total_all_eggs BIGINT;
    v_total_feed_kg NUMERIC;
    v_total_days INT;
    v_today_total_eggs INT := 0;
    v_today_hdp NUMERIC := 0;
    v_today_hhp NUMERIC := 0;
    v_today_fcr NUMERIC := 0;
    v_today_avg_egg_g NUMERIC := 0;
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

    -- Perhitungan Hari Ini (Menyertakan Telur Retak/Rusak)
    IF v_today_record.record_date IS NOT NULL THEN
        v_today_total_eggs := COALESCE(v_today_record.egg_good_pcs, 0) + COALESCE(v_today_record.egg_bad_pcs, 0);

        IF v_current_pop > 0 THEN
            v_today_hdp := ROUND((v_today_total_eggs::NUMERIC / v_current_pop::NUMERIC) * 100.0, 2);
        END IF;

        IF v_initial_pop > 0 THEN
            v_today_hhp := ROUND((v_today_total_eggs::NUMERIC / v_initial_pop::NUMERIC) * 100.0, 2);
        END IF;

        -- FCR = Pakan (kg) / Telur Normal Layak Jual (kg)
        IF v_today_record.egg_good_kg > 0 THEN
            v_today_fcr := ROUND(v_today_record.feed_kg / v_today_record.egg_good_kg, 2);
        END IF;

        -- Rata-rata bobot butir telur
        IF v_today_record.egg_good_pcs > 0 THEN
            v_today_avg_egg_g := ROUND((v_today_record.egg_good_kg * 1000.0) / v_today_record.egg_good_pcs, 2);
        END IF;
    END IF;

    -- Perhitungan Keseluruhan / Rata-rata Kumulatif (Menyertakan Telur Retak/Rusak)
    v_total_all_eggs := v_total_egg_good_pcs + v_total_egg_bad_pcs;

    IF v_total_days > 0 THEN
        IF v_current_pop > 0 THEN
            v_overall_hdp := ROUND((v_total_all_eggs::NUMERIC / (v_current_pop * v_total_days)::NUMERIC) * 100.0, 2);
        END IF;
        IF v_initial_pop > 0 THEN
            v_overall_hhp := ROUND((v_total_all_eggs::NUMERIC / (v_initial_pop * v_total_days)::NUMERIC) * 100.0, 2);
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
            'initial_age_weeks', COALESCE(v_flock.initial_age_weeks, 1),
            'age_weeks', (COALESCE(v_flock.initial_age_weeks, 1) + GREATEST(0, FLOOR((COALESCE(v_flock.chick_out_date, CURRENT_DATE) - v_flock.chick_in_date) / 7.0)))::INT,
            'status', v_flock.status
        ),
        'today', jsonb_build_object(
            'has_recorded', (v_today_record.record_date IS NOT NULL),
            'record_date', COALESCE(v_today_record.record_date, CURRENT_DATE),
            'egg_good_pcs', COALESCE(v_today_record.egg_good_pcs, 0),
            'egg_good_kg', COALESCE(v_today_record.egg_good_kg, 0),
            'egg_bad_pcs', COALESCE(v_today_record.egg_bad_pcs, 0),
            'egg_bad_kg', COALESCE(v_today_record.egg_bad_kg, 0),
            'egg_total_pcs', v_today_total_eggs,
            'mortality_pcs', COALESCE(v_today_record.mortality_pcs, 0),
            'culling_pcs', COALESCE(v_today_record.culling_pcs, 0),
            'feed_kg', COALESCE(v_today_record.feed_kg, 0),
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
            'total_mortality', v_total_mort,
            'mortality_rate_percent', v_mortality_rate,
            'total_culling', v_total_cull,
            'total_egg_good_pcs', v_total_egg_good_pcs,
            'total_egg_good_kg', ROUND(v_total_egg_good_kg, 2),
            'total_egg_bad_pcs', v_total_egg_bad_pcs,
            'total_egg_bad_kg', ROUND(v_total_egg_bad_kg, 2),
            'total_egg_total_pcs', v_total_all_eggs,
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


-- 3. CREATE OR REPLACE FUNCTION: get_flock_daily_history
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
SECURITY DEFINER
AS $$
DECLARE
    v_initial_pop INT;
BEGIN
    SELECT initial_population INTO v_initial_pop FROM public.flocks WHERE flocks.id = p_flock_id;

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
        -- HDP dan HHP menyertakan telur rusak/retak:
        CASE 
            WHEN c.active_pop > 0 THEN ROUND(((c.egg_good_pcs + c.egg_bad_pcs)::NUMERIC / c.active_pop::NUMERIC) * 100.0, 2) 
            ELSE 0.00 
        END AS hd_percent,
        CASE 
            WHEN c.active_pop > 0 THEN ROUND(((c.egg_good_pcs + c.egg_bad_pcs)::NUMERIC / c.active_pop::NUMERIC) * 100.0, 2) 
            ELSE 0.00 
        END AS hdp_percent,
        CASE 
            WHEN v_initial_pop > 0 THEN ROUND(((c.egg_good_pcs + c.egg_bad_pcs)::NUMERIC / v_initial_pop::NUMERIC) * 100.0, 2) 
            ELSE 0.00 
        END AS hhp_percent,
        CASE 
            WHEN c.egg_good_kg > 0 THEN ROUND(c.feed_kg / c.egg_good_kg, 2) 
            ELSE 0.00 
        END AS fcr,
        CASE 
            WHEN c.egg_good_pcs > 0 THEN ROUND((c.egg_good_kg * 1000.0) / c.egg_good_pcs, 2) 
            ELSE 0.00 
        END AS avg_egg_weight_g,
        c.notes,
        c.created_at
    FROM cumulative_losses c
    ORDER BY c.record_date DESC
    LIMIT p_limit;
END;
$$;

-- 4. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.get_flock_dashboard_summary(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_flock_daily_history(UUID, INT) TO anon, authenticated, service_role;
