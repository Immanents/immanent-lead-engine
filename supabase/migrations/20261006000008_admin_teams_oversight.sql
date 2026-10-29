-- Admin can read every team, member list and team message (read-only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='admin_read_teams') THEN
    CREATE POLICY admin_read_teams ON teams FOR SELECT USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_members' AND policyname='admin_read_team_members') THEN
    CREATE POLICY admin_read_team_members ON team_members FOR SELECT USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_messages' AND policyname='admin_read_team_messages') THEN
    CREATE POLICY admin_read_team_messages ON team_messages FOR SELECT USING (public.is_admin());
  END IF;
END $$;
