-- ========================================================
-- DATABASE SCHEMA & RPC FUNCTIONS FOR KANDANG AYAM PETELUR
-- Paste this script directly into Supabase SQL Editor
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL ANGKATAN (FLOCKS)
CREATE TABLE IF NOT EXISTS public.flocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    coop_name TEXT NOT NULL,
    strain TEXT DEFAULT '-',
    capacity INT NOT NULL DEFAULT 0,
    chick_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
    initial_population INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'archived'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABEL PENCATATAN HARIAN (DAILY RECORDS)
CREATE TABLE IF NOT EXISTS public.daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flock_id UUID NOT NULL REFERENCES public.flocks(id) ON DELETE CASCADE,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    egg_good_pcs INT NOT NULL DEFAULT 0,
    egg_good_kg NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    egg_bad_pcs INT NOT NULL DEFAULT 0,
    egg_bad_kg NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    mortality_pcs INT NOT NULL DEFAULT 0,
    culling_pcs INT NOT NULL DEFAULT 0,
    feed_kg NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_flock_record_date UNIQUE (flock_id, record_date)
);

-- 3. TABEL KESEHATAN (HEALTH RECORDS: OBAT, VAKSIN, VITAMIN)
CREATE TABLE IF NOT EXISTS public.health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flock_id UUID NOT NULL REFERENCES public.flocks(id) ON DELETE CASCADE,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL, -- 'Vaksin', 'Obat', 'Vitamin', 'Desinfektan'
    item_name TEXT NOT NULL,
    dosage TEXT,
    method TEXT, -- 'Air Minum', 'Injeksi', 'Tetes Mata', 'Pakan', 'Semprot'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Public access policies for single-role universal access
ALTER TABLE public.flocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select flocks" ON public.flocks FOR SELECT USING (true);
CREATE POLICY "Allow public insert flocks" ON public.flocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update flocks" ON public.flocks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete flocks" ON public.flocks FOR DELETE USING (true);

CREATE POLICY "Allow public select daily_records" ON public.daily_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert daily_records" ON public.daily_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update daily_records" ON public.daily_records FOR UPDATE USING (true);
CREATE POLICY "Allow public delete daily_records" ON public.daily_records FOR DELETE USING (true);

CREATE POLICY "Allow public select health_records" ON public.health_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert health_records" ON public.health_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update health_records" ON public.health_records FOR UPDATE USING (true);
CREATE POLICY "Allow public delete health_records" ON public.health_records FOR DELETE USING (true);


-- ========================================================
-- STORED FUNCTIONS / RPCs
-- ========================================================

-- RPC 1: Create a new Flock
CREATE OR REPLACE FUNCTION public.create_flock(
    p_name TEXT,
    p_coop_name TEXT,
    p_strain TEXT,
    p_capacity INT,
    p_chick_in_date DATE,
    p_initial_population INT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_flock public.flocks%ROWTYPE;
BEGIN
    INSERT INTO public.flocks (name, coop_name, strain, capacity, chick_in_date, initial_population, status)
    VALUES (p_name, p_coop_name, COALESCE(p_strain, '-'), COALESCE(p_capacity, p_initial_population, 0), p_chick_in_date, p_initial_population, 'active')
    RETURNING * INTO v_flock;

    RETURN to_jsonb(v_flock);
END;
$$;


-- RPC 2: Get All Flocks with Live Active Population & Current Performance Summary
CREATE OR REPLACE FUNCTION public.get_flocks()
RETURNS TABLE (
    id UUID,
    name TEXT,
    coop_name TEXT,
    strain TEXT,
    capacity INT,
    chick_in_date DATE,
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
        f.initial_population,
        (f.initial_population - COALESCE(SUM(d.mortality_pcs), 0)::INT - COALESCE(SUM(d.culling_pcs), 0)::INT) AS current_population,
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


-- RPC 3: Get Dashboard Performance Summary for a specific Flock
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
    v_today_hd NUMERIC(5,2) := 0.00;
    v_today_fcr NUMERIC(5,2) := 0.00;
    v_today_avg_egg_g NUMERIC(5,2) := 0.00;
    v_overall_hd NUMERIC(5,2) := 0.00;
    v_overall_fcr NUMERIC(5,2) := 0.00;
BEGIN
    -- Get flock info
    SELECT id, name, coop_name, strain, chick_in_date, initial_population, status
    INTO v_flock
    FROM public.flocks
    WHERE id = p_flock_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Flock not found');
    END IF;

    -- Calculate total mortality & culling to find current active population
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

    v_current_pop := v_flock.initial_population - v_totals.total_mortality - v_totals.total_culling;

    -- Get today's or latest record
    SELECT *
    INTO v_today_record
    FROM public.daily_records
    WHERE flock_id = p_flock_id AND record_date = CURRENT_DATE;

    -- Calculate metrics for today if record exists
    IF v_today_record.id IS NOT NULL THEN
        IF v_current_pop > 0 THEN
            v_today_hd := ROUND((v_today_record.egg_good_pcs::NUMERIC / v_current_pop::NUMERIC) * 100.0, 2);
        END IF;

        IF v_today_record.egg_good_kg > 0 THEN
            v_today_fcr := ROUND(v_today_record.feed_kg / v_today_record.egg_good_kg, 2);
        END IF;

        IF v_today_record.egg_good_pcs > 0 THEN
            v_today_avg_egg_g := ROUND((v_today_record.egg_good_kg * 1000.0) / v_today_record.egg_good_pcs, 2);
        END IF;
    END IF;

    -- Calculate overall cumulative metrics
    IF v_totals.total_days_recorded > 0 AND v_current_pop > 0 THEN
        v_overall_hd := ROUND((v_totals.total_egg_good_pcs::NUMERIC / (v_current_pop * v_totals.total_days_recorded)::NUMERIC) * 100.0, 2);
    END IF;

    IF v_totals.total_egg_good_kg > 0 THEN
        v_overall_fcr := ROUND(v_totals.total_feed_kg / v_totals.total_egg_good_kg, 2);
    END IF;

    -- Build JSON result
    v_result := jsonb_build_object(
        'flock', jsonb_build_object(
            'id', v_flock.id,
            'name', v_flock.name,
            'coop_name', v_flock.coop_name,
            'strain', v_flock.strain,
            'chick_in_date', v_flock.chick_in_date,
            'initial_population', v_flock.initial_population,
            'current_population', v_current_pop,
            'age_weeks', GREATEST(1, FLOOR((CURRENT_DATE - v_flock.chick_in_date) / 7.0))::INT,
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
            'hd_percent', v_today_hd,
            'fcr', v_today_fcr,
            'avg_egg_weight_g', v_today_avg_egg_g,
            'notes', COALESCE(v_today_record.notes, '')
        ),
        'totals', jsonb_build_object(
            'total_mortality', v_totals.total_mortality,
            'total_culling', v_totals.total_culling,
            'total_egg_good_pcs', v_totals.total_egg_good_pcs,
            'total_egg_good_kg', v_totals.total_egg_good_kg,
            'total_egg_bad_pcs', v_totals.total_egg_bad_pcs,
            'total_egg_bad_kg', v_totals.total_egg_bad_kg,
            'total_feed_kg', v_totals.total_feed_kg,
            'total_days_recorded', v_totals.total_days_recorded,
            'overall_hd_percent', v_overall_hd,
            'overall_fcr', v_overall_fcr
        )
    );

    RETURN v_result;
END;
$$;


-- RPC 4: Get Daily History for Charts and Tables with calculated metrics per day
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
        CASE WHEN c.egg_good_kg > 0 THEN ROUND(c.feed_kg / c.egg_good_kg, 2) ELSE 0.00 END AS fcr,
        CASE WHEN c.egg_good_pcs > 0 THEN ROUND((c.egg_good_kg * 1000.0) / c.egg_good_pcs, 2) ELSE 0.00 END AS avg_egg_weight_g,
        c.notes,
        c.created_at
    FROM cumulative_losses c
    ORDER BY c.record_date DESC
    LIMIT p_limit;
END;
$$;


-- RPC 5: Atomic Upsert Daily Record
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
        p_flock_id, p_record_date, COALESCE(p_egg_good_pcs, 0), COALESCE(p_egg_good_kg, 0.00),
        COALESCE(p_egg_bad_pcs, 0), COALESCE(p_egg_bad_kg, 0.00), COALESCE(p_mortality_pcs, 0),
        COALESCE(p_culling_pcs, 0), COALESCE(p_feed_kg, 0.00), p_notes
    )
    ON CONFLICT (flock_id, record_date)
    DO UPDATE SET
        egg_good_pcs = EXCLUDED.egg_good_pcs,
        egg_good_kg = EXCLUDED.egg_good_kg,
        egg_bad_pcs = EXCLUDED.egg_bad_pcs,
        egg_bad_kg = EXCLUDED.egg_bad_kg,
        mortality_pcs = EXCLUDED.mortality_pcs,
        culling_pcs = EXCLUDED.culling_pcs,
        feed_kg = EXCLUDED.feed_kg,
        notes = EXCLUDED.notes
    RETURNING * INTO v_record;

    RETURN to_jsonb(v_record);
END;
$$;


-- RPC 6: Get Health Records Timeline
CREATE OR REPLACE FUNCTION public.get_flock_health_records(p_flock_id UUID)
RETURNS TABLE (
    id UUID,
    record_date DATE,
    category TEXT,
    item_name TEXT,
    dosage TEXT,
    method TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT h.id, h.record_date, h.category, h.item_name, h.dosage, h.method, h.notes, h.created_at
    FROM public.health_records h
    WHERE h.flock_id = p_flock_id
    ORDER BY h.record_date DESC, h.created_at DESC;
END;
$$;


-- RPC 7: Add Health Record (Vaksin / Obat / Vitamin)
CREATE OR REPLACE FUNCTION public.add_health_record(
    p_flock_id UUID,
    p_record_date DATE,
    p_category TEXT,
    p_item_name TEXT,
    p_dosage TEXT,
    p_method TEXT,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_health public.health_records%ROWTYPE;
BEGIN
    INSERT INTO public.health_records (flock_id, record_date, category, item_name, dosage, method, notes)
    VALUES (p_flock_id, p_record_date, p_category, p_item_name, p_dosage, p_method, p_notes)
    RETURNING * INTO v_health;

    RETURN to_jsonb(v_health);
END;
$$;


-- RPC 8: Seed Demo Data Function for Quick Testing
CREATE OR REPLACE FUNCTION public.seed_sample_data()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_flock_id UUID;
    v_date DATE;
    i INT;
    v_good_pcs INT;
    v_good_kg NUMERIC(8,2);
    v_feed NUMERIC(8,2);
    v_mortality INT;
BEGIN
    -- Insert a sample flock
    INSERT INTO public.flocks (name, coop_name, strain, chick_in_date, initial_population, status)
    VALUES ('Flock 12 - Layer Alpha', 'Kandang A', 'Isa Brown', CURRENT_DATE - INTERVAL '120 days', 2000, 'active')
    RETURNING id INTO v_flock_id;

    -- Generate 14 days of realistic daily data
    FOR i IN REVERSE 0..13 LOOP
        v_date := CURRENT_DATE - (i || ' day')::INTERVAL;
        v_good_pcs := 1720 + (RANDOM() * 100)::INT;
        v_good_kg := ROUND((v_good_pcs * 0.062)::NUMERIC, 2);
        v_feed := ROUND((115.0 * 2000 / 1000.0 + (RANDOM() * 5.0))::NUMERIC, 2);
        
        IF RANDOM() > 0.7 THEN
            v_mortality := 1;
        ELSE
            v_mortality := 0;
        END IF;

        PERFORM public.upsert_daily_record(
            v_flock_id,
            v_date,
            v_good_pcs,
            v_good_kg,
            12,
            0.72,
            v_mortality,
            0,
            v_feed,
            'Kondisi ayam sehat dan aktif.'
        );
    END FOR;

    -- Insert health records
    PERFORM public.add_health_record(
        v_flock_id,
        CURRENT_DATE - INTERVAL '10 days',
        'Vaksin',
        'Vaksin ND-IB Booster',
        '2000 Dosis',
        'Air Minum',
        'Booster rutin umur 16 minggu'
    );

    PERFORM public.add_health_record(
        v_flock_id,
        CURRENT_DATE - INTERVAL '3 days',
        'Vitamin',
        'Egg Stimulant Vita',
        '100g / 200L Air',
        'Air Minum',
        'Pemberian vitamin pemicu telur'
    );

    RETURN v_flock_id;
END;
$$;
