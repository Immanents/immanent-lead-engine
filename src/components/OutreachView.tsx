import { useState } from 'react'
import { Check, X, Edit3, AtSign, Mail, MessageCircle, Link2 } from 'lucide-react'
import type { Outreach, OutreachStatus } from '../types'

interface OutreachViewProps {
  outreach: Outreach[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

const CHANNEL_ICON = {
  Instagram: AtSign,
  Email: Mail,
  WhatsApp: MessageCircle,
  LinkedIn: Link2,
}

const STATUS_META: Record<OutreachStatus, { color: string; bg: string }> = {
  DRAFT: { color: '#64748b', bg: 'var(--c-edge)' },
  PENDING_APPROVAL: { color: '#f59e0b', bg: 'var(--t-amber-bg)' },
  APPROVED: { color: 'var(--c-primary-l)', bg: 'var(--t-orange-bg)' },
  SENT: { color: 'var(--t-green)', bg: 'var(--t-green-bg)' },
  REPLIED: { color: '#10b981', bg: 'var(--t-green-bg)' },
  NO_RESPONSE: { color: 'var(--t-red)', bg: 'var(--t-red-bg)' },
}

const MESSAGE_TYPE_LABEL: Record<string, string> = {
  INITIAL: 'Initial',
  FOLLOW_UP_1: 'Follow-up #1',
  FOLLOW_UP_2: 'Follow-up #2',
  FINAL_FOLLOW_UP: 'Final Follow-up',
}

export default function OutreachView({ outreach, onApprove, onReject }: OutreachViewProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')

  const pending = outreach.filter((o) => o.status === 'PENDING_APPROVAL')
  const shown = tab === 'pending' ? pending : outreach

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--c-ink)', letterSpacing: '-0.02em' }}>
            Outreach
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Human-reviewed outreach messages
          </p>
        </div>
        {pending.length > 0 && (
          <div
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md"
            style={{ background: 'var(--t-amber-bg)', color: '#f59e0b', border: '1px solid var(--t-amber-bd)', fontFamily: 'DM Mono, monospace' }}
          >
            {pending.length} awaiting approval
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid var(--c-edge)' }}>
        {(['pending', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2.5 text-sm font-medium capitalize"
            style={{
              color: tab === t ? 'var(--c-ink)' : 'var(--c-ink-3)',
              borderBottom: tab === t ? '2px solid #f97316' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t === 'pending' ? `Pending Approval (${pending.length})` : `All Messages (${outreach.length})`}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {shown.length === 0 && (
          <div
            className="rounded-lg py-16 text-center"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
          >
            <p className="text-sm" style={{ color: 'var(--c-ink-3)' }}>No messages to show</p>
          </div>
        )}
        {shown.map((msg) => {
          const Icon = CHANNEL_ICON[msg.channel] ?? Mail
          const meta = STATUS_META[msg.status]
          const isExpanded = expanded === msg.id
          const isPending = msg.status === 'PENDING_APPROVAL'

          return (
            <div
              key={msg.id}
              className="rounded-lg overflow-hidden"
              style={{
                background: 'var(--c-surface)',
                border: isPending ? '1px solid var(--t-amber-bd)' : '1px solid var(--c-edge)',
              }}
            >
              <div
                className="flex items-center gap-3 px-5 py-3 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : msg.id)}
              >
                <div
                  className="flex items-center justify-center rounded"
                  style={{ width: 28, height: 28, background: 'var(--c-surface-2)', flexShrink: 0 }}
                >
                  <Icon size={13} style={{ color: '#64748b' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--c-ink)' }}>
                      {msg.lead_name}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--c-surface-2)', color: '#64748b', fontFamily: 'DM Mono, monospace' }}
                    >
                      {msg.channel}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--c-surface-2)', color: '#64748b', fontFamily: 'DM Mono, monospace' }}
                    >
                      {MESSAGE_TYPE_LABEL[msg.message_type]}
                    </span>
                  </div>
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: 'var(--c-ink-3)', maxWidth: 400 }}
                  >
                    {msg.content.slice(0, 90)}...
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium ml-auto flex-shrink-0"
                  style={{ background: meta.bg, color: meta.color, fontFamily: 'DM Mono, monospace' }}
                >
                  {msg.status.replace('_', ' ')}
                </span>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--c-edge)' }}>
                  <div
                    className="px-5 py-4"
                    style={{ background: 'var(--c-surface-2)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--c-ink-2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </p>
                  </div>
                  {isPending && (
                    <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--c-edge)' }}>
                      <button
                        onClick={() => onApprove(msg.id)}
                        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium"
                        style={{ background: '#10b981', color: '#fff' }}
                      >
                        <Check size={13} />
                        Approve & Send
                      </button>
                      <button
                        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md"
                        style={{ background: 'var(--c-surface-2)', color: 'var(--c-primary-l)', border: '1px solid var(--c-edge)' }}
                      >
                        <Edit3 size={13} />
                        Edit
                      </button>
                      <button
                        onClick={() => onReject(msg.id)}
                        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md ml-auto"
                        style={{ background: 'var(--t-red-bg)', color: 'var(--t-red)', border: '1px solid var(--t-red-bd)' }}
                      >
                        <X size={13} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
