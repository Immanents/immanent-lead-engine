BEGIN;

-- trigger_lead_analysis is now restricted to trusted roles. Pin its lookup path
-- so unqualified public.leads references cannot be resolved through a mutable
-- caller-provided schema or a temporary object.
DO $$
BEGIN
  IF to_regprocedure('public.trigger_lead_analysis(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.trigger_lead_analysis(uuid) SET search_path = pg_catalog, public, net, pg_temp';
  END IF;
END
$$;

COMMIT;
