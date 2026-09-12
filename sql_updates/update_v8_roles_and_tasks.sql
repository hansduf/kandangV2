-- ==============================================================================
-- UPDATE V8: MULTI-ROLE (OWNER & WORKER), PROFILES, TASKS & COMPLETIONS
-- ==============================================================================

-- 1. Create app_profiles table
CREATE TABLE IF NOT EXISTS public.app_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'worker')),
    pin TEXT, -- 4-digit PIN for owner
    avatar_color TEXT NOT NULL DEFAULT '#00684a',
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial Owner and Worker 1 if table is empty
INSERT INTO public.app_profiles (name, role, pin, avatar_color)
SELECT 'Pemilik', 'owner', '1234', '#00684a'
WHERE NOT EXISTS (SELECT 1 FROM public.app_profiles WHERE role = 'owner');

INSERT INTO public.app_profiles (name, role, pin, avatar_color)
SELECT 'Pekerja 1', 'worker', NULL, '#2563eb'
WHERE NOT EXISTS (SELECT 1 FROM public.app_profiles WHERE role = 'worker');

-- 2. Create farm_tasks table
CREATE TABLE IF NOT EXISTS public.farm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL DEFAULT 'custom', -- daily_record, vaccine, feed, cleaning, vitamin, custom
    flock_id UUID REFERENCES public.flocks(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.app_profiles(id) ON DELETE SET NULL, -- NULL = all workers
    recurrence_type TEXT NOT NULL DEFAULT 'daily', -- once, daily, interval, days_of_week
    recurrence_interval INT DEFAULT 1, -- e.g. every 3 days
    days_of_week INT[], -- e.g. [1, 4] for Mon, Thu (0=Sun, 1=Mon, ..., 6=Sat)
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    due_time TIME DEFAULT '16:00',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial daily egg record task if not exists
INSERT INTO public.farm_tasks (title, description, task_type, recurrence_type, due_time)
SELECT 'Catat Produksi Telur & Pakan', 'Hitung jumlah butir telur utuh, rusak, dan timbangan sore ini', 'daily_record', 'daily', '16:30'
WHERE NOT EXISTS (SELECT 1 FROM public.farm_tasks WHERE task_type = 'daily_record');

-- 3. Create task_completions table
CREATE TABLE IF NOT EXISTS public.task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.farm_tasks(id) ON DELETE CASCADE,
    task_date DATE NOT NULL,
    completed_by UUID REFERENCES public.app_profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    CONSTRAINT uq_task_date UNIQUE(task_id, task_date)
);

-- 4. RPC to verify Owner PIN
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

-- 5. RPC to get tasks for a specific date with completion status
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
        (tc.id IS NOT NULL OR (
            t.task_type = 'daily_record' AND EXISTS (
                SELECT 1 FROM public.daily_records dr 
                WHERE dr.record_date = p_date 
                  AND (t.flock_id IS NULL OR dr.flock_id = t.flock_id)
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
          -- One-time task on exact date
          (t.recurrence_type = 'once' AND t.start_date = p_date)
          -- Daily task
          OR (t.recurrence_type = 'daily')
          -- Interval every N days
          OR (t.recurrence_type = 'interval' AND ((p_date - t.start_date) % GREATEST(1, t.recurrence_interval)) = 0)
          -- Specific days of week
          OR (t.recurrence_type = 'days_of_week' AND EXTRACT(DOW FROM p_date)::INT = ANY(t.days_of_week))
      )
      AND (p_worker_id IS NULL OR t.assigned_to IS NULL OR t.assigned_to = p_worker_id)
    ORDER BY t.due_time ASC, t.created_at ASC;
END;
$$;

-- 6. RPC to toggle task completion
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
