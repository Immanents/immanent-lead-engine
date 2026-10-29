-- Immanent Lead Engine — Core Schema
-- Idempotent: safe to run against an existing database.
-- Apply via: Supabase Dashboard → SQL Editor → Run

-- ── Enable required extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── campaigns ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  industry    text NOT NULL DEFAULT '',
  location    text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'UPCOMING')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'owner_all') THEN
    CREATE POLICY owner_all ON campaigns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── leads ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name       text NOT NULL,
  industry            text NOT NULL DEFAULT '',
  location            text NOT NULL DEFAULT '',
  description         text,
  website             text,
  website_status      text DEFAULT 'none'
                        CHECK (website_status IN ('none', 'poor', 'outdated', 'decent', 'good')),
  instagram           text,
  facebook            text,
  linkedin            text,
  email               text,
  phone               text,
  contact_person      text,
  source              text NOT NULL DEFAULT 'Manual',
  campaign_id         uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  lead_score          integer NOT NULL DEFAULT 50 CHECK (lead_score >= 0 AND lead_score <= 100),
  priority            text NOT NULL DEFAULT 'Maybe'
                        CHECK (priority IN ('High Priority', 'Good', 'Maybe', 'Low')),
  status              text NOT NULL DEFAULT 'NEW'
                        CHECK (status IN ('NEW','QUALIFIED','CONTACTED','INTERESTED','PROPOSAL','WON','LOST','NURTURE','ARCHIVED')),
  primary_problem     text,
  opportunity         text,
  recommended_package text CHECK (recommended_package IN ('Starter', 'Business', 'Premium')),
  suggested_price     numeric,
  ai_analysis         jsonb,
  ai_pitch            text,
  notes               text,
  last_contacted_at   timestamptz,
  next_follow_up_at   timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'owner_all') THEN
    CREATE POLICY owner_all ON leads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add AI columns to existing leads table if they are missing
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_analysis         jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_pitch            text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS primary_problem     text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opportunity         text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS recommended_package text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS suggested_price     numeric;

-- ── outreach ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id      uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id  uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  channel      text NOT NULL
                 CHECK (channel IN ('Instagram', 'Email', 'WhatsApp', 'LinkedIn')),
  message_type text NOT NULL DEFAULT 'INITIAL'
                 CHECK (message_type IN ('INITIAL', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'FINAL_FOLLOW_UP')),
  content      text NOT NULL,
  status       text NOT NULL DEFAULT 'DRAFT'
                 CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','SENT','REPLIED','NO_RESPONSE')),
  scheduled_at timestamptz,
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Add user_id to outreach if the table already existed without it
ALTER TABLE outreach ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id from the linked lead for any existing rows that lack it
UPDATE outreach o
SET user_id = l.user_id
FROM leads l
WHERE o.lead_id = l.id
  AND o.user_id IS NULL;

ALTER TABLE outreach ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'outreach' AND policyname = 'owner_all') THEN
    CREATE POLICY owner_all ON outreach FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── proposals ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id          uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  package          text NOT NULL CHECK (package IN ('Starter', 'Business', 'Premium')),
  price            numeric NOT NULL DEFAULT 0,
  payment_terms    text NOT NULL DEFAULT '',
  scope            text NOT NULL DEFAULT '',
  proposal_message text,
  status           text NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED')),
  sent_at          timestamptz,
  accepted_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proposals' AND policyname = 'owner_all') THEN
    CREATE POLICY owner_all ON proposals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── clients ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id        uuid REFERENCES leads(id) ON DELETE SET NULL,
  business_name  text NOT NULL,
  contact_person text,
  project_name   text NOT NULL DEFAULT '',
  package        text NOT NULL CHECK (package IN ('Starter', 'Business', 'Premium')),
  project_value  numeric NOT NULL DEFAULT 0,
  amount_paid    numeric NOT NULL DEFAULT 0,
  balance        numeric NOT NULL DEFAULT 0,
  project_status text NOT NULL DEFAULT 'NOT STARTED'
                   CHECK (project_status IN ('NOT STARTED','IN PROGRESS','CLIENT REVIEW','COMPLETED','ON HOLD','CANCELLED')),
  start_date     timestamptz,
  deadline       timestamptz,
  notes          text,
  testimonial    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'owner_all') THEN
    CREATE POLICY owner_all ON clients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── activities ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id   uuid REFERENCES leads(id) ON DELETE CASCADE,
  lead_name text NOT NULL DEFAULT '',
  type      text NOT NULL
              CHECK (type IN ('LEAD_CREATED','STATUS_CHANGED','OUTREACH_SENT','FOLLOW_UP',
                              'PROPOSAL_SENT','PROPOSAL_ACCEPTED','CONVERTED','AI_ANALYZED')),
  description text NOT NULL DEFAULT '',
  channel   text CHECK (channel IN ('Instagram', 'Email', 'WhatsApp', 'LinkedIn')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'owner_all') THEN
    CREATE POLICY owner_all ON activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
