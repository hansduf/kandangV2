-- ==============================================================================
-- UPDATE V15: INCLUDE MORNING & AFTERNOON FEED IN get_flock_daily_history
-- ==============================================================================
-- Masalah:
-- Fungsi get_flock_daily_history sebelumnya belum mengembalikan kolom
-- feed_morning_kg dan feed_afternoon_kg, sehingga saat web memuat ulang
-- riwayat harian, nilai pakan pagi terbaca kosong.
--
-- Solusi:
-- Perbarui return table get_flock_daily_history agar menyertakan
-- feed_morning_kg NUMERIC(8,2) dan feed_afternoon_kg NUMERIC(8,2).
-- ==============================================================================

DROP FUNCTION IF EXISTS public.get_flock_daily_history(UUID, INT);

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
    feed_morning_kg NUMERIC(8,2),
    feed_afternoon_kg NUMERIC(8,2),
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
            COALESCE(d.feed_morning_kg, 0) AS feed_morning_kg,
            COALESCE(d.feed_afternoon_kg, 0) AS feed_afternoon_kg,
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
        c.feed_morning_kg,
        c.feed_afternoon_kg,
        CASE 
            WHEN c.active_pop > 0 THEN ROUND(((c.egg_good_pcs + c.egg_bad_pcs)::NUMERIC / c.active_pop::NUMERIC) * 100, 2)
            ELSE 0.00
        END AS hd_percent,
        CASE 
            WHEN c.active_pop > 0 THEN ROUND(((c.egg_good_pcs + c.egg_bad_pcs)::NUMERIC / c.active_pop::NUMERIC) * 100, 2)
            ELSE 0.00
        END AS hdp_percent,
        CASE 
            WHEN v_initial_pop > 0 THEN ROUND(((c.egg_good_pcs + c.egg_bad_pcs)::NUMERIC / v_initial_pop::NUMERIC) * 100, 2)
            ELSE 0.00
        END AS hhp_percent,
        CASE 
            WHEN (c.egg_good_kg + c.egg_bad_kg) > 0 THEN ROUND((c.feed_kg / (c.egg_good_kg + c.egg_bad_kg)), 2)
            WHEN c.egg_good_kg > 0 THEN ROUND((c.feed_kg / c.egg_good_kg), 2)
            ELSE 0.00
        END AS fcr,
        CASE 
            WHEN c.egg_good_pcs > 0 THEN ROUND(((c.egg_good_kg * 1000) / c.egg_good_pcs), 2)
            ELSE 0.00
        END AS avg_egg_weight_g,
        c.notes,
        c.created_at
    FROM cumulative_losses c
    ORDER BY c.record_date DESC
    LIMIT p_limit;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_flock_daily_history(UUID, INT) TO anon, authenticated, service_role;
