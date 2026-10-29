import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const path = new URL('../supabase/migrations/20261006000010_security_hardening.sql', import.meta.url)
const sql = readFileSync(path, 'utf8')

assert.match(sql, /DECLARE\s+target_table text;/, 'dynamic policy loop must use an unambiguous variable')
assert.doesNotMatch(sql, /table_name\s*=\s*table_name/, 'ambiguous table-name comparisons are forbidden')
assert.match(
  sql,
  /string_agg\(format\('%I', c\.column_name\)/,
  'dynamic column identifiers must be quoted before interpolation',
)
assert.match(
  sql,
  /DROP POLICY IF EXISTS %I ON public\.%I/,
  'dynamic policy and table identifiers must use format %I',
)
assert.doesNotMatch(
  sql,
  /public\.%s/,
  'schema-qualified dynamic table names must never use unquoted %s',
)
assert.match(
  sql,
  /RAISE EXCEPTION 'Unexpected policies on public\.%: %'/,
  'dynamic policy replacement must abort on undocumented policies',
)
assert.match(
  sql,
  /'proposals_own',\s*'proposals_owner'/,
  'the two known duplicate proposal policies must be explicitly allowlisted for replacement',
)
assert.match(
  sql,
  /target_table IN \('activities', 'campaigns', 'clients', 'leads', 'outreach'\)[\s\S]*?target_table \|\| '_own'/,
  'known legacy owner-policy names must be explicitly allowlisted for replacement',
)
assert.match(
  sql,
  /'owner_all',\s*'owner_all_settings',\s*'settings_own'/,
  'the known legacy settings policy must be explicitly allowlisted for replacement',
)

const visibleProfile = sql.match(
  /CREATE OR REPLACE FUNCTION public\.get_visible_profile[\s\S]*?\n\$\$;/,
)?.[0]
assert.ok(visibleProfile, 'get_visible_profile definition must exist')
assert.match(
  visibleProfile,
  /RETURNS TABLE \(\s*id uuid,\s*full_name text,\s*role text,\s*last_seen_at timestamptz\s*\)/,
  'visible profile RPC must return only approved fields',
)
assert.doesNotMatch(visibleProfile, /public\.is_admin\(\)/, 'admin status alone must not authorize lookup')
assert.match(visibleProfile, /public\.shares_team_with\(p\.id\)/, 'shared-team relationship must be checked')
assert.match(visibleProfile, /FROM public\.messages AS m/, 'direct-message relationship must be checked')

const adminContact = sql.match(
  /CREATE OR REPLACE FUNCTION public\.get_admin_contact[\s\S]*?\n\$\$;/,
)?.[0]
assert.ok(adminContact, 'get_admin_contact definition must exist')
assert.match(
  adminContact,
  /RETURNS TABLE \(\s*id uuid,\s*full_name text,\s*role text,\s*last_seen_at timestamptz\s*\)/,
  'admin contact discovery must return only approved fields',
)
assert.match(
  adminContact,
  /AND NOT public\.is_admin\(\)/,
  'admin contact discovery is only for ordinary users with the existing sub-to-admin messaging authorization',
)

for (const forbiddenGrant of [
  /GRANT INSERT .*public\.profiles TO authenticated/,
  /GRANT DELETE .*public\.profiles TO authenticated/,
  /GRANT UPDATE .*role.*public\.profiles TO authenticated/,
]) {
  assert.doesNotMatch(sql, forbiddenGrant)
}
assert.match(
  sql,
  /GRANT UPDATE \(full_name, last_seen_at\) ON TABLE public\.profiles TO authenticated/,
)

assert.equal((sql.match(/^BEGIN;$/gm) ?? []).length, 1, 'migration must have one transaction start')
assert.equal((sql.match(/^COMMIT;$/gm) ?? []).length, 1, 'migration must have one transaction commit')

console.log('Security migration static review tests passed.')
