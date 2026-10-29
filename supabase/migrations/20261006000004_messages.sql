-- Immanent Lead Engine — admin <-> sub messaging (idempotent)
-- Requires 20261006000001_profiles_roles.sql

CREATE TABLE IF NOT EXISTS messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body         text NOT NULL CHECK (length(trim(body)) > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  read_at      timestamptz
);
CREATE INDEX IF NOT EXISTS messages_recipient_idx ON messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages (sender_id, created_at DESC);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_user(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
$$;

DO $$ BEGIN
  -- Subs need to see who the admin is so they can message them
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'read_admin_profile') THEN
    CREATE POLICY read_admin_profile ON profiles FOR SELECT USING (role = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'read_own_messages') THEN
    CREATE POLICY read_own_messages ON messages FOR SELECT
      USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
  END IF;
  -- Admin can message anyone; subs can only message the admin
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'send_messages') THEN
    CREATE POLICY send_messages ON messages FOR INSERT
      WITH CHECK (auth.uid() = sender_id AND (public.is_admin() OR public.is_admin_user(recipient_id)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'mark_read') THEN
    CREATE POLICY mark_read ON messages FOR UPDATE
      USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
  END IF;
END $$;

-- Recipients may only change read_at
CREATE OR REPLACE FUNCTION public.messages_only_read_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.sender_id := OLD.sender_id;
  NEW.recipient_id := OLD.recipient_id;
  NEW.body := OLD.body;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS messages_only_read_at ON messages;
CREATE TRIGGER messages_only_read_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_only_read_at();
