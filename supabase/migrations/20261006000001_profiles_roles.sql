-- Immanent Lead Engine — profiles & roles (idempotent)
-- Apply via: Supabase Dashboard → SQL Editor → Run

CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text NOT NULL DEFAULT '',
  email      text,
  role       text NOT NULL DEFAULT 'sub' CHECK (role IN ('admin', 'sub')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'read_own_or_admin') THEN
    CREATE POLICY read_own_or_admin ON profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'update_own_name') THEN
    -- role cannot be changed by the row owner (enforced by trigger below)
    CREATE POLICY update_own_name ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_profile_role ON profiles;
CREATE TRIGGER protect_profile_role BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- New signups: immangaius@gmail.com is the admin, everyone else is a sub
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN lower(NEW.email) = 'immangaius@gmail.com' THEN 'admin' ELSE 'sub' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing accounts
INSERT INTO profiles (id, full_name, email, role)
SELECT u.id,
       COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
       u.email,
       CASE WHEN lower(u.email) = 'immangaius@gmail.com' THEN 'admin' ELSE 'sub' END
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- Enforce the admin even if profiles already existed with other roles
UPDATE profiles SET role = 'admin' WHERE lower(email) = 'immangaius@gmail.com';
UPDATE profiles SET role = 'sub'   WHERE lower(email) <> 'immangaius@gmail.com' AND role = 'admin';
