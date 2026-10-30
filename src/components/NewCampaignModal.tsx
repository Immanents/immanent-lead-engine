import { useState } from 'react'
import { X } from 'lucide-react'
import type { Campaign } from '../types'

interface Props {
  onClose: () => void
  onAdd: (campaign: Omit<Campaign, 'id' | 'created_at' | 'total_leads' | 'qualified' | 'contacted' | 'replies' | 'interested' | 'proposals' | 'won' | 'revenue'>) => Promise<void>
}

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 100, padding: 16,
}

const MODAL: React.CSSProperties = {
  background: 'var(--c-surface)', border: '1px solid var(--c-edge)', borderRadius: 12,
  width: '100%', maxWidth: 480, padding: '24px 24px 20px',
}

const LABEL: React.CSSProperties = {
  fontSize: 11, color: 'var(--c-ink-3)',
  textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6,
}

const INPUT: React.CSSProperties = {
  width: '100%', background: 'var(--c-bg)', border: '1px solid var(--c-edge)',
  borderRadius: 6, padding: '8px 12px', color: 'var(--c-ink)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
}

export default function NewCampaignModal({ onClose, onAdd }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState<Campaign['status']>('UPCOMING')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !industry.trim() || !location.trim()) {
      setError('Name, industry, and location are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onAdd({ name: name.trim(), description: description.trim() || undefined, industry: industry.trim(), location: location.trim(), status })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <div style={OVERLAY} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={MODAL}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--c-ink)', letterSpacing: '-0.01em' }}>
            New Campaign
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-ink-3)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={LABEL}>Campaign Name *</label>
            <input style={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lagos Restaurants Q3" />
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={LABEL}>Industry *</label>
              <input style={INPUT} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Food & Beverage" />
            </div>
            <div>
              <label style={LABEL}>Location *</label>
              <input style={INPUT} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lagos" />
            </div>
          </div>

          <div>
            <label style={LABEL}>Status</label>
            <select
              style={{ ...INPUT, cursor: 'pointer' }}
              value={status}
              onChange={(e) => setStatus(e.target.value as Campaign['status'])}
            >
              <option value="UPCOMING">Upcoming</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div>
            <label style={LABEL}>Description</label>
            <textarea
              style={{ ...INPUT, resize: 'vertical', minHeight: 72 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this campaign targeting?"
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: 'var(--t-red)' }}>{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md"
              style={{ background: 'var(--c-surface-2)', color: 'var(--c-ink-2)', border: '1px solid var(--c-edge)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm px-4 py-2 rounded-md font-medium"
              style={{ background: 'var(--c-primary-l)', color: '#fff', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
