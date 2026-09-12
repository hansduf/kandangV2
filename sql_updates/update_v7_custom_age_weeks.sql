-- ==============================================================================
-- UPDATE V7: CUSTOM UMUR AYAM (CHICK-IN / MASUK KANDANG)
-- ==============================================================================
-- Fitur:
-- Menambahkan kolom `initial_age_weeks` ke tabel `flocks` agar user bisa menentukan
-- umur ayam saat masuk kandang (misal 1 minggu untuk DOC, 8 minggu untuk ayam dara,
-- atau 16/18 minggu untuk pullet siap telur).
-- ==============================================================================

-- 1. Tambahkan kolom initial_age_weeks ke tabel flocks
ALTER TABLE public.flocks ADD COLUMN IF NOT EXISTS initial_age_weeks INT NOT NULL DEFAULT 1;

-- 2. Update fungsi create_flock
DROP FUNCTION IF EXISTS public.create_flock(TEXT, TEXT, TEXT, INT, DATE, INT, DATE, TEXT);
DROP FUNCTION IF EXISTS public.create_flock(TEXT, TEXT, TEXT, INT, DATE, INT, DATE, TEXT, INT);

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
    INSERT INTO public.flocks (
        name, coop_name, strain, capacity, chick_in_date, chick_out_date,
        initial_population, status, initial_age_weeks
    )
    VALUES (
        p_name, p_coop_name, COALESCE(p_strain, '-'), 
        COALESCE(p_capacity, p_initial_population, 0), 
        p_chick_in_date, p_chick_out_date, 
        p_initial_population, COALESCE(p_status, 'active'),
        COALESCE(p_initial_age_weeks, 1)
    )
    RETURNING * INTO v_flock;

    RETURN to_jsonb(v_flock);
END;
$$;


-- 3. Update fungsi update_flock
DROP FUNCTION IF EXISTS public.update_flock(UUID, TEXT, TEXT, TEXT, INT, DATE, INT, DATE, TEXT);
DROP FUNCTION IF EXISTS public.update_flock(UUID, TEXT, TEXT, TEXT, INT, DATE, INT, DATE, TEXT, INT);

CREATE OR REPLACE FUNCTION public.update_flock(
    p_id UUID,
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
    UPDATE public.flocks
    SET
        name = p_name,
        coop_name = p_coop_name,
        strain = COALESCE(p_strain, '-'),
        capacity = COALESCE(p_capacity, p_initial_population, 0),
        chick_in_date = p_chick_in_date,
        chick_out_date = p_chick_out_date,
        initial_population = p_initial_population,
        status = COALESCE(p_status, 'active'),
        initial_age_weeks = COALESCE(p_initial_age_weeks, 1)
    WHERE id = p_id
    RETURNING * INTO v_flock;

    RETURN to_jsonb(v_flock);
END;
$$;


-- 4. Update fungsi get_flocks (menghitung umur terkini = umur awal + selisih minggu)
DROP FUNCTION IF EXISTS public.get_flocks();

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
