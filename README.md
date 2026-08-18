# Immanent Lead Engine — V1

Internal client acquisition system for Immanent Studio. Next.js 14 (App Router) + Supabase (Postgres, Auth) + Claude for AI lead analysis and outreach generation.

## What's built

- Auth (Supabase, single founder account)
- Dashboard, Leads (list + profile), Discover (manual + CSV import w/ duplicate detection), Outreach, Campaigns, Proposals, Clients, Analytics, Settings
- AI Lead Analysis + AI Outreach Generator — calls run server-side via `/api/ai/*` so your Anthropic key never reaches the browser
- Lead scoring engine matching the spec's point table exactly
- Follow-up scheduling (configurable Day 2 / 5 / 10 cadence)
- Row Level Security in Postgres — every table is scoped to `owner_id = auth.uid()`

## 1. Create your Supabase project (~3 min)

1. Go to https://supabase.com/dashboard → New Project. Pick a name, region (choose one close to Lagos, e.g. `eu-west` or `af-south` if available), and a strong database password.
2. Once it's provisioned, go to **Project Settings → API**. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (not used by the app yet, but keep it safe for future server-side jobs)
3. Go to **SQL Editor → New Query**, paste the entire contents of `supabase/migrations/0001_init.sql`, and run it. This creates all 7 tables (leads, activities, outreach, campaigns, proposals, clients, settings) with Row Level Security enabled.
4. Go to **Authentication → Providers** and make sure Email is enabled (it is by default). Optionally, under **Authentication → Settings**, turn off "Confirm email" for faster local testing (turn it back on before going fully live, or just confirm the one founder account manually).

## 2. Get an Anthropic API key

Go to https://console.anthropic.com → API Keys → Create Key. This powers "Analyze Lead with AI" and "Generate Message." Usage is pay-as-you-go and billed to your Anthropic account, separate from any Claude.ai subscription.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the four values from steps 1–2:

```
cp .env.example .env.local
```

## 4. Run it locally

```
npm install
npm run dev
```

Open http://localhost:3000 → you'll land on `/login`. Click "First time? Create the founder account", sign up with your email + a password, and you're in. (If you left "Confirm email" on, check your inbox first.)

## 5. Deploy to Vercel (~5 min)

1. Push this folder to a GitHub repo (`git init && git add . && git commit -m "Immanent Lead Engine V1" && git remote add origin <your-repo-url> && git push -u origin main`).
2. Go to https://vercel.com/new, import that repo.
3. In the Vercel project's **Settings → Environment Variables**, add the same four variables from `.env.local`.
4. Deploy. Vercel will build and give you a live URL (e.g. `immanent-lead-engine.vercel.app`).
5. Every future `git push` to `main` auto-redeploys.

## Notes on scope

This build covers the full V1 Definition of Done from the spec: create/import a lead → AI analysis → explainable score → opportunity → recommended package → AI outreach → founder approval → manual send/record → follow-up reminders → pipeline movement → proposal → client conversion → revenue tracking → source/campaign analytics.

Deliberately not included, per the spec's exclusions: automated Instagram/WhatsApp sending, mass messaging, payment processing, a client portal, or multi-tenant billing. Outreach always requires your explicit approval before being logged as sent.
