export type Lead = {
  id: string; owner_id?: string; business_name: string; industry: string; location: string | null;
  description: string | null; website: string | null; website_status: string | null;
  instagram: string | null; facebook: string | null; linkedin: string | null; email: string | null;
  phone: string | null; contact_person: string | null; source: string; campaign_id: string | null;
  lead_score: number; priority: string; signals: Record<string, boolean>;
  primary_problem: string | null; opportunity: string | null; recommended_package: string | null;
  suggested_price: number | null; ai_analysis: any; ai_pitch: string | null; status: string;
  created_at: string; updated_at: string; last_contacted_at: string | null; next_follow_up_at: string | null;
  notes: string | null;
};
export type Activity = { id: string; lead_id: string; type: string; description: string; channel: string | null; created_at: string; };
export type Outreach = { id: string; lead_id: string; campaign_id: string | null; channel: string; message_type: string; subject: string | null; content: string; status: string; scheduled_at: string | null; sent_at: string | null; created_at: string; };
export type Campaign = { id: string; name: string; description: string | null; industry: string | null; location: string | null; status: string; created_at: string; };
export type Proposal = { id: string; lead_id: string; package: string; price: number; payment_terms: string; scope: string; status: string; created_at: string; sent_at: string | null; accepted_at: string | null; };
export type Client = { id: string; lead_id: string | null; business_name: string; contact_person: string | null; project_name: string; package: string | null; project_value: number; amount_paid: number; balance: number; project_status: string; start_date: string | null; deadline: string | null; project_link: string | null; notes: string | null; testimonial: string | null; case_study: string | null; created_at: string; };
export type Settings = { owner_id: string; studio_name: string; follow_up_days: number[]; };
