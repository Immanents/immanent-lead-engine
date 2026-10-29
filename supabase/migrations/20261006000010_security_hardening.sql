-- Immanent Lead Engine — authorization and privilege hardening
-- Review in a non-production Supabase project before applying in production.
-- This migration changes grants, policies, and function definitions only; it does not
-- delete application data, users, tables, or records.

BEGIN;

-- ── Helper functions used by RLS ─────────────────────────────────────────────
-- SECURITY DEFINER is required here to avoid recursive profile/team RLS checks.
-- Keep every object reference schema-qualified and expose execution only to the
-- roles that need to evaluate authenticated RLS policies.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = $1
      AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(tid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members AS tm
    WHERE tm.team_id = $1
      AND tm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_leader(tid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams AS t
    WHERE t.id = $1
      AND t.leader_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_team_with(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members AS mine
    JOIN public.team_members AS theirs
      ON theirs.team_id = mine.team_id
    WHERE mine.user_id = auth.uid()
      AND theirs.user_id = $1
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_admin_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_user(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_team_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_team_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_team_leader(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_team_leader(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.shares_team_with(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shares_team_with(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_leader(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shares_team_with(uuid) TO authenticated, service_role;

-- ── Profiles ─────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Revoke both table-level and independently granted column-level privileges.
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM authenticated;
REVOKE SELECT (id, full_name, email, role, created_at, last_seen_at),
  INSERT (id, full_name, email, role, created_at, last_seen_at),
  UPDATE (id, full_name, email, role, created_at, last_seen_at),
  REFERENCES (id, full_name, email, role, created_at, last_seen_at)
  ON TABLE public.profiles FROM PUBLIC;
REVOKE SELECT (id, full_name, email, role, created_at, last_seen_at),
  INSERT (id, full_name, email, role, created_at, last_seen_at),
  UPDATE (id, full_name, email, role, created_at, last_seen_at),
  REFERENCES (id, full_name, email, role, created_at, last_seen_at)
  ON TABLE public.profiles FROM anon;
REVOKE SELECT (id, full_name, email, role, created_at, last_seen_at),
  INSERT (id, full_name, email, role, created_at, last_seen_at),
  UPDATE (id, full_name, email, role, created_at, last_seen_at),
  REFERENCES (id, full_name, email, role, created_at, last_seen_at)
  ON TABLE public.profiles FROM authenticated;

-- Authenticated users need their own complete profile; administrators retain the
-- existing account-oversight view. Teammates use limited RPCs defined below.
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, last_seen_at) ON TABLE public.profiles TO authenticated;

DO $$
DECLARE
  policy_record record;
  unexpected_policies text;
BEGIN
  SELECT string_agg(p.policyname, ', ' ORDER BY p.policyname)
  INTO unexpected_policies
  FROM pg_catalog.pg_policies AS p
  WHERE p.schemaname = 'public'
    AND p.tablename = 'profiles'
    AND NOT (
      p.policyname = ANY (ARRAY[
        'read_admin_profile',
        'read_own_or_admin',
        'read_teammates',
        'update_own_name',
        'profiles_select_own_or_admin',
        'profiles_update_own'
      ])
    );

  IF unexpected_policies IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected policies on public.profiles: %', unexpected_policies;
  END IF;

  FOR policy_record IN
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.profiles',
      policy_record.policyname
    );
  END LOOP;
END
$$;

CREATE POLICY profiles_select_own_or_admin
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Column grants are the primary client restriction. This trigger is defense in
-- depth and also prevents an administrator browser session from changing roles.
-- Trusted provisioning/administration running without an end-user JWT remains
-- able to maintain these fields.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (
       NEW.id IS DISTINCT FROM OLD.id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
     )
  THEN
    RAISE EXCEPTION 'Profile identity, email, and role are managed by a trusted workflow'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- Preserve signup provisioning while removing every direct client INSERT path.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    CASE
      WHEN lower(NEW.email) = 'immangaius@gmail.com' THEN 'admin'
      ELSE 'sub'
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_profile_role() FROM anon;
REVOKE ALL ON FUNCTION public.protect_profile_role() FROM authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

-- Limited profile projections for messaging, notifications, and team rosters.
-- Only the four explicitly approved identity/presence fields are returned.
CREATE OR REPLACE FUNCTION public.get_admin_contact()
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  last_seen_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.full_name,
    p.role,
    p.last_seen_at
  FROM public.profiles AS p
  WHERE auth.uid() IS NOT NULL
    AND NOT public.is_admin()
    AND p.role = 'admin'
  ORDER BY p.created_at
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_visible_profile(profile_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  last_seen_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.full_name,
    p.role,
    p.last_seen_at
  FROM public.profiles AS p
  WHERE p.id = $1
    AND (
      p.id = auth.uid()
      OR public.shares_team_with(p.id)
      OR EXISTS (
        SELECT 1
        FROM public.messages AS m
        WHERE (
          m.sender_id = auth.uid()
          AND m.recipient_id = p.id
        )
        OR (
          m.recipient_id = auth.uid()
          AND m.sender_id = p.id
        )
      )
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_team_member_profiles(tid uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  last_seen_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.full_name,
    p.role,
    p.last_seen_at
  FROM public.team_members AS tm
  JOIN public.profiles AS p
    ON p.id = tm.user_id
  WHERE tm.team_id = $1
    AND (
      public.is_team_member($1)
      OR public.is_admin()
    )
  ORDER BY tm.added_at;
$$;

REVOKE ALL ON FUNCTION public.get_admin_contact() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_contact() FROM anon;
REVOKE ALL ON FUNCTION public.get_visible_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_visible_profile(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_team_member_profiles(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_team_member_profiles(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_admin_contact() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_visible_profile(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_team_member_profiles(uuid) TO authenticated, service_role;

-- ── User-owned CRM tables ────────────────────────────────────────────────────
-- Replace policy drift and duplicates with one explicit policy per operation.
-- Administrators keep read-only oversight; only owners may create or mutate.

DO $$
DECLARE
  target_table text;
  policy_record record;
  column_list text;
  expected_policies text[];
  unexpected_policies text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'activities',
    'campaigns',
    'clients',
    'leads',
    'outreach',
    'proposals'
  ]
  LOOP
    IF to_regclass('public.' || target_table) IS NULL THEN
      CONTINUE;
    END IF;

    expected_policies := ARRAY[
      'owner_all',
      'admin_read_all',
      target_table || '_select',
      target_table || '_insert',
      target_table || '_update',
      target_table || '_delete'
    ];
    IF target_table IN ('activities', 'campaigns', 'clients', 'leads', 'outreach') THEN
      expected_policies := expected_policies || ARRAY[
        target_table || '_own'
      ];
    END IF;
    IF target_table = 'proposals' THEN
      expected_policies := expected_policies || ARRAY[
        'proposals_own',
        'proposals_owner'
      ];
    END IF;

    SELECT string_agg(p.policyname, ', ' ORDER BY p.policyname)
    INTO unexpected_policies
    FROM pg_catalog.pg_policies AS p
    WHERE p.schemaname = 'public'
      AND p.tablename = target_table
      AND NOT (p.policyname = ANY (expected_policies));

    IF unexpected_policies IS NOT NULL THEN
      RAISE EXCEPTION 'Unexpected policies on public.%: %', target_table, unexpected_policies;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', target_table);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', target_table);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated', target_table);

    SELECT string_agg(format('%I', c.column_name), ', ' ORDER BY c.ordinal_position)
    INTO column_list
    FROM information_schema.columns AS c
    WHERE c.table_schema = 'public'
      AND c.table_name = target_table;

    IF column_list IS NOT NULL THEN
      EXECUTE format(
        'REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s) ON TABLE public.%2$I FROM PUBLIC',
        column_list,
        target_table
      );
      EXECUTE format(
        'REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s) ON TABLE public.%2$I FROM anon',
        column_list,
        target_table
      );
      EXECUTE format(
        'REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s) ON TABLE public.%2$I FROM authenticated',
        column_list,
        target_table
      );
    END IF;

    EXECUTE format(
      'GRANT SELECT ON TABLE public.%I TO authenticated',
      target_table
    );
    IF target_table IN ('activities', 'campaigns', 'leads', 'outreach', 'proposals') THEN
      EXECUTE format(
        'GRANT INSERT ON TABLE public.%I TO authenticated',
        target_table
      );
    END IF;
    IF target_table IN ('leads', 'outreach', 'proposals') THEN
      EXECUTE format(
        'GRANT UPDATE ON TABLE public.%I TO authenticated',
        target_table
      );
    END IF;
    IF target_table IN ('leads', 'outreach') THEN
      EXECUTE format(
        'GRANT DELETE ON TABLE public.%I TO authenticated',
        target_table
      );
    END IF;

    FOR policy_record IN
      SELECT policyname
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
        AND tablename = target_table
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        policy_record.policyname,
        target_table
      );
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin())',
      target_table || '_select',
      target_table
    );
    IF target_table IN ('activities', 'campaigns', 'leads', 'outreach', 'proposals') THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())',
        target_table || '_insert',
        target_table
      );
    END IF;
    IF target_table IN ('leads', 'outreach', 'proposals') THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
        target_table || '_update',
        target_table
      );
    END IF;
    IF target_table IN ('leads', 'outreach') THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())',
        target_table || '_delete',
        target_table
      );
    END IF;
  END LOOP;
END
$$;

-- ── Direct messages ──────────────────────────────────────────────────────────

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.messages FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.messages FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.messages FROM authenticated;
REVOKE SELECT (
  id,
  sender_id,
  recipient_id,
  body,
  created_at,
  read_at,
  delivered_at
), INSERT (
  id,
  sender_id,
  recipient_id,
  body,
  created_at,
  read_at,
  delivered_at
), UPDATE (
  id,
  sender_id,
  recipient_id,
  body,
  created_at,
  read_at,
  delivered_at
), REFERENCES (
  id,
  sender_id,
  recipient_id,
  body,
  created_at,
  read_at,
  delivered_at
) ON TABLE public.messages FROM PUBLIC;
REVOKE SELECT (
  id,
  sender_id,
  recipient_id,
  body,
  created_at,
  read_at,
  delivered_at
), INSERT (
  id,
  sender_id,
  recipient_id,
  body,
  created_at,
  read_at,
  delivered_at
), UPDATE (
  id,
  sender_id,
  recipient_id,
  body,
  created_at,
  read_at,
  delivered_at
), REFERENCES (
  id,
  sender_id,
  recipient_id,
  body,
  created_at,
  read_at,
  delivered_at
) ON TABLE public.messages FROM anon;
REVOKE SELECT (
  id,
  sender_id,
  recipient_id,
  body,
  created_at,
  read_at,
  delivered_at
), INSERT (
  id,
  sender_id,
  recipient_id,
  body,
  created_at,
  read_at,
  delivered_at
), UPDATE (
  id,
  sender_id,
  recipient_id,
  body,
  created_at,
  read_at,
  delivered_at
), REFERENCES (
  id,
  sender_id,
  recipient_id,
  body,
  created_at,
  read_at,
  delivered_at
) ON TABLE public.messages FROM authenticated;

GRANT SELECT ON TABLE public.messages TO authenticated;
GRANT INSERT (sender_id, recipient_id, body) ON TABLE public.messages TO authenticated;
GRANT UPDATE (read_at, delivered_at) ON TABLE public.messages TO authenticated;

DO $$
DECLARE
  policy_record record;
  unexpected_policies text;
BEGIN
  SELECT string_agg(p.policyname, ', ' ORDER BY p.policyname)
  INTO unexpected_policies
  FROM pg_catalog.pg_policies AS p
  WHERE p.schemaname = 'public'
    AND p.tablename = 'messages'
    AND NOT (
      p.policyname = ANY (ARRAY[
        'read_own_messages',
        'send_messages',
        'mark_read',
        'messages_select_participant',
        'messages_insert_authorized',
        'messages_update_recipient'
      ])
    );

  IF unexpected_policies IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected policies on public.messages: %', unexpected_policies;
  END IF;

  FOR policy_record IN
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.messages',
      policy_record.policyname
    );
  END LOOP;
END
$$;

CREATE POLICY messages_select_participant
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY messages_insert_authorized
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      public.is_admin()
      OR public.is_admin_user(recipient_id)
    )
  );

CREATE POLICY messages_update_recipient
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE OR REPLACE FUNCTION public.messages_only_read_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only message receipt fields may be updated'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.read_at IS DISTINCT FROM OLD.read_at THEN
    IF OLD.read_at IS NOT NULL OR NEW.read_at IS NULL THEN
      RAISE EXCEPTION 'Message read receipt cannot be cleared or rewritten'
        USING ERRCODE = '42501';
    END IF;
    NEW.read_at := clock_timestamp();
  END IF;

  IF NEW.delivered_at IS DISTINCT FROM OLD.delivered_at THEN
    IF OLD.delivered_at IS NOT NULL OR NEW.delivered_at IS NULL THEN
      RAISE EXCEPTION 'Message delivery receipt cannot be cleared or rewritten'
        USING ERRCODE = '42501';
    END IF;
    NEW.delivered_at := clock_timestamp();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_only_read_at ON public.messages;
CREATE TRIGGER messages_only_read_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.messages_only_read_at();

REVOKE ALL ON FUNCTION public.messages_only_read_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.messages_only_read_at() FROM anon;
REVOKE ALL ON FUNCTION public.messages_only_read_at() FROM authenticated;

-- ── Teams ────────────────────────────────────────────────────────────────────

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.teams FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.teams FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.teams FROM authenticated;
REVOKE SELECT (id, name, leader_id, created_at),
  INSERT (id, name, leader_id, created_at),
  UPDATE (id, name, leader_id, created_at),
  REFERENCES (id, name, leader_id, created_at)
  ON TABLE public.teams FROM PUBLIC;
REVOKE SELECT (id, name, leader_id, created_at),
  INSERT (id, name, leader_id, created_at),
  UPDATE (id, name, leader_id, created_at),
  REFERENCES (id, name, leader_id, created_at)
  ON TABLE public.teams FROM anon;
REVOKE SELECT (id, name, leader_id, created_at),
  INSERT (id, name, leader_id, created_at),
  UPDATE (id, name, leader_id, created_at),
  REFERENCES (id, name, leader_id, created_at)
  ON TABLE public.teams FROM authenticated;
GRANT SELECT, DELETE ON TABLE public.teams TO authenticated;
GRANT UPDATE (name) ON TABLE public.teams TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.team_members FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.team_members FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.team_members FROM authenticated;
REVOKE SELECT (
  team_id,
  user_id,
  added_at,
  last_read_at,
  last_delivered_at
), INSERT (
  team_id,
  user_id,
  added_at,
  last_read_at,
  last_delivered_at
), UPDATE (
  team_id,
  user_id,
  added_at,
  last_read_at,
  last_delivered_at
), REFERENCES (
  team_id,
  user_id,
  added_at,
  last_read_at,
  last_delivered_at
) ON TABLE public.team_members FROM PUBLIC;
REVOKE SELECT (
  team_id,
  user_id,
  added_at,
  last_read_at,
  last_delivered_at
), INSERT (
  team_id,
  user_id,
  added_at,
  last_read_at,
  last_delivered_at
), UPDATE (
  team_id,
  user_id,
  added_at,
  last_read_at,
  last_delivered_at
), REFERENCES (
  team_id,
  user_id,
  added_at,
  last_read_at,
  last_delivered_at
) ON TABLE public.team_members FROM anon;
REVOKE SELECT (
  team_id,
  user_id,
  added_at,
  last_read_at,
  last_delivered_at
), INSERT (
  team_id,
  user_id,
  added_at,
  last_read_at,
  last_delivered_at
), UPDATE (
  team_id,
  user_id,
  added_at,
  last_read_at,
  last_delivered_at
), REFERENCES (
  team_id,
  user_id,
  added_at,
  last_read_at,
  last_delivered_at
) ON TABLE public.team_members FROM authenticated;
GRANT SELECT, DELETE ON TABLE public.team_members TO authenticated;
GRANT UPDATE (last_read_at) ON TABLE public.team_members TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.team_messages FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.team_messages FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.team_messages FROM authenticated;
REVOKE SELECT (id, team_id, sender_id, body, created_at),
  INSERT (id, team_id, sender_id, body, created_at),
  UPDATE (id, team_id, sender_id, body, created_at),
  REFERENCES (id, team_id, sender_id, body, created_at)
  ON TABLE public.team_messages FROM PUBLIC;
REVOKE SELECT (id, team_id, sender_id, body, created_at),
  INSERT (id, team_id, sender_id, body, created_at),
  UPDATE (id, team_id, sender_id, body, created_at),
  REFERENCES (id, team_id, sender_id, body, created_at)
  ON TABLE public.team_messages FROM anon;
REVOKE SELECT (id, team_id, sender_id, body, created_at),
  INSERT (id, team_id, sender_id, body, created_at),
  UPDATE (id, team_id, sender_id, body, created_at),
  REFERENCES (id, team_id, sender_id, body, created_at)
  ON TABLE public.team_messages FROM authenticated;
GRANT SELECT ON TABLE public.team_messages TO authenticated;
GRANT INSERT (team_id, sender_id, body) ON TABLE public.team_messages TO authenticated;

DO $$
DECLARE
  target_table text;
  policy_record record;
  expected_policies text[];
  unexpected_policies text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['teams', 'team_members', 'team_messages']
  LOOP
    expected_policies := CASE target_table
      WHEN 'teams' THEN ARRAY[
        'team_read',
        'team_leader_update',
        'team_leader_delete',
        'admin_read_teams',
        'teams_select_member_or_admin',
        'teams_update_leader',
        'teams_delete_leader'
      ]
      WHEN 'team_members' THEN ARRAY[
        'members_read',
        'members_remove',
        'members_update_own',
        'admin_read_team_members',
        'team_members_select_member_or_admin',
        'team_members_update_self',
        'team_members_delete_authorized'
      ]
      ELSE ARRAY[
        'team_msgs_read',
        'team_msgs_send',
        'admin_read_team_messages',
        'team_messages_select_member_or_admin',
        'team_messages_insert_member'
      ]
    END;

    SELECT string_agg(p.policyname, ', ' ORDER BY p.policyname)
    INTO unexpected_policies
    FROM pg_catalog.pg_policies AS p
    WHERE p.schemaname = 'public'
      AND p.tablename = target_table
      AND NOT (p.policyname = ANY (expected_policies));

    IF unexpected_policies IS NOT NULL THEN
      RAISE EXCEPTION 'Unexpected policies on public.%: %', target_table, unexpected_policies;
    END IF;

    FOR policy_record IN
      SELECT policyname
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
        AND tablename = target_table
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        policy_record.policyname,
        target_table
      );
    END LOOP;
  END LOOP;
END
$$;

CREATE POLICY teams_select_member_or_admin
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (public.is_team_member(id) OR public.is_admin());

CREATE POLICY teams_update_leader
  ON public.teams
  FOR UPDATE
  TO authenticated
  USING (leader_id = auth.uid())
  WITH CHECK (leader_id = auth.uid());

CREATE POLICY teams_delete_leader
  ON public.teams
  FOR DELETE
  TO authenticated
  USING (leader_id = auth.uid());

CREATE POLICY team_members_select_member_or_admin
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (public.is_team_member(team_id) OR public.is_admin());

CREATE POLICY team_members_update_self
  ON public.team_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY team_members_delete_authorized
  ON public.team_members
  FOR DELETE
  TO authenticated
  USING (
    (
      public.is_team_leader(team_id)
      AND user_id <> auth.uid()
    )
    OR (
      user_id = auth.uid()
      AND NOT public.is_team_leader(team_id)
    )
  );

CREATE POLICY team_messages_select_member_or_admin
  ON public.team_messages
  FOR SELECT
  TO authenticated
  USING (public.is_team_member(team_id) OR public.is_admin());

CREATE POLICY team_messages_insert_member
  ON public.team_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_team_member(team_id)
  );

CREATE OR REPLACE FUNCTION public.team_members_only_read_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.team_id IS DISTINCT FROM OLD.team_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.added_at IS DISTINCT FROM OLD.added_at
  THEN
    RAISE EXCEPTION 'Team membership identity cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.last_read_at IS DISTINCT FROM OLD.last_read_at THEN
    IF OLD.last_read_at IS NOT NULL
       AND NEW.last_read_at IS NOT NULL
       AND NEW.last_read_at < OLD.last_read_at
    THEN
      RAISE EXCEPTION 'Team read receipt cannot move backwards'
        USING ERRCODE = '42501';
    END IF;
    NEW.last_read_at := clock_timestamp();
  END IF;

  IF NEW.last_delivered_at IS DISTINCT FROM OLD.last_delivered_at THEN
    IF OLD.last_delivered_at IS NOT NULL
       AND NEW.last_delivered_at IS NOT NULL
       AND NEW.last_delivered_at < OLD.last_delivered_at
    THEN
      RAISE EXCEPTION 'Team delivery receipt cannot move backwards'
        USING ERRCODE = '42501';
    END IF;
    NEW.last_delivered_at := clock_timestamp();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_members_only_read_at ON public.team_members;
CREATE TRIGGER team_members_only_read_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.team_members_only_read_at();

REVOKE ALL ON FUNCTION public.team_members_only_read_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.team_members_only_read_at() FROM anon;
REVOKE ALL ON FUNCTION public.team_members_only_read_at() FROM authenticated;

-- Harden team RPCs while preserving their existing behavior.
CREATE OR REPLACE FUNCTION public.create_team(team_name text)
RETURNS public.teams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_team public.teams;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF length(trim(COALESCE(team_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Give the team a name';
  END IF;

  INSERT INTO public.teams (name, leader_id)
  VALUES (trim(team_name), auth.uid())
  RETURNING * INTO new_team;

  INSERT INTO public.team_members (team_id, user_id, last_read_at)
  VALUES (new_team.id, auth.uid(), clock_timestamp());

  RETURN new_team;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_team_member(tid uuid, member_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  member_id uuid;
BEGIN
  IF NOT public.is_team_leader(tid) THEN
    RAISE EXCEPTION 'Only the team leader can add members';
  END IF;

  SELECT p.id
  INTO member_id
  FROM public.profiles AS p
  WHERE lower(p.email) = lower(trim(member_email))
  LIMIT 1;

  IF member_id IS NULL THEN
    RAISE EXCEPTION 'No account found with that email. Ask them to sign up first.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.team_members AS tm
    WHERE tm.team_id = tid
      AND tm.user_id = member_id
  ) THEN
    RAISE EXCEPTION 'That person is already in this team';
  END IF;

  INSERT INTO public.team_members (team_id, user_id)
  VALUES (tid, member_id);

  RETURN member_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.team_unread_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT count(*)::integer
  FROM public.team_messages AS m
  JOIN public.team_members AS mine
    ON mine.team_id = m.team_id
   AND mine.user_id = auth.uid()
  WHERE m.sender_id <> auth.uid()
    AND m.created_at > COALESCE(mine.last_read_at, mine.added_at);
$$;

CREATE OR REPLACE FUNCTION public.mark_team_delivered()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.team_members
  SET last_delivered_at = clock_timestamp()
  WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.create_team(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_team(text) FROM anon;
REVOKE ALL ON FUNCTION public.add_team_member(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_team_member(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.team_unread_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.team_unread_count() FROM anon;
REVOKE ALL ON FUNCTION public.mark_team_delivered() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_team_delivered() FROM anon;

GRANT EXECUTE ON FUNCTION public.create_team(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_team_member(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.team_unread_count() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_team_delivered() TO authenticated, service_role;

-- ── Settings (when present) ──────────────────────────────────────────────────
-- The repository does not define this table, but deployed inventories may. Fail
-- safely if a deployed settings table lacks the documented owner_id boundary.

DO $$
DECLARE
  policy_record record;
  column_list text;
  unexpected_policies text;
BEGIN
  IF to_regclass('public.settings') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'settings'
      AND column_name = 'owner_id'
  ) THEN
    RAISE EXCEPTION 'public.settings exists without owner_id; review required before hardening';
  END IF;

  SELECT string_agg(p.policyname, ', ' ORDER BY p.policyname)
  INTO unexpected_policies
  FROM pg_catalog.pg_policies AS p
  WHERE p.schemaname = 'public'
    AND p.tablename = 'settings'
    AND NOT (
      p.policyname = ANY (ARRAY[
        'owner_all',
        'owner_all_settings',
        'settings_own',
        'settings_owner',
        'settings_select_own',
        'settings_insert_own',
        'settings_update_own',
        'settings_delete_own'
      ])
    );

  IF unexpected_policies IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected policies on public.settings: %', unexpected_policies;
  END IF;

  EXECUTE 'ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY';
  EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.settings FROM PUBLIC';
  EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.settings FROM anon';
  EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.settings FROM authenticated';

  SELECT string_agg(format('%I', c.column_name), ', ' ORDER BY c.ordinal_position)
  INTO column_list
  FROM information_schema.columns AS c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'settings';

  IF column_list IS NOT NULL THEN
    EXECUTE format(
      'REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s) ON TABLE public.settings FROM PUBLIC',
      column_list
    );
    EXECUTE format(
      'REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s) ON TABLE public.settings FROM anon',
      column_list
    );
    EXECUTE format(
      'REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s) ON TABLE public.settings FROM authenticated',
      column_list
    );
  END IF;

  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.settings TO authenticated';

  FOR policy_record IN
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'settings'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.settings',
      policy_record.policyname
    );
  END LOOP;

  EXECUTE 'CREATE POLICY settings_select_own ON public.settings FOR SELECT TO authenticated USING (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY settings_insert_own ON public.settings FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY settings_update_own ON public.settings FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY settings_delete_own ON public.settings FOR DELETE TO authenticated USING (owner_id = auth.uid())';
END
$$;

COMMIT;
