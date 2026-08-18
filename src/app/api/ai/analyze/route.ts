import { NextResponse } from "next/server";

const ANALYSIS_SYSTEM = `You are a business analyst for a Nigerian web design studio doing outbound client acquisition for small businesses. Given raw lead info, produce a strict JSON object only — no preamble, no markdown fences. If information is unavailable, use the exact string "Unknown / Not available". NEVER invent facts (like specific review counts, revenue, or named competitors) that were not given.
JSON shape:
{
 "business_summary": string,
 "online_presence": string,
 "website_status": string,
 "primary_problem": string,
 "customer_journey": string,
 "business_opportunity": string,
 "recommended_solution": string,
 "recommended_package": "Starter" | "Business" | "Premium",
 "suggested_price": number,
 "reason_for_score": string,
 "suggested_outreach_angle": string,
 "signals": { "no_website": boolean, "poor_website": boolean, "strong_social": boolean, "clear_services": boolean, "quality_content": boolean, "good_reviews": boolean, "established": boolean, "clear_contact": boolean, "good_market": boolean }
}`;

export async function POST(req: Request) {
  const lead = await req.json();
  const prompt = `Analyze this lead:
Business: ${lead.business_name}
Industry: ${lead.industry}
Location: ${lead.location || "Unknown"}
Website: ${lead.website || "None provided"}
Instagram: ${lead.instagram || "None provided"}
Facebook: ${lead.facebook || "None provided"}
LinkedIn: ${lead.linkedin || "None provided"}
Notes: ${lead.notes || "None"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: ANALYSIS_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
  try {
    const parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 502 });
  }
}
