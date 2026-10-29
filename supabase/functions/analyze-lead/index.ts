const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Block private/internal network targets to prevent SSRF
function isBlockedUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    if (!["http:", "https:"].includes(url.protocol)) return true
    const h = url.hostname.toLowerCase()
    if (h === "localhost" || h === "::1") return true
    const oct = h.split(".").map(Number)
    if (oct.length === 4 && !oct.some(isNaN)) {
      const [a, b] = oct
      if (a === 10) return true
      if (a === 127) return true
      if (a === 0) return true
      if (a === 172 && b >= 16 && b <= 31) return true
      if (a === 192 && b === 168) return true
      if (a === 169 && b === 254) return true // AWS metadata, link-local
    }
    return false
  } catch {
    return true
  }
}


// ── Multi-provider LLM with automatic failover ───────────────────────────────
// A provider is used only if its API key is set. Order: LLM_PROVIDER_ORDER (default gemini,anthropic,openai).
type Provider = "gemini" | "anthropic" | "openai"
type LlmResult = { ok: true; text: string; provider: string } | { ok: false; error: string }

// Ignore secrets that look like pasted instructions rather than a real model id
const modelEnv = (name: string): string | undefined => {
  const v = Deno.env.get(name)?.trim()
  return v && !/\s/.test(v) ? v : undefined
}

const GEMINI_MODELS = [
  modelEnv("GEMINI_MODEL"),
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
].filter((m, i, a): m is string => !!m && a.indexOf(m) === i)

// Set ANTHROPIC_BASE_URL to use an Anthropic-compatible gateway (e.g. AgentRouter)
const ANTHROPIC_BASE_URL = (Deno.env.get("ANTHROPIC_BASE_URL") ?? "https://api.anthropic.com").replace(/\/$/, "")
const ANTHROPIC_MODEL = modelEnv("ANTHROPIC_MODEL") ?? "claude-sonnet-5"
const OPENAI_MODEL = modelEnv("OPENAI_MODEL") ?? "gpt-4.1-mini"
// Any OpenAI-compatible API works here (e.g. Groq, OpenRouter) by setting OPENAI_BASE_URL
const OPENAI_BASE_URL = (Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "")

const RETRYABLE = [408, 409, 425, 429, 500, 502, 503, 504, 529]
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function configuredProviders(): Provider[] {
  const keys: Record<Provider, string | undefined> = {
    gemini: Deno.env.get("GEMINI_API_KEY"),
    anthropic: Deno.env.get("ANTHROPIC_API_KEY"),
    openai: Deno.env.get("OPENAI_API_KEY"),
  }
  const order = (Deno.env.get("LLM_PROVIDER_ORDER") ?? "gemini,anthropic,openai")
    .split(",").map((p) => p.trim().toLowerCase()) as Provider[]
  const all: Provider[] = [...order, "gemini", "anthropic", "openai"]
  return all.filter((p, i) => keys[p] && all.indexOf(p) === i)
}

// One attempt per model/provider with a single quick retry on overload.
async function tryRequest(
  label: string,
  doFetch: () => Promise<Response>,
  extract: (json: any) => string,
): Promise<{ text?: string; error?: string; fatal?: boolean }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await doFetch()
      if (res.ok) {
        const raw = await res.text()
        let json: any
        try { json = JSON.parse(raw) } catch {
          return { error: `${label}: non-JSON response (check the base URL / that this gateway allows API calls): ${raw.slice(0, 120)}` }
        }
        const text = extract(json)
        if (text.trim()) return { text }
        return { error: `${label}: empty response` }
      }
      const body = (await res.text()).slice(0, 300)
      console.error(`${label} failed ${res.status} (attempt ${attempt + 1}): ${body}`)
      if (RETRYABLE.includes(res.status)) {
        if (attempt === 0) { await sleep(800); continue }
        return { error: `${label}: ${res.status} ${body}` }
      }
      // 400/401/403/404 etc: this model/provider is unusable, move on
      return { error: `${label}: ${res.status} ${body}` }
    } catch (e) {
      console.error(`${label} network error`, e)
      return { error: `${label}: ${(e as Error).message}` }
    }
  }
  return { error: `${label}: failed` }
}

async function callLLM(prompt: string, temperature: number, maxTokens: number): Promise<LlmResult> {
  const providers = configuredProviders()
  if (providers.length === 0) {
    return { ok: false, error: "No AI provider configured. Set GEMINI_API_KEY, ANTHROPIC_API_KEY or OPENAI_API_KEY." }
  }
  const errors: string[] = []

  for (const provider of providers) {
    if (provider === "gemini") {
      const key = Deno.env.get("GEMINI_API_KEY")!
      for (const model of GEMINI_MODELS) {
        const r = await tryRequest(
          `gemini/${model}`,
          () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: maxTokens } }),
          }),
          (j) => j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
        )
        if (r.text) return { ok: true, text: r.text, provider: `gemini/${model}` }
        errors.push(r.error!)
      }
    } else if (provider === "anthropic") {
      const key = Deno.env.get("ANTHROPIC_API_KEY")!
      const r = await tryRequest(
        `anthropic/${ANTHROPIC_MODEL}`,
        () => fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": key, Authorization: `Bearer ${key}`, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, temperature, messages: [{ role: "user", content: prompt }] }),
        }),
        (j) => (j?.content ?? []).map((c: any) => c?.text ?? "").join(""),
      )
      if (r.text) return { ok: true, text: r.text, provider: `anthropic/${ANTHROPIC_MODEL}` }
      errors.push(r.error!)
    } else {
      const key = Deno.env.get("OPENAI_API_KEY")!
      const r = await tryRequest(
        `openai/${OPENAI_MODEL}`,
        () => fetch(`${OPENAI_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: OPENAI_MODEL, max_tokens: maxTokens, temperature, messages: [{ role: "user", content: prompt }] }),
        }),
        (j) => j?.choices?.[0]?.message?.content ?? "",
      )
      if (r.text) return { ok: true, text: r.text, provider: `openai/${OPENAI_MODEL}` }
      errors.push(r.error!)
    }
  }
  return { ok: false, error: `All AI providers failed. ${errors.join(" | ")}` }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!

  try {
    // ── 1. Authenticate the caller ────────────────────────────────
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
    })
    if (!userRes.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }
    const { id: userId } = await userRes.json()

    // ── 2. Parse and validate the request body ────────────────────
    const { lead, action = 'analyze', options = {} } = await req.json()

    if (!lead?.id || !UUID_RE.test(lead.id)) {
      return new Response(JSON.stringify({ error: "Invalid lead ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── 3. Verify the user owns this lead ─────────────────────────
    const ownershipRes = await fetch(
      `${supabaseUrl}/rest/v1/leads?id=eq.${lead.id}&user_id=eq.${userId}&select=id`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      },
    )
    const ownershipData = await ownershipRes.json()
    if (!Array.isArray(ownershipData) || ownershipData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Lead not found or access denied" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // ── 4a. generate_outreach shortcut (no re-crawl, no re-score) ──
    if (action === "generate_outreach") {
      const analysis = lead.ai_analysis
      if (!analysis) {
        return new Response(JSON.stringify({ error: "No AI analysis found. Run analysis first." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const ANGLE_LABELS: Record<string, string> = {
        website_improvement: "Website improvement",
        booking_conversion: "Booking and conversion improvement",
        brand_presentation: "Brand presentation and credibility",
        event_experience: "Event and customer experience",
        mobile_experience: "Mobile experience",
        general_design: "General design opportunity",
      }
      const TONE_LABELS: Record<string, string> = {
        warm_conversational: "Warm and conversational — friendly, approachable, like a genuine human message",
        premium_professional: "Premium and professional — polished, refined, befitting a luxury brand",
        consultative: "Consultative — expert advisor tone, focused on solving a real problem",
        direct_respectful: "Direct and respectful — clear, concise, no fluff, respectful of their time",
      }
      const LENGTH_LABELS: Record<string, string> = {
        short: "Short — 2 to 3 short paragraphs maximum",
        medium: "Medium — 3 to 4 paragraphs",
        detailed: "Detailed — 4 to 5 paragraphs with richer context",
      }

      const angle = ANGLE_LABELS[options.angle] ?? "General design opportunity"
      const tone = TONE_LABELS[options.tone] ?? "Warm and conversational"
      const length = LENGTH_LABELS[options.length] ?? "Medium — 3 to 4 paragraphs"
      const channel = options.channel ?? "WhatsApp"
      const evidence = Array.isArray(analysis.website_evidence) && analysis.website_evidence.length > 0
        ? analysis.website_evidence.join("\n- ")
        : null

      const outreachPrompt = `You are an outreach specialist for Immanent Studio, a web design agency in Nigeria.

Generate a highly personalized outreach message for the following business lead. Use the analysis data to make the message specific and evidence-based.

BUSINESS:
Name: ${lead.business_name}
Category: ${lead.industry}
Location: ${lead.location}
Contact Person: ${lead.contact_person || "Unknown"}
Website: ${lead.website || "None"}
Instagram: ${lead.instagram || "None"}
X: ${lead.x_handle || "None"}
Discord: ${lead.discord || "None"}
Telegram: ${lead.telegram || "None"}

EXISTING AI ANALYSIS:
Business Summary: ${analysis.business_summary ?? "N/A"}
Online Presence: ${analysis.online_presence ?? "N/A"}
Primary Problem: ${analysis.primary_problem ?? "N/A"}
Business Opportunity: ${analysis.business_opportunity ?? "N/A"}
Customer Journey: ${analysis.customer_journey ?? "N/A"}
Recommended Solution: ${analysis.recommended_solution ?? "N/A"}
Suggested Outreach Angle: ${analysis.suggested_outreach_angle ?? "N/A"}
Score Rationale: ${analysis.reason_for_score ?? "N/A"}
${evidence ? `Website Evidence (verified):\n- ${evidence}` : "Website Evidence: None available — do not invent website findings."}
Confidence Level: ${analysis.confidence ?? "medium"}

USER-SELECTED OPTIONS:
Message Angle: ${angle}
Tone: ${tone}
Length: ${length}
Channel: ${channel}

MESSAGE RULES — follow these strictly:

Opening:
- If contact person is a real name: "Good day [exact name],"
- If contact person is unknown: "Good day [exact business name] team,"
- Never write "Good day there," or "Good day business owner," or any placeholder.

Personalization:
- Use the EXACT business name from the data above. Never shorten, invent, or substitute it.
- Mention at least one specific verified detail about this business (from the analysis).
- If website evidence is available, reference one concrete observation using cautious language: "I noticed…", "it appears…", "there may be…"
- If NO website evidence is available, do NOT invent a website problem. Use only verified business details and opportunities. Add a note at the end of personalization_reason to suggest the user manually adds an observation.
- Connect the observation to a realistic customer-experience or business opportunity.
- Select only the 2 to 3 most relevant findings. Do not list everything.

Tone guidance:
- ${tone}
- Avoid: "premier", "world-class", "guaranteed", "industry-leading", "transformative" unless explicitly supported by evidence.
- Do not sound like an automated audit or mass-marketing email.
- Never mention lead scores, confidence levels, internal analysis, pricing, or AI tools.
- Avoid insulting or embarrassing the prospect.
- End with a low-pressure call to action appropriate for ${channel}.
- Do not claim you visited, contacted, or spoke with the business unless that is in the data.
- Do not invent facts about customers, revenue, services, or operations.

Structure:
- Natural, personalized greeting
- Specific detail about the business
- Cautious, evidence-based observation (or opportunity if no website evidence)
- Relevant opportunity tied to the message angle
- Brief explanation of how Immanent Studio can help
- Low-pressure call to action

Return ONLY valid JSON in this exact structure:

{
  "message": "...",
  "personalization": {
    "business_detail": "The specific business detail you used in the message",
    "relevant_observation": "The website or online presence observation you used (or 'No website evidence available — used business details only' if none)",
    "business_opportunity": "The opportunity you highlighted in the message",
    "recommended_angle": "Why this angle was chosen for this specific lead",
    "evidence_used": ["list", "of", "specific", "evidence", "items", "referenced"],
    "personalization_reason": "A 2–3 sentence explanation of why this opening, observation, and call to action were chosen for this business specifically. If no website evidence was available, note that and suggest the user manually adds an observation before sending."
  }
}`

      const llm = await callLLM(outreachPrompt, 0.5, 4096)
      if (!llm.ok) {
        return new Response(JSON.stringify({ error: llm.error }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      let rawText: string = llm.text
      rawText = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim()

      let outreachResult: Record<string, unknown>
      try {
        outreachResult = JSON.parse(rawText)
      } catch {
        const lastBrace = rawText.lastIndexOf("}")
        if (lastBrace > 0) {
          try { outreachResult = JSON.parse(rawText.slice(0, lastBrace + 1)) }
          catch { return new Response(JSON.stringify({ error: "AI returned invalid JSON for outreach generation" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }) }
        } else {
          return new Response(JSON.stringify({ error: "AI returned invalid JSON for outreach generation" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
      }

      return new Response(
        JSON.stringify({ message: outreachResult.message ?? "", personalization: outreachResult.personalization ?? {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // ── 5. Fetch website content (with SSRF guard) ────────────────
    let websiteContent = "No website provided or unable to fetch."
    if (lead.website?.trim()) {
      let urlToFetch = lead.website.trim()
      if (!/^https?:\/\//i.test(urlToFetch))
        urlToFetch = "https://" + urlToFetch

      if (isBlockedUrl(urlToFetch)) {
        websiteContent = "Website URL is not accessible from this server."
      } else {
        try {
          const webRes = await fetch(urlToFetch, {
            signal: AbortSignal.timeout(6000),
            headers: { "User-Agent": "ImmanentLeadBot/1.0" },
          })
          if (webRes.ok) {
            const html = await webRes.text()
            websiteContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
              .replace(/<[^>]*>/gm, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 10000)
            if (websiteContent.length < 50) {
              websiteContent = `Website loaded but returned minimal readable content (HTTP ${webRes.status}).`
            }
          } else {
            websiteContent = `Website returned HTTP ${webRes.status} — could not retrieve content.`
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          websiteContent = msg.includes("timeout")
            ? "Website request timed out after 6 seconds."
            : "Website could not be reached (connection error)."
        }
      }
    }

    // ── 6. Build prompt ───────────────────────────────────────────
    const prompt = `You are a business development analyst for Immanent Studio, a web design agency in Nigeria.

Analyze this business lead and return a detailed assessment that helps Immanent Studio decide whether and how to approach this lead.

Business Details:

Business Name: ${lead.business_name}
Industry: ${lead.industry}
Location: ${lead.location}
Website: ${lead.website || "None"}
Website Status: ${lead.website_status || "Unknown"}
Instagram: ${lead.instagram || "None"}
X: ${lead.x_handle || "None"}
Discord: ${lead.discord || "None"}
Telegram: ${lead.telegram || "None"}
Facebook: ${lead.facebook || "None"}
LinkedIn: ${lead.linkedin || "None"}
Contact Person: ${lead.contact_person || "Unknown"}
Description: ${lead.description || "None"}
Notes: ${lead.notes || "None"}
Primary Problem: ${lead.primary_problem || "Unknown"}

Website Content Extracted (if any):
${websiteContent}

Immanent Studio Packages:

Starter: ₦150,000
- Basic informational website
- Suitable for small businesses that need an online presence

Business: ₦250,000
- Full business website
- More pages and business features
- Suitable for established businesses

Premium: ₦400,000
- Advanced website
- Integrations and advanced functionality
- Suitable for businesses with more complex requirements

Lead Scoring Guidelines:

No website at all: +20 points
Poor or outdated website: +15 points
Strong social media presence: +15 points
Active business with clear revenue potential: +10 points
Easy to reach decision maker: +10 points
Competitive industry where a website can generate strong ROI: +10 points
Weak or no social media presence: -5 points

Analyze the lead based on the information provided. If website content is provided, analyze the website quality, mobile experience cues (if any can be deduced), menu presence, booking flow, contact options, and conversion opportunities. Never invent website findings if the content is not available.

The lead score should be a realistic score from 0 to 100. Do not automatically use 75. Calculate the score based on the available evidence.

Choose the recommended package based on the business's needs:

STARTER = 150000
BUSINESS = 250000
PREMIUM = 400000

The outreach message must be highly personalized using ONLY the verified lead information provided above.

PERSONALIZATION RULES:

1. Use the exact Business Name provided above. Never invent, shorten, replace, or substitute the business name.

2. Use the exact Location provided above when it is useful. Do not invent a different location.

3. If Contact Person is a real name provided above, address them by that exact name.

4. If Contact Person is "Unknown", empty, null, or missing, DO NOT invent a person's name. Instead address the business naturally, for example:
"Good day Nigeria Breakfast Place team,"
using the exact business name.

5. Never use names such as "Test Owner", "Test Business", "there", "business owner", "[Name]", "[Business Name]", or any other placeholder unless that exact text was actually provided as verified lead data.

6. Mention the specific problem identified for this lead. Do not use a generic problem that could apply to every business.

7. Mention the specific opportunity for this business and explain how Immanent Studio's website service could address it.

8. Do not claim that you visited, contacted, spoke with, or discussed anything with the business unless that information is explicitly present in the lead data.

9. Do not invent facts about the business, its customers, revenue, services, social media activity, or operations.

10. The message should feel like a genuine one-to-one outreach message, not a mass marketing template.

Write a complete message that can be sent immediately through WhatsApp or email.

The first line must follow this rule:
- Known contact person: "Good day [exact contact name],"
- Unknown contact person: "Good day [exact business name] team,"

The message should be 3-5 short paragraphs, warm and professional, with a soft call to action.

Do not use placeholders.

Return ONLY valid JSON using exactly this structure:

{
  "business_summary": "...",
  "online_presence": "...",
  "website_status": "none",
  "primary_problem": "...",
  "customer_journey": "...",
  "business_opportunity": "...",
  "recommended_solution": "...",
  "recommended_package": "Starter",
  "suggested_price": 150000,
  "lead_score": 0,
  "reason_for_score": "...",
  "suggested_outreach_angle": "...",
  "website_evidence": [],
  "confidence": "medium",
  "message_draft": "..."
}

IMPORTANT FOR message_draft:

The message_draft must be a complete, ready-to-send message.

If Contact Person is known: "Good day [exact contact person name],"
If Contact Person is unknown: "Good day [exact business name] team,"

Never write placeholders like "[Name]", "[Business Name]", "Good day there", "Good day business owner".

Use the EXACT business name from the Business Name field.
Use the actual location when it helps personalise the message.
Reference the specific problem and opportunity identified for this lead.
Do not invent information not present in the lead data.
The message should be 3-5 short paragraphs ending with a natural, low-pressure call to action.
`

    // ── 7. Call AI (automatic provider/model failover) ───────────
    const llm = await callLLM(prompt, 0.4, 8192)
    if (!llm.ok) {
      console.error("AI providers failed:", llm.error)
      return new Response(
        JSON.stringify({ error: llm.error }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }
    console.log("Analysis generated by", llm.provider)

    // ── 8. Parse AI response ──────────────────────────────────────
    let jsonText: string = llm.text

    jsonText = jsonText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()

    if (!jsonText) {
      throw new Error("AI returned an empty response")
    }

    let analysis: Record<string, unknown>
    try {
      analysis = JSON.parse(jsonText)
    } catch {
      // Try trimming to last closing brace in case the response was slightly truncated
      const lastBrace = jsonText.lastIndexOf("}")
      if (lastBrace > 0) {
        try {
          analysis = JSON.parse(jsonText.slice(0, lastBrace + 1))
        } catch {
          throw new Error(`AI returned invalid JSON: ${jsonText.slice(0, 300)}`)
        }
      } else {
        throw new Error(`AI returned invalid JSON: ${jsonText.slice(0, 300)}`)
      }
    }

    // Normalize and validate fields
    if (analysis.recommended_package) {
      const pkg = String(analysis.recommended_package).toLowerCase()
      if (pkg === "starter") analysis.recommended_package = "Starter"
      else if (pkg === "business") analysis.recommended_package = "Business"
      else if (pkg === "premium") analysis.recommended_package = "Premium"
      else analysis.recommended_package = "Starter"
    }
    analysis.lead_score = Math.min(
      100,
      Math.max(0, Number(analysis.lead_score) || 0),
    )
    if (!analysis.suggested_price || Number(analysis.suggested_price) <= 0) {
      analysis.suggested_price = 150000
    }
    if (!["high", "medium", "low"].includes(String(analysis.confidence))) {
      analysis.confidence = "medium"
    }
    if (!Array.isArray(analysis.website_evidence)) {
      analysis.website_evidence = []
    }

    // ── 9. Save to leads table (service role, safe) ───────────────
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/leads?id=eq.${lead.id}&user_id=eq.${userId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          ai_analysis: analysis,
          ai_pitch: analysis.message_draft ?? null,
          lead_score: analysis.lead_score,
          primary_problem: analysis.primary_problem,
          opportunity: analysis.business_opportunity,
          recommended_package: analysis.recommended_package,
          suggested_price: analysis.suggested_price,
          updated_at: new Date().toISOString(),
        }),
      },
    )

    if (!updateRes.ok) {
      const updateError = await updateRes.text()
      console.error("Failed to update lead:", updateError)
      return new Response(
        JSON.stringify({
          error: `Failed to save analysis: ${updateError}`,
          analysis,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("analyze-lead error:", err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
