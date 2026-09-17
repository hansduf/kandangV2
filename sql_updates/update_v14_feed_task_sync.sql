-- ==============================================================================
-- UPDATE V14: FEED TASK SUPPORT & AUTOMATIC COMPLETION SYNC (OPTION 2)
-- ==============================================================================
-- 1. Menambahkan kolom feed_morning_kg dan feed_afternoon_kg di daily_records jika belum ada
-- 2. Memperbarui get_tasks_for_date agar mendukung task_type = 'feed' dengan kriteria Opsi 2:
--    - Jika judul tugas mengandung "Pagi" -> selesai saat feed_morning_kg > 0 (atau feed_kg > 0)
--    - Jika judul tugas mengandung "Sore" -> selesai saat feed_afternoon_kg > 0
--    - Tugas pakan umum -> selesai saat total pakan (feed_kg) > 0
--    - Multi-kandang: seluruh kandang target harus memenuhi syarat agar tugas selesai
-- ==============================================================================

-- 1. Tambah kolom pencatatan pakan pagi & sore di daily_records
ALTER TABLE public.daily_records
ADD COLUMN IF NOT EXISTS feed_morning_kg NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS feed_afternoon_kg NUMERIC(10, 2) DEFAULT 0;

-- 2. Drop fungsi get_tasks_for_date lama
DROP FUNCTION IF EXISTS public.get_tasks_for_date(DATE, UUID);

-- 3. Buat ulang fungsi get_tasks_for_date dengan dukungan tugas pakan (feed)
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
    flock_ids UUID[],
    coop_name TEXT,
    flock_name TEXT,
    assigned_to UUID,
    assigned_to_ids UUID[],
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
        t.flock_ids,
        f.coop_name,
        f.name AS flock_name,
        t.assigned_to,
        t.assigned_to_ids,
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
                -- Kasus 2: Tugas Catat Telur (daily_record)
                t.task_type = 'daily_record' AND (
                    -- Jika khusus 1 kandang tunggal
                    (t.flock_id IS NOT NULL AND (t.flock_ids IS NULL OR cardinality(t.flock_ids) = 0) AND EXISTS (
                        SELECT 1 FROM public.daily_records dr 
                        WHERE dr.record_date = p_date AND dr.flock_id = t.flock_id
                    ))
                    OR
                    -- Jika memilih beberapa kandang tertentu (flock_ids)
                    (t.flock_ids IS NOT NULL AND cardinality(t.flock_ids) > 0 AND NOT EXISTS (
                        SELECT 1 FROM unnest(t.flock_ids) target_fid
                        WHERE NOT EXISTS (
                            SELECT 1 FROM public.daily_records dr_sub
                            WHERE dr_sub.flock_id = target_fid AND dr_sub.record_date = p_date
                        )
                    ))
                    OR
                    -- Jika untuk semua kandang: SEMUA kandang aktif harus sudah tercatat
                    (t.flock_id IS NULL AND (t.flock_ids IS NULL OR cardinality(t.flock_ids) = 0) AND NOT EXISTS (
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
                -- Kasus 3: Tugas Vaksinasi, Obat, atau Vitamin
                t.task_type IN ('vaccine', 'medicine', 'vitamin') AND (
                    -- Khusus 1 kandang tunggal
                    (t.flock_id IS NOT NULL AND (t.flock_ids IS NULL OR cardinality(t.flock_ids) = 0) AND EXISTS (
                        SELECT 1 FROM public.health_records hr
                        WHERE hr.record_date = p_date AND hr.flock_id = t.flock_id
                          AND (
                              (t.task_type = 'vaccine' AND hr.category ILIKE '%vaksin%')
                              OR (t.task_type = 'medicine' AND (hr.category ILIKE '%obat%' OR hr.category ILIKE '%medis%'))
                              OR (t.task_type = 'vitamin' AND hr.category ILIKE '%vitamin%')
                          )
                    ))
                    OR
                    -- Khusus beberapa kandang tertentu (flock_ids): SEMUA kandang terpilih harus sudah tercatat
                    (t.flock_ids IS NOT NULL AND cardinality(t.flock_ids) > 0 AND NOT EXISTS (
                        SELECT 1 FROM unnest(t.flock_ids) target_fid
                        WHERE NOT EXISTS (
                            SELECT 1 FROM public.health_records hr_sub
                            WHERE hr_sub.flock_id = target_fid AND hr_sub.record_date = p_date
                              AND (
                                  (t.task_type = 'vaccine' AND hr_sub.category ILIKE '%vaksin%')
                                  OR (t.task_type = 'medicine' AND (hr_sub.category ILIKE '%obat%' OR hr_sub.category ILIKE '%medis%'))
                                  OR (t.task_type = 'vitamin' AND hr_sub.category ILIKE '%vitamin%')
                              )
                        )
                    ))
                    OR
                    -- Farm-wide (Semua Kandang): SEMUA kandang aktif harus sudah tercatat
                    (t.flock_id IS NULL AND (t.flock_ids IS NULL OR cardinality(t.flock_ids) = 0) AND NOT EXISTS (
                        SELECT 1 FROM public.flocks f_req 
                        WHERE (f_req.status = 'active' OR f_req.status IS NULL)
                          AND NOT EXISTS (
                              SELECT 1 FROM public.health_records hr_all
                              WHERE hr_all.flock_id = f_req.id AND hr_all.record_date = p_date
                                AND (
                                    (t.task_type = 'vaccine' AND hr_all.category ILIKE '%vaksin%')
                                    OR (t.task_type = 'medicine' AND (hr_all.category ILIKE '%obat%' OR hr_all.category ILIKE '%medis%'))
                                    OR (t.task_type = 'vitamin' AND hr_all.category ILIKE '%vitamin%')
                                )
                          )
                    ) AND EXISTS (SELECT 1 FROM public.flocks WHERE status = 'active' OR status IS NULL))
                )
            )
            OR (
                -- Kasus 4: Tugas Pemberian Pakan (feed) - Opsi 2 (Deteksi Pagi / Sore / Total)
                t.task_type = 'feed' AND (
                    -- Khusus 1 kandang tunggal
                    (t.flock_id IS NOT NULL AND (t.flock_ids IS NULL OR cardinality(t.flock_ids) = 0) AND EXISTS (
                        SELECT 1 FROM public.daily_records dr 
                        WHERE dr.record_date = p_date AND dr.flock_id = t.flock_id
                          AND (
                              -- Jika judul tugas pakan mengandung "pagi"
                              (t.title ILIKE '%pagi%' AND (COALESCE(dr.feed_morning_kg, 0) > 0 OR (COALESCE(dr.feed_kg, 0) > 0 AND COALESCE(dr.feed_afternoon_kg, 0) = 0)))
                              OR
                              -- Jika judul tugas pakan mengandung "sore"
                              (t.title ILIKE '%sore%' AND COALESCE(dr.feed_afternoon_kg, 0) > 0)
                              OR
                              -- Tugas pakan umum / lainnya (semua waktu)
                              (t.title NOT ILIKE '%pagi%' AND t.title NOT ILIKE '%sore%' AND (
                                  COALESCE(dr.feed_kg, 0) > 0 OR COALESCE(dr.feed_morning_kg, 0) > 0 OR COALESCE(dr.feed_afternoon_kg, 0) > 0
                              ))
                          )
                    ))
                    OR
                    -- Khusus beberapa kandang tertentu (flock_ids): SEMUA kandang terpilih harus sudah diberi pakan sesuai kriteria
                    (t.flock_ids IS NOT NULL AND cardinality(t.flock_ids) > 0 AND NOT EXISTS (
                        SELECT 1 FROM unnest(t.flock_ids) target_fid
                        WHERE NOT EXISTS (
                            SELECT 1 FROM public.daily_records dr_sub
                            WHERE dr_sub.flock_id = target_fid AND dr_sub.record_date = p_date
                              AND (
                                  (t.title ILIKE '%pagi%' AND (COALESCE(dr_sub.feed_morning_kg, 0) > 0 OR (COALESCE(dr_sub.feed_kg, 0) > 0 AND COALESCE(dr_sub.feed_afternoon_kg, 0) = 0)))
                                  OR
                                  (t.title ILIKE '%sore%' AND COALESCE(dr_sub.feed_afternoon_kg, 0) > 0)
                                  OR
                                  (t.title NOT ILIKE '%pagi%' AND t.title NOT ILIKE '%sore%' AND (
                                      COALESCE(dr_sub.feed_kg, 0) > 0 OR COALESCE(dr_sub.feed_morning_kg, 0) > 0 OR COALESCE(dr_sub.feed_afternoon_kg, 0) > 0
                                  ))
                              )
                        )
                    ))
                    OR
                    -- Farm-wide (Semua Kandang): SEMUA kandang aktif harus sudah diberi pakan sesuai kriteria
                    (t.flock_id IS NULL AND (t.flock_ids IS NULL OR cardinality(t.flock_ids) = 0) AND NOT EXISTS (
                        SELECT 1 FROM public.flocks f_req 
                        WHERE (f_req.status = 'active' OR f_req.status IS NULL)
                          AND NOT EXISTS (
                              SELECT 1 FROM public.daily_records dr_all
                              WHERE dr_all.flock_id = f_req.id AND dr_all.record_date = p_date
                                AND (
                                    (t.title ILIKE '%pagi%' AND (COALESCE(dr_all.feed_morning_kg, 0) > 0 OR (COALESCE(dr_all.feed_kg, 0) > 0 AND COALESCE(dr_all.feed_afternoon_kg, 0) = 0)))
                                    OR
                                    (t.title ILIKE '%sore%' AND COALESCE(dr_all.feed_afternoon_kg, 0) > 0)
                                    OR
                                    (t.title NOT ILIKE '%pagi%' AND t.title NOT ILIKE '%sore%' AND (
                                        COALESCE(dr_all.feed_kg, 0) > 0 OR COALESCE(dr_all.feed_morning_kg, 0) > 0 OR COALESCE(dr_all.feed_afternoon_kg, 0) > 0
                                    ))
                                )
                          )
                    ) AND EXISTS (SELECT 1 FROM public.flocks WHERE status = 'active' OR status IS NULL))
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
          p_worker_id IS NULL
          OR (
              t.assigned_to IS NULL 
              AND (t.assigned_to_ids IS NULL OR cardinality(t.assigned_to_ids) = 0)
          )
          OR t.assigned_to = p_worker_id
          OR (t.assigned_to_ids IS NOT NULL AND p_worker_id = ANY(t.assigned_to_ids))
      )
      AND (
          (t.recurrence_type = 'once' AND t.start_date = p_date)
          OR (t.recurrence_type = 'daily')
          OR (t.recurrence_type = 'days_of_week' AND EXTRACT(DOW FROM p_date)::INT = ANY(t.days_of_week))
          OR (t.recurrence_type = 'interval' AND ((p_date - t.start_date) >= 0) AND ((p_date - t.start_date) % GREATEST(1, COALESCE(t.recurrence_interval, 1)) = 0))
      )
    ORDER BY is_completed ASC, t.due_time ASC;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_tasks_for_date(DATE, UUID) TO anon, authenticated, service_role;

-- 4. Perbarui get_flock_daily_history agar mengembalikan feed_morning_kg dan feed_afternoon_kg
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

GRANT EXECUTE ON FUNCTION public.get_flock_daily_history(UUID, INT) TO anon, authenticated, service_role;

