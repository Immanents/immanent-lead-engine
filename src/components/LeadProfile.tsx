import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Globe,
  AtSign,
  Share2,
  Link2,
  Mail,
  Phone,
  MapPin,
  Zap,
  MessageSquare,
  Edit3,
  Check,
  Copy,
  CheckCheck,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import type { Lead, LeadStatus, Outreach, Channel, PackageType, PersonalizationData, MessageAngle, MessageTone, MessageLength } from '../types'
import { StatusBadge, PriorityBadge, PackageBadge, fmt } from './shared'
import {
  analyzeLeadWithAI,
  updateLeadNotes,
  saveManualAssessment,
  getOutreachByLead,
  createOutreachRecord,
  markOutreachSent,
  logActivity,
  generatePersonalizedOutreach,
} from '../lib/db'
import { supabase } from '../lib/supabase'

const STATUSES: LeadStatus[] = [
  'NEW', 'QUALIFIED', 'CONTACTED', 'INTERESTED', 'PROPOSAL', 'WON', 'LOST', 'NURTURE', 'ARCHIVED',
]

const CHANNELS: { value: Channel; label: string; emoji: string }[] = [
  { value: 'WhatsApp', label: 'WhatsApp', emoji: '💬' },
  { value: 'Email', label: 'Email', emoji: '✉️' },
  { value: 'Instagram', label: 'Instagram DM', emoji: '📷' },
  { value: 'LinkedIn', label: 'LinkedIn', emoji: '💼' },
]

const PACKAGES: { value: PackageType; label: string; price: number }[] = [
  { value: 'Starter', label: 'Starter', price: 150000 },
  { value: 'Business', label: 'Business', price: 250000 },
  { value: 'Premium', label: 'Premium', price: 400000 },
]

const ANGLES: { value: MessageAngle; label: string }[] = [
  { value: 'website_improvement', label: 'Website' },
  { value: 'booking_conversion', label: 'Booking / Conversion' },
  { value: 'brand_presentation', label: 'Brand' },
  { value: 'event_experience', label: 'Events' },
  { value: 'mobile_experience', label: 'Mobile' },
  { value: 'general_design', label: 'General' },
]

const TONES: { value: MessageTone; label: string }[] = [
  { value: 'warm_conversational', label: 'Warm' },
  { value: 'premium_professional', label: 'Premium' },
  { value: 'consultative', label: 'Consultative' },
  { value: 'direct_respectful', label: 'Direct' },
]

const LENGTHS: { value: MessageLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'detailed', label: 'Detailed' },
]

interface LeadProfileProps {
  lead: Lead
  onBack: () => void
  onUpdateStatus: (id: string, status: LeadStatus) => void
  onLeadUpdate?: (lead: Lead) => void
}

const SECTION: React.CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-edge)',
  borderRadius: 8,
  padding: '16px 20px',
}

function Row({ label, value, mono }: { label: string; value?: string | number; mono?: boolean }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-4 py-1.5">
      <span className="text-xs w-32 flex-shrink-0 pt-0.5" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>
        {label}
      </span>
      <span className="text-xs flex-1" style={{ color: 'var(--c-ink-2)', fontFamily: mono ? 'DM Mono, monospace' : 'Inter, sans-serif' }}>
        {value}
      </span>
    </div>
  )
}

function StatusChip({ status }: { status: Outreach['status'] }) {
  const map: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: 'var(--c-surface-2)', color: '#64748b' },
    PENDING_APPROVAL: { bg: 'var(--t-amber-bg)', color: '#f59e0b' },
    APPROVED: { bg: 'var(--t-green-bg)', color: '#10b981' },
    SENT: { bg: 'var(--c-surface)', color: 'var(--c-primary-l)' },
    REPLIED: { bg: 'var(--t-green-bg)', color: 'var(--t-green)' },
    NO_RESPONSE: { bg: 'var(--t-red-bg)', color: '#f43f5e' },
  }
  const s = map[status] ?? map.DRAFT
  return (
    <span
      className="text-xs px-2 py-0.5 rounded"
      style={{ background: s.bg, color: s.color, fontFamily: 'DM Mono, monospace', fontSize: 10 }}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

export default function LeadProfile({ lead, onBack, onUpdateStatus, onLeadUpdate }: LeadProfileProps) {
  // Notes
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)

  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'ai' | 'outreach'>('overview')

  // AI Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [pitchDraft, setPitchDraft] = useState(lead.ai_pitch ?? '')
  const [editingPitch, setEditingPitch] = useState(false)
  const [savingPitch, setSavingPitch] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showManual, setShowManual] = useState(false)

  // Manual assessment state
  const [manualProblem, setManualProblem] = useState(lead.primary_problem ?? '')
  const [manualOpportunity, setManualOpportunity] = useState(lead.opportunity ?? '')
  const [manualSolution, setManualSolution] = useState(lead.ai_analysis?.recommended_solution ?? '')
  const [manualPackage, setManualPackage] = useState<PackageType>(lead.recommended_package ?? 'Starter')
  const [manualPrice, setManualPrice] = useState<number>(lead.suggested_price ?? 150000)
  const [manualScore, setManualScore] = useState<number>(lead.lead_score ?? 0)
  const [manualMessage, setManualMessage] = useState(lead.ai_pitch ?? '')
  const [savingManual, setSavingManual] = useState(false)
  const [manualSaved, setManualSaved] = useState(false)

  // Outreach tab
  const [outreachRecords, setOutreachRecords] = useState<Outreach[]>([])
  const [loadingOutreach, setLoadingOutreach] = useState(false)
  const [channel, setChannel] = useState<Channel>('WhatsApp')
  const [outreachMessage, setOutreachMessage] = useState('')
  const [savingDraft, setSavingDraft] = useState(false)
  const [markingSent, setMarkingSent] = useState<string | null>(null)
  const [outreachError, setOutreachError] = useState<string | null>(null)
  const [copiedOutreach, setCopiedOutreach] = useState<string | null>(null)
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)

  // Personalized generation
  const [outreachAngle, setOutreachAngle] = useState<MessageAngle>('general_design')
  const [outreachTone, setOutreachTone] = useState<MessageTone>('warm_conversational')
  const [outreachLength, setOutreachLength] = useState<MessageLength>('medium')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [personalization, setPersonalization] = useState<PersonalizationData | null>(null)
  const [showWhyMessage, setShowWhyMessage] = useState(false)
  const [limitedEvidence, setLimitedEvidence] = useState(false)

  const hasAI = !!lead.ai_analysis

  // Load outreach records when outreach tab is opened
  useEffect(() => {
    if (activeTab === 'outreach') {
      setLoadingOutreach(true)
      getOutreachByLead(lead.id)
        .then(setOutreachRecords)
        .catch((e) => setOutreachError(e.message))
        .finally(() => setLoadingOutreach(false))
    }
  }, [activeTab, lead.id])

  // Pre-fill outreach message when switching to outreach tab
  useEffect(() => {
    if (activeTab === 'outreach' && !outreachMessage) {
      setOutreachMessage(lead.ai_pitch ?? pitchDraft ?? '')
    }
  }, [activeTab])

  // Keep pitchDraft in sync when lead prop updates (e.g. after analysis)
  useEffect(() => {
    setPitchDraft(lead.ai_pitch ?? '')
  }, [lead.ai_pitch])

  async function runAnalysis() {
    setIsAnalyzing(true)
    setAnalyzeError(null)
    try {
      const updated = await analyzeLeadWithAI(lead)
      setPitchDraft(updated.ai_pitch ?? '')
      onLeadUpdate?.(updated)
      setActiveTab('ai')
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function savePitch() {
    setSavingPitch(true)
    try {
      await supabase.from('leads').update({ ai_pitch: pitchDraft, updated_at: new Date().toISOString() }).eq('id', lead.id)
      onLeadUpdate?.({ ...lead, ai_pitch: pitchDraft })
      setEditingPitch(false)
    } finally {
      setSavingPitch(false)
    }
  }

  function copyPitch() {
    navigator.clipboard.writeText(pitchDraft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveNotes() {
    setSavingNotes(true)
    try {
      await updateLeadNotes(lead.id, notes)
      onLeadUpdate?.({ ...lead, notes })
      setEditingNotes(false)
    } finally {
      setSavingNotes(false)
    }
  }

  async function handleSaveManual() {
    if (manualScore < 0 || manualScore > 100) {
      alert('Lead score must be between 0 and 100.')
      return
    }
    setSavingManual(true)
    try {
      await saveManualAssessment(lead.id, {
        primary_problem: manualProblem || undefined,
        opportunity: manualOpportunity || undefined,
        recommended_package: manualPackage,
        suggested_price: manualPrice,
        lead_score: manualScore,
        ai_pitch: manualMessage || undefined,
      })
      onLeadUpdate?.({
        ...lead,
        primary_problem: manualProblem || lead.primary_problem,
        opportunity: manualOpportunity || lead.opportunity,
        recommended_package: manualPackage,
        suggested_price: manualPrice,
        lead_score: manualScore,
        ai_pitch: manualMessage || lead.ai_pitch,
      })
      if (manualMessage) setPitchDraft(manualMessage)
      setManualSaved(true)
      setTimeout(() => setManualSaved(false), 3000)
    } catch (err) {
      alert('Failed to save: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSavingManual(false)
    }
  }

  async function handleSaveDraft() {
    if (!outreachMessage.trim()) return
    setSavingDraft(true)
    setOutreachError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const record = await createOutreachRecord(user.id, {
        lead_id: lead.id,
        campaign_id: lead.campaign_id,
        channel,
        message_type: 'INITIAL',
        content: outreachMessage.trim(),
        status: 'DRAFT',
      })
      setOutreachRecords((prev) => [{ ...record, lead_name: lead.business_name }, ...prev])
    } catch (err) {
      setOutreachError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingDraft(false)
    }
  }

  async function handleMarkSent(id: string) {
    setMarkingSent(id)
    try {
      await markOutreachSent(id)
      setOutreachRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'SENT', sent_at: new Date().toISOString() } : r))
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await logActivity(user.id, {
          lead_id: lead.id,
          lead_name: lead.business_name,
          type: 'OUTREACH_SENT',
          description: `Outreach sent via ${channel}`,
          channel,
        })
      }
      onLeadUpdate?.({ ...lead, last_contacted_at: new Date().toISOString() })
    } catch (err) {
      setOutreachError(err instanceof Error ? err.message : String(err))
    } finally {
      setMarkingSent(null)
    }
  }

  function copyOutreachRecord(content: string, id: string) {
    navigator.clipboard.writeText(content)
    setCopiedOutreach(id)
    setTimeout(() => setCopiedOutreach(null), 2000)
  }

  async function handleGenerateOutreach() {
    setIsGenerating(true)
    setGenerateError(null)
    setPersonalization(null)
    setShowWhyMessage(false)
    try {
      const { message, personalization: p } = await generatePersonalizedOutreach(lead, {
        angle: outreachAngle,
        tone: outreachTone,
        length: outreachLength,
        channel,
      })
      setOutreachMessage(message)
      setPersonalization(p)
      setLimitedEvidence(!lead.ai_analysis?.website_evidence?.length)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Back + header */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm transition-colors mt-1 flex-shrink-0"
          style={{ color: '#64748b' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--c-ink-2)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#64748b')}
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Leads</span>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold truncate" style={{ color: 'var(--c-ink)', letterSpacing: '-0.02em' }}>
              {lead.business_name}
            </h1>
            <StatusBadge status={lead.status} />
            <PriorityBadge priority={lead.priority} />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm" style={{ color: '#64748b' }}>{lead.industry}</span>
            <span style={{ color: 'var(--c-edge-2)' }}>·</span>
            <span className="text-sm flex items-center gap-1" style={{ color: '#64748b' }}>
              <MapPin size={12} />
              {lead.location}
            </span>
          </div>
        </div>
        {/* Score ring */}
        <div
          className="flex flex-col items-center justify-center rounded-lg px-3 py-2 flex-shrink-0"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)', minWidth: 64 }}
        >
          <span
            className="text-xl font-semibold"
            style={{
              color: lead.lead_score >= 80 ? '#f43f5e' : lead.lead_score >= 60 ? '#10b981' : '#f59e0b',
              fontFamily: 'DM Mono, monospace',
              letterSpacing: '-0.02em',
            }}
          >
            {lead.lead_score}
          </span>
          <span className="text-xs mt-0.5" style={{ color: 'var(--c-ink-3)' }}>Score</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="rounded-lg px-4 py-3 flex flex-wrap items-center gap-2" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}>
        <span className="text-xs" style={{ color: '#64748b', fontFamily: 'DM Mono, monospace' }}>Status:</span>
        <select
          value={lead.status}
          onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
          className="text-xs rounded px-2 py-1 outline-none"
          style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', color: 'var(--c-ink-2)', fontFamily: 'DM Mono, monospace' }}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex-1" />
        {!hasAI && (
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium transition-opacity"
            style={{ background: '#f97316', color: '#fff', opacity: isAnalyzing ? 0.6 : 1 }}
          >
            <Zap size={13} />
            {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
          </button>
        )}
        {hasAI && (
          <>
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors"
              style={{ background: 'var(--c-surface-2)', color: 'var(--c-ink-3)', border: '1px solid var(--c-edge)', opacity: isAnalyzing ? 0.6 : 1 }}
            >
              <RefreshCw size={11} className={isAnalyzing ? 'animate-spin' : ''} />
              Re-analyze
            </button>
            <button
              onClick={() => {
                if (!outreachMessage && lead.ai_pitch) setOutreachMessage(lead.ai_pitch)
                setActiveTab('outreach')
              }}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors"
              style={{ background: 'var(--c-surface-2)', color: 'var(--c-primary-l)', border: '1px solid var(--c-edge)' }}
            >
              <MessageSquare size={13} />
              Generate Outreach
            </button>
          </>
        )}
      </div>

      {/* Analysis error */}
      {analyzeError && (
        <div className="text-xs px-3 py-2 rounded-md flex items-start gap-2" style={{ background: 'var(--t-red-bg)', border: '1px solid var(--t-red-bd)', color: 'var(--t-red)' }}>
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          <span>Analysis failed: {analyzeError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--c-edge)' }}>
        {(['overview', 'ai', 'outreach'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-medium capitalize transition-colors"
            style={{
              color: activeTab === tab ? 'var(--c-ink)' : 'var(--c-ink-3)',
              borderBottom: activeTab === tab ? '2px solid #f97316' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab === 'ai' ? 'AI Analysis' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'ai' && hasAI && (
              <span className="ml-1.5 text-xs px-1 py-0.5 rounded" style={{ background: 'var(--t-orange-bg)', color: 'var(--c-primary-l)', fontFamily: 'DM Mono, monospace' }}>
                Done
              </span>
            )}
            {tab === 'outreach' && outreachRecords.length > 0 && (
              <span className="ml-1.5 text-xs px-1 py-0.5 rounded" style={{ background: 'var(--c-surface-3)', color: '#64748b', fontFamily: 'DM Mono, monospace' }}>
                {outreachRecords.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* Business info */}
          <div style={SECTION}>
            <h3 className="text-xs font-medium mb-3" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>
              Business Information
            </h3>
            <Row label="Industry" value={lead.industry} />
            <Row label="Location" value={lead.location} />
            <Row label="Source" value={lead.source} mono />
            {lead.description && (
              <div className="mt-3">
                <p className="text-xs" style={{ color: '#64748b', lineHeight: 1.6 }}>{lead.description}</p>
              </div>
            )}
          </div>

          {/* Contact info */}
          <div style={SECTION}>
            <h3 className="text-xs font-medium mb-3" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>
              Contact
            </h3>
            {lead.contact_person && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex items-center justify-center rounded-full text-xs font-semibold" style={{ width: 24, height: 24, background: 'var(--c-edge-2)', color: 'var(--c-primary-l)', flexShrink: 0 }}>
                  {lead.contact_person.charAt(0)}
                </div>
                <span className="text-xs" style={{ color: 'var(--c-ink-2)' }}>{lead.contact_person}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2 py-1">
                <Phone size={12} style={{ color: 'var(--c-ink-3)' }} />
                <span className="text-xs" style={{ color: 'var(--c-ink-2)', fontFamily: 'DM Mono, monospace' }}>{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2 py-1">
                <Mail size={12} style={{ color: 'var(--c-ink-3)' }} />
                <span className="text-xs" style={{ color: 'var(--c-ink-2)', fontFamily: 'DM Mono, monospace' }}>{lead.email}</span>
              </div>
            )}
          </div>

          {/* Online presence */}
          <div style={SECTION}>
            <h3 className="text-xs font-medium mb-3" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>
              Online Presence
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe size={13} style={{ color: 'var(--c-ink-3)' }} />
                <span className="text-xs" style={{ color: lead.website_status === 'none' ? '#f43f5e' : 'var(--c-ink-2)', fontFamily: 'DM Mono, monospace' }}>
                  {lead.website || 'nil'}
                </span>
                {lead.website_status && (
                  <span className="text-xs px-1.5 py-0.5 rounded ml-auto" style={{
                    background: 'var(--c-surface-2)',
                    color: lead.website_status === 'none' || lead.website_status === 'poor' ? '#f43f5e' : lead.website_status === 'outdated' ? '#f59e0b' : '#10b981',
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 10,
                  }}>
                    {lead.website_status.toUpperCase()}
                  </span>
                )}
              </div>
              {([
                ['Instagram', lead.instagram, AtSign],
                ['X', lead.x_handle, AtSign],
                ['Discord', lead.discord, Share2],
                ['Telegram', lead.telegram, Share2],
              ] as const).map(([label, val, Icon]) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={13} style={{ color: 'var(--c-ink-3)' }} />
                  <span className="text-xs w-16" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>{label}</span>
                  <span className="text-xs" style={{ color: val ? 'var(--c-ink-2)' : 'var(--c-ink-3)', fontFamily: val ? undefined : 'DM Mono, monospace' }}>{val || 'nil'}</span>
                </div>
              ))}
              {lead.facebook && (
                <div className="flex items-center gap-2">
                  <Share2 size={13} style={{ color: 'var(--c-ink-3)' }} />
                  <span className="text-xs" style={{ color: 'var(--c-ink-2)' }}>{lead.facebook}</span>
                </div>
              )}
              {lead.linkedin && (
                <div className="flex items-center gap-2">
                  <Link2 size={13} style={{ color: 'var(--c-ink-3)' }} />
                  <span className="text-xs" style={{ color: 'var(--c-ink-2)' }}>{lead.linkedin}</span>
                </div>
              )}
            </div>
          </div>

          {/* Opportunity */}
          <div style={SECTION}>
            <h3 className="text-xs font-medium mb-3" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>
              Opportunity
            </h3>
            {lead.recommended_package && (
              <div className="flex items-center gap-2 mb-3">
                <PackageBadge pkg={lead.recommended_package} />
                {lead.suggested_price && (
                  <span className="text-sm font-semibold" style={{ color: '#10b981', fontFamily: 'DM Mono, monospace' }}>
                    {fmt(lead.suggested_price)}
                  </span>
                )}
              </div>
            )}
            {lead.primary_problem && (
              <div className="mb-2">
                <div className="text-xs mb-1" style={{ color: 'var(--c-ink-3)' }}>Problem</div>
                <p className="text-xs" style={{ color: 'var(--c-ink-2)', lineHeight: 1.6 }}>{lead.primary_problem}</p>
              </div>
            )}
            {lead.opportunity && (
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--c-ink-3)' }}>Opportunity</div>
                <p className="text-xs" style={{ color: 'var(--c-ink-2)', lineHeight: 1.6 }}>{lead.opportunity}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div style={SECTION}>
            <h3 className="text-xs font-medium mb-3" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>
              Timeline
            </h3>
            <Row label="Created" value={new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} mono />
            {lead.last_contacted_at && (
              <Row label="Last contact" value={new Date(lead.last_contacted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} mono />
            )}
            {lead.next_follow_up_at && (
              <Row label="Follow-up" value={new Date(lead.next_follow_up_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} mono />
            )}
          </div>

          {/* Notes */}
          <div style={SECTION}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>
                Notes
              </h3>
              <button
                onClick={() => editingNotes ? saveNotes() : setEditingNotes(true)}
                style={{ color: 'var(--c-ink-3)' }}
              >
                {editingNotes ? <Check size={13} /> : <Edit3 size={13} />}
              </button>
            </div>
            {editingNotes ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs rounded p-2 outline-none resize-none"
                rows={4}
                style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', color: 'var(--c-ink-2)', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}
              />
            ) : (
              <p className="text-xs" style={{ color: notes ? 'var(--c-ink-2)' : 'var(--c-ink-3)', lineHeight: 1.6 }}>
                {notes || 'No notes yet. Click the edit icon to add.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── AI ANALYSIS TAB ──────────────────────────────────────── */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          {!hasAI && !isAnalyzing && (
            <div className="rounded-lg flex flex-col items-center justify-center py-12" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}>
              <Zap size={32} style={{ color: 'var(--c-edge-2)' }} />
              <p className="text-sm mt-3 mb-4" style={{ color: 'var(--c-ink-3)' }}>No AI analysis yet</p>
              <div className="flex gap-2">
                <button
                  onClick={runAnalysis}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-md font-medium"
                  style={{ background: '#f97316', color: '#fff' }}
                >
                  <Zap size={13} />
                  Analyze Lead with AI
                </button>
                <button
                  onClick={() => setShowManual(!showManual)}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-md"
                  style={{ background: 'var(--c-surface-2)', color: '#64748b', border: '1px solid var(--c-edge)' }}
                >
                  <Edit3 size={13} />
                  Enter Manually
                </button>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="rounded-lg flex flex-col items-center justify-center py-16" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}>
              <div className="rounded-full animate-spin" style={{ width: 32, height: 32, border: '2px solid var(--c-edge)', borderTopColor: '#f97316' }} />
              <p className="text-sm mt-4" style={{ color: '#64748b' }}>Analyzing {lead.business_name}...</p>
              <p className="text-xs mt-1" style={{ color: 'var(--c-ink-3)' }}>Crawling website and scoring opportunity</p>
            </div>
          )}

          {hasAI && lead.ai_analysis && (
            <div className="grid gap-4 grid-cols-1">
              <div style={SECTION}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xs font-medium" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>
                    AI Analysis
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded" style={{ background: 'var(--t-orange-bg)', color: 'var(--c-primary-l)', fontFamily: 'DM Mono, monospace' }}>
                    <Zap size={10} />
                    Score: {lead.ai_analysis.lead_score}
                  </div>
                  <PackageBadge pkg={lead.ai_analysis.recommended_package} />
                  <span className="font-semibold" style={{ color: '#10b981', fontFamily: 'DM Mono, monospace' }}>
                    {fmt(lead.ai_analysis.suggested_price)}
                  </span>
                  {lead.ai_analysis.confidence && (
                    <span className="text-xs px-2 py-0.5 rounded ml-auto" style={{
                      background: 'var(--c-surface-2)',
                      color: lead.ai_analysis.confidence === 'high' ? '#10b981' : lead.ai_analysis.confidence === 'medium' ? '#f59e0b' : '#f43f5e',
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 10,
                    }}>
                      {lead.ai_analysis.confidence.toUpperCase()} CONFIDENCE
                    </span>
                  )}
                </div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {[
                    ['Business Summary', lead.ai_analysis.business_summary],
                    ['Online Presence', lead.ai_analysis.online_presence],
                    ['Primary Problem', lead.ai_analysis.primary_problem],
                    ['Business Opportunity', lead.ai_analysis.business_opportunity],
                    ['Customer Journey', lead.ai_analysis.customer_journey],
                    ['Recommended Solution', lead.ai_analysis.recommended_solution],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>{label}</div>
                      <p className="text-xs" style={{ color: 'var(--c-ink-2)', lineHeight: 1.6 }}>{value}</p>
                    </div>
                  ))}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="text-xs font-medium mb-1" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>Score Rationale</div>
                    <p className="text-xs" style={{ color: 'var(--c-ink-2)', lineHeight: 1.6 }}>{lead.ai_analysis.reason_for_score}</p>
                  </div>
                  {lead.ai_analysis.website_evidence && lead.ai_analysis.website_evidence.length > 0 && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div className="text-xs font-medium mb-2" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>Website Evidence</div>
                      <ul className="space-y-1">
                        {lead.ai_analysis.website_evidence.map((e, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--c-ink-2)', lineHeight: 1.6 }}>
                            <span style={{ color: 'var(--c-edge-2)', marginTop: 3, flexShrink: 0 }}>▸</span>
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {(lead.ai_pitch || pitchDraft) && (
                <div style={SECTION}>
                  <p className="text-xs mb-4" style={{ color: '#64748b', fontStyle: 'italic', lineHeight: 1.6 }}>
                    <span className="font-medium not-italic" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>Angle: </span>
                    {lead.ai_analysis?.suggested_outreach_angle}
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-medium" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>
                      Message Draft
                    </h3>
                    <div className="flex gap-1.5">
                      <button onClick={copyPitch} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded" style={{ background: 'var(--c-surface-2)', color: copied ? 'var(--t-green)' : '#64748b', border: '1px solid var(--c-edge)' }}>
                        {copied ? <CheckCheck size={11} /> : <Copy size={11} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      {!editingPitch ? (
                        <button onClick={() => setEditingPitch(true)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded" style={{ background: 'var(--c-surface-2)', color: '#64748b', border: '1px solid var(--c-edge)' }}>
                          <Edit3 size={11} />
                          Edit
                        </button>
                      ) : (
                        <button onClick={savePitch} disabled={savingPitch} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium" style={{ background: '#f97316', color: '#fff', opacity: savingPitch ? 0.6 : 1 }}>
                          <Check size={11} />
                          {savingPitch ? 'Saving...' : 'Save'}
                        </button>
                      )}
                    </div>
                  </div>
                  {editingPitch ? (
                    <textarea
                      value={pitchDraft}
                      onChange={(e) => setPitchDraft(e.target.value)}
                      className="w-full rounded p-4 text-sm"
                      style={{ background: 'var(--c-bg)', border: '1px solid #f97316', color: 'var(--c-ink)', lineHeight: 1.7, minHeight: 200, resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                    />
                  ) : (
                    <div className="rounded p-4" style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)' }}>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--c-ink-2)', lineHeight: 1.8 }}>{pitchDraft}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Manual Assessment Section */}
          {(showManual || hasAI) && (
            <div style={SECTION}>
              <button
                onClick={() => setShowManual(!showManual)}
                className="flex items-center justify-between w-full"
              >
                <h3 className="text-xs font-medium" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>
                  Manual Assessment
                </h3>
                <div className="flex items-center gap-2">
                  {manualSaved && (
                    <span className="text-xs flex items-center gap-1" style={{ color: '#10b981' }}>
                      <Check size={10} /> Saved
                    </span>
                  )}
                  {showManual ? <ChevronUp size={13} style={{ color: 'var(--c-ink-3)' }} /> : <ChevronDown size={13} style={{ color: 'var(--c-ink-3)' }} />}
                </div>
              </button>

              {showManual && (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>Primary Problem</label>
                      <textarea
                        value={manualProblem}
                        onChange={(e) => setManualProblem(e.target.value)}
                        rows={3}
                        className="w-full text-xs rounded p-2 outline-none resize-none"
                        style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', color: 'var(--c-ink-2)', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>Business Opportunity</label>
                      <textarea
                        value={manualOpportunity}
                        onChange={(e) => setManualOpportunity(e.target.value)}
                        rows={3}
                        className="w-full text-xs rounded p-2 outline-none resize-none"
                        style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', color: 'var(--c-ink-2)', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>Recommended Solution</label>
                      <textarea
                        value={manualSolution}
                        onChange={(e) => setManualSolution(e.target.value)}
                        rows={2}
                        className="w-full text-xs rounded p-2 outline-none resize-none"
                        style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', color: 'var(--c-ink-2)', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}
                      />
                    </div>
                    <div className="grid gap-3 grid-cols-2">
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>Package</label>
                        <select
                          value={manualPackage}
                          onChange={(e) => {
                            const p = e.target.value as PackageType
                            setManualPackage(p)
                            const pkg = PACKAGES.find((x) => x.value === p)
                            if (pkg) setManualPrice(pkg.price)
                          }}
                          className="w-full text-xs rounded px-2 py-1.5 outline-none"
                          style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', color: 'var(--c-ink-2)', fontFamily: 'DM Mono, monospace' }}
                        >
                          {PACKAGES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>Price (₦)</label>
                        <input
                          type="number"
                          value={manualPrice}
                          onChange={(e) => setManualPrice(Number(e.target.value))}
                          className="w-full text-xs rounded px-2 py-1.5 outline-none"
                          style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', color: 'var(--c-ink-2)', fontFamily: 'DM Mono, monospace' }}
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="text-xs mb-1 block" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>Lead Score (0–100)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={manualScore}
                          onChange={(e) => setManualScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="w-full text-xs rounded px-2 py-1.5 outline-none"
                          style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', color: 'var(--c-ink-2)', fontFamily: 'DM Mono, monospace' }}
                        />
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>Outreach Message</label>
                      <textarea
                        value={manualMessage}
                        onChange={(e) => setManualMessage(e.target.value)}
                        rows={6}
                        className="w-full text-xs rounded p-2 outline-none resize-none"
                        style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', color: 'var(--c-ink-2)', lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveManual}
                    disabled={savingManual}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium"
                    style={{ background: '#f97316', color: '#fff', opacity: savingManual ? 0.6 : 1 }}
                  >
                    <Check size={11} />
                    {savingManual ? 'Saving...' : 'Save Assessment'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── OUTREACH TAB ─────────────────────────────────────────── */}
      {activeTab === 'outreach' && (
        <div className="space-y-4">
          {/* Compose */}
          <div style={SECTION}>
            <h3 className="text-xs font-medium mb-4" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>
              New Message
            </h3>

            {/* Generation Options */}
            <div className="space-y-3 mb-4 p-3 rounded-md" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-edge)' }}>
              {/* Channel */}
              <div>
                <div className="text-xs mb-1.5" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>CHANNEL</div>
                <div className="flex flex-wrap gap-1.5">
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch.value}
                      onClick={() => setChannel(ch.value)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors"
                      style={{
                        background: channel === ch.value ? 'var(--c-edge-2)' : 'var(--c-surface-2)',
                        color: channel === ch.value ? 'var(--c-primary-l)' : 'var(--c-ink-3)',
                        border: channel === ch.value ? '1px solid #f97316' : '1px solid var(--c-edge)',
                      }}
                    >
                      <span>{ch.emoji}</span>{ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Angle */}
              <div>
                <div className="text-xs mb-1.5" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>MESSAGE ANGLE</div>
                <div className="flex flex-wrap gap-1.5">
                  {ANGLES.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setOutreachAngle(a.value)}
                      className="text-xs px-2.5 py-1 rounded-md transition-colors"
                      style={{
                        background: outreachAngle === a.value ? 'var(--c-surface-3)' : 'var(--c-surface-2)',
                        color: outreachAngle === a.value ? 'var(--c-primary-l)' : 'var(--c-ink-3)',
                        border: outreachAngle === a.value ? '1px solid #f97316' : '1px solid var(--c-edge)',
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone + Length */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs mb-1.5" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>TONE</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TONES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setOutreachTone(t.value)}
                        className="text-xs px-2.5 py-1 rounded-md transition-colors"
                        style={{
                          background: outreachTone === t.value ? 'var(--c-surface-3)' : 'var(--c-surface-2)',
                          color: outreachTone === t.value ? 'var(--c-primary-l)' : 'var(--c-ink-3)',
                          border: outreachTone === t.value ? '1px solid #f97316' : '1px solid var(--c-edge)',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-1.5" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>LENGTH</div>
                  <div className="flex gap-1.5">
                    {LENGTHS.map((l) => (
                      <button
                        key={l.value}
                        onClick={() => setOutreachLength(l.value)}
                        className="text-xs px-2.5 py-1 rounded-md transition-colors"
                        style={{
                          background: outreachLength === l.value ? 'var(--c-surface-3)' : 'var(--c-surface-2)',
                          color: outreachLength === l.value ? 'var(--c-primary-l)' : 'var(--c-ink-3)',
                          border: outreachLength === l.value ? '1px solid #f97316' : '1px solid var(--c-edge)',
                        }}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate button */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleGenerateOutreach}
                  disabled={isGenerating || !hasAI}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-opacity"
                  style={{ background: '#f97316', color: '#fff', opacity: isGenerating || !hasAI ? 0.6 : 1 }}
                >
                  <Zap size={11} className={isGenerating ? 'animate-pulse' : ''} />
                  {isGenerating ? 'Generating...' : outreachMessage ? 'Regenerate Message' : 'Generate Message'}
                </button>
                {!hasAI && (
                  <span className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Run AI analysis first to generate</span>
                )}
              </div>

              {generateError && (
                <div className="text-xs flex items-start gap-1.5 mt-1" style={{ color: 'var(--t-red)' }}>
                  <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
                  {generateError}
                </div>
              )}
            </div>

            {/* Personalization Panel */}
            {personalization && (personalization.business_detail || personalization.relevant_observation || personalization.business_opportunity) && (
              <div className="mb-3 rounded-md p-3 space-y-2" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-edge)' }}>
                <div className="text-xs font-medium" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Personalization Used
                </div>
                {limitedEvidence && (
                  <div className="text-xs flex items-center gap-1.5 py-1" style={{ color: '#f59e0b' }}>
                    <AlertCircle size={11} />
                    Limited evidence — no website data. Message uses business details only.
                  </div>
                )}
                {personalization.business_detail && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: 'var(--c-edge-2)', fontFamily: 'DM Mono, monospace' }}>Business detail</div>
                    <p className="text-xs" style={{ color: '#64748b', lineHeight: 1.5 }}>{personalization.business_detail}</p>
                  </div>
                )}
                {personalization.relevant_observation && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: 'var(--c-edge-2)', fontFamily: 'DM Mono, monospace' }}>Website observation</div>
                    <p className="text-xs" style={{ color: '#64748b', lineHeight: 1.5 }}>{personalization.relevant_observation}</p>
                  </div>
                )}
                {personalization.business_opportunity && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: 'var(--c-edge-2)', fontFamily: 'DM Mono, monospace' }}>Opportunity highlighted</div>
                    <p className="text-xs" style={{ color: '#64748b', lineHeight: 1.5 }}>{personalization.business_opportunity}</p>
                  </div>
                )}
                {personalization.evidence_used && personalization.evidence_used.length > 0 && (
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--c-edge-2)', fontFamily: 'DM Mono, monospace' }}>Evidence used</div>
                    <div className="flex flex-wrap gap-1">
                      {personalization.evidence_used.map((e, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--c-surface-3)', color: 'var(--c-primary-l)', border: '1px solid var(--c-edge-2)' }}>{e}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message field */}
            <textarea
              value={outreachMessage}
              onChange={(e) => setOutreachMessage(e.target.value)}
              placeholder={hasAI ? 'Click Generate Message above to create a personalized draft...' : 'Run AI analysis first, then generate a personalized message.'}
              rows={8}
              className="w-full text-sm rounded p-4 outline-none resize-y"
              style={{ background: 'var(--c-bg)', border: '1px solid var(--c-edge)', color: 'var(--c-ink)', lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}
            />

            {/* Why this message? */}
            {personalization?.personalization_reason && (
              <div className="mt-2">
                <button
                  onClick={() => setShowWhyMessage(!showWhyMessage)}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: 'var(--c-ink-3)' }}
                >
                  {showWhyMessage ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  Why this message?
                </button>
                {showWhyMessage && (
                  <div className="mt-2 rounded-md p-3" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-edge)' }}>
                    <p className="text-xs" style={{ color: '#64748b', lineHeight: 1.7 }}>{personalization.personalization_reason}</p>
                    {personalization.recommended_angle && (
                      <p className="text-xs mt-2" style={{ color: 'var(--c-ink-3)', lineHeight: 1.6 }}>
                        <span style={{ color: 'var(--c-edge-2)', fontFamily: 'DM Mono, monospace' }}>Angle: </span>
                        {personalization.recommended_angle}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {outreachError && (
              <div className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--t-red)' }}>
                <AlertCircle size={11} />
                {outreachError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(outreachMessage)
                  setCopiedOutreach('compose')
                  setTimeout(() => setCopiedOutreach(null), 2000)
                }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md"
                style={{ background: 'var(--c-surface-2)', color: copiedOutreach === 'compose' ? 'var(--t-green)' : '#64748b', border: '1px solid var(--c-edge)' }}
              >
                {copiedOutreach === 'compose' ? <CheckCheck size={11} /> : <Copy size={11} />}
                {copiedOutreach === 'compose' ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={savingDraft || !outreachMessage.trim()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md"
                style={{ background: 'var(--c-surface-2)', color: 'var(--c-primary-l)', border: '1px solid var(--c-edge)', opacity: savingDraft || !outreachMessage.trim() ? 0.5 : 1 }}
              >
                <Edit3 size={11} />
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              {lead.phone && channel === 'WhatsApp' && (
                <a
                  href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(outreachMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md"
                  style={{ background: 'var(--c-surface-2)', color: 'var(--t-green)', border: '1px solid var(--c-edge)' }}
                >
                  <Send size={11} />
                  Open WhatsApp
                </a>
              )}
              {lead.email && channel === 'Email' && (
                <a
                  href={`mailto:${lead.email}?body=${encodeURIComponent(outreachMessage)}`}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md"
                  style={{ background: 'var(--c-surface-2)', color: 'var(--c-primary-l)', border: '1px solid var(--c-edge)' }}
                >
                  <Mail size={11} />
                  Open Email
                </a>
              )}
              <div className="flex-1" />
              <p className="hidden sm:block text-xs" style={{ color: 'var(--c-edge-2)' }}>
                Save as draft, then mark as sent after you send it.
              </p>
            </div>
          </div>

          {/* Outreach history */}
          {loadingOutreach ? (
            <div className="flex items-center justify-center py-8">
              <div className="rounded-full animate-spin" style={{ width: 20, height: 20, border: '2px solid var(--c-edge)', borderTopColor: '#f97316' }} />
            </div>
          ) : outreachRecords.length > 0 ? (
            <div style={SECTION}>
              <h3 className="text-xs font-medium mb-3" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'DM Mono, monospace' }}>
                History ({outreachRecords.length})
              </h3>
              <div className="space-y-2">
                {outreachRecords.map((rec) => (
                  <div key={rec.id} className="rounded-md overflow-hidden" style={{ border: '1px solid var(--c-edge)' }}>
                    <div
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                      style={{ background: 'var(--c-bg)' }}
                      onClick={() => setExpandedRecord(expandedRecord === rec.id ? null : rec.id)}
                    >
                      <span className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
                        {CHANNELS.find((c) => c.value === rec.channel)?.emoji}
                      </span>
                      <span className="text-xs font-medium" style={{ color: '#64748b' }}>{rec.channel}</span>
                      <span className="text-xs" style={{ color: 'var(--c-edge-2)' }}>·</span>
                      <span className="text-xs flex-1 truncate" style={{ color: 'var(--c-ink-3)' }}>{rec.content.slice(0, 60)}...</span>
                      <StatusChip status={rec.status} />
                      <span className="text-xs" style={{ color: 'var(--c-edge-2)', fontFamily: 'DM Mono, monospace' }}>
                        {new Date(rec.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      {expandedRecord === rec.id ? <ChevronUp size={12} style={{ color: 'var(--c-ink-3)' }} /> : <ChevronDown size={12} style={{ color: 'var(--c-ink-3)' }} />}
                    </div>
                    {expandedRecord === rec.id && (
                      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--c-edge)', background: 'var(--c-bg)' }}>
                        <p className="text-sm whitespace-pre-wrap mb-3" style={{ color: 'var(--c-ink-2)', lineHeight: 1.8 }}>{rec.content}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyOutreachRecord(rec.content, rec.id)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded"
                            style={{ background: 'var(--c-surface-2)', color: copiedOutreach === rec.id ? 'var(--t-green)' : '#64748b', border: '1px solid var(--c-edge)' }}
                          >
                            {copiedOutreach === rec.id ? <CheckCheck size={10} /> : <Copy size={10} />}
                            {copiedOutreach === rec.id ? 'Copied' : 'Copy'}
                          </button>
                          {rec.status !== 'SENT' && (
                            <button
                              onClick={() => handleMarkSent(rec.id)}
                              disabled={markingSent === rec.id}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium"
                              style={{ background: 'var(--c-surface)', color: 'var(--c-primary-l)', border: '1px solid var(--c-edge)', opacity: markingSent === rec.id ? 0.6 : 1 }}
                            >
                              <Send size={10} />
                              {markingSent === rec.id ? 'Marking...' : 'Mark as Sent'}
                            </button>
                          )}
                          {rec.sent_at && (
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>
                              Sent {new Date(rec.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg flex flex-col items-center justify-center py-8" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}>
              <MessageSquare size={24} style={{ color: 'var(--c-edge-2)' }} />
              <p className="text-xs mt-2" style={{ color: 'var(--c-ink-3)' }}>No outreach saved yet. Compose a message above and save as draft.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
