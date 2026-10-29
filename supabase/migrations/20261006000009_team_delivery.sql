-- Team message delivery receipts
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS last_delivered_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_team_delivered()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE team_members SET last_delivered_at = now() WHERE user_id = auth.uid();
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='team_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
  END IF;
END $$;
