import { useState } from 'react'
import { X } from 'lucide-react'
import { cleanChannel } from '../lib/nil'
import type { Lead, LeadSource, WebsiteStatus } from '../types'

interface AddLeadModalProps {
  onClose: () => void
  onAdd: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'lead_score' | 'priority'>) => void
  campaigns: { id: string; name: string }[]
}

const SOURCES: LeadSource[] = [
  'Google Maps', 'Instagram', 'Facebook', 'LinkedIn', 'Apollo', 'Referral', 'Directory', 'Manual', 'Other',
]

const WEBSITE_STATUSES: { value: WebsiteStatus; label: string }[] = [
  { value: 'none', label: 'No website' },
  { value: 'poor', label: 'Poor' },
  { value: 'outdated', label: 'Outdated' },
  { value: 'decent', label: 'Decent' },
  { value: 'good', label: 'Good' },
]

const PRESENCE: { key: 'website' | 'instagram' | 'x_handle' | 'discord' | 'telegram'; label: string; placeholder: string }[] = [
  { key: 'website', label: 'Website URL', placeholder: 'https://... or nil' },
  { key: 'instagram', label: 'Instagram', placeholder: '@handle or nil' },
  { key: 'x_handle', label: 'X', placeholder: '@handle or nil' },
  { key: 'discord', label: 'Discord server', placeholder: 'invite link or nil' },
  { key: 'telegram', label: 'Telegram server', placeholder: 't.me/... or nil' },
]

const INPUT_STYLE = {
  background: 'var(--c-surface-2)',
  border: '1px solid var(--c-edge)',
  color: 'var(--c-ink)',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 13,
  outline: 'none',
  width: '100%',

}

const LABEL_STYLE = {
  display: 'block' as const,
  fontSize: 11,
  color: 'var(--c-ink-3)',
  marginBottom: 4,

}

export default function AddLeadModal({ onClose, onAdd, campaigns }: AddLeadModalProps) {
  const [form, setForm] = useState({
    business_name: '',
    industry: '',
    location: '',
    source: 'Manual' as LeadSource,
    website: '',
    website_status: 'none' as WebsiteStatus,
    instagram: '',
    x_handle: '',
    discord: '',
    telegram: '',
    email: '',
    phone: '',
    contact_person: '',
    campaign_id: '',
    notes: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.business_name.trim() || !form.industry.trim()) return
    onAdd({
      ...form,
      status: 'NEW',
      website: cleanChannel(form.website),
      website_status: cleanChannel(form.website) ? form.website_status : 'none',
      instagram: cleanChannel(form.instagram),
      x_handle: cleanChannel(form.x_handle),
      discord: cleanChannel(form.discord),
      telegram: cleanChannel(form.telegram),
      email: form.email || undefined,
      phone: form.phone || undefined,
      contact_person: form.contact_person || undefined,
      campaign_id: form.campaign_id || undefined,
      notes: form.notes || undefined,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', zIndex: 100 }}
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-edge)',
          width: 540,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--c-edge)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--c-ink)' }}>
            Add New Lead
          </h2>
          <button onClick={onClose} style={{ color: 'var(--c-ink-3)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="text-xs mb-2" style={{ color: 'var(--c-primary-l)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Online presence — required, type nil if not available
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {PRESENCE.map((f) => (
                  <div key={f.key} style={f.key === 'website' ? { gridColumn: '1 / -1' } : undefined}>
                    <label style={LABEL_STYLE}>{f.label} *</label>
                    <div className="flex gap-1">
                      <input
                        required
                        style={INPUT_STYLE}
                        value={form[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        placeholder={f.placeholder}
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, [f.key]: 'nil' })}
                        title="Not available"
                        className="text-xs px-2 rounded-md flex-shrink-0"
                        style={{
                          background: cleanChannel(form[f.key]) === undefined && form[f.key] ? 'var(--t-orange-bg)' : 'var(--c-surface-2)',
                          color: cleanChannel(form[f.key]) === undefined && form[f.key] ? 'var(--c-primary-l)' : 'var(--c-ink-3)',
                          border: '1px solid var(--c-edge)',

                          cursor: 'pointer',
                        }}
                      >
                        nil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={LABEL_STYLE}>Business Name *</label>
              <input
                required
                style={INPUT_STYLE}
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                placeholder="e.g. Glamour Touch Salon"
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Industry *</label>
              <input
                required
                style={INPUT_STYLE}
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                placeholder="e.g. Beauty & Wellness"
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Location</label>
              <input
                style={INPUT_STYLE}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Lagos, Nigeria"
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Source *</label>
              <select
                required
                style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {cleanChannel(form.website) && (
            <div>
              <label style={LABEL_STYLE}>Website Status</label>
              <select
                style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                value={form.website_status}
                onChange={(e) => setForm({ ...form, website_status: e.target.value as WebsiteStatus })}
              >
                {WEBSITE_STATUSES.filter((s) => s.value !== 'none').map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            )}
            <div>
              <label style={LABEL_STYLE}>Email</label>
              <input
                type="email"
                style={INPUT_STYLE}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="hello@business.com"
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Phone</label>
              <input
                style={INPUT_STYLE}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+234 800 000 0000"
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Contact Person</label>
              <input
                style={INPUT_STYLE}
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                placeholder="First name or full name"
              />
            </div>
            {campaigns.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LABEL_STYLE}>Campaign (optional)</label>
                <select
                  style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                  value={form.campaign_id}
                  onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
                >
                  <option value="">No campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>Notes</label>
              <textarea
                style={{ ...INPUT_STYLE, resize: 'none' }}
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any initial observations about this prospect..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--c-edge)' }}>
            <button
              type="submit"
              className="text-sm px-4 py-2 rounded-md font-medium"
              style={{ background: 'var(--c-primary-l)', color: '#fff' }}
            >
              Add Lead
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md"
              style={{ background: 'var(--c-surface-2)', color: 'var(--c-ink-2)', border: '1px solid var(--c-edge)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
