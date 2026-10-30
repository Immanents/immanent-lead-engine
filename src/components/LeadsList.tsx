import { useState } from 'react'
import { Search, Plus, Filter, Upload, ChevronRight, Trash2 } from 'lucide-react'
import type { Lead, LeadStatus, LeadSource } from '../types'
import { StatusBadge, PriorityBadge, ScoreBadge, PackageBadge } from './shared'

interface LeadsListProps {
  leads: Lead[]
  onViewLead: (id: string) => void
  onAddLead: () => void
  onImportCsv: () => void
  onDeleteLead: (id: string) => void
}

const STATUSES: LeadStatus[] = [
  'NEW', 'QUALIFIED', 'CONTACTED', 'INTERESTED', 'PROPOSAL', 'WON', 'LOST', 'NURTURE', 'ARCHIVED',
]

const WEBSITE_LABELS: Record<string, string> = {
  none: 'None',
  poor: 'Poor',
  outdated: 'Outdated',
  decent: 'Decent',
  good: 'Good',
}

export default function LeadsList({ leads, onViewLead, onAddLead, onImportCsv, onDeleteLead }: LeadsListProps) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'ALL'>('ALL')
  const [filterSource, setFilterSource] = useState<LeadSource | 'ALL'>('ALL')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filtered = leads.filter((l) => {
    const matchSearch =
      !search ||
      l.business_name.toLowerCase().includes(search.toLowerCase()) ||
      l.industry.toLowerCase().includes(search.toLowerCase()) ||
      l.location.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'ALL' || l.status === filterStatus
    const matchSource = filterSource === 'ALL' || l.source === filterSource
    return matchSearch && matchStatus && matchSource
  })

  const sources: LeadSource[] = [...new Set(leads.map((l) => l.source))] as LeadSource[]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: 'var(--c-ink)', letterSpacing: '0' }}>
            Leads
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--c-ink-2)' }}>
            {leads.length} total · {leads.filter((l) => !['WON', 'LOST', 'ARCHIVED'].includes(l.status)).length} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onImportCsv}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors"
            style={{ background: 'var(--c-surface-2)', color: 'var(--c-ink-2)', border: '1px solid var(--c-edge)' }}
          >
            <Upload size={13} />
            Import
          </button>
          <button
            onClick={onAddLead}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium transition-colors"
            style={{ background: 'var(--c-primary-l)', color: '#fff' }}
          >
            <Plus size={13} />
            Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-lg px-4 py-3 flex flex-wrap items-center gap-2"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
      >
        <div className="relative flex-1" style={{ minWidth: 160 }}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-ink-3)' }} />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded text-sm outline-none"
            style={{
              background: 'var(--c-surface-2)',
              border: '1px solid var(--c-edge)',
              color: 'var(--c-ink)',

            }}
          />
        </div>
        <Filter size={13} style={{ color: 'var(--c-ink-3)', flexShrink: 0 }} />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as LeadStatus | 'ALL')}
          className="text-sm px-2 py-1.5 rounded outline-none"
          style={{
            background: 'var(--c-surface-2)',
            border: '1px solid var(--c-edge)',
            color: 'var(--c-ink-2)',

            fontSize: 11,
          }}
        >
          <option value="ALL">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as LeadSource | 'ALL')}
          className="text-sm px-2 py-1.5 rounded outline-none"
          style={{
            background: 'var(--c-surface-2)',
            border: '1px solid var(--c-edge)',
            color: 'var(--c-ink-2)',

            fontSize: 11,
          }}
        >
          <option value="ALL">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm rounded-lg" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)', color: 'var(--c-ink-3)' }}>
            No leads match your filters.
          </div>
        )}
        {filtered.map((lead) => (
          <div
            key={lead.id}
            className="rounded-lg px-4 py-3 cursor-pointer"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
            onClick={() => onViewLead(lead.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--c-ink)' }}>
                  {lead.business_name}
                </div>
                <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--c-ink-2)' }}>
                  {lead.industry} · {lead.location}
                </div>
                {lead.contact_person && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--c-ink-3)' }}>{lead.contact_person}</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <StatusBadge status={lead.status} />
                <ScoreBadge score={lead.lead_score} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {lead.recommended_package && <PackageBadge pkg={lead.recommended_package} />}
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--c-surface-2)', color: 'var(--c-ink-2)' }}
                >
                  {lead.source}
                </span>
                <span
                  className="text-xs"
                  style={{
                    color: lead.website_status === 'none' ? 'var(--t-red)' : lead.website_status === 'poor' || lead.website_status === 'outdated' ? 'var(--t-amber)' : 'var(--t-green)',

                  }}
                >
                  {WEBSITE_LABELS[lead.website_status ?? 'none'] ?? '—'}
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                {confirmDeleteId === lead.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { onDeleteLead(lead.id); setConfirmDeleteId(null) }}
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ background: 'var(--t-red-bg)', color: 'var(--t-red)', border: '1px solid var(--t-red-bd)' }}
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ background: 'var(--c-surface-2)', color: 'var(--c-ink-2)', border: '1px solid var(--c-edge)' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(lead.id)}
                    className="p-1 rounded"
                    style={{ color: 'var(--c-ink-3)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div
        className="hidden md:block rounded-lg overflow-x-auto"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
      >
        <table className="w-full" style={{ minWidth: 700 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--c-edge)' }}>
              {['Business', 'Industry / Location', 'Source', 'Website', 'Score', 'Status', 'Package', ''].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium"
                    style={{ color: 'var(--c-ink-3)', letterSpacing: '0.04em' }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onViewLead(lead.id)}
                className="group cursor-pointer transition-colors"
                style={{ borderBottom: '1px solid var(--c-surface-2)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-4 py-3">
                  <div className="text-sm font-medium" style={{ color: 'var(--c-ink)' }}>
                    {lead.business_name}
                  </div>
                  {lead.contact_person && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--c-ink-3)' }}>
                      {lead.contact_person}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs" style={{ color: 'var(--c-ink-2)' }}>{lead.industry}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--c-ink-3)' }}>{lead.location}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--c-surface-2)', color: 'var(--c-ink-2)' }}
                  >
                    {lead.source}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs"
                    style={{
                      color: lead.website_status === 'none' ? 'var(--t-red)' : lead.website_status === 'poor' || lead.website_status === 'outdated' ? 'var(--t-amber)' : 'var(--t-green)',

                    }}
                  >
                    {WEBSITE_LABELS[lead.website_status ?? 'none'] ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3"><ScoreBadge score={lead.lead_score} /></td>
                <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                <td className="px-4 py-3">
                  {lead.recommended_package ? <PackageBadge pkg={lead.recommended_package} /> : <span style={{ color: 'var(--c-edge-2)' }}>—</span>}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  {confirmDeleteId === lead.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { onDeleteLead(lead.id); setConfirmDeleteId(null) }}
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{ background: 'var(--t-red-bg)', color: 'var(--t-red)', border: '1px solid var(--t-red-bd)' }}
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: 'var(--c-surface-2)', color: 'var(--c-ink-2)', border: '1px solid var(--c-edge)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(lead.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                      style={{ color: 'var(--c-ink-3)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t-red)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--c-ink-3)')}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--c-ink-3)' }}>
                  No leads match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
