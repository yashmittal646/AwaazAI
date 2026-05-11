
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  mobile TEXT,
  address TEXT,
  ward TEXT,
  city TEXT,
  pincode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, mobile, address, ward, city, pincode)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'mobile',
    NEW.raw_user_meta_data ->> 'address',
    NEW.raw_user_meta_data ->> 'ward',
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'pincode'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grievances table
CREATE TABLE public.grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ref_code TEXT NOT NULL UNIQUE DEFAULT ('JS-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  ward TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'Filed',
  risk_score INTEGER DEFAULT 5,
  sla_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grievances_select_own" ON public.grievances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "grievances_insert_own" ON public.grievances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "grievances_update_own" ON public.grievances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "grievances_delete_own" ON public.grievances FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX grievances_user_idx ON public.grievances(user_id, created_at DESC);
