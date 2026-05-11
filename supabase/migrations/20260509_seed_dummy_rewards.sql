-- ═══════════════════════════════════════════════════════════════════
-- JanSeva AI — COMPLETE SETUP + SEED
-- 
-- HOW TO GET YOUR USER ID:
--   1. Go to Supabase Dashboard → Authentication → Users
--   2. Find shouryapratap6081@gmail.com in the list
--   3. Click on the user → copy the UUID shown at the top
--   4. Paste it below replacing the placeholder
-- ═══════════════════════════════════════════════════════════════════

-- ⬇️  PASTE YOUR UUID HERE (between the single quotes)
DO $$ BEGIN
  PERFORM set_config('app.seed_user_id', 'PASTE-YOUR-UUID-HERE', false);
END $$;

-- ─── 1. PROFILES TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  mobile      TEXT,
  address     TEXT,
  ward        TEXT,
  city        TEXT,
  pincode     TEXT,
  xp_total    INTEGER NOT NULL DEFAULT 0,
  xp_pending  INTEGER NOT NULL DEFAULT 0,
  xp_redeemed INTEGER NOT NULL DEFAULT 0,
  level       TEXT    NOT NULL DEFAULT 'Naya Nagarik',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_select_own') THEN
    EXECUTE 'CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_insert_own') THEN
    EXECUTE 'CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_update_own') THEN
    EXECUTE 'CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, mobile, address, ward, city, pincode)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'mobile',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'ward',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'pincode'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 2. GRIEVANCES TABLE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.grievances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ref_code            TEXT NOT NULL UNIQUE DEFAULT ('JS-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  title               TEXT NOT NULL,
  description         TEXT,
  type                TEXT NOT NULL,
  ward                TEXT,
  location            TEXT,
  status              TEXT NOT NULL DEFAULT 'Filed',
  risk_score          INTEGER DEFAULT 5,
  sla_days            INTEGER DEFAULT 7,
  image_url           TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  xp_awarded          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grievances' AND policyname='grievances_select_own') THEN
    EXECUTE 'CREATE POLICY grievances_select_own ON public.grievances FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grievances' AND policyname='grievances_insert_own') THEN
    EXECUTE 'CREATE POLICY grievances_insert_own ON public.grievances FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grievances' AND policyname='grievances_update_own') THEN
    EXECUTE 'CREATE POLICY grievances_update_own ON public.grievances FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grievances' AND policyname='grievances_delete_own') THEN
    EXECUTE 'CREATE POLICY grievances_delete_own ON public.grievances FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS grievances_user_idx ON public.grievances(user_id, created_at DESC);

-- ─── 3. REWARD REDEMPTIONS TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_spent     INTEGER NOT NULL,
  reward_type  TEXT NOT NULL,
  reward_label TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'processing',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reward_redemptions' AND policyname='redemptions_own_select') THEN
    EXECUTE 'CREATE POLICY redemptions_own_select ON public.reward_redemptions FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reward_redemptions' AND policyname='redemptions_own_insert') THEN
    EXECUTE 'CREATE POLICY redemptions_own_insert ON public.reward_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- ─── 4. SEED DATA ───────────────────────────────────────────────────
DO $$
DECLARE
  v_user_id UUID := current_setting('app.seed_user_id')::UUID;
BEGIN
  -- Upsert profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (v_user_id, 'Shourya Pratap')
  ON CONFLICT (id) DO UPDATE SET
    full_name = 'Shourya Pratap',
    xp_total = 65,
    xp_pending = 250,
    xp_redeemed = 200,
    level = 'Naya Nagarik';

  -- Clean old seed rows
  DELETE FROM public.grievances      WHERE user_id = v_user_id AND ref_code LIKE 'JS-DEMO-%';
  DELETE FROM public.reward_redemptions WHERE user_id = v_user_id;

  -- Insert dummy grievances
  INSERT INTO public.grievances
    (user_id, title, description, type, ward, location, status,
     risk_score, sla_days, verification_status, xp_awarded, created_at, ref_code)
  VALUES
  -- ✅ VERIFIED
  (v_user_id,'Massive pothole on 80 Feet Road near Forum Mall',
   'Large pothole causing vehicle damage near Forum Mall junction in Koramangala.',
   'Road','Koramangala Ward','Koramangala, 80 Feet Road','Resolved',9,7,'verified',100,now()-INTERVAL '12 days','JS-DEMO-001'),

  (v_user_id,'Sewage overflow blocking main street in HSR Layout',
   'Sewage pipe burst on 27th Main. Raw sewage on road — health hazard for 200+ households.',
   'Water','HSR Layout Ward','HSR Layout, 27th Main','Resolved',8,5,'verified',100,now()-INTERVAL '8 days','JS-DEMO-002'),

  (v_user_id,'Streetlight outage on Indiranagar 100 Feet Road',
   '3 streetlights non-functional on 100 Feet Road. High accident risk after 8 PM.',
   'Electricity','Indiranagar Ward','Indiranagar, 100 Feet Road','Filed',6,7,'verified',75,now()-INTERVAL '5 days','JS-DEMO-003'),

  -- ⏳ PENDING
  (v_user_id,'Garbage not cleared for 10 days in BTM Layout',
   'Municipal garbage at BTM Stage 1 bus stop not cleared for 10 days. Health hazard.',
   'Sanitation','BTM Layout Ward','BTM Layout Stage 1','In Progress',7,7,'pending',0,now()-INTERVAL '2 days','JS-DEMO-004'),

  (v_user_id,'Illegal construction blocking drainage in Whitefield',
   'Builder wall blocking drainage near Whitefield Main Road. Caused flooding in 3 houses.',
   'Housing','Whitefield Ward','Whitefield Main Road','Filed',8,14,'pending',0,now()-INTERVAL '1 day','JS-DEMO-005'),

  (v_user_id,'Water tanker not supplied for 5 days — Jayanagar 4th Block',
   'BWSSB tanker missing for 5 days. 50+ families affected.',
   'Water','Jayanagar Ward','Jayanagar 4th Block','Filed',5,7,'pending',0,now()-INTERVAL '3 hours','JS-DEMO-006'),

  -- ❌ REJECTED
  (v_user_id,'Park benches look old — Cubbon Park (Invalid)',
   'Park benches in Cubbon Park look old.',
   'Other','Cubbon Park Ward','Cubbon Park','Closed',2,14,'rejected',-10,now()-INTERVAL '15 days','JS-DEMO-007');

  -- Past redemption
  INSERT INTO public.reward_redemptions
    (user_id, xp_spent, reward_type, reward_label, status, created_at)
  VALUES (v_user_id, 200, 'amazon_voucher', '₹50 Amazon Voucher', 'fulfilled', now()-INTERVAL '3 days');

  RAISE NOTICE '✅ Seed complete for user_id: %', v_user_id;
END $$;

-- ─── 5. CONFIRM ─────────────────────────────────────────────────────
SELECT ref_code, type, verification_status, xp_awarded, created_at::date AS filed_on
FROM   public.grievances
WHERE  ref_code LIKE 'JS-DEMO-%'
ORDER  BY created_at DESC;
