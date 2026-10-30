import { TrendingUp, Users, Star, Briefcase, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import type { Lead, Activity, Outreach } from '../types'
import { statusColor, priorityDot } from './shared'

interface DashboardProps {
  leads: Lead[]
  activities: Activity[]
  pendingOutreach: Outreach[]
  onViewLead: (id: string) => void
  onNavigate: (view: string) => void
  userName?: string
}

const PIPELINE_STAGES = ['NEW', 'QUALIFIED', 'CONTACTED', 'INTERESTED', 'PROPOSAL', 'WON', 'LOST'] as const

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div
      className="rounded-lg px-5 py-4"
      style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
    >
      <div className="text-xs mb-2" style={{ color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div
        className="text-2xl font-semibold"
        style={{ color: accent ?? 'var(--c-ink)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0' }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: 'var(--c-ink-2)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  LEAD_CREATED: Users,
  STATUS_CHANGED: ArrowRight,
  OUTREACH_SENT: CheckCircle,
  FOLLOW_UP: Clock,
  PROPOSAL_SENT: AlertCircle,
  PROPOSAL_ACCEPTED: Star,
  CONVERTED: TrendingUp,
  AI_ANALYZED: Star,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function Dashboard({ leads, activities, pendingOutreach, onViewLead, onNavigate, userName }: DashboardProps) {
  const wonLeads = leads.filter((l) => l.status === 'WON')
  const wonRevenue = wonLeads.reduce((s, l) => s + (l.suggested_price ?? 0), 0)
  const pipelineValue = leads
    .filter((l) => !['WON', 'LOST', 'ARCHIVED'].includes(l.status))
    .reduce((s, l) => s + (l.suggested_price ?? 0), 0)
  const activeLeads = leads.filter((l) => !['WON', 'LOST', 'ARCHIVED'].includes(l.status))

  const followUpsDue = leads.filter((l) => {
    if (!l.next_follow_up_at) return false
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999)
    return new Date(l.next_follow_up_at) <= endOfToday
  })

  const highPriority = leads.filter(
    (l) => l.priority === 'High Priority' && !['WON', 'LOST', 'ARCHIVED'].includes(l.status)
  )

  const pendingProposal = leads.filter((l) => l.status === 'PROPOSAL')

  const countByStatus = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s, leads.filter((l) => l.status === s).length])
  )

  const fmt = (n: number) =>
    n >= 1000000 ? `₦${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `₦${(n / 1000).toFixed(0)}k` : `₦${n}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-medium" style={{ color: 'var(--c-ink)', letterSpacing: '0' }}>
          {userName ? `Welcome back, ${userName.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--c-ink-2)' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — What should you do today?
        </p>
      </div>

      {/* Revenue stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pipeline Value" value={fmt(pipelineValue)} sub={`${activeLeads.length} active leads`} />
        <StatCard label="Won Revenue" value={fmt(wonRevenue)} sub={`${wonLeads.length} clients won`} accent="var(--t-green)" />
        <StatCard label="Active Leads" value={activeLeads.length} sub="In pipeline" />
        <StatCard label="Clients" value={wonLeads.length} sub="All time" accent="var(--c-primary-l)" />
      </div>

      {/* Lead metrics row */}
      <div
        className="rounded-lg"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)', overflow: 'hidden' }}
      >
        <div className="text-xs font-medium px-5 pt-4 pb-3" style={{ color: 'var(--c-ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Lead Funnel
        </div>
        <div
          style={{ overflowX: 'auto', paddingBottom: 16, paddingInline: 20 }}
        >
        <div className="flex items-center gap-0" style={{ minWidth: 420 }}>
          {PIPELINE_STAGES.map((stage, i) => {
            const count = countByStatus[stage] ?? 0
            const isLast = i === PIPELINE_STAGES.length - 1
            return (
              <div key={stage} className="flex items-center gap-0 flex-1">
                <div className="flex-1 text-center">
                  <div
                    className="text-lg font-semibold"
                    style={{
                      color: stage === 'WON' ? 'var(--t-green)' : stage === 'LOST' ? 'var(--t-red)' : 'var(--c-ink)',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '0',
                    }}
                  >
                    {count}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--c-ink-3)' }}>
                    {stage}
                  </div>
                </div>
                {!isLast && (
                  <div style={{ color: 'var(--c-edge-2)', flexShrink: 0 }}>→</div>
                )}
              </div>
            )
          })}
        </div>
        </div>
      </div>

      {/* Today's actions + Recent activity */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Today's actions */}
        <div
          className="rounded-lg"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--c-edge)' }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--c-ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Today's Actions
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--c-surface-2)' }}>
            {/* Follow-ups due */}
            <div className="px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--t-amber)' }}>
                  <Clock size={12} />
                  Follow-ups Due ({followUpsDue.length})
                </span>
              </div>
              {followUpsDue.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--c-ink-3)' }}>No follow-ups due today</p>
              ) : (
                followUpsDue.map((l) => (
                  <button
                    key={l.id}
                    className="w-full text-left py-1.5 flex items-center gap-2 group"
                    onClick={() => onViewLead(l.id)}
                  >
                    <span className="text-xs" style={{ color: 'var(--c-ink-2)' }}>
                      {l.business_name}
                    </span>
                    <span className="ml-auto text-xs" style={{ color: 'var(--c-ink-3)' }}>
                      {statusColor(l.status)}
                    </span>
                  </button>
                ))
              )}
            </div>
            {/* Pending approvals */}
            <div className="px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--c-primary-l)' }}>
                  <CheckCircle size={12} />
                  Messages Awaiting Approval ({pendingOutreach.length})
                </span>
              </div>
              {pendingOutreach.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--c-ink-3)' }}>No messages pending</p>
              ) : (
                pendingOutreach.map((o) => (
                  <button
                    key={o.id}
                    className="w-full text-left py-1.5 flex items-center gap-2"
                    onClick={() => onNavigate('outreach')}
                  >
                    <span className="text-xs" style={{ color: 'var(--c-ink-2)' }}>{o.lead_name}</span>
                    <span
                      className="ml-auto text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--c-surface-3)', color: 'var(--c-primary-l)' }}
                    >
                      {o.channel}
                    </span>
                  </button>
                ))
              )}
            </div>
            {/* High priority leads */}
            <div className="px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--t-red)' }}>
                  <Star size={12} />
                  High Priority Leads ({highPriority.length})
                </span>
              </div>
              {highPriority.slice(0, 3).map((l) => (
                <button
                  key={l.id}
                  className="w-full text-left py-1.5 flex items-center gap-2"
                  onClick={() => onViewLead(l.id)}
                >
                  <span className="text-xs" style={{ color: 'var(--c-ink-2)' }}>{l.business_name}</span>
                  <span
                    className="ml-auto text-xs font-mono"
                    style={{ color: 'var(--t-red)' }}
                  >
                    {l.lead_score}
                  </span>
                </button>
              ))}
            </div>
            {/* Pending proposals */}
            <div className="px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--c-primary-l)' }}>
                  <AlertCircle size={12} />
                  Pending Proposals ({pendingProposal.length})
                </span>
              </div>
              {pendingProposal.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--c-ink-3)' }}>No pending proposals</p>
              ) : (
                pendingProposal.map((l) => (
                  <button
                    key={l.id}
                    className="w-full text-left py-1.5 flex items-center gap-2"
                    onClick={() => onViewLead(l.id)}
                  >
                    <span className="text-xs" style={{ color: 'var(--c-ink-2)' }}>{l.business_name}</span>
                    <span className="ml-auto text-xs" style={{ color: 'var(--c-ink-2)' }}>
                      {l.recommended_package}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="rounded-lg"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
        >
          <div
            className="px-5 py-3"
            style={{ borderBottom: '1px solid var(--c-edge)' }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--c-ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Recent Activity
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--c-surface-2)' }}>
            {activities.slice(0, 7).map((a) => {
              const Icon = ACTIVITY_ICONS[a.type] ?? ArrowRight
              return (
                <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                  <div
                    className="flex-shrink-0 rounded flex items-center justify-center mt-0.5"
                    style={{ width: 24, height: 24, background: 'var(--c-surface-2)' }}
                  >
                    <Icon size={12} color="var(--c-ink-2)" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: 'var(--c-ink-2)' }}>
                      <span style={{ color: 'var(--c-ink)' }}>{a.lead_name}</span>
                      {' — '}
                      {a.description}
                    </p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--c-ink-3)' }}>
                    {timeAgo(a.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
