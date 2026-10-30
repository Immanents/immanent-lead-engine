import type { LeadStatus, Priority, PackageType } from '../types'

export const STATUS_META: Record<
  LeadStatus,
  { color: string; bg: string; label: string }
> = {
  NEW: { color: 'var(--t-blue)', bg: 'var(--t-blue-bg)', label: 'New' },
  QUALIFIED: { color: 'var(--c-primary-l)', bg: 'var(--t-orange-bg)', label: 'Qualified' },
  CONTACTED: { color: 'var(--t-amber)', bg: 'var(--t-amber-bg)', label: 'Contacted' },
  INTERESTED: { color: 'var(--t-green)', bg: 'var(--t-green-bg)', label: 'Interested' },
  PROPOSAL: { color: 'var(--t-blue)', bg: 'var(--t-blue-bg)', label: 'Proposal' },
  WON: { color: 'var(--t-green)', bg: 'var(--t-green-bg)', label: 'Won' },
  LOST: { color: 'var(--t-red)', bg: 'var(--t-red-bg)', label: 'Lost' },
  NURTURE: { color: 'var(--c-primary-l)', bg: 'var(--t-orange-bg)', label: 'Nurture' },
  ARCHIVED: { color: 'var(--c-ink-2)', bg: 'var(--c-edge)', label: 'Archived' },
}

export const PRIORITY_META: Record<Priority, { color: string; dot: string }> = {
  'High Priority': { color: 'var(--t-red)', dot: 'var(--t-red)' },
  Good: { color: 'var(--t-green)', dot: 'var(--t-green)' },
  Maybe: { color: 'var(--t-amber)', dot: 'var(--t-amber)' },
  Low: { color: 'var(--c-ink-3)', dot: 'var(--c-ink-3)' },
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded"
      style={{
        color: meta.color,
        background: meta.bg,

        letterSpacing: '0.02em',
      }}
    >
      {meta.label}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs"
      style={{ color: meta.color }}
    >
      <span
        className="rounded-full"
        style={{ width: 6, height: 6, background: meta.dot, flexShrink: 0, display: 'inline-block' }}
      />
      {priority}
    </span>
  )
}

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'var(--t-red)' : score >= 60 ? 'var(--t-green)' : score >= 40 ? 'var(--t-amber)' : 'var(--c-ink-2)'
  return (
    <span
      className="text-xs font-medium"
      style={{ color }}
    >
      {score}
    </span>
  )
}

export function PackageBadge({ pkg }: { pkg: PackageType }) {
  const colors: Record<PackageType, { color: string; bg: string }> = {
    Starter: { color: 'var(--t-blue)', bg: 'var(--t-blue-bg)' },
    Business: { color: 'var(--c-primary-l)', bg: 'var(--t-orange-bg)' },
    Premium: { color: 'var(--t-blue)', bg: 'var(--t-blue-bg)' },
  }
  const c = colors[pkg]
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded"
      style={{ color: c.color, background: c.bg }}
    >
      {pkg}
    </span>
  )
}

// Legacy helpers used in Dashboard
export function statusColor(s: LeadStatus) {
  return STATUS_META[s]?.label ?? s
}
export function priorityDot(p: Priority) {
  return PRIORITY_META[p]?.dot ?? 'var(--c-ink-2)'
}

export function fmt(n: number) {
  if (n >= 1000000) return `₦${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `₦${(n / 1000).toFixed(0)}k`
  return `₦${n.toLocaleString()}`
}
