-- ─────────────────────────────────────────────────────────────
-- Reward System Migration
-- ─────────────────────────────────────────────────────────────

-- 1. Add verification_status to grievances
ALTER TABLE public.grievances
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (verification_status IN ('pending', 'verified', 'rejected'));

-- 2. Add xp_awarded to grievances (actual XP credited for this grievance)
ALTER TABLE public.grievances
  ADD COLUMN IF NOT EXISTS xp_awarded INTEGER NOT NULL DEFAULT 0;

-- 3. Add xp balance columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_total    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_pending  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_redeemed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level       TEXT NOT NULL DEFAULT 'Naya Nagarik';

-- 4. Rewards / redemptions ledger
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_spent     INTEGER NOT NULL,
  reward_type  TEXT NOT NULL,        -- 'amazon_voucher' | 'paytm_cash' | 'donation'
  reward_label TEXT NOT NULL,        -- human-readable e.g. "₹50 Amazon Voucher"
  status       TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'fulfilled', 'failed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redemptions_own_select" ON public.reward_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "redemptions_own_insert" ON public.reward_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Auto-update profile XP whenever grievance verification_status changes
CREATE OR REPLACE FUNCTION public.sync_xp_on_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_xp  INTEGER := 50;
  bonus_xp INTEGER := 0;
BEGIN
  -- Only act when verification_status actually changed
  IF OLD.verification_status = NEW.verification_status THEN
    RETURN NEW;
  END IF;

  -- Determine XP value based on type & urgency
  IF NEW.risk_score >= 8 THEN bonus_xp := 50;
  ELSIF NEW.risk_score >= 5 THEN bonus_xp := 25;
  END IF;

  IF NEW.verification_status = 'verified' THEN
    -- Remove from pending, add to total
    UPDATE public.profiles SET
      xp_pending = GREATEST(0, xp_pending - (base_xp + bonus_xp)),
      xp_total   = xp_total + (base_xp + bonus_xp),
      xp_awarded = (base_xp + bonus_xp),
      level = CASE
        WHEN (xp_total + base_xp + bonus_xp) >= 2000 THEN 'Jan Nayak'
        WHEN (xp_total + base_xp + bonus_xp) >= 1000 THEN 'Sudharak'
        WHEN (xp_total + base_xp + bonus_xp) >= 500  THEN 'Prahari'
        WHEN (xp_total + base_xp + bonus_xp) >= 200  THEN 'Sewak'
        ELSE 'Naya Nagarik'
      END
    WHERE id = NEW.user_id;
    -- Record on the grievance
    UPDATE public.grievances SET xp_awarded = (base_xp + bonus_xp) WHERE id = NEW.id;

  ELSIF NEW.verification_status = 'rejected' THEN
    -- Remove from pending, deduct 10 as penalty
    UPDATE public.profiles SET
      xp_pending = GREATEST(0, xp_pending - (base_xp + bonus_xp)),
      xp_total   = GREATEST(0, xp_total - 10)
    WHERE id = NEW.user_id;
    UPDATE public.grievances SET xp_awarded = -10 WHERE id = NEW.id;

  ELSIF NEW.verification_status = 'pending' AND OLD.verification_status = 'pending' THEN
    -- Freshly filed (insertion case handled separately)
    NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_grievance_verification ON public.grievances;
CREATE TRIGGER on_grievance_verification
  AFTER UPDATE ON public.grievances
  FOR EACH ROW EXECUTE FUNCTION public.sync_xp_on_verification();

-- 6. When a new grievance is filed, add XP to pending pool
CREATE OR REPLACE FUNCTION public.add_pending_xp_on_file()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_xp INTEGER := 50;
  bonus   INTEGER := 0;
BEGIN
  IF NEW.risk_score >= 8 THEN bonus := 50;
  ELSIF NEW.risk_score >= 5 THEN bonus := 25;
  END IF;

  UPDATE public.profiles SET
    xp_pending = xp_pending + (base_xp + bonus)
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_grievance_filed ON public.grievances;
CREATE TRIGGER on_grievance_filed
  AFTER INSERT ON public.grievances
  FOR EACH ROW EXECUTE FUNCTION public.add_pending_xp_on_file();
