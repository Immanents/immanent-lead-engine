-- Immanent Lead Engine V1 — Core Schema
-- Single-user-first, but scoped by owner_id for safety / future multi-user.

create extension if not exists "uuid-ossp";

create table if not exists campaigns (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  description text,
  industry text,
  location text,
  status text default 'Active',
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null default auth.uid(),
  business_name text not null,
  industry text not null,
  location text,
  description text,
  website text,
  website_status text,
  instagram text,
  facebook text,
  linkedin text,
  email text,
  phone text,
  contact_person text,
  source text not null default 'Manual',
  campaign_id uuid references campaigns(id) on delete set null,
  lead_score int default 0,
  priority text default 'Low',
  signals jsonb default '{}'::jsonb,
  primary_problem text,
  opportunity text,
  recommended_package text,
  suggested_price numeric,
  ai_analysis jsonb,
  ai_pitch text,
  status text not null default 'NEW',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  notes text
);

create table if not exists activities (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null default auth.uid(),
  lead_id uuid references leads(id) on delete cascade,
  type text not null,
  description text,
  channel text,
  created_at timestamptz default now()
);

create table if not exists outreach (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null default auth.uid(),
  lead_id uuid references leads(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  channel text not null,
  message_type text default 'outreach',
  subject text,
  content text,
  status text default 'SENT',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists proposals (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null default auth.uid(),
  lead_id uuid references leads(id) on delete cascade,
  package text,
  price numeric,
  payment_terms text,
  scope text,
  status text default 'Draft',
  created_at timestamptz default now(),
  sent_at timestamptz,
  accepted_at timestamptz
);

create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null default auth.uid(),
  lead_id uuid references leads(id) on delete set null,
  business_name text,
  contact_person text,
  project_name text,
  package text,
  project_value numeric default 0,
  amount_paid numeric default 0,
  balance numeric default 0,
  project_status text default 'NOT STARTED',
  start_date date,
  deadline date,
  project_link text,
  notes text,
  testimonial text,
  case_study text,
  created_at timestamptz default now()
);

create table if not exists settings (
  owner_id uuid primary key default auth.uid(),
  studio_name text default 'Immanent Studio',
  follow_up_days int[] default '{2,5,10}'
);

-- Row Level Security: each row only visible/editable by its owner
alter table campaigns enable row level security;
alter table leads enable row level security;
alter table activities enable row level security;
alter table outreach enable row level security;
alter table proposals enable row level security;
alter table clients enable row level security;
alter table settings enable row level security;

create policy "owner_all_campaigns" on campaigns for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_leads" on leads for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_activities" on activities for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_outreach" on outreach for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_proposals" on proposals for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_clients" on clients for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_settings" on settings for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index if not exists idx_leads_owner on leads(owner_id);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_campaign on leads(campaign_id);
create index if not exists idx_activities_lead on activities(lead_id);
create index if not exists idx_outreach_lead on outreach(lead_id);
create index if not exists idx_proposals_lead on proposals(lead_id);
