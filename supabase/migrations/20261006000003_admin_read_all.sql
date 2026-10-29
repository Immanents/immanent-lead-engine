-- Immanent Lead Engine — admin can read every account's data (idempotent)
-- Requires 20261006000001_profiles_roles.sql (public.is_admin()).
-- Read-only: admins can view but not modify other accounts' rows.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['leads','campaigns','outreach','proposals','clients','activities'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'admin_read_all') THEN
      EXECUTE format('CREATE POLICY admin_read_all ON %I FOR SELECT USING (public.is_admin())', t);
    END IF;
  END LOOP;
END $$;
