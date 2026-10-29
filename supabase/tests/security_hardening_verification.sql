-- Read-only catalog checks for 20261006000010_security_hardening.sql.
-- Run after the migration in the Supabase SQL Editor. These queries do not
-- mutate application data.

-- 1. RLS must be enabled on every client-facing table that exists.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls_enabled
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n
  ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'activities',
    'campaigns',
    'clients',
    'leads',
    'messages',
    'outreach',
    'profiles',
    'proposals',
    'settings',
    'team_members',
    'team_messages',
    'teams'
  )
ORDER BY c.relname;

-- 2. Effective policies after replacement. Inspect roles, command, USING, and
-- WITH CHECK; no policy should target anon or PUBLIC.
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'activities',
    'campaigns',
    'clients',
    'leads',
    'messages',
    'outreach',
    'profiles',
    'proposals',
    'settings',
    'team_members',
    'team_messages',
    'teams'
  )
ORDER BY tablename, cmd, policyname;

-- 3. Table grants. Expected: no anon rows; profiles grant authenticated SELECT
-- only at table level; other client operations are explicit.
SELECT
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND table_name IN (
    'activities',
    'campaigns',
    'clients',
    'leads',
    'messages',
    'outreach',
    'profiles',
    'proposals',
    'settings',
    'team_members',
    'team_messages',
    'teams'
  )
ORDER BY table_name, grantee, privilege_type;

-- 4. Column grants. Expected profile authenticated UPDATE columns are exactly
-- full_name and last_seen_at. Message/team identity columns must not be
-- updateable by authenticated.
SELECT
  table_name,
  column_name,
  grantee,
  privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND table_name IN ('profiles', 'messages', 'team_members', 'team_messages', 'teams')
ORDER BY table_name, grantee, privilege_type, column_name;

-- 5. Definer ownership/configuration and EXECUTE grants. Expected:
-- proconfig includes search_path="" for every listed SECURITY DEFINER function,
-- and anon/PUBLIC have no EXECUTE grant.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_catalog.pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer,
  p.proconfig,
  p.proacl
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'add_team_member',
    'create_team',
    'get_admin_contact',
    'get_team_member_profiles',
    'get_visible_profile',
    'handle_new_user',
    'is_admin',
    'is_admin_user',
    'is_team_leader',
    'is_team_member',
    'mark_team_delivered',
    'protect_profile_role',
    'shares_team_with',
    'team_unread_count'
  )
ORDER BY p.proname, arguments;

-- 6. There must be no direct anon/authenticated profile INSERT or DELETE and no
-- authenticated UPDATE privilege on identity/privileged profile columns.
SELECT
  has_table_privilege('anon', 'public.profiles', 'INSERT') AS anon_profile_insert,
  has_table_privilege('anon', 'public.profiles', 'DELETE') AS anon_profile_delete,
  has_table_privilege('authenticated', 'public.profiles', 'INSERT') AS authenticated_profile_insert,
  has_table_privilege('authenticated', 'public.profiles', 'DELETE') AS authenticated_profile_delete,
  has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE') AS authenticated_role_update,
  has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE') AS authenticated_id_update,
  has_column_privilege('authenticated', 'public.profiles', 'email', 'UPDATE') AS authenticated_email_update,
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE') AS authenticated_name_update,
  has_column_privilege('authenticated', 'public.profiles', 'last_seen_at', 'UPDATE') AS authenticated_presence_update;

-- 7. Duplicate proposal policy names from older schemas should be absent.
SELECT policyname
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'proposals'
ORDER BY policyname;

-- 8. Limited profile RPCs must expose only the approved identity/presence
-- projection. get_visible_profile must be inspected together with its function
-- definition to confirm relationship checks.
SELECT
  p.proname AS function_name,
  pg_catalog.pg_get_function_result(p.oid) AS result_type,
  pg_catalog.pg_get_functiondef(p.oid) AS definition
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_admin_contact',
    'get_team_member_profiles',
    'get_visible_profile'
  )
ORDER BY p.proname;

-- 9. Least-privilege owner-table grants. This query should return zero rows.
WITH expected(table_name, privilege_type) AS (
  VALUES
    ('activities', 'INSERT'),
    ('activities', 'SELECT'),
    ('campaigns', 'INSERT'),
    ('campaigns', 'SELECT'),
    ('clients', 'SELECT'),
    ('leads', 'DELETE'),
    ('leads', 'INSERT'),
    ('leads', 'SELECT'),
    ('leads', 'UPDATE'),
    ('outreach', 'DELETE'),
    ('outreach', 'INSERT'),
    ('outreach', 'SELECT'),
    ('outreach', 'UPDATE'),
    ('proposals', 'INSERT'),
    ('proposals', 'SELECT'),
    ('proposals', 'UPDATE')
),
actual AS (
  SELECT table_name, privilege_type
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND grantee = 'authenticated'
    AND table_name IN (
      'activities',
      'campaigns',
      'clients',
      'leads',
      'outreach',
      'proposals'
    )
),
differences AS (
  (SELECT 'missing' AS difference, * FROM expected EXCEPT SELECT 'missing', * FROM actual)
  UNION ALL
  (SELECT 'unexpected' AS difference, * FROM actual EXCEPT SELECT 'unexpected', * FROM expected)
)
SELECT *
FROM differences
ORDER BY table_name, privilege_type, difference;

-- 10. Authorization helpers must not be executable by anon, including through
-- PUBLIC. All values should be false.
SELECT
  has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') AS anon_is_admin,
  has_function_privilege('anon', 'public.is_admin_user(uuid)', 'EXECUTE') AS anon_is_admin_user,
  has_function_privilege('anon', 'public.is_team_leader(uuid)', 'EXECUTE') AS anon_is_team_leader,
  has_function_privilege('anon', 'public.is_team_member(uuid)', 'EXECUTE') AS anon_is_team_member,
  has_function_privilege('anon', 'public.shares_team_with(uuid)', 'EXECUTE') AS anon_shares_team;
