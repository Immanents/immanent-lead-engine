import assert from 'node:assert/strict'
import { isMissingRpcError } from '../src/lib/supabaseErrors.ts'

const functionName = 'get_visible_profile'

assert.equal(
  isMissingRpcError(
    {
      code: 'PGRST202',
      message: 'Could not find the function public.get_visible_profile(profile_id) in the schema cache',
    },
    functionName,
  ),
  true,
  'the exact PostgREST missing-function error should permit rollout fallback',
)

for (const error of [
  { code: '42501', message: 'permission denied for function get_visible_profile' },
  { code: 'PGRST301', message: 'JWT expired while calling get_visible_profile' },
  { code: 'PGRST202', message: 'Could not find the function public.some_other_function()' },
  { code: '500', message: 'get_visible_profile failed' },
  new Error('network failure'),
  null,
]) {
  assert.equal(
    isMissingRpcError(error, functionName),
    false,
    `security-relevant error must fail closed: ${JSON.stringify(error)}`,
  )
}

console.log('Supabase RPC fallback classification tests passed.')
