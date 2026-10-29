import { Briefcase, ArrowUpRight } from 'lucide-react'
import type { Client, ProjectStatus } from '../types'
import { PackageBadge, fmt } from './shared'

interface ClientsViewProps {
  clients: Client[]
}

const PROJECT_STATUS_META: Record<ProjectStatus, { color: string; bg: string }> = {
  'NOT STARTED': { color: 'var(--t-blue)', bg: 'var(--t-blue-bg)' },
  'IN PROGRESS': { color: 'var(--t-amber)', bg: 'var(--t-amber-bg)' },
  'CLIENT REVIEW': { color: 'var(--c-primary-l)', bg: 'var(--t-orange-bg)' },
  COMPLETED: { color: 'var(--t-green)', bg: 'var(--t-green-bg)' },
  'ON HOLD': { color: 'var(--c-primary-l)', bg: 'var(--t-orange-bg)' },
  CANCELLED: { color: 'var(--t-red)', bg: 'var(--t-red-bg)' },
}

function ProgressBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? (paid / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 4, background: 'var(--c-edge)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#f97316' }}
        />
      </div>
      <span className="text-xs flex-shrink-0" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace', fontSize: 10 }}>
        {Math.round(pct)}%
      </span>
    </div>
  )
}

export default function ClientsView({ clients }: ClientsViewProps) {
  const totalRevenue = clients.reduce((s, c) => s + c.amount_paid, 0)
  const totalBalance = clients.reduce((s, c) => s + c.balance, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--c-ink)', letterSpacing: '-0.02em' }}>
            Clients
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            {clients.length} active clients
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Clients', value: clients.length },
          { label: 'Revenue Received', value: fmt(totalRevenue), accent: '#10b981' },
          { label: 'Outstanding', value: fmt(totalBalance), accent: '#f59e0b' },
          { label: 'In Progress', value: clients.filter((c) => c.project_status === 'IN PROGRESS').length, accent: 'var(--t-amber)' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg px-4 py-3"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
          >
            <div className="text-xs mb-1.5" style={{ color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace' }}>{s.label}</div>
            <div
              className="text-xl font-semibold"
              style={{ color: s.accent ?? 'var(--c-ink)', fontFamily: 'DM Mono, monospace', letterSpacing: '-0.02em' }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Client cards */}
      <div className="space-y-3">
        {clients.map((c) => {
          const meta = PROJECT_STATUS_META[c.project_status]
          return (
            <div
              key={c.id}
              className="rounded-lg overflow-hidden"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
            >
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex items-center justify-center rounded-lg"
                      style={{ width: 36, height: 36, background: 'var(--c-surface-2)', flexShrink: 0 }}
                    >
                      <Briefcase size={16} style={{ color: 'var(--c-ink-3)' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--c-ink)' }}>
                          {c.business_name}
                        </h3>
                        <PackageBadge pkg={c.package} />
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{c.project_name}</p>
                      {c.contact_person && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--c-ink-3)' }}>{c.contact_person}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ background: meta.bg, color: meta.color, fontFamily: 'DM Mono, monospace' }}
                    >
                      {c.project_status}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: '#10b981', fontFamily: 'DM Mono, monospace' }}>
                      {fmt(c.project_value)}
                    </span>
                  </div>
                </div>

                {/* Payment progress */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--c-ink-3)' }}>Payment</span>
                    <span style={{ color: '#64748b', fontFamily: 'DM Mono, monospace' }}>
                      {fmt(c.amount_paid)} paid · {fmt(c.balance)} outstanding
                    </span>
                  </div>
                  <ProgressBar paid={c.amount_paid} total={c.project_value} />
                </div>

                {/* Timeline */}
                <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--c-ink-3)' }}>
                  <span>
                    Started:{' '}
                    <span style={{ color: '#64748b', fontFamily: 'DM Mono, monospace' }}>
                      {new Date(c.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </span>
                  <span>
                    Deadline:{' '}
                    <span style={{ color: '#64748b', fontFamily: 'DM Mono, monospace' }}>
                      {new Date(c.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </span>
                </div>

                {c.notes && (
                  <p className="mt-3 text-xs" style={{ color: 'var(--c-ink-3)', lineHeight: 1.6 }}>
                    {c.notes}
                  </p>
                )}

                {c.testimonial && (
                  <div
                    className="mt-3 rounded px-3 py-2"
                    style={{ background: 'var(--t-green-bg)', border: '1px solid var(--t-green-bd)' }}
                  >
                    <p className="text-xs italic" style={{ color: 'var(--t-green)', lineHeight: 1.6 }}>
                      "{c.testimonial}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {clients.length === 0 && (
          <div
            className="rounded-lg py-16 text-center"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
          >
            <p className="text-sm" style={{ color: 'var(--c-ink-3)' }}>No clients yet. Convert a Won lead to create your first client.</p>
          </div>
        )}
      </div>
    </div>
  )
}
