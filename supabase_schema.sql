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
    chick_out_date DATE,
    initial_population INT NOT NULL DEFAULT 0,
    initial_age_weeks INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'archived' | 'checked_out'
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
    vaccinated_birds_count INT DEFAULT 0, -- Jumlah ayam yang diberi vaksin/obat
    method TEXT, -- 'Air Minum', 'Injeksi / Suntik', 'Tetes Mata', 'Campur Pakan', 'Semprot / Fogging', 'Tetes Mulut'
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

-- DROP EXISTING FUNCTIONS TO PREVENT TYPE CHANGE ERRORS (42P13)
DROP FUNCTION IF EXISTS public.create_flock(TEXT, TEXT, TEXT, INT, DATE, INT);
DROP FUNCTION IF EXISTS public.create_flock(TEXT, TEXT, TEXT, INT, DATE, INT, DATE, TEXT);
DROP FUNCTION IF EXISTS public.get_flocks();
DROP FUNCTION IF EXISTS public.get_flock_dashboard_summary(UUID);
DROP FUNCTION IF EXISTS public.get_flock_daily_history(UUID, INT);
DROP FUNCTION IF EXISTS public.upsert_daily_record(UUID, DATE, INT, NUMERIC, INT, NUMERIC, INT, INT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.get_flock_health_records(UUID);
DROP FUNCTION IF EXISTS public.add_health_record(UUID, DATE, TEXT, TEXT, TEXT, INT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_flock(UUID, TEXT, TEXT, TEXT, INT, DATE, INT);
DROP FUNCTION IF EXISTS public.update_flock(UUID, TEXT, TEXT, TEXT, INT, DATE, INT, DATE, TEXT);
DROP FUNCTION IF EXISTS public.delete_flock(UUID);


-- RPC 1: Create a new Flock
CREATE OR REPLACE FUNCTION public.create_flock(
    p_name TEXT,
    p_coop_name TEXT,
    p_strain TEXT,
    p_capacity INT,
    p_chick_in_date DATE,
    p_initial_population INT,
    p_chick_out_date DATE DEFAULT NULL,
    p_status TEXT DEFAULT 'active',
    p_initial_age_weeks INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_flock public.flocks%ROWTYPE;
BEGIN
    INSERT INTO public.flocks (name, coop_name, strain, capacity, chick_in_date, chick_out_date, initial_population, status, initial_age_weeks)
    VALUES (p_name, p_coop_name, COALESCE(p_strain, '-'), COALESCE(p_capacity, p_initial_population, 0), p_chick_in_date, p_chick_out_date, p_initial_population, COALESCE(p_status, 'active'), COALESCE(p_initial_age_weeks, 1))
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
    chick_out_date DATE,
    initial_population INT,
    current_population INT,
    initial_age_weeks INT,
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
        COALESCE(f.initial_age_weeks, 1)::INT AS initial_age_weeks,
        COALESCE(SUM(d.mortality_pcs), 0)::INT AS total_mortality,
        COALESCE(SUM(d.culling_pcs), 0)::INT AS total_culling,
        (COALESCE(f.initial_age_weeks, 1) + GREATEST(0, FLOOR((COALESCE(f.chick_out_date, CURRENT_DATE) - f.chick_in_date) / 7.0)))::INT AS age_weeks,
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

    IF v_today_record.record_date IS NOT NULL THEN
        IF v_current_pop > 0 THEN
            v_today_hdp := ROUND((v_today_record.egg_good_pcs::NUMERIC / v_current_pop::NUMERIC) * 100.0, 2);
        END IF;
        IF v_initial_pop > 0 THEN
            v_today_hhp := ROUND((v_today_record.egg_good_pcs::NUMERIC / v_initial_pop::NUMERIC) * 100.0, 2);
        END IF;
        -- HITUNG fcr & avg_egg_weight_g (bukan baca dari kolom)
        IF v_today_record.egg_good_kg > 0 THEN
            v_today_fcr := ROUND(v_today_record.feed_kg / v_today_record.egg_good_kg, 2);
        END IF;
        IF v_today_record.egg_good_pcs > 0 THEN
            v_today_avg_egg_g := ROUND((v_today_record.egg_good_kg * 1000.0) / v_today_record.egg_good_pcs, 2);
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
            'age_weeks', GREATEST(1, FLOOR((COALESCE(v_flock.chick_out_date, CURRENT_DATE) - v_flock.chick_in_date) / 7.0)),
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


-- RPC 6: Get Health Records Timeline
CREATE OR REPLACE FUNCTION public.get_flock_health_records(p_flock_id UUID)
RETURNS TABLE (
    id UUID,
    record_date DATE,
    category TEXT,
    item_name TEXT,
    dosage TEXT,
    vaccinated_birds_count INT,
    method TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT h.id, h.record_date, h.category, h.item_name, h.dosage, COALESCE(h.vaccinated_birds_count, 0)::INT, h.method, h.notes, h.created_at
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
    p_vaccinated_birds_count INT,
    p_method TEXT,
    p_notes TEXT
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


-- RPC 8: Update Existing Flock
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


-- RPC 9: Delete Flock
CREATE OR REPLACE FUNCTION public.delete_flock(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.flocks WHERE id = p_id;
END;
$$;

-- ==============================================================================
-- UPDATE V8: MULTI-ROLE (OWNER & WORKER), PROFILES, TASKS & COMPLETIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.app_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'worker')),
    pin TEXT,
    avatar_color TEXT NOT NULL DEFAULT '#00684a',
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_profiles (name, role, pin, avatar_color)
SELECT 'Pemilik', 'owner', '1234', '#00684a'
WHERE NOT EXISTS (SELECT 1 FROM public.app_profiles WHERE role = 'owner');

INSERT INTO public.app_profiles (name, role, pin, avatar_color)
SELECT 'Pekerja 1', 'worker', NULL, '#2563eb'
WHERE NOT EXISTS (SELECT 1 FROM public.app_profiles WHERE role = 'worker');

CREATE TABLE IF NOT EXISTS public.farm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL DEFAULT 'custom',
    flock_id UUID REFERENCES public.flocks(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.app_profiles(id) ON DELETE SET NULL,
    recurrence_type TEXT NOT NULL DEFAULT 'daily',
    recurrence_interval INT DEFAULT 1,
    days_of_week INT[],
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    due_time TIME DEFAULT '16:00',
    color TEXT DEFAULT '#10b981',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.farm_tasks(id) ON DELETE CASCADE,
    task_date DATE NOT NULL,
    completed_by UUID REFERENCES public.app_profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    CONSTRAINT uq_task_date UNIQUE(task_id, task_date)
);

CREATE OR REPLACE FUNCTION public.verify_owner_pin(
    p_profile_id UUID,
    p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_pin TEXT;
BEGIN
    SELECT pin INTO v_stored_pin
    FROM public.app_profiles
    WHERE id = p_profile_id AND role = 'owner';

    IF v_stored_pin IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN (v_stored_pin = p_pin);
END;
$$;

DROP FUNCTION IF EXISTS public.get_tasks_for_date(DATE, UUID);

CREATE OR REPLACE FUNCTION public.get_tasks_for_date(
    p_date DATE,
    p_worker_id UUID DEFAULT NULL
)
RETURNS TABLE (
    task_id UUID,
    title TEXT,
    description TEXT,
    task_type TEXT,
    flock_id UUID,
    coop_name TEXT,
    flock_name TEXT,
    assigned_to UUID,
    assigned_name TEXT,
    recurrence_type TEXT,
    recurrence_interval INT,
    days_of_week INT[],
    due_time TIME,
    color TEXT,
    is_completed BOOLEAN,
    completed_at TIMESTAMPTZ,
    completed_by UUID,
    completed_by_name TEXT,
    notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id AS task_id,
        t.title,
        t.description,
        t.task_type,
        t.flock_id,
        f.coop_name,
        f.name AS flock_name,
        t.assigned_to,
        ap.name AS assigned_name,
        t.recurrence_type,
        t.recurrence_interval,
        t.days_of_week,
        t.due_time,
        COALESCE(t.color, '#10b981') AS color,
        (tc.id IS NOT NULL OR (
            t.task_type = 'daily_record' AND (
                -- Flock-specific task
                (t.flock_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.daily_records dr 
                    WHERE dr.record_date = p_date AND dr.flock_id = t.flock_id
                ))
                OR
                -- Farm-wide general task: ALL active flocks must have recorded
                (t.flock_id IS NULL AND NOT EXISTS (
                    SELECT 1 FROM public.flocks f_req 
                    WHERE (f_req.status = 'active' OR f_req.status IS NULL)
                      AND NOT EXISTS (
                          SELECT 1 FROM public.daily_records dr_all
                          WHERE dr_all.flock_id = f_req.id AND dr_all.record_date = p_date
                      )
                ) AND EXISTS (SELECT 1 FROM public.flocks WHERE status = 'active' OR status IS NULL))
            )
        )) AS is_completed,
        tc.completed_at,
        tc.completed_by,
        cp.name AS completed_by_name,
        tc.notes
    FROM public.farm_tasks t
    LEFT JOIN public.flocks f ON t.flock_id = f.id
    LEFT JOIN public.app_profiles ap ON t.assigned_to = ap.id
    LEFT JOIN public.task_completions tc ON t.id = tc.task_id AND tc.task_date = p_date
    LEFT JOIN public.app_profiles cp ON tc.completed_by = cp.id
    WHERE t.is_active = true
      AND t.start_date <= p_date
      AND (t.end_date IS NULL OR t.end_date >= p_date)
      AND (
          (t.recurrence_type = 'once' AND t.start_date = p_date)
          OR (t.recurrence_type = 'daily')
          OR (t.recurrence_type = 'interval' AND ((p_date - t.start_date) >= 0) AND ((p_date - t.start_date) % GREATEST(1, COALESCE(t.recurrence_interval, 1)) = 0))
          OR (t.recurrence_type = 'days_of_week' AND EXTRACT(DOW FROM p_date)::INT = ANY(t.days_of_week))
      )
      AND (p_worker_id IS NULL OR t.assigned_to IS NULL OR t.assigned_to = p_worker_id)
    ORDER BY t.due_time ASC NULLS LAST, t.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_task_completion(
    p_task_id UUID,
    p_date DATE,
    p_worker_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    SELECT id INTO v_existing_id
    FROM public.task_completions
    WHERE task_id = p_task_id AND task_date = p_date;

    IF v_existing_id IS NOT NULL THEN
        DELETE FROM public.task_completions WHERE id = v_existing_id;
        RETURN FALSE;
    ELSE
        INSERT INTO public.task_completions (task_id, task_date, completed_by, notes)
        VALUES (p_task_id, p_date, p_worker_id, p_notes);
        RETURN TRUE;
    END IF;
END;
$$;

