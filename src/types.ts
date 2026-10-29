export type LeadStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'PROPOSAL'
  | 'WON'
  | 'LOST'
  | 'NURTURE'
  | 'ARCHIVED'

export type Priority = 'High Priority' | 'Good' | 'Maybe' | 'Low'
export type LeadSource =
  | 'Google Maps'
  | 'Instagram'
  | 'Facebook'
  | 'LinkedIn'
  | 'Apollo'
  | 'Referral'
  | 'Directory'
  | 'Manual'
  | 'Other'
export type WebsiteStatus = 'none' | 'poor' | 'outdated' | 'decent' | 'good'
export type PackageType = 'Starter' | 'Business' | 'Premium'
export type Channel = 'Instagram' | 'Email' | 'WhatsApp' | 'LinkedIn'
export type OutreachStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SENT'
  | 'REPLIED'
  | 'NO_RESPONSE'
export type ProposalStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED'
export type ProjectStatus =
  | 'NOT STARTED'
  | 'IN PROGRESS'
  | 'CLIENT REVIEW'
  | 'COMPLETED'
  | 'ON HOLD'
  | 'CANCELLED'

export interface PersonalizationData {
  business_detail?: string
  relevant_observation?: string
  business_opportunity?: string
  recommended_angle?: string
  evidence_used?: string[]
  personalization_reason?: string
}

export type MessageAngle =
  | 'website_improvement'
  | 'booking_conversion'
  | 'brand_presentation'
  | 'event_experience'
  | 'mobile_experience'
  | 'general_design'

export type MessageTone =
  | 'warm_conversational'
  | 'premium_professional'
  | 'consultative'
  | 'direct_respectful'

export type MessageLength = 'short' | 'medium' | 'detailed'

export interface OutreachGenerationOptions {
  angle: MessageAngle
  tone: MessageTone
  length: MessageLength
  channel: Channel
}

export interface AIAnalysis {
  business_summary: string
  online_presence: string
  website_status: string
  primary_problem: string
  customer_journey: string
  business_opportunity: string
  recommended_solution: string
  recommended_package: PackageType
  suggested_price: number
  lead_score: number
  reason_for_score: string
  suggested_outreach_angle: string
  website_evidence?: string[]
  message_draft?: string
  confidence?: 'high' | 'medium' | 'low'
}

export interface Lead {
  id: string
  business_name: string
  industry: string
  location: string
  description?: string
  website?: string
  website_status?: WebsiteStatus
  instagram?: string
  x_handle?: string
  discord?: string
  telegram?: string
  facebook?: string
  linkedin?: string
  email?: string
  phone?: string
  contact_person?: string
  source: LeadSource
  campaign_id?: string
  lead_score: number
  priority: Priority
  primary_problem?: string
  opportunity?: string
  recommended_package?: PackageType
  suggested_price?: number
  ai_analysis?: AIAnalysis
  ai_pitch?: string
  status: LeadStatus
  created_at: string
  updated_at: string
  last_contacted_at?: string
  next_follow_up_at?: string
  notes?: string
}

export interface Outreach {
  id: string
  lead_id: string
  lead_name: string
  campaign_id?: string
  channel: Channel
  message_type: 'INITIAL' | 'FOLLOW_UP_1' | 'FOLLOW_UP_2' | 'FINAL_FOLLOW_UP'
  content: string
  status: OutreachStatus
  scheduled_at?: string
  sent_at?: string
  created_at: string
}

export interface Campaign {
  id: string
  name: string
  description?: string
  industry: string
  location: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'UPCOMING'
  created_at: string
  total_leads: number
  qualified: number
  contacted: number
  replies: number
  interested: number
  proposals: number
  won: number
  revenue: number
}

export interface Proposal {
  id: string
  lead_id: string
  business_name?: string
  package: PackageType
  price: number
  payment_terms: string
  scope: string
  proposal_message?: string
  status: ProposalStatus
  created_at: string
  sent_at?: string
  accepted_at?: string
}

export interface Client {
  id: string
  lead_id: string
  business_name: string
  contact_person?: string
  project_name: string
  package: PackageType
  project_value: number
  amount_paid: number
  balance: number
  project_status: ProjectStatus
  start_date: string
  deadline: string
  created_at: string
  notes?: string
  testimonial?: string
}

export interface Activity {
  id: string
  lead_id: string
  lead_name: string
  type:
    | 'LEAD_CREATED'
    | 'STATUS_CHANGED'
    | 'OUTREACH_SENT'
    | 'FOLLOW_UP'
    | 'PROPOSAL_SENT'
    | 'PROPOSAL_ACCEPTED'
    | 'CONVERTED'
    | 'AI_ANALYZED'
  description: string
  channel?: Channel
  created_at: string
}
