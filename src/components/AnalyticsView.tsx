import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import type { Lead, Campaign } from '../types'
import { fmt } from './shared'

interface AnalyticsViewProps {
  leads: Lead[]
  campaigns: Campaign[]
}

const FUNNEL_COLORS: Record<string, string> = {
  NEW: 'var(--t-blue)',
  QUALIFIED: 'var(--c-primary-l)',
  CONTACTED: 'var(--t-amber)',
  INTERESTED: 'var(--t-green)',
  PROPOSAL: 'var(--t-blue)',
  WON: '#10b981',
  LOST: 'var(--t-red)',
}

const SOURCE_COLORS = ['#f97316', '#10b981', '#f59e0b', '#f43f5e', '#38bdf8', '#2563eb', 'var(--t-blue)', 'var(--t-green)']

const tooltipStyle = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-edge)',
  borderRadius: 6,
  fontSize: 12,
  color: 'var(--c-ink-2)',
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      className="text-xs font-medium"
      style={{
        color: 'var(--c-ink-3)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontFamily: 'DM Mono, monospace',
        marginBottom: 12,
      }}
    >
      {title}
    </h2>
  )
}

export default function AnalyticsView({ leads, campaigns }: AnalyticsViewProps) {
  const totalLeads = leads.length
  const newLeads = leads.filter((l) => l.status === 'NEW').length
  const qualified = leads.filter((l) => l.status === 'QUALIFIED').length
  const contacted = leads.filter((l) => l.status === 'CONTACTED').length
  const interested = leads.filter((l) => l.status === 'INTERESTED').length
  const wonLeads = leads.filter((l) => l.status === 'WON')
  const wonRevenue = wonLeads.reduce((s, l) => s + (l.suggested_price ?? 0), 0)
  const pipelineValue = leads
    .filter((l) => !['WON', 'LOST', 'ARCHIVED'].includes(l.status))
    .reduce((s, l) => s + (l.suggested_price ?? 0), 0)
  const avgProjectValue = wonLeads.length > 0 ? wonRevenue / wonLeads.length : 0
  const closeRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0
  const proposalLeads = leads.filter((l) => l.status === 'PROPOSAL').length
  const proposalRate = contacted > 0 ? (proposalLeads / contacted) * 100 : 0

  // Funnel data
  const funnelData = [
    { name: 'New', value: newLeads + qualified + contacted + interested + proposalLeads + wonLeads.length },
    { name: 'Qualified', value: qualified + contacted + interested + proposalLeads + wonLeads.length },
    { name: 'Contacted', value: contacted + interested + proposalLeads + wonLeads.length },
    { name: 'Interested', value: interested + proposalLeads + wonLeads.length },
    { name: 'Proposal', value: proposalLeads + wonLeads.length },
    { name: 'Won', value: wonLeads.length },
  ]

  // By source
  const sourceMap: Record<string, number> = {}
  leads.forEach((l) => {
    sourceMap[l.source] = (sourceMap[l.source] ?? 0) + 1
  })
  const sourceData = Object.entries(sourceMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Campaign performance
  const campaignData = campaigns.map((c) => ({
    name: c.name.split(' —')[0],
    leads: c.total_leads,
    qualified: c.qualified,
    interested: c.interested,
    won: c.won,
  }))

  // Revenue by source
  const revenueBySource: Record<string, number> = {}
  wonLeads.forEach((l) => {
    const key = l.source
    revenueBySource[key] = (revenueBySource[key] ?? 0) + (l.suggested_price ?? 0)
  })
  const revenueSourceData = Object.entries(revenueBySource).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--c-ink)', letterSpacing: '-0.02em' }}>
          Analytics
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Revenue and sales performance
        </p>
      </div>

      {/* KPI row */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Leads', value: totalLeads },
          { label: 'Won Revenue', value: fmt(wonRevenue), accent: '#10b981' },
          { label: 'Pipeline Value', value: fmt(pipelineValue), accent: 'var(--c-primary-l)' },
          { label: 'Avg Project Value', value: fmt(Math.round(avgProjectValue)), accent: '#f59e0b' },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-lg px-4 py-3"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
          >
            <div className="text-xs mb-1.5" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>{k.label}</div>
            <div
              className="text-xl font-semibold"
              style={{ color: k.accent ?? 'var(--c-ink)', fontFamily: 'DM Mono, monospace', letterSpacing: '-0.02em' }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Rate row */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Close Rate', value: `${closeRate.toFixed(1)}%` },
          { label: 'Proposal Rate', value: `${proposalRate.toFixed(1)}%` },
          { label: 'Reply Rate', value: `${contacted > 0 ? ((interested / contacted) * 100).toFixed(1) : 0}%` },
          { label: 'Qualified Leads', value: qualified + contacted + interested + proposalLeads },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-lg px-4 py-3"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
          >
            <div className="text-xs mb-1.5" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>{k.label}</div>
            <div
              className="text-xl font-semibold"
              style={{ color: 'var(--c-ink)', fontFamily: 'DM Mono, monospace', letterSpacing: '-0.02em' }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Funnel */}
        <div
          className="rounded-lg px-5 py-4"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
        >
          <SectionHeader title="Sales Funnel" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--c-ink-3)', fontSize: 10, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--c-surface-2)' }} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                {funnelData.map((entry) => (
                  <Cell key={entry.name} fill={FUNNEL_COLORS[entry.name.toUpperCase()] ?? '#f97316'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead source distribution */}
        <div
          className="rounded-lg px-5 py-4"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
        >
          <SectionHeader title="Leads by Source" />
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {sourceData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div
                    className="rounded-sm flex-shrink-0"
                    style={{ width: 8, height: 8, background: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                  />
                  <span className="text-xs flex-1" style={{ color: '#64748b' }}>{s.name}</span>
                  <span className="text-xs" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Campaign performance */}
      <div
        className="rounded-lg px-5 py-4"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
      >
        <SectionHeader title="Campaign Performance" />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={campaignData} margin={{ left: 0, right: 16, top: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--c-ink-3)', fontSize: 10, fontFamily: 'DM Mono, monospace' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--c-surface-2)' }} />
            <Bar dataKey="leads" name="Total Leads" fill="var(--c-edge-2)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="qualified" name="Qualified" fill="#f97316" radius={[3, 3, 0, 0]} />
            <Bar dataKey="interested" name="Interested" fill="var(--t-green)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="won" name="Won" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
