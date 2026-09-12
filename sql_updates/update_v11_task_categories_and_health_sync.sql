-- ==============================================================================
-- UPDATE V11: TASK CATEGORIES (VAKSIN, OBAT, VITAMIN) & PER-COOP COMPLETION SYNC
-- ==============================================================================
-- 1. Mendukung kategori tugas lengkap:
--    - 'daily_record' (Produksi Telur & Pakan)
--    - 'vaccine' (Vaksinasi)
--    - 'medicine' (Pemberian Obat)
--    - 'vitamin' (Pemberian Vitamin)
--    - 'cleaning' (Pembersihan Kandang)
--    - 'custom' (Lainnya)
-- 2. Memperbarui RPC get_tasks_for_date agar otomatis mendeteksi penyelesaian
--    tugas Vaksin, Obat, dan Vitamin jika tercatat di tabel health_records.
-- ==============================================================================

-- 1. Drop fungsi get_tasks_for_date lama agar tidak konflik
DROP FUNCTION IF EXISTS public.get_tasks_for_date(DATE, UUID);

-- 2. Buat ulang fungsi get_tasks_for_date dengan dukungan lengkap untuk Vaksin, Obat, & Vitamin
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
        (
            -- Kasus 1: Dicentang manual di task_completions
            tc.id IS NOT NULL 
            OR (
                -- Kasus 2: Tugas Catat Telur & Pakan (daily_record)
                t.task_type = 'daily_record' AND (
                    -- Jika khusus untuk 1 kandang tertentu
                    (t.flock_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM public.daily_records dr 
                        WHERE dr.record_date = p_date AND dr.flock_id = t.flock_id
                    ))
                    OR
                    -- Jika untuk semua kandang: SEMUA kandang aktif harus sudah tercatat
                    (t.flock_id IS NULL AND NOT EXISTS (
                        SELECT 1 FROM public.flocks f_req 
                        WHERE (f_req.status = 'active' OR f_req.status IS NULL)
                          AND NOT EXISTS (
                              SELECT 1 FROM public.daily_records dr_all
                              WHERE dr_all.flock_id = f_req.id AND dr_all.record_date = p_date
                          )
                    ) AND EXISTS (SELECT 1 FROM public.flocks WHERE status = 'active' OR status IS NULL))
                )
            )
            OR (
                -- Kasus 3: Tugas Vaksinasi, Obat, atau Vitamin otomatis selesai jika ada di health_records
                t.task_type IN ('vaccine', 'medicine', 'vitamin') AND (
                    -- Khusus 1 kandang
                    (t.flock_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM public.health_records hr
                        WHERE hr.record_date = p_date AND hr.flock_id = t.flock_id
                          AND (
                              (t.task_type = 'vaccine' AND hr.category ILIKE '%vaksin%')
                              OR (t.task_type = 'medicine' AND (hr.category ILIKE '%obat%' OR hr.category ILIKE '%medis%'))
                              OR (t.task_type = 'vitamin' AND hr.category ILIKE '%vitamin%')
                          )
                    ))
                    OR
                    -- Tugas farm-wide (Semua Kandang)
                    (t.flock_id IS NULL AND EXISTS (
                        SELECT 1 FROM public.health_records hr
                        WHERE hr.record_date = p_date
                          AND (
                              (t.task_type = 'vaccine' AND hr.category ILIKE '%vaksin%')
                              OR (t.task_type = 'medicine' AND (hr.category ILIKE '%obat%' OR hr.category ILIKE '%medis%'))
                              OR (t.task_type = 'vitamin' AND hr.category ILIKE '%vitamin%')
                          )
                    ))
                )
            )
        ) AS is_completed,
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
          OR (t.recurrence_type = 'days_of_week' AND EXTRACT(DOW FROM p_date)::INT = ANY(t.days_of_week))
          OR (t.recurrence_type = 'interval' AND ((p_date - t.start_date) >= 0) AND ((p_date - t.start_date) % GREATEST(1, COALESCE(t.recurrence_interval, 1)) = 0))
      )
      AND (
          p_worker_id IS NULL 
          OR t.assigned_to IS NULL 
          OR t.assigned_to = p_worker_id
      )
    ORDER BY t.due_time ASC NULLS LAST, t.created_at ASC;
END;
$$;

-- 3. Berikan hak akses execute
GRANT EXECUTE ON FUNCTION public.get_tasks_for_date(DATE, UUID) TO anon, authenticated, service_role;
