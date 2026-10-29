import { cleanChannel } from '../lib/nil'
import { useState, useRef } from 'react'
import { X, Upload, AlertCircle, CheckCircle, Loader2, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { Lead, LeadSource, WebsiteStatus } from '../types'

interface CsvImportModalProps {
  onClose: () => void
  onImport: (leads: Omit<Lead, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>
  campaigns: { id: string; name: string }[]
}

// Map of CSV/Excel header aliases → lead field names
const FIELD_MAP: Record<string, keyof Lead> = {
  'business name': 'business_name',
  'business': 'business_name',
  'name': 'business_name',
  'company': 'business_name',
  'industry': 'industry',
  'category': 'industry',
  'type': 'industry',
  'location': 'location',
  'city': 'location',
  'address': 'location',
  'location / address': 'location',
  'website': 'website',
  'website url': 'website',
  'website url (fill in)': 'website',
  'url': 'website',
  'website status': 'website_status',
  'website audit status': 'website_status',
  'instagram': 'instagram',
  'instagram handle': 'instagram',
  'instagram page': 'instagram',
  'instagram page (fill in)': 'instagram',
  'x': 'x_handle',
  'x handle': 'x_handle',
  'x (twitter)': 'x_handle',
  'twitter': 'x_handle',
  'twitter handle': 'x_handle',
  'discord': 'discord',
  'discord server': 'discord',
  'telegram': 'telegram',
  'telegram server': 'telegram',
  'telegram group': 'telegram',
  'facebook': 'facebook',
  'facebook page': 'facebook',
  'linkedin': 'linkedin',
  'email': 'email',
  'email address': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  'contact': 'contact_person',
  'contact person': 'contact_person',
  'contact name': 'contact_person',
  'source': 'source',
  'notes': 'notes',
  'description': 'description',
}

// Anchor words that signal a real header row
const HEADER_ANCHORS = ['business name', 'business', 'name', 'company', 'category', 'industry', 'location']

function findHeaderRowIndex(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const lower = rows[i].map((c) => String(c).toLowerCase().trim())
    if (HEADER_ANCHORS.some((a) => lower.includes(a))) return i
  }
  return 0
}

const VALID_SOURCES: LeadSource[] = [
  'Google Maps', 'Instagram', 'Facebook', 'LinkedIn', 'Apollo', 'Referral', 'Directory', 'Manual', 'Other',
]

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }

  function parseLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  }).filter((row) => Object.values(row).some(Boolean))

  return { headers, rows }
}

function mapRow(row: Record<string, string>, defaultSource: LeadSource): Omit<Lead, 'id' | 'created_at' | 'updated_at'> | null {
  const mapped: Partial<Lead> = {}

  for (const [csvKey, value] of Object.entries(row)) {
    const field = FIELD_MAP[csvKey.toLowerCase().trim()]
    if (field && value) {
      ;(mapped as any)[field] = value
    }
  }

  if (!mapped.business_name) return null

  // Sanitise source
  const rawSource = (mapped.source as string) ?? ''
  const matchedSource = VALID_SOURCES.find(
    (s) => s.toLowerCase() === rawSource.toLowerCase()
  )
  mapped.source = matchedSource ?? defaultSource

  // Sanitise website_status
  const wsRaw = (mapped.website_status as string ?? '').toLowerCase()
  const validWS: WebsiteStatus[] = ['none', 'poor', 'outdated', 'decent', 'good']
  mapped.website_status = validWS.includes(wsRaw as WebsiteStatus) ? (wsRaw as WebsiteStatus) : 'none'

  return {
    business_name: mapped.business_name ?? '',
    industry: mapped.industry ?? 'Unknown',
    location: mapped.location ?? '',
    description: mapped.description,
    website: cleanChannel(mapped.website),
    website_status: cleanChannel(mapped.website) ? mapped.website_status : 'none',
    instagram: cleanChannel(mapped.instagram),
    x_handle: cleanChannel((mapped as any).x_handle),
    discord: cleanChannel((mapped as any).discord),
    telegram: cleanChannel((mapped as any).telegram),
    facebook: mapped.facebook,
    linkedin: mapped.linkedin,
    email: mapped.email,
    phone: mapped.phone,
    contact_person: mapped.contact_person,
    source: mapped.source as LeadSource,
    lead_score: 50,
    priority: 'Maybe',
    status: 'NEW',
    notes: mapped.notes,
  }
}

export default function CsvImportModal({ onClose, onImport, campaigns }: CsvImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [parsedRows, setParsedRows] = useState<Omit<Lead, 'id' | 'created_at' | 'updated_at'>[]>([])
  const [skipped, setSkipped] = useState(0)
  const [defaultSource, setDefaultSource] = useState<LeadSource>('Manual')
  const [campaignId, setCampaignId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)

  function processRows(rows: Record<string, string>[]) {
    const mapped: Omit<Lead, 'id' | 'created_at' | 'updated_at'>[] = []
    let skip = 0
    rows.forEach((row) => {
      const lead = mapRow(row, defaultSource)
      if (lead) mapped.push(lead)
      else skip++
    })
    if (mapped.length === 0) {
      setError('No valid leads found. Make sure your file has a "Business Name" column.')
      return
    }
    setParsedRows(mapped)
    setSkipped(skip)
    setStep('preview')
  }

  function handleFile(file: File) {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name)
    const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv'
    if (!isExcel && !isCsv) {
      setError('Please upload a .csv or Excel (.xlsx / .xls) file')
      return
    }
    setError(null)
    const reader = new FileReader()

    if (isExcel) {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const raw: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
        if (raw.length < 2) { setError('Spreadsheet appears to be empty.'); return }
        const headerIdx = findHeaderRowIndex(raw)
        const headers = raw[headerIdx].map((h) => String(h))
        const rows: Record<string, string>[] = raw.slice(headerIdx + 1).map((rowArr) => {
          const row: Record<string, string> = {}
          headers.forEach((h, i) => { row[h] = String(rowArr[i] ?? '') })
          return row
        }).filter((row) => Object.values(row).some(Boolean))
        processRows(rows)
      }
      reader.readAsArrayBuffer(file)
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string
        const { headers, rows: rawRows } = parseCSV(text)
        // If the first "header" row looks like a title, re-parse skipping it
        const allRows = [headers, ...rawRows.map((r) => headers.map((h) => r[h] ?? ''))]
        const headerIdx = findHeaderRowIndex(allRows.map((r) => (Array.isArray(r) ? r : Object.values(r))))
        if (headerIdx > 0) {
          const realHeaders = allRows[headerIdx] as string[]
          const realRows: Record<string, string>[] = allRows.slice(headerIdx + 1).map((rowArr) => {
            const row: Record<string, string> = {}
            realHeaders.forEach((h, i) => { row[h] = String((rowArr as string[])[i] ?? '') })
            return row
          }).filter((row) => Object.values(row).some(Boolean))
          processRows(realRows)
        } else {
          processRows(rawRows)
        }
      }
      reader.readAsText(file)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleImport() {
    setStep('importing')
    try {
      const rows = parsedRows.map((r) => ({
        ...r,
        campaign_id: campaignId || undefined,
      }))
      await onImport(rows)
      setImportedCount(rows.length)
      setStep('done')
    } catch (err: any) {
      setError(err.message ?? 'Import failed')
      setStep('preview')
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', zIndex: 100 }}
    >
      <div
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-edge)',
          borderRadius: 14,
          width: '100%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 16,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--c-edge)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} style={{ color: '#f97316' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>Import CSV / Excel</span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--c-ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Step: Upload */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--c-edge)',
                  borderRadius: 10,
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#f97316')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--c-edge)')}
              >
                <Upload size={32} style={{ color: 'var(--c-edge-2)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'var(--c-ink-2)', marginBottom: 4 }}>
                  Drop your CSV or Excel file here, or click to browse
                </p>
                <p style={{ fontSize: 12, color: 'var(--c-ink-3)' }}>
                  Accepts .csv, .xlsx, .xls · Columns: Business Name, Industry, Location, Website, Phone, Email…
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {/* Options */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--c-ink-3)', marginBottom: 5, fontFamily: 'DM Mono, monospace' }}>
                    Default Source
                  </label>
                  <select
                    value={defaultSource}
                    onChange={(e) => setDefaultSource(e.target.value as LeadSource)}
                    style={{ width: '100%', background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', borderRadius: 6, padding: '7px 10px', fontSize: 13, color: 'var(--c-ink-2)', outline: 'none', fontFamily: 'DM Mono, monospace' }}
                  >
                    {VALID_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {campaigns.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--c-ink-3)', marginBottom: 5, fontFamily: 'DM Mono, monospace' }}>
                      Assign to Campaign
                    </label>
                    <select
                      value={campaignId}
                      onChange={(e) => setCampaignId(e.target.value)}
                      style={{ width: '100%', background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', borderRadius: 6, padding: '7px 10px', fontSize: 13, color: 'var(--c-ink-2)', outline: 'none', fontFamily: 'DM Mono, monospace' }}
                    >
                      <option value="">No campaign</option>
                      {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Column guide */}
              <div style={{ background: 'var(--c-surface-2)', borderRadius: 8, padding: '12px 16px' }}>
                <p style={{ fontSize: 11, color: 'var(--c-ink-3)', marginBottom: 8, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Recognised column headers
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Business Name', 'Industry', 'Location', 'Website', 'Website Status', 'Phone', 'Email', 'Instagram', 'Facebook', 'LinkedIn', 'Contact Person', 'Source', 'Notes'].map((h) => (
                    <span key={h} style={{ fontSize: 11, background: 'var(--c-surface-3)', color: 'var(--c-primary-l)', borderRadius: 4, padding: '2px 8px', fontFamily: 'DM Mono, monospace' }}>
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ background: 'var(--t-red-bg)', border: '1px solid var(--t-red-bd)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--t-red)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'var(--t-green-bg)', border: '1px solid var(--t-green-bd)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--t-green)' }}>
                  {parsedRows.length} leads ready to import
                </div>
                {skipped > 0 && (
                  <div style={{ background: 'var(--t-amber-bg)', border: '1px solid var(--t-amber-bd)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#f59e0b' }}>
                    {skipped} rows skipped (missing business name)
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div style={{ border: '1px solid var(--c-edge)', borderRadius: 8, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-edge)' }}>
                      {['Business', 'Industry', 'Location', 'Website', 'Source'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 50).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--c-surface-2)' }}>
                        <td style={{ padding: '7px 12px', fontSize: 12, color: 'var(--c-ink)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.business_name}
                        </td>
                        <td style={{ padding: '7px 12px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {row.industry || '—'}
                        </td>
                        <td style={{ padding: '7px 12px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {row.location || '—'}
                        </td>
                        <td style={{ padding: '7px 12px', fontSize: 12, color: row.website_status === 'none' ? '#f43f5e' : '#64748b', fontFamily: 'DM Mono, monospace' }}>
                          {row.website_status?.toUpperCase() || 'NONE'}
                        </td>
                        <td style={{ padding: '7px 12px', fontSize: 11, color: 'var(--c-ink-3)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
                          {row.source}
                        </td>
                      </tr>
                    ))}
                    {parsedRows.length > 50 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '8px 12px', fontSize: 12, color: 'var(--c-ink-3)', textAlign: 'center' }}>
                          + {parsedRows.length - 50} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {error && (
                <div style={{ background: 'var(--t-red-bg)', border: '1px solid var(--t-red-bd)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--t-red)', display: 'flex', gap: 8 }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleImport}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 14, fontWeight: 600, background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Import {parsedRows.length} Leads
                </button>
                <button
                  onClick={() => { setStep('upload'); setParsedRows([]); setError(null) }}
                  style={{ padding: '10px 16px', borderRadius: 8, fontSize: 14, background: 'var(--c-surface-2)', color: '#64748b', border: '1px solid var(--c-edge)', cursor: 'pointer' }}
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Loader2 size={32} style={{ color: '#f97316', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 14, color: 'var(--c-ink-2)' }}>Importing {parsedRows.length} leads…</p>
              <p style={{ fontSize: 12, color: 'var(--c-ink-3)', marginTop: 4 }}>This may take a moment</p>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 6 }}>
                Import Complete
              </p>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
                {importedCount} leads added to your pipeline
              </p>
              <button
                onClick={onClose}
                style={{ padding: '10px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Go to Leads
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
