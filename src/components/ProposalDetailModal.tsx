import { useState } from 'react'
import {
  X,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Send,
} from 'lucide-react'
import type { Lead, Proposal } from '../types'
import { fmt, PackageBadge } from './shared'

interface Props {
  proposal: Proposal
  lead?: Lead
  onClose: () => void
  onStatusChange: (
    id: string,
    status: Proposal['status'],
  ) => Promise<void>
}

const PACKAGE_TIMELINES = {
  Starter: '3–5 working days',
  Business: '5–7 working days',
  Premium: '7–10 working days',
}

const OVERLAY: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 110,
  padding: 16,
}

const MODAL: React.CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-edge)',
  borderRadius: 12,
  width: '100%',
  maxWidth: 760,
  maxHeight: '92vh',
  overflowY: 'auto',
}

export default function ProposalDetailModal({
  proposal,
  lead,
  onClose,
  onStatusChange,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const message =
    proposal.proposal_message ||
    `Good day ${lead?.contact_person || 'there'},

Thank you for the opportunity to discuss how Immanent Studio can help ${proposal.business_name || 'your business'} strengthen its online presence.

We are proposing our ${proposal.package} website package for ${fmt(proposal.price)}.

Scope of Work:
${proposal.scope}

Project Timeline:
${PACKAGE_TIMELINES[proposal.package]}

Payment Terms:
${proposal.payment_terms}

We would be happy to proceed once you are comfortable with the proposal.

Warm regards,
Immanent Studio`

  async function handleCopy() {
    await navigator.clipboard.writeText(message)
    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  function getWhatsAppNumber() {
    if (!lead?.phone) return null

    let phone = lead.phone.replace(/\D/g, '')

    if (phone.startsWith('0')) {
      phone = '234' + phone.substring(1)
    }

    if (!phone.startsWith('234')) {
      phone = '234' + phone
    }

    return phone
  }

  async function handleWhatsApp() {
    const phone = getWhatsAppNumber()

    if (!phone) {
      alert(
        'This lead does not have a phone number saved.',
      )
      return
    }

    await handleCopy()

    await onStatusChange(
      proposal.id,
      'SENT',
    )

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  function handleEmail() {
    if (!lead?.email) {
      alert(
        'This lead does not have an email address saved.',
      )
      return
    }

    const subject = `${proposal.package} Website Proposal — ${proposal.business_name}`

    window.location.href =
      `mailto:${lead.email}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(message)}`
  }

  async function handleMarkSent() {
    setSaving(true)

    try {
      await onStatusChange(
        proposal.id,
        'SENT',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(
    status: Proposal['status'],
  ) {
    setSaving(true)

    try {
      await onStatusChange(
        proposal.id,
        status,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={OVERLAY}
      onClick={(e) =>
        e.target === e.currentTarget && onClose()
      }
    >
      <div style={MODAL}>
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-5"
          style={{
            borderBottom:
              '1px solid var(--c-edge)',
          }}
        >
          <div>
            <p
              className="text-xs mb-1"
              style={{
                color: 'var(--c-ink-3)',
                fontFamily:
                  'Inter, system-ui, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Website Proposal
            </p>

            <h2
              className="text-2xl font-medium"
              style={{
                color: 'var(--c-ink)',
              }}
            >
              {proposal.business_name}
            </h2>

            {lead?.contact_person && (
              <p
                className="text-sm mt-1"
                style={{
                  color: 'var(--c-ink-2)',
                }}
              >
                Prepared for{' '}
                {lead.contact_person}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--c-ink-2)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Package summary */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns:
                'repeat(3, 1fr)',
            }}
          >
            <div
              className="rounded-lg p-4"
              style={{
                background: 'var(--c-bg)',
                border:
                  '1px solid var(--c-edge)',
              }}
            >
              <p
                className="text-xs mb-2"
                style={{
                  color: 'var(--c-ink-3)',
                  fontFamily:
                    'Inter, system-ui, sans-serif',
                }}
              >
                PACKAGE
              </p>

              <PackageBadge
                pkg={proposal.package}
              />
            </div>

            <div
              className="rounded-lg p-4"
              style={{
                background: 'var(--c-bg)',
                border:
                  '1px solid var(--c-edge)',
              }}
            >
              <p
                className="text-xs mb-2"
                style={{
                  color: 'var(--c-ink-3)',
                  fontFamily:
                    'Inter, system-ui, sans-serif',
                }}
              >
                PROJECT VALUE
              </p>

              <p
                className="text-lg font-semibold"
                style={{
                  color: 'var(--t-green)',
                  fontFamily:
                    'Inter, system-ui, sans-serif',
                }}
              >
                {fmt(proposal.price)}
              </p>
            </div>

            <div
              className="rounded-lg p-4"
              style={{
                background: 'var(--c-bg)',
                border:
                  '1px solid var(--c-edge)',
              }}
            >
              <p
                className="text-xs mb-2"
                style={{
                  color: 'var(--c-ink-3)',
                  fontFamily:
                    'Inter, system-ui, sans-serif',
                }}
              >
                TIMELINE
              </p>

              <p
                className="text-sm"
                style={{
                  color: 'var(--c-ink-2)',
                }}
              >
                {
                  PACKAGE_TIMELINES[
                    proposal.package
                  ]
                }
              </p>
            </div>
          </div>

          {/* Scope */}
          <section>
            <h3
              className="text-xs mb-2"
              style={{
                color: 'var(--c-primary-l)',
                fontFamily:
                  'Inter, system-ui, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Scope of Work
            </h3>

            <div
              className="rounded-lg p-4"
              style={{
                background: 'var(--c-bg)',
                border:
                  '1px solid var(--c-edge)',
              }}
            >
              <p
                className="text-sm"
                style={{
                  color: 'var(--c-ink-2)',
                  lineHeight: 1.7,
                }}
              >
                {proposal.scope}
              </p>
            </div>
          </section>

          {/* Payment */}
          <section>
            <h3
              className="text-xs mb-2"
              style={{
                color: 'var(--c-primary-l)',
                fontFamily:
                  'Inter, system-ui, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Payment Terms
            </h3>

            <div
              className="rounded-lg p-4"
              style={{
                background: 'var(--c-bg)',
                border:
                  '1px solid var(--c-edge)',
              }}
            >
              <p
                className="text-sm"
                style={{
                  color: 'var(--c-ink-2)',
                }}
              >
                {proposal.payment_terms}
              </p>
            </div>
          </section>

          {/* Proposal message */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3
                className="text-xs"
                style={{
                  color: 'var(--c-primary-l)',
                  fontFamily:
                    'Inter, system-ui, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Client Proposal Message
              </h3>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md"
                style={{
                  background: 'var(--c-surface-2)',
                  border:
                    '1px solid var(--c-edge)',
                  color: copied
                    ? 'var(--t-green)'
                    : 'var(--c-ink-2)',
                }}
              >
                {copied ? (
                  <Check size={13} />
                ) : (
                  <Copy size={13} />
                )}

                {copied
                  ? 'Copied'
                  : 'Copy Proposal'}
              </button>
            </div>

            <textarea
              readOnly
              value={message}
              className="w-full rounded-lg"
              style={{
                minHeight: 310,
                resize: 'vertical',
                background: 'var(--c-bg)',
                border:
                  '1px solid var(--c-edge)',
                color: 'var(--c-ink)',
                padding: 16,
                fontSize: 13,
                lineHeight: 1.7,
                outline: 'none',
              }}
            />
          </section>

          {/* Actions */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 pt-2"
            style={{
              borderTop:
                '1px solid var(--c-edge)',
            }}
          >
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleWhatsApp}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md font-medium"
                style={{
                  background: 'var(--t-green-bg)',
                  color: 'var(--t-green)',
                  border:
                    '1px solid var(--t-green-bd)',
                }}
              >
                <MessageCircle
                  size={14}
                />
                Send via WhatsApp
              </button>

              <button
                onClick={handleEmail}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md"
                style={{
                  background: 'var(--c-surface-2)',
                  color: 'var(--c-ink-2)',
                  border:
                    '1px solid var(--c-edge)',
                }}
              >
                <Mail size={14} />
                Email
              </button>

              {proposal.status ===
                'DRAFT' && (
                <button
                  onClick={handleMarkSent}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md"
                  style={{
                    background: 'var(--t-orange-bg)',
                    color: 'var(--c-primary-l)',
                    border:
                      '1px solid var(--c-primary-l)',
                  }}
                >
                  <Send size={14} />
                  {saving
                    ? 'Saving...'
                    : 'Mark as Sent'}
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {proposal.status ===
                'SENT' && (
                <button
                  onClick={() =>
                    handleStatus(
                      'ACCEPTED',
                    )
                  }
                  disabled={saving}
                  className="text-xs px-3 py-2 rounded-md"
                  style={{
                    background: 'var(--t-green-bg)',
                    color: 'var(--t-green)',
                    border:
                      '1px solid var(--t-green-bd)',
                  }}
                >
                  Mark Accepted
                </button>
              )}

              {(proposal.status ===
                'SENT' ||
                proposal.status ===
                  'DRAFT') && (
                <button
                  onClick={() =>
                    handleStatus(
                      'DECLINED',
                    )
                  }
                  disabled={saving}
                  className="text-xs px-3 py-2 rounded-md"
                  style={{
                    background: 'var(--t-red-bg)',
                    color: 'var(--t-red)',
                    border:
                      '1px solid var(--t-red-bd)',
                  }}
                >
                  Mark Declined
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}