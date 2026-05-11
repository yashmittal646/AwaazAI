-- ═══════════════════════════════════════════════════════════════════
-- JanSeva AI — Admin RLS Policies
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- This allows the admin dashboard to read ALL grievances and
-- update verification_status + XP fields across all users.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Grievances: allow admin to read all rows ───────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'grievances' AND policyname = 'admin_read_all'
  ) THEN
    EXECUTE 'CREATE POLICY admin_read_all ON public.grievances FOR SELECT USING (true)';
  END IF;
END $$;

-- ─── Grievances: allow admin to update verification fields ──────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'grievances' AND policyname = 'admin_update_all'
  ) THEN
    EXECUTE 'CREATE POLICY admin_update_all ON public.grievances FOR UPDATE USING (true)';
  END IF;
END $$;

-- ─── Profiles: allow admin to read all profiles ─────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'admin_read_all'
  ) THEN
    EXECUTE 'CREATE POLICY admin_read_all ON public.profiles FOR SELECT USING (true)';
  END IF;
END $$;

-- ─── Profiles: allow admin to update XP fields ──────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'admin_update_all'
  ) THEN
    EXECUTE 'CREATE POLICY admin_update_all ON public.profiles FOR UPDATE USING (true)';
  END IF;
END $$;

-- ─── Verify ─────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('grievances', 'profiles')
ORDER BY tablename, policyname;
