BEGIN;

-- The app invokes analyze-lead with the signed-in user's JWT. This legacy RPC
-- accepts an arbitrary lead ID and is not called by the current client, so it
-- must not be exposed to anon or authenticated callers.
DO $$
BEGIN
  IF to_regprocedure('public.trigger_lead_analysis(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.trigger_lead_analysis(uuid) FROM PUBLIC, anon, authenticated';
  END IF;

  -- This function is used only by table triggers, never as a client RPC.
  IF to_regprocedure('public.update_updated_at()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at() SET search_path = ' || quote_literal('');
    EXECUTE 'REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated';
  END IF;
END
$$;

-- The generated Figma Make key-value table is accessed by Edge Functions with
-- the service role. Remove unused direct client privileges; RLS remains enabled
-- with no client policies, while trusted server access continues to work.
DO $$
BEGIN
  IF to_regclass('public.kv_store_7633b5f5') IS NOT NULL THEN
    REVOKE ALL PRIVILEGES ON TABLE public.kv_store_7633b5f5 FROM PUBLIC, anon, authenticated;
    REVOKE ALL PRIVILEGES (key, value)
      ON TABLE public.kv_store_7633b5f5
      FROM PUBLIC, anon, authenticated;
    GRANT ALL PRIVILEGES ON TABLE public.kv_store_7633b5f5 TO service_role;
  END IF;
END
$$;

COMMIT;
