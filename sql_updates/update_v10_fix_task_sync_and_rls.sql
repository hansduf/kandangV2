-- ==============================================================================
-- UPDATE V10: FIX CROSS-DEVICE TASK SYNC & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Masalah: Perubahan tugas (tambah tugas, ubah tanggal, centang tugas) di HP A
-- tidak muncul di HP B dan C karena tabel app_profiles, farm_tasks, dan task_completions
-- belum memiliki Policy RLS publik untuk role 'anon' (pengunjung/browser aplikasi)
-- serta grant permissions untuk role publik.
--
-- Jalankan skrip ini di SQL Editor Supabase untuk membuka akses sinkronisasi
-- otomatis antar seluruh perangkat (HP A, B, C, PC).
-- ==============================================================================

-- 1. Pastikan ekstensi pgcrypto tersedia untuk UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Pastikan RLS aktif pada tabel role & tugas
ALTER TABLE public.app_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- 3. Hapus policy lama jika ada untuk mencegah konflik / duplikasi
DROP POLICY IF EXISTS "Allow public select app_profiles" ON public.app_profiles;
DROP POLICY IF EXISTS "Allow public insert app_profiles" ON public.app_profiles;
DROP POLICY IF EXISTS "Allow public update app_profiles" ON public.app_profiles;
DROP POLICY IF EXISTS "Allow public delete app_profiles" ON public.app_profiles;
DROP POLICY IF EXISTS "Allow all app_profiles" ON public.app_profiles;
DROP POLICY IF EXISTS "Allow all access to app_profiles" ON public.app_profiles;

DROP POLICY IF EXISTS "Allow public select farm_tasks" ON public.farm_tasks;
DROP POLICY IF EXISTS "Allow public insert farm_tasks" ON public.farm_tasks;
DROP POLICY IF EXISTS "Allow public update farm_tasks" ON public.farm_tasks;
DROP POLICY IF EXISTS "Allow public delete farm_tasks" ON public.farm_tasks;
DROP POLICY IF EXISTS "Allow all farm_tasks" ON public.farm_tasks;
DROP POLICY IF EXISTS "Allow all access to farm_tasks" ON public.farm_tasks;

DROP POLICY IF EXISTS "Allow public select task_completions" ON public.task_completions;
DROP POLICY IF EXISTS "Allow public insert task_completions" ON public.task_completions;
DROP POLICY IF EXISTS "Allow public update task_completions" ON public.task_completions;
DROP POLICY IF EXISTS "Allow public delete task_completions" ON public.task_completions;
DROP POLICY IF EXISTS "Allow all task_completions" ON public.task_completions;
DROP POLICY IF EXISTS "Allow all access to task_completions" ON public.task_completions;

-- 4. Buat Kebijakan (Policy) RLS Universal (ALL operations: SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Allow all access to app_profiles" 
ON public.app_profiles 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all access to farm_tasks" 
ON public.farm_tasks 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all access to task_completions" 
ON public.task_completions 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 5. Berikan Hak Akses (GRANT) penuh ke role anon, authenticated, dan service_role
GRANT ALL ON TABLE public.app_profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.farm_tasks TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.task_completions TO anon, authenticated, service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Verifikasi dan pastikan kolom color ada di farm_tasks
ALTER TABLE public.farm_tasks 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10b981';

UPDATE public.farm_tasks 
SET color = '#10b981' 
WHERE color IS NULL;

-- 7. Pastikan RPC toggle_task_completion dan get_tasks_for_date dapat diakses publik
GRANT EXECUTE ON FUNCTION public.get_tasks_for_date(DATE, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_task_completion(UUID, DATE, UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_owner_pin(UUID, TEXT) TO anon, authenticated, service_role;
