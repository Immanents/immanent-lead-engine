import { useState } from 'react'
import {
  Plus,
  FileText,
  ScrollText,
} from 'lucide-react'
import type {
  Lead,
  Proposal,
  ProposalStatus,
} from '../types'
import { PackageBadge, fmt } from './shared'
import NewProposalModal from './NewProposalModal'
import ProposalDetailModal from './ProposalDetailModal'

interface ProposalsViewProps {
  proposals: Proposal[]
  leads: Lead[]

  onAdd: (
    proposal: Omit<
      Proposal,
      'id' | 'created_at' | 'sent_at' | 'accepted_at' | 'business_name'
    >
  ) => Promise<void>

  onStatusChange: (
    id: string,
    status: ProposalStatus,
  ) => Promise<void>
}

const STATUS_META: Record<
  ProposalStatus,
  { color: string; bg: string }
> = {
  DRAFT: {
    color: '#64748b',
    bg: 'var(--c-edge)',
  },
  SENT: {
    color: 'var(--t-amber)',
    bg: 'var(--t-amber-bg)',
  },
  ACCEPTED: {
    color: 'var(--t-green)',
    bg: 'var(--t-green-bg)',
  },
  DECLINED: {
    color: 'var(--t-red)',
    bg: 'var(--t-red-bg)',
  },
}

export default function ProposalsView({
  proposals,
  leads,
  onAdd,
  onStatusChange,
}: ProposalsViewProps) {
  const [showModal, setShowModal] =
    useState(false)

  const [selectedProposal, setSelectedProposal] =
    useState<Proposal | null>(null)

  const total = proposals.reduce(
    (s, p) => s + p.price,
    0,
  )

  const won = proposals
    .filter(
      (p) => p.status === 'ACCEPTED',
    )
    .reduce((s, p) => s + p.price, 0)

  const selectedLead = selectedProposal
    ? leads.find(
        (l) =>
          l.id === selectedProposal.lead_id,
      )
    : undefined

  return (
    <div className="space-y-4">
      {showModal && (
        <NewProposalModal
          leads={leads}
          onClose={() =>
            setShowModal(false)
          }
          onAdd={onAdd}
        />
      )}

      {selectedProposal && (
        <ProposalDetailModal
          proposal={selectedProposal}
          lead={selectedLead}
          onClose={() =>
            setSelectedProposal(null)
          }
          onStatusChange={async (
            id,
            status,
          ) => {
            await onStatusChange(
              id,
              status,
            )

            setSelectedProposal(
              (current) =>
                current
                  ? {
                      ...current,
                      status,
                      ...(status ===
                      'SENT'
                        ? {
                            sent_at:
                              new Date().toISOString(),
                          }
                        : {}),
                      ...(status ===
                      'ACCEPTED'
                        ? {
                            accepted_at:
                              new Date().toISOString(),
                          }
                        : {}),
                    }
                  : null,
            )
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{
              color: 'var(--c-ink)',
              letterSpacing:
                '-0.02em',
            }}
          >
            Proposals
          </h1>

          <p
            className="text-sm mt-0.5"
            style={{
              color: '#64748b',
            }}
          >
            {proposals.length} proposals ·{' '}
            {fmt(won)} won
          </p>
        </div>

        <button
          onClick={() =>
            setShowModal(true)
          }
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium"
          style={{
            background: '#f97316',
            color: '#fff',
          }}
        >
          <Plus size={13} />
          New Proposal
        </button>
      </div>

      {/* Summary */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns:
            'repeat(4, 1fr)',
        }}
      >
        {[
          {
            label: 'Total Value',
            value: fmt(total),
          },
          {
            label: 'Won',
            value: fmt(won),
            accent: '#10b981',
          },
          {
            label: 'Pending',
            value: fmt(
              proposals
                .filter(
                  (p) =>
                    p.status ===
                    'SENT',
                )
                .reduce(
                  (s, p) =>
                    s + p.price,
                  0,
                ),
            ),
            accent: 'var(--t-amber)',
          },
          {
            label: 'Close Rate',
            value: `${
              proposals.length > 0
                ? Math.round(
                    (proposals.filter(
                      (p) =>
                        p.status ===
                        'ACCEPTED',
                    ).length /
                      proposals.length) *
                      100,
                  )
                : 0
            }%`,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg px-4 py-3"
            style={{
              background: 'var(--c-surface)',
              border:
                '1px solid var(--c-edge)',
            }}
          >
            <div
              className="text-xs mb-1.5"
              style={{
                color: 'var(--c-ink-3)',
                fontFamily:
                  'DM Mono, monospace',
              }}
            >
              {s.label}
            </div>

            <div
              className="text-xl font-semibold"
              style={{
                color:
                  s.accent ??
                  'var(--c-ink)',
                fontFamily:
                  'DM Mono, monospace',
                letterSpacing:
                  '-0.02em',
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Proposals list */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: 'var(--c-surface)',
          border:
            '1px solid var(--c-edge)',
        }}
      >
        {proposals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 48,
                height: 48,
                background: 'var(--c-surface-2)',
                border:
                  '1px solid var(--c-edge)',
              }}
            >
              <ScrollText
                size={22}
                style={{
                  color: 'var(--c-ink-3)',
                }}
              />
            </div>

            <div className="text-center">
              <p
                className="text-sm font-medium"
                style={{
                  color: '#64748b',
                }}
              >
                No proposals yet
              </p>

              <p
                className="text-xs mt-1"
                style={{
                  color: 'var(--c-ink-3)',
                }}
              >
                Proposals will appear here
                once you create them from a
                lead
              </p>
            </div>
          </div>
        )}

        <table
          className="w-full"
          style={{
            display:
              proposals.length === 0
                ? 'none'
                : 'table',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom:
                  '1px solid var(--c-edge)',
              }}
            >
              {[
                'Business',
                'Package',
                'Value',
                'Payment Terms',
                'Status',
                'Created',
                'Sent',
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-xs"
                  style={{
                    color: 'var(--c-ink-3)',
                    fontFamily:
                      'DM Mono, monospace',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {proposals.map((p) => {
              const meta =
                STATUS_META[p.status]

              return (
                <tr
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedProposal(
                      p,
                    )
                  }
                  style={{
                    borderBottom:
                      '1px solid var(--c-surface-2)',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      'var(--c-surface-2)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      'transparent')
                  }
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center justify-center rounded"
                        style={{
                          width: 28,
                          height: 28,
                          background:
                            'var(--c-surface-2)',
                          flexShrink: 0,
                        }}
                      >
                        <FileText
                          size={13}
                          style={{
                            color:
                              'var(--c-ink-3)',
                          }}
                        />
                      </div>

                      <span
                        className="text-sm font-medium"
                        style={{
                          color:
                            'var(--c-ink)',
                        }}
                      >
                        {p.business_name}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <PackageBadge
                      pkg={p.package}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className="text-sm font-semibold"
                      style={{
                        color:
                          '#10b981',
                        fontFamily:
                          'DM Mono, monospace',
                      }}
                    >
                      {fmt(p.price)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className="text-xs"
                      style={{
                        color:
                          '#64748b',
                      }}
                    >
                      {p.payment_terms}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{
                        background:
                          meta.bg,
                        color:
                          meta.color,
                        fontFamily:
                          'DM Mono, monospace',
                      }}
                    >
                      {p.status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className="text-xs"
                      style={{
                        color:
                          'var(--c-ink-3)',
                        fontFamily:
                          'DM Mono, monospace',
                      }}
                    >
                      {new Date(
                        p.created_at,
                      ).toLocaleDateString(
                        'en-GB',
                        {
                          day: 'numeric',
                          month: 'short',
                        },
                      )}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className="text-xs"
                      style={{
                        color:
                          'var(--c-ink-3)',
                        fontFamily:
                          'DM Mono, monospace',
                      }}
                    >
                      {p.sent_at
                        ? new Date(
                            p.sent_at,
                          ).toLocaleDateString(
                            'en-GB',
                            {
                              day: 'numeric',
                              month: 'short',
                            },
                          )
                        : '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Package pricing reference */}
      <div>
        <h2
          className="text-xs font-medium mb-3"
          style={{
            color: 'var(--c-ink-3)',
            textTransform:
              'uppercase',
            letterSpacing:
              '0.06em',
            fontFamily:
              'DM Mono, monospace',
          }}
        >
          Package Reference
        </h2>

        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns:
              'repeat(3, 1fr)',
          }}
        >
          {[
            {
              pkg: 'Starter' as const,
              price: 150000,
              timeline:
                '3–5 working days',
              scope:
                '1-page responsive business website, services, gallery, WhatsApp CTA, map, social links, basic SEO, deployment',
            },
            {
              pkg: 'Business' as const,
              price: 250000,
              timeline:
                '5–7 working days',
              scope:
                'Up to 5 pages, custom UI/UX, contact form, gallery, WhatsApp, map, social integration, basic SEO, deployment, 7-day support',
            },
            {
              pkg: 'Premium' as const,
              price: 400000,
              timeline:
                '7–10 working days',
              scope:
                'Up to 8 pages, advanced UX, custom sections, booking/request flow, advanced forms, analytics, basic performance optimization, 14-day support',
            },
          ].map((pkg) => (
            <div
              key={pkg.pkg}
              className="rounded-lg px-4 py-4"
              style={{
                background:
                  'var(--c-surface)',
                border:
                  '1px solid var(--c-edge)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <PackageBadge
                  pkg={pkg.pkg}
                />

                <span
                  className="font-semibold"
                  style={{
                    color:
                      '#10b981',
                    fontFamily:
                      'DM Mono, monospace',
                    fontSize: 15,
                  }}
                >
                  {fmt(pkg.price)}
                </span>
              </div>

              <div
                className="text-xs mb-2"
                style={{
                  color: '#64748b',
                  fontFamily:
                    'DM Mono, monospace',
                }}
              >
                {pkg.timeline}
              </div>

              <p
                className="text-xs"
                style={{
                  color: 'var(--c-ink-3)',
                  lineHeight: 1.6,
                }}
              >
                {pkg.scope}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}