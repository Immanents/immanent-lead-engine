import { NextResponse } from "next/server";

const OUTREACH_SYSTEM = `You write short, specific, human, non-generic outreach messages for a Nigerian web design studio (Immanent Studio) contacting small business owners cold. Structure: (1) a personal observation about their specific business, (2) the problem/opportunity, (3) what Immanent can help with, (4) a low-friction call to action. Avoid mass-message language ("Dear business owner", "I hope this finds you well", generic flattery). Keep it under 120 words. Match tone to the channel. Return strict JSON only, no markdown fences: {"subject": string or null, "message": string}`;

export async function POST(req: Request) {
  const { lead, channel } = await req.json();
  const prompt = `Business: ${lead.business_name}
Industry: ${lead.industry}
Location: ${lead.location || "Unknown"}
Website status: ${lead.ai_analysis?.website_status || lead.website || "Unknown"}
Social presence: IG ${lead.instagram || "none"} FB ${lead.facebook || "none"}
Primary problem: ${lead.primary_problem || "Unknown"}
Opportunity: ${lead.opportunity || "Unknown"}
Recommended offer: ${lead.recommended_package || "a new website"} at ₦${Number(lead.suggested_price || 0).toLocaleString()}
Outreach angle: ${lead.ai_analysis?.suggested_outreach_angle || ""}
Channel: ${channel}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: OUTREACH_SYSTEM,
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
