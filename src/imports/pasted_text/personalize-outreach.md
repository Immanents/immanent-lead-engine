Customize the existing Immanent Lead Engine AI outreach feature so that generated messages are highly personalized, evidence-based, and clearly connected to the lead’s actual business and website analysis.

IMPORTANT:
- Preserve the existing Gemini API integration and existing Gemini API key.
- Do not migrate to Anthropic.
- Do not add ANTHROPIC_API_KEY.
- Do not replace, rename, or remove the current Gemini environment variable or Gemini implementation.
- Preserve the existing Supabase architecture and current lead-analysis workflow.
- Do not rebuild unrelated parts of the application.

GOAL:
The outreach generator must not produce generic messages such as:
“I saw your business and think we can improve your website.”

Instead, it must use specific business details and verified findings from the AI analysis.

1. IMPROVE THE OUTREACH GENERATION PROMPT

Update the existing Gemini outreach-generation prompt to use these inputs:

- Business name
- Business category
- Business location
- Website URL
- Business summary
- Online presence
- Primary problem
- Business opportunity
- Customer journey
- Recommended solution
- Score rationale
- Website evidence
- Suggested outreach angle
- Recommended package
- Estimated project value
- Confidence level

The prompt must instruct Gemini to:

- Mention at least one specific business detail.
- Reference one concrete website observation when available.
- Connect the observation to a realistic business or customer-experience opportunity.
- Explain how Immanent Studio can help without sounding like a generic sales pitch.
- Avoid inventing facts.
- Avoid claiming that an issue is confirmed if the evidence only suggests it.
- Use cautious language such as “I noticed,” “it appears,” or “there may be an opportunity” when appropriate.
- Avoid exaggerated claims such as “premier,” “world-class,” “guaranteed,” or “industry-leading” unless those claims are explicitly supported.
- Avoid listing every AI finding in one message.
- Select only the two or three most relevant findings.
- Keep the message natural and human.
- Avoid sounding like an automated audit.
- Avoid insulting or embarrassing the prospect.
- Use a low-pressure call to action.
- Never mention the AI, Gemini, lead score, confidence score, internal analysis, or estimated project price unless explicitly requested.

2. ADD STRUCTURED PERSONALIZATION DATA

Extend the AI analysis response with a structured object such as:

personalization:
{
  business_detail: string,
  relevant_observation: string,
  business_opportunity: string,
  recommended_angle: string,
  evidence_used: string[],
  personalization_reason: string
}

Keep the existing AI analysis fields working. Make these new fields optional for backward compatibility.

3. ADD OUTREACH GENERATION OPTIONS

In the Outreach tab, add controls for:

Message angle:
- Website improvement
- Booking/conversion improvement
- Brand presentation
- Event/customer experience
- Mobile experience
- General design opportunity

Tone:
- Warm and conversational
- Premium and professional
- Consultative
- Direct and respectful

Length:
- Short
- Medium
- Detailed

Channel:
- WhatsApp
- Email
- Instagram
- LinkedIn

When the user changes these options and clicks Generate or Regenerate, send the selected options to the existing Gemini Edge Function.

4. ADD A PERSONALIZATION EVIDENCE PANEL

Beside or above the generated draft, display a section titled:

“Personalization used”

Show:

- Business detail
- Website observation
- Business opportunity
- Recommended angle
- Evidence used

Use clean visual cards or chips.

Example:

Business detail:
“Combines fine dining, live entertainment, and nightlife.”

Website observation:
“Event listings may contain inconsistent date information.”

Business opportunity:
“Make event discovery and VIP table reservations easier.”

Do not display raw technical field names such as svgScore, svgCopy, or svgEdit as text. Use the existing icon system correctly.

5. ADD A “WHY THIS MESSAGE?” SECTION

Add a collapsible section under the draft titled:

“Why this message?”

Display a short explanation of:

- Why the opening was selected.
- Which business-specific detail was used.
- Which website observation was used.
- How the opportunity connects to the proposed service.
- Why the call to action was chosen.

This explanation must be generated from structured personalization data and must not expose internal prompts or API details.

6. ADD SENTENCE-LEVEL EVIDENCE CONNECTIONS IF PRACTICAL

If the existing UI architecture supports it, display small evidence labels below relevant paragraphs or sentences, for example:

Based on: Website evidence

Based on: Business opportunity

If sentence-level mapping would require major restructuring, use the broader “Personalization used” panel instead.

7. IMPROVE THE GENERATED MESSAGE FORMAT

The generated outreach should generally follow this structure:

- Natural greeting.
- Specific observation about the business.
- Specific and cautious website or customer-experience observation.
- Relevant opportunity.
- Brief explanation of how Immanent Studio can help.
- Low-pressure call to action.

The message must not always use the same wording or the same opening sentence.

Create variation while keeping the message grounded in the actual analysis.

8. VALIDATION AND FALLBACKS

If website evidence is missing:

- Do not invent a website problem.
- Use only verified business details and opportunities.
- Clearly mark the message as having limited evidence.
- Suggest that the user manually add an observation before sending.

If the AI analysis is incomplete:

- Allow the user to edit the personalization fields manually.
- Keep the existing manual assessment fallback working.

If Gemini returns malformed structured data:

- Safely parse the response.
- Preserve the existing message draft if available.
- Show a friendly error state.
- Do not break the Outreach tab.

9. TEST WITH THE LIBRARY LAGOS EXAMPLE

Use the existing The Library Lagos analysis to verify that the generated message references relevant details such as:

- Dinner and live entertainment positioning.
- Study Nights or nightlife experience.
- Event listing presentation.
- VIP/table-booking opportunity.

The final result should feel researched and specific, not like a generic website-design pitch.

After implementation, show a clear summary of the files changed and confirm that the existing Gemini API integration was preserved.