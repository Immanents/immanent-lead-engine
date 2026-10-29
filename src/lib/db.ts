import { supabase } from './supabase'
import { isMissingRpcError } from './supabaseErrors'
import type { Lead, Campaign, Outreach, Proposal, Client, Activity, LeadStatus, OutreachGenerationOptions, PersonalizationData } from '../types'

// ── Leads ──────────────────────────────────────────────────────

export async function getLeads(userId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Lead[]
}

export async function createLead(
  userId: string,
  lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...lead, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as Lead
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const { error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteLead(id: string) {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

export async function updateLeadNotes(id: string, notes: string) {
  const { error } = await supabase
    .from('leads')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function bulkInsertLeads(userId: string, leads: Omit<Lead, 'id' | 'created_at' | 'updated_at'>[]) {
  const rows = leads.map((l) => ({ ...l, user_id: userId }))
  const { data, error } = await supabase.from('leads').insert(rows).select()
  if (error) throw error
  return data as Lead[]
}

// ── Campaigns ──────────────────────────────────────────────────

export async function getCampaigns(userId: string) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Campaign[]
}

export async function createCampaign(userId: string, campaign: Omit<Campaign, 'id' | 'created_at' | 'total_leads' | 'qualified' | 'contacted' | 'replies' | 'interested' | 'proposals' | 'won' | 'revenue'>) {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ ...campaign, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as Campaign
}

export async function createProposal(
  userId: string,
  proposal: Omit<Proposal, 'id' | 'created_at' | 'sent_at' | 'accepted_at' | 'business_name'>
) {
  const { data, error } = await supabase
    .from('proposals')
    .insert({ ...proposal, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as Proposal
}

// ── Outreach ───────────────────────────────────────────────────

export async function getOutreach(userId: string) {
  const { data, error } = await supabase
    .from('outreach')
    .select('*, leads(business_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    lead_name: row.leads?.business_name ?? '',
  })) as Outreach[]
}

export async function approveOutreach(id: string) {
  const { error } = await supabase
    .from('outreach')
    .update({ status: 'SENT', sent_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function rejectOutreach(id: string) {
  const { error } = await supabase.from('outreach').delete().eq('id', id)
  if (error) throw error
}

// ── Proposals ──────────────────────────────────────────────────

export async function getProposals(userId: string) {
  const { data, error } = await supabase
    .from('proposals')
    .select('*, leads(business_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    business_name: row.leads?.business_name ?? '',
  })) as Proposal[]
}

export async function updateProposalStatus(
  id: string,
  status: Proposal['status'],
) {
  const updates: Record<string, any> = {
    status,
  }

  if (status === 'SENT') {
    updates.sent_at = new Date().toISOString()
  }

  if (status === 'ACCEPTED') {
    updates.accepted_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('proposals')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

// ── Clients ────────────────────────────────────────────────────

export async function getClients(userId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Client[]
}

// ── Activities ─────────────────────────────────────────────────

export async function getActivities(userId: string) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data as Activity[]
}

export async function logActivity(
  userId: string,
  activity: Omit<Activity, 'id' | 'created_at'>
) {
  const { error } = await supabase.from('activities').insert({ ...activity, user_id: userId })
  if (error) console.error('Activity log error:', error)
}

// ── AI Analysis ────────────────────────────────────────────────

export async function analyzeLeadWithAI(lead: Lead): Promise<Lead> {
  const { data, error } = await supabase.functions.invoke('analyze-lead', {
    body: { lead },
  })
  if (error) {
    // Try to extract the real error message from the response body
    let message = error.message
    try {
      const body = await (error as any).context?.json?.()
      if (body?.error) message = body.error
    } catch { /* ignore parse errors */ }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)

  // Edge Function has already saved the result; fetch the updated lead
  const { data: updated, error: fetchError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', lead.id)
    .single()
  if (fetchError) throw fetchError
  return updated as Lead
}

export async function generatePersonalizedOutreach(
  lead: Lead,
  options: OutreachGenerationOptions
): Promise<{ message: string; personalization: PersonalizationData }> {
  const { data, error } = await supabase.functions.invoke('analyze-lead', {
    body: { lead, action: 'generate_outreach', options },
  })
  if (error) {
    let message = error.message
    try {
      const body = await (error as any).context?.json?.()
      if (body?.error) message = body.error
    } catch { /* ignore */ }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return { message: data.message ?? '', personalization: data.personalization ?? {} }
}

export async function saveManualAssessment(
  leadId: string,
  fields: {
    primary_problem?: string
    opportunity?: string
    recommended_package?: import('../types').PackageType
    suggested_price?: number
    lead_score?: number
    ai_pitch?: string
    notes?: string
  }
) {
  const { error } = await supabase
    .from('leads')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', leadId)
  if (error) throw error
}

export async function getOutreachByLead(leadId: string) {
  const { data, error } = await supabase
    .from('outreach')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Outreach[]
}

export async function createOutreachRecord(
  userId: string,
  record: Omit<Outreach, 'id' | 'created_at' | 'lead_name' | 'sent_at'>
) {
  const { data, error } = await supabase
    .from('outreach')
    .insert({ ...record, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as Outreach
}

export async function markOutreachSent(id: string) {
  const { error } = await supabase
    .from('outreach')
    .update({ status: 'SENT', sent_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ── Profiles ───────────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string
  email?: string | null
  role: 'admin' | 'sub'
  created_at?: string
  last_seen_at?: string | null
}

const VISIBLE_PROFILE_FIELDS = 'id, full_name, role, last_seen_at'

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function getAllProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data as Profile[]
}

export async function updateProfileName(userId: string, fullName: string) {
  const { data, error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId).select().single()
  if (error) throw error
  return data as Profile
}

export async function getAdminProfile() {
  const { data, error } = await supabase.rpc('get_admin_contact')
  if (!error) return ((data as Profile[] | null)?.[0] ?? null) as Profile | null
  if (!isMissingRpcError(error, 'get_admin_contact')) throw error

  // Rollout compatibility only while the hardening RPC is absent. Existing RLS
  // still decides whether this explicitly limited projection is visible.
  const { data: legacy, error: legacyError } = await supabase
    .from('profiles')
    .select(VISIBLE_PROFILE_FIELDS)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle()
  if (legacyError) throw legacyError
  return legacy as Profile | null
}

export async function getVisibleProfile(userId: string) {
  const { data, error } = await supabase.rpc('get_visible_profile', { profile_id: userId })
  if (!error) return ((data as Profile[] | null)?.[0] ?? null) as Profile | null
  throw error
}

// ── Messages ───────────────────────────────────────────────────

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  created_at: string
  read_at: string | null
  delivered_at?: string | null
}

export async function getMessages() {
  const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data as Message[]
}

export async function sendMessage(senderId: string, recipientId: string, body: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, body: body.trim() })
    .select()
    .single()
  if (error) throw error
  return data as Message
}

export async function markMessagesRead(fromId: string, myId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', fromId)
    .eq('recipient_id', myId)
    .is('read_at', null)
  if (error) throw error
}

export async function touchPresence(userId: string) {
  await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId)
}

export async function markMessagesDelivered(myId: string) {
  await supabase
    .from('messages')
    .update({ delivered_at: new Date().toISOString() })
    .eq('recipient_id', myId)
    .is('delivered_at', null)
}

// ── Teams ──────────────────────────────────────────────────────

export interface Team {
  id: string
  name: string
  leader_id: string
  created_at: string
}

export interface TeamMember {
  team_id: string
  user_id: string
  added_at: string
  last_read_at: string | null
  last_delivered_at?: string | null
}

export interface TeamMessage {
  id: string
  team_id: string
  sender_id: string
  body: string
  created_at: string
}

export async function getMyTeams() {
  const { data, error } = await supabase.from('teams').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data as Team[]
}

export async function createTeam(name: string) {
  const { data, error } = await supabase.rpc('create_team', { team_name: name })
  if (error) throw error
  return data as Team
}

export async function addTeamMember(teamId: string, email: string) {
  const { error } = await supabase.rpc('add_team_member', { tid: teamId, member_email: email })
  if (error) throw error
}

export async function getTeamMembers(teamId: string) {
  const { data, error } = await supabase.from('team_members').select('*').eq('team_id', teamId).order('added_at', { ascending: true })
  if (error) throw error
  const members = data as TeamMember[]
  const { data: profs, error: pErr } = await supabase.rpc('get_team_member_profiles', { tid: teamId })
  let profiles = profs as Profile[] | null
  if (pErr) {
    if (!isMissingRpcError(pErr, 'get_team_member_profiles')) throw pErr

    // Rollout compatibility only while the RPC is absent. Legacy RLS continues
    // to authorize rows and the projection excludes email and profile metadata.
    const ids = members.map((m) => m.user_id)
    const { data: legacy, error: legacyError } = await supabase
      .from('profiles')
      .select(VISIBLE_PROFILE_FIELDS)
      .in('id', ids)
    if (legacyError) throw legacyError
    profiles = legacy as Profile[]
  }
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
  return members.map((m) => ({ ...m, profile: byId.get(m.user_id) ?? null }))
}

export async function removeTeamMember(teamId: string, userId: string) {
  const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId)
  if (error) throw error
}

export async function deleteTeam(teamId: string) {
  const { error } = await supabase.from('teams').delete().eq('id', teamId)
  if (error) throw error
}

export async function getTeamMessages(teamId: string) {
  const { data, error } = await supabase
    .from('team_messages')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data as TeamMessage[]).reverse()
}

export async function sendTeamMessage(teamId: string, senderId: string, body: string) {
  const { data, error } = await supabase
    .from('team_messages')
    .insert({ team_id: teamId, sender_id: senderId, body: body.trim() })
    .select()
    .single()
  if (error) throw error
  return data as TeamMessage
}

export async function markTeamRead(teamId: string, userId: string) {
  const { error } = await supabase
    .from('team_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function markTeamDelivered() {
  const { error } = await supabase.rpc('mark_team_delivered')
  if (error) throw error
}

export async function getTeamUnread() {
  const { data, error } = await supabase.rpc('team_unread_count')
  if (error) throw error
  return (data as number) ?? 0
}
