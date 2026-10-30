import { useState } from 'react'
import { Plus, TrendingUp, Megaphone } from 'lucide-react'
import type { Campaign } from '../types'
import { fmt } from './shared'
import NewCampaignModal from './NewCampaignModal'

interface CampaignsViewProps {
  campaigns: Campaign[]
  onAdd: (campaign: Omit<Campaign, 'id' | 'created_at' | 'total_leads' | 'qualified' | 'contacted' | 'replies' | 'interested' | 'proposals' | 'won' | 'revenue'>) => Promise<void>
}

const STATUS_META: Record<Campaign['status'], { color: string; bg: string }> = {
  ACTIVE: { color: 'var(--t-green)', bg: 'var(--t-green-bg)' },
  PAUSED: { color: 'var(--t-amber)', bg: 'var(--t-amber-bg)' },
  COMPLETED: { color: 'var(--c-primary-l)', bg: 'var(--t-orange-bg)' },
  UPCOMING: { color: 'var(--t-blue)', bg: 'var(--t-blue-bg)' },
}

function MetricCell({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="text-center">
      <div
        className="text-base font-semibold"
        style={{ color: accent ?? 'var(--c-ink)', letterSpacing: '0' }}
      >
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--c-ink-3)' }}>{label}</div>
    </div>
  )
}

export default function CampaignsView({ campaigns, onAdd }: CampaignsViewProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="space-y-4">
      {showModal && <NewCampaignModal onClose={() => setShowModal(false)} onAdd={onAdd} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: 'var(--c-ink)', letterSpacing: '0' }}>
            Campaigns
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--c-ink-2)' }}>
            Organised lead acquisition campaigns
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: 'var(--c-primary-l)', color: '#fff' }}
        >
          <Plus size={13} />
          New Campaign
        </button>
      </div>

      {campaigns.length === 0 && (
        <div
          className="rounded-lg flex flex-col items-center justify-center py-20 gap-3"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
        >
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 48, height: 48, background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)' }}
          >
            <Megaphone size={22} style={{ color: 'var(--c-ink-3)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--c-ink-2)' }}>No campaigns yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--c-ink-3)' }}>
              Create a campaign to group and track leads by outreach effort
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {campaigns.map((c) => {
          const meta = STATUS_META[c.status]
          const convRate = c.total_leads > 0 ? ((c.won / c.total_leads) * 100).toFixed(1) : '0.0'
          return (
            <div
              key={c.id}
              className="rounded-lg overflow-hidden"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
            >
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--c-edge)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--c-ink)', letterSpacing: '-0.01em' }}>
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs" style={{ color: 'var(--c-ink-2)' }}>{c.industry}</span>
                      <span style={{ color: 'var(--c-edge-2)' }}>·</span>
                      <span className="text-xs" style={{ color: 'var(--c-ink-2)' }}>{c.location}</span>
                    </div>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {c.status}
                  </span>
                </div>
                {c.description && (
                  <p className="text-xs mt-2" style={{ color: 'var(--c-ink-3)', lineHeight: 1.6 }}>
                    {c.description}
                  </p>
                )}
              </div>

              {/* Metrics */}
              <div
                className="grid px-5 py-4"
                style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}
              >
                <MetricCell label="Leads" value={c.total_leads} />
                <MetricCell label="Qualified" value={c.qualified} accent="var(--c-primary-l)" />
                <MetricCell label="Contacted" value={c.contacted} accent="var(--t-amber)" />
                <MetricCell label="Interested" value={c.interested} accent="var(--t-green)" />
                <MetricCell label="Won" value={c.won} accent="var(--t-green)" />
              </div>

              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderTop: '1px solid var(--c-edge)' }}
              >
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--c-ink-2)' }}>
                  <TrendingUp size={12} />
                  Conv. {convRate}%
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--t-green)' }}>
                  Revenue: {fmt(c.revenue)}
                </div>
                <button
                  className="text-xs px-2.5 py-1 rounded"
                  style={{ background: 'var(--c-surface-2)', color: 'var(--c-ink-2)', border: '1px solid var(--c-edge)' }}
                >
                  View Leads
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
