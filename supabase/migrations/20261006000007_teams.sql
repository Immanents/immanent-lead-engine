-- Immanent Lead Engine — teams: leader adds members, members share a group chat (idempotent)

CREATE TABLE IF NOT EXISTS teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (length(trim(name)) > 0),
  leader_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS team_members (
  team_id      uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at     timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  PRIMARY KEY (team_id, user_id)
);
CREATE TABLE IF NOT EXISTS team_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS team_messages_team_idx ON team_messages (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS team_members_user_idx ON team_members (user_id);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- Helpers (security definer so policies don't recurse)
CREATE OR REPLACE FUNCTION public.is_team_member(tid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM team_members WHERE team_id = tid AND user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.is_team_leader(tid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM teams WHERE id = tid AND leader_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.shares_team_with(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members a JOIN team_members b ON a.team_id = b.team_id
    WHERE a.user_id = auth.uid() AND b.user_id = uid
  );
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='read_teammates') THEN
    CREATE POLICY read_teammates ON profiles FOR SELECT USING (public.shares_team_with(id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='team_read') THEN
    CREATE POLICY team_read ON teams FOR SELECT USING (public.is_team_member(id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='team_leader_update') THEN
    CREATE POLICY team_leader_update ON teams FOR UPDATE USING (leader_id = auth.uid()) WITH CHECK (leader_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='team_leader_delete') THEN
    CREATE POLICY team_leader_delete ON teams FOR DELETE USING (leader_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_members' AND policyname='members_read') THEN
    CREATE POLICY members_read ON team_members FOR SELECT USING (public.is_team_member(team_id));
  END IF;
  -- leader removes others; a non-leader can leave
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_members' AND policyname='members_remove') THEN
    CREATE POLICY members_remove ON team_members FOR DELETE USING (
      (public.is_team_leader(team_id) AND user_id <> auth.uid())
      OR (user_id = auth.uid() AND NOT public.is_team_leader(team_id))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_members' AND policyname='members_update_own') THEN
    CREATE POLICY members_update_own ON team_members FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_messages' AND policyname='team_msgs_read') THEN
    CREATE POLICY team_msgs_read ON team_messages FOR SELECT USING (public.is_team_member(team_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_messages' AND policyname='team_msgs_send') THEN
    CREATE POLICY team_msgs_send ON team_messages FOR INSERT
      WITH CHECK (sender_id = auth.uid() AND public.is_team_member(team_id));
  END IF;
END $$;

-- Members may only change last_read_at on their own row
CREATE OR REPLACE FUNCTION public.team_members_only_read_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.team_id := OLD.team_id;
  NEW.user_id := OLD.user_id;
  NEW.added_at := OLD.added_at;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS team_members_only_read_at ON team_members;
CREATE TRIGGER team_members_only_read_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION public.team_members_only_read_at();

-- Create a team; the caller becomes its leader and first member
CREATE OR REPLACE FUNCTION public.create_team(team_name text)
RETURNS teams LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t teams;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF length(trim(coalesce(team_name, ''))) = 0 THEN RAISE EXCEPTION 'Give the team a name'; END IF;
  INSERT INTO teams (name, leader_id) VALUES (trim(team_name), auth.uid()) RETURNING * INTO t;
  INSERT INTO team_members (team_id, user_id, last_read_at) VALUES (t.id, auth.uid(), now());
  RETURN t;
END $$;

-- Leader adds an existing account by email (emails of other accounts are never exposed)
CREATE OR REPLACE FUNCTION public.add_team_member(tid uuid, member_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  IF NOT public.is_team_leader(tid) THEN RAISE EXCEPTION 'Only the team leader can add members'; END IF;
  SELECT id INTO uid FROM profiles WHERE lower(email) = lower(trim(member_email)) LIMIT 1;
  IF uid IS NULL THEN RAISE EXCEPTION 'No account found with that email. Ask them to sign up first.'; END IF;
  IF EXISTS (SELECT 1 FROM team_members WHERE team_id = tid AND user_id = uid) THEN
    RAISE EXCEPTION 'That person is already in this team';
  END IF;
  INSERT INTO team_members (team_id, user_id) VALUES (tid, uid);
  RETURN uid;
END $$;

-- Unread team messages across all my teams
CREATE OR REPLACE FUNCTION public.team_unread_count()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT count(*)::int
  FROM team_messages m
  JOIN team_members me ON me.team_id = m.team_id AND me.user_id = auth.uid()
  WHERE m.sender_id <> auth.uid()
    AND m.created_at > coalesce(me.last_read_at, me.added_at);
$$;

-- Instant delivery
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='team_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
  END IF;
END $$;
