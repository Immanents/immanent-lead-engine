export const STAGES = ["NEW","QUALIFIED","CONTACTED","INTERESTED","PROPOSAL","WON","LOST","NURTURE","ARCHIVED"];
export const PIPELINE_STAGES = ["NEW","QUALIFIED","CONTACTED","INTERESTED","PROPOSAL","WON"];
export const SOURCES = ["Google Maps","Instagram","Facebook","LinkedIn","Apollo","Referral","Directory","Manual","Other"];
export const CHANNELS = ["Instagram","Email","Manual WhatsApp","LinkedIn"];

export const SCORE_SIGNALS = [
  { key: "no_website", label: "No website", points: 20 },
  { key: "poor_website", label: "Poor / outdated website", points: 15 },
  { key: "strong_social", label: "Strong social presence", points: 15 },
  { key: "clear_services", label: "Clear services", points: 10 },
  { key: "quality_content", label: "Quality images / content", points: 10 },
  { key: "good_reviews", label: "Good reviews", points: 10 },
  { key: "established", label: "Established business", points: 10 },
  { key: "clear_contact", label: "Clear contact information", points: 5 },
  { key: "good_market", label: "Good target market", points: 5 },
];

export const PACKAGES: Record<string, { price: number; timeline: string; scope: string }> = {
  Starter: { price: 150000, timeline: "3–5 working days", scope: "1-page responsive business website, services, gallery, WhatsApp CTA, map, social links, basic SEO, deployment" },
  Business: { price: 250000, timeline: "5–7 working days", scope: "Up to 5 pages, custom UI/UX, contact form, gallery, WhatsApp, map, social integration, basic SEO, deployment, 7-day support" },
  Premium: { price: 400000, timeline: "7–10 working days", scope: "Up to 8 pages, advanced UX, custom sections, booking/request flow, advanced forms, analytics, basic performance optimization, 14-day support" },
};
