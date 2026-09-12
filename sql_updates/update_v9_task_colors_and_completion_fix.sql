-- ==============================================================================
-- UPDATE V9: TASK COLORS & MULTI-COOP COMPLETION SYNC FIX
-- ==============================================================================

-- 1. Add color column to farm_tasks for custom calendar indicator dots
ALTER TABLE public.farm_tasks 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10b981';

-- Update existing records if color is null
UPDATE public.farm_tasks 
SET color = '#10b981' 
WHERE color IS NULL;

-- 2. Drop previous function to allow updating return table columns cleanly
DROP FUNCTION IF EXISTS public.get_tasks_for_date(DATE, UUID);

-- 3. Re-create get_tasks_for_date with color column & strict multi-flock completion check
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
                -- Flock-specific task: only completed if this specific flock has recorded
                (t.flock_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.daily_records dr 
                    WHERE dr.record_date = p_date AND dr.flock_id = t.flock_id
                ))
                OR
                -- Farm-wide general task: ALL active flocks must have recorded on p_date
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
          -- One-time task on exact date
          (t.recurrence_type = 'once' AND t.start_date = p_date)
          -- Daily task
          OR (t.recurrence_type = 'daily')
          -- Specific days of the week (0=Sun, 1=Mon, ..., 6=Sat)
          OR (t.recurrence_type = 'days_of_week' AND EXTRACT(DOW FROM p_date)::INT = ANY(t.days_of_week))
          -- Interval every N days
          OR (t.recurrence_type = 'interval' AND ((p_date - t.start_date) >= 0) AND ((p_date - t.start_date) % GREATEST(1, COALESCE(t.recurrence_interval, 1)) = 0))
      )
      AND (
          -- Assigned to specific worker or farm-wide (all workers)
          p_worker_id IS NULL 
          OR t.assigned_to IS NULL 
          OR t.assigned_to = p_worker_id
      )
    ORDER BY t.due_time ASC NULLS LAST, t.created_at ASC;
END;
$$;
