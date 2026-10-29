import { useState } from 'react'
import { X } from 'lucide-react'
import type { Lead, Proposal, PackageType } from '../types'

interface Props {
  leads: Lead[]
  onClose: () => void
  onAdd: (
    proposal: Omit<
      Proposal,
      'id' | 'created_at' | 'sent_at' | 'accepted_at' | 'business_name'
    >
  ) => Promise<void>
}

const PACKAGES: {
  id: PackageType
  label: string
  price: number
  timeline: string
  scope: string
}[] = [
  {
    id: 'Starter',
    label: 'Starter',
    price: 150000,
    timeline: '3–5 working days',
    scope:
      '1-page responsive business website, services, gallery, WhatsApp CTA, map, social links, basic SEO, deployment',
  },
  {
    id: 'Business',
    label: 'Business',
    price: 250000,
    timeline: '5–7 working days',
    scope:
      'Up to 5 pages, custom UI/UX, contact form, gallery, WhatsApp, map, social integration, basic SEO, deployment, 7-day support',
  },
  {
    id: 'Premium',
    label: 'Premium',
    price: 400000,
    timeline: '7–10 working days',
    scope:
      'Up to 8 pages, advanced UX, booking/request flow, advanced forms, analytics, performance optimization, 14-day support',
  },
]

const OVERLAY: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: 16,
}

const MODAL: React.CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-edge)',
  borderRadius: 12,
  width: '100%',
  maxWidth: 560,
  padding: '24px 24px 20px',
  maxHeight: '90vh',
  overflowY: 'auto',
}

const LABEL: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--c-ink-3)',
  fontFamily: 'DM Mono, monospace',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  display: 'block',
  marginBottom: 6,
}

const INPUT: React.CSSProperties = {
  width: '100%',
  background: 'var(--c-bg)',
  border: '1px solid var(--c-edge)',
  borderRadius: 6,
  padding: '8px 12px',
  color: 'var(--c-ink)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const fmt = (n: number) => '₦' + n.toLocaleString('en-NG')

function createProposalMessage(
  lead: Lead,
  pkg: PackageType,
  price: number,
  paymentTerms: string,
  scope: string,
  timeline: string,
) {
  const contactName = lead.contact_person || 'there'

  return `Good day ${contactName},

Thank you for the opportunity to discuss how Immanent Studio can help ${lead.business_name} strengthen its online presence.

Based on our discussion and the needs of your business, we are proposing a ${pkg} website package designed to give your customers a clear and professional way to discover your business, understand your services, and get in touch with you easily.

Project Package: ${pkg}
Project Value: ${fmt(price)}

Scope of Work:
${scope}

Project Timeline:
${timeline}

Payment Terms:
${paymentTerms}

The goal is to create a clean, responsive and professional online experience that represents ${lead.business_name} properly and makes it easier for potential customers to connect with your business.

We would be happy to proceed once you are comfortable with the proposal and payment terms.

Warm regards,
Immanent Studio`
}

export default function NewProposalModal({ leads, onClose, onAdd }: Props) {
  const [leadId, setLeadId] = useState('')
  const [pkg, setPkg] = useState<PackageType>('Business')
  const [price, setPrice] = useState(250000)
  const [paymentTerms, setPaymentTerms] = useState(
    '50% upfront, 50% on delivery',
  )
  const [scope, setScope] = useState(PACKAGES[1].scope)
  const [status, setStatus] = useState<Proposal['status']>('DRAFT')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handlePackageChange(p: PackageType) {
    const meta = PACKAGES.find((x) => x.id === p)!

    setPkg(p)
    setPrice(meta.price)
    setScope(meta.scope)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!leadId) {
      setError('Please select a lead.')
      return
    }

    const lead = leads.find((l) => l.id === leadId)

    if (!lead) {
      setError('Selected lead could not be found.')
      return
    }

    const packageMeta = PACKAGES.find((p) => p.id === pkg)!

    const proposalMessage = createProposalMessage(
      lead,
      pkg,
      price,
      paymentTerms,
      scope,
      packageMeta.timeline,
    )

    setSaving(true)
    setError('')

    try {
      await onAdd({
        lead_id: leadId,
        package: pkg,
        price,
        payment_terms: paymentTerms,
        scope,
        proposal_message: proposalMessage,
        status,
      })

      onClose()
    } catch (err: any) {
      setError(
        err?.message ??
          err?.error_description ??
          JSON.stringify(err),
      )
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
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-base font-semibold"
            style={{
              color: 'var(--c-ink)',
              letterSpacing: '-0.01em',
            }}
          >
            New Proposal
          </h2>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--c-ink-3)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={LABEL}>
              Lead / Business *
            </label>

            <select
              style={{ ...INPUT, cursor: 'pointer' }}
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
            >
              <option value="">
                — Select a lead —
              </option>

              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.business_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={LABEL}>
              Package
            </label>

            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns:
                  'repeat(3, 1fr)',
              }}
            >
              {PACKAGES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    handlePackageChange(p.id)
                  }
                  style={{
                    padding: '10px 8px',
                    borderRadius: 7,
                    border: `1px solid ${
                      pkg === p.id
                        ? '#f97316'
                        : 'var(--c-edge)'
                    }`,
                    background:
                      pkg === p.id
                        ? 'var(--t-orange-bg)'
                        : 'var(--c-bg)',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div
                    className="text-xs font-semibold mb-1"
                    style={{
                      color:
                        pkg === p.id
                          ? 'var(--c-primary-l)'
                          : 'var(--c-ink-2)',
                    }}
                  >
                    {p.label}
                  </div>

                  <div
                    className="text-xs"
                    style={{
                      color: '#10b981',
                      fontFamily:
                        'DM Mono, monospace',
                    }}
                  >
                    {fmt(p.price)}
                  </div>

                  <div
                    className="text-[10px] mt-1"
                    style={{
                      color: 'var(--c-ink-3)',
                    }}
                  >
                    {p.timeline}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns:
                '1fr 1fr',
            }}
          >
            <div>
              <label style={LABEL}>
                Custom Price (₦)
              </label>

              <input
                type="number"
                style={INPUT}
                value={price}
                onChange={(e) =>
                  setPrice(
                    Number(e.target.value),
                  )
                }
                min={0}
              />
            </div>

            <div>
              <label style={LABEL}>
                Status
              </label>

              <select
                style={{
                  ...INPUT,
                  cursor: 'pointer',
                }}
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as Proposal['status'],
                  )
                }
              >
                <option value="DRAFT">
                  Draft
                </option>
                <option value="SENT">
                  Sent
                </option>
                <option value="ACCEPTED">
                  Accepted
                </option>
                <option value="DECLINED">
                  Declined
                </option>
              </select>
            </div>
          </div>

          <div>
            <label style={LABEL}>
              Payment Terms
            </label>

            <input
              style={INPUT}
              value={paymentTerms}
              onChange={(e) =>
                setPaymentTerms(e.target.value)
              }
              placeholder="e.g. 50% upfront, 50% on delivery"
            />
          </div>

          <div>
            <label style={LABEL}>
              Scope of Work
            </label>

            <textarea
              style={{
                ...INPUT,
                resize: 'vertical',
                minHeight: 90,
              }}
              value={scope}
              onChange={(e) =>
                setScope(e.target.value)
              }
            />
          </div>

          <div
            className="rounded-md p-3"
            style={{
              background: 'var(--c-bg)',
              border: '1px solid var(--c-edge)',
            }}
          >
            <p
              className="text-xs"
              style={{
                color: '#64748b',
                lineHeight: 1.6,
              }}
            >
              A client-ready proposal message will
              automatically be drafted from the
              selected lead, package, scope, price,
              timeline and payment terms.
            </p>
          </div>

          {error && (
            <p
              className="text-xs"
              style={{ color: 'var(--t-red)' }}
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md"
              style={{
                background: 'var(--c-surface-2)',
                color: '#64748b',
                border: '1px solid var(--c-edge)',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="text-sm px-4 py-2 rounded-md font-medium"
              style={{
                background: '#f97316',
                color: '#fff',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? 'Saving...'
                : 'Create Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}