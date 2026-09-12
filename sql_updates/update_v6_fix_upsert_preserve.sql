-- ==============================================================================
-- UPDATE V6: FIX upsert_daily_record (PRESERVE DATA ON PARTIAL UPDATES)
-- ==============================================================================
-- Masalah sebelumnya:
-- Saat user mencatat telur di pagi hari, lalu siang/sore menginput kematian,
-- fungsi upsert menimpa nilai telur menjadi 0 jika form kematian mengirimkan 0.
-- 
-- Solusi:
-- Gunakan klausa CASE WHEN agar jika parameter bernilai 0 atau tidak diubah,
-- data telur/kematian yang sudah ada sebelumnya TETAP DIPERTAHANKAN.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.upsert_daily_record(
    p_flock_id UUID,
    p_record_date DATE,
    p_egg_good_pcs INT,
    p_egg_good_kg NUMERIC,
    p_egg_bad_pcs INT,
    p_egg_bad_kg NUMERIC,
    p_mortality_pcs INT,
    p_culling_pcs INT,
    p_feed_kg NUMERIC,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_record public.daily_records%ROWTYPE;
BEGIN
    INSERT INTO public.daily_records (
        flock_id, record_date, egg_good_pcs, egg_good_kg,
        egg_bad_pcs, egg_bad_kg, mortality_pcs, culling_pcs, feed_kg, notes
    )
    VALUES (
        p_flock_id, 
        p_record_date, 
        COALESCE(p_egg_good_pcs, 0), 
        COALESCE(p_egg_good_kg, 0.00),
        COALESCE(p_egg_bad_pcs, 0), 
        COALESCE(p_egg_bad_kg, 0.00), 
        COALESCE(p_mortality_pcs, 0),
        COALESCE(p_culling_pcs, 0), 
        COALESCE(p_feed_kg, 0.00), 
        p_notes
    )
    ON CONFLICT (flock_id, record_date)
    DO UPDATE SET
        egg_good_pcs = CASE 
            WHEN EXCLUDED.egg_good_pcs > 0 THEN EXCLUDED.egg_good_pcs 
            ELSE daily_records.egg_good_pcs 
        END,
        egg_good_kg = CASE 
            WHEN EXCLUDED.egg_good_kg > 0 THEN EXCLUDED.egg_good_kg 
            ELSE daily_records.egg_good_kg 
        END,
        egg_bad_pcs = CASE 
            WHEN EXCLUDED.egg_bad_pcs > 0 THEN EXCLUDED.egg_bad_pcs 
            ELSE daily_records.egg_bad_pcs 
        END,
        egg_bad_kg = CASE 
            WHEN EXCLUDED.egg_bad_kg > 0 THEN EXCLUDED.egg_bad_kg 
            ELSE daily_records.egg_bad_kg 
        END,
        mortality_pcs = CASE 
            WHEN EXCLUDED.mortality_pcs > 0 THEN EXCLUDED.mortality_pcs 
            ELSE daily_records.mortality_pcs 
        END,
        culling_pcs = CASE 
            WHEN EXCLUDED.culling_pcs > 0 THEN EXCLUDED.culling_pcs 
            ELSE daily_records.culling_pcs 
        END,
        feed_kg = CASE 
            WHEN EXCLUDED.feed_kg > 0 THEN EXCLUDED.feed_kg 
            ELSE daily_records.feed_kg 
        END,
        notes = CASE 
            WHEN EXCLUDED.notes IS NOT NULL AND EXCLUDED.notes <> '' THEN 
                CASE 
                    WHEN daily_records.notes IS NOT NULL AND daily_records.notes <> '' AND daily_records.notes <> EXCLUDED.notes 
                    THEN daily_records.notes || '; ' || EXCLUDED.notes 
                    ELSE EXCLUDED.notes 
                END
            ELSE daily_records.notes 
        END
    RETURNING * INTO v_record;

    RETURN to_jsonb(v_record);
END;
$$;
