# Immanent Lead Engine — Implement the Core AI Lead Generation Engine

You are working on my existing Immanent Lead Engine project.

**Important:** This is an implementation task, not a redesign task. Preserve the existing UI, design system, navigation, Supabase architecture, and working features. Do not generate a new app or replace the existing project.

I have limited Figma Make usage, so implement the complete core workflow in one pass. Prioritize functionality over visual changes.

## 1. Main product concept

Immanent Lead Engine is an AI-powered lead generation tool for my website design and UI/UX design business.

The app must help me:

1. Import or add business leads.
2. Analyze a business website automatically.
3. Identify genuine website and digital experience opportunities.
4. Recommend the best website design solution or service package.
5. Generate a personalized outreach message.
6. Edit, copy, and track the outreach.
7. Follow up with leads and track conversions.

The app must work with real data, not just mockups or simulated AI results.

## 2. Inspect the existing code first

Before making changes:

* Inspect the current project structure.
* Identify the existing lead management components.
* Identify the current Supabase client and database functions.
* Inspect the AI analysis Edge Function.
* Inspect the existing `LeadProfile`, `OutreachView`, dashboard, and lead creation/import flows.
* Identify existing TypeScript types and database interfaces.
* Reuse existing components and functions wherever possible.

Do not create duplicate components, duplicate Supabase clients, duplicate tables, or a second unrelated architecture.

## 3. Fix the AI website analysis workflow

Connect the existing "Analyze with AI" or "Analyze Website" action to the actual Supabase Edge Function.

Use the existing `supabase/functions/analyze-lead/index.ts` if it already exists.

The preferred workflow is:

Frontend → Supabase Edge Function → Website analysis → AI analysis → Save result to Supabase → Update Lead Profile.

Do not rely on a nonexistent RPC or database trigger unless it is verified to exist.

If the current code calls something like:

`supabase.rpc('trigger_lead_analysis', ...)`

replace that dependency with a direct Edge Function invocation where appropriate.

### Website analysis requirements

When a lead has a valid website:

* Validate and normalize the URL.
* Fetch the website securely on the server.
* Extract meaningful text such as page title, headings, navigation, services, contact details, booking links, and calls to action.
* Handle websites that fail to load, timeout, or return insufficient content.
* Do not execute arbitrary website JavaScript.
* Do not claim to have visually inspected a website if only its HTML text was analyzed.
* Clearly distinguish verified findings from assumptions.

The AI should identify relevant opportunities such as:

* No website or weak online presence.
* Poor conversion opportunities.
* Missing contact or booking flow.
* Weak service presentation.
* Poor content structure.
* Missing clear calls to action.
* Possible mobile or usability concerns only when supported by available evidence.

Do not automatically label a website as poor just because its HTML is sparse.

### When no website exists

The analysis must still work using available business information:

* Business name.
* Industry.
* Location.
* Description.
* Social media links.
* Services.
* Contact details.

Do not fail the entire analysis because a website is missing.

## 4. Standardize the AI analysis response

Use one consistent structured response between the Edge Function, database, and frontend.

Preserve existing compatible fields, but ensure the following are supported:

```ts
interface AIAnalysis {
  business_summary: string;
  online_presence: string;
  website_status: string;
  primary_problem: string;
  customer_journey: string;
  business_opportunity: string;
  recommended_solution: string;
  recommended_package: string;
  suggested_price: number;
  lead_score: number;
  reason_for_score: string;
  suggested_outreach_angle: string;
  website_evidence: string[];
  message_draft: string;
  confidence: 'high' | 'medium' | 'low';
}
```

If the existing database uses JSONB for AI analysis, store the structured result there.

If the existing database uses separate columns, adapt to the existing schema instead of creating unnecessary duplicate columns.

Ensure:

* AI JSON is parsed safely.
* Invalid AI responses are handled.
* Scores are validated between 0 and 100.
* Prices are validated.
* The correct lead ID is updated.
* Loading, success, and error states are displayed.
* Analysis results persist after page refresh.

Do not invent unsupported facts about a business.

## 5. Implement personalized outreach

Connect the existing "Generate Outreach" action to a real generation workflow.

The message must be based on the lead's actual information and analysis.

Generate a personalized message using:

* Business name.
* Industry.
* Location when available.
* Verified website findings.
* Business opportunity.
* Recommended website solution.
* My design service offering.

The message should feel like a thoughtful website design pitch, not generic AI spam.

Support these channels:

* WhatsApp.
* Email.
* Instagram DM.

The user must be able to:

* Select an outreach channel.
* Generate a message.
* Edit the message.
* Regenerate the message.
* Copy the message.
* Save the draft.
* Mark the outreach as sent manually.
* Track the outreach status.

Do not claim that WhatsApp, email, or Instagram messages were automatically sent unless a real sending integration exists.

If no sending integration exists, implement a reliable manual workflow:

Generate → Edit → Copy → Open contact channel → Mark as sent.

## 6. Implement manual fallback

Add a manual assessment fallback inside the existing Lead Profile or AI Analysis view.

When automatic analysis fails or the website is missing, allow the user to:

* Enter website observations.
* Enter the primary business problem.
* Enter the business opportunity.
* Select or enter a recommended solution.
* Select a recommended package.
* Enter a suggested price.
* Enter a lead score.
* Write or edit an outreach message.
* Save the assessment to Supabase.

The manual fallback must use the same lead and outreach records as the automatic workflow.

Do not create a separate disconnected manual system.

## 7. Improve the Lead Profile workspace

Preserve the existing design and tabs, but make the lead profile the main workspace.

Ensure it displays:

### Business information

* Business name.
* Industry.
* Location.
* Website.
* Phone.
* Email.
* Social media links.

### AI opportunity summary

* Lead score.
* Primary problem.
* Business opportunity.
* Recommended solution.
* Recommended package.
* Suggested price.
* Confidence level.

### Website findings

* Website status.
* Verified findings.
* Evidence.
* Analysis timestamp.
* Analysis errors when applicable.

### Outreach

* Channel selector.
* Generated message.
* Editable message field.
* Copy action.
* Save draft.
* Mark as sent.
* Outreach status.

### Activity timeline

Track:

* Lead created.
* Website analyzed.
* Analysis updated.
* Outreach generated.
* Outreach sent.
* Follow-up completed.
* Proposal created.
* Lead converted.

Use existing database tables and activity functions when available.

## 8. Supabase and security

Keep the existing Supabase architecture.

Before adding migrations, inspect whether the required tables and columns already exist.

Use the existing tables where possible:

* `leads`
* `outreach`
* `campaigns`
* `proposals`
* `clients`
* `activities`

If required tables or columns are missing, create the minimum necessary migration.

Ensure:

* Authenticated users can access their own leads.
* RLS is enabled and correct for user-owned data.
* Service-role credentials never appear in frontend code.
* AI API keys remain server-side.
* The authenticated user is verified before lead analysis or updates.
* Website fetching is protected against unsafe URLs, private-network targets, excessive responses, and long timeouts.

Do not break existing authentication or working lead management.

## 9. Error handling

Every major action must have a clear state:

* Idle.
* Loading.
* Success.
* Error.
* Retry.

Handle:

* Missing website.
* Invalid URL.
* Website unavailable.
* AI API failure.
* Invalid AI response.
* Supabase failure.
* Missing contact information.
* Duplicate outreach.

Display useful error messages instead of silently failing.

## 10. Keep the scope controlled

Do not add:

* New landing pages.
* Unnecessary animations.
* New dashboards unrelated to the core workflow.
* Fake AI analysis.
* Fake outreach sending.
* Unnecessary third-party integrations.
* Duplicate database systems.
* Unrelated features.

Do not rewrite the entire app.

Focus on making the existing lead profile, AI analysis, outreach, and Supabase data flow work together.

## 11. Final verification

After implementation:

* Check TypeScript errors.
* Check imports.
* Check Supabase function calls.
* Check that the existing app still runs.
* Check that lead creation still works.
* Check that CSV import still works.
* Check that AI analysis saves to the correct lead.
* Check that analysis persists after refresh.
* Check that outreach generation uses the correct lead.
* Check that manual fallback saves correctly.
* Check that existing navigation and dashboard are not broken.

At the end, provide a concise summary of:

1. Files changed.
2. Features implemented.
3. Supabase migrations or Edge Functions required.
4. Environment variables required.
5. Any remaining setup I must complete manually.

**Priority:** Make the core lead-generation engine functional using the existing project. Do not spend the limited generation budget on redesigning the interface.
