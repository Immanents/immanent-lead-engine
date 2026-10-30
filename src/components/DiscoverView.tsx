import { MapPin, AtSign, Search, Globe } from 'lucide-react'

const SOURCES = [
  { label: 'Google Maps', icon: MapPin, desc: 'Search for businesses in a specific area. Copy business name, location, and contact into a new lead.' },
  { label: 'Instagram', icon: AtSign, desc: 'Find businesses with active profiles but no website. Search by location tags and industry hashtags.' },
  { label: 'Facebook', icon: Globe, desc: 'Look for local business pages with poor or missing websites. Check the "Website" field on business pages.' },
  { label: 'Directories', icon: Search, desc: 'Browse industry directories (Vconnect, BusinessList, etc.) for listings without websites.' },
]

export default function DiscoverView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium" style={{ color: 'var(--c-ink)', letterSpacing: '0' }}>
          Discover
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--c-ink-2)' }}>
          Find new leads manually. V1 discovery is intentionally simple — no external scraping.
        </p>
      </div>

      <div
        className="rounded-lg px-5 py-4"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
      >
        <h2
          className="text-xs font-medium mb-4"
          style={{ color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          Discovery Workflow
        </h2>
        <ol className="space-y-3">
          {[
            'Search for businesses in a target industry and location using one of the sources below.',
            'Check whether they have a website — businesses with no website or a poor website score highest.',
            'Copy their business name, industry, location, and any contact details you can find.',
            'Click "Add Lead" in the Leads section to create the lead record.',
            'Run AI Analysis to score the lead and generate an outreach pitch.',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-mono font-medium"
                style={{ width: 22, height: 22, background: 'var(--c-surface-2)', color: 'var(--c-primary-l)', marginTop: 1 }}
              >
                {i + 1}
              </span>
              <span className="text-sm" style={{ color: 'var(--c-ink-2)', lineHeight: 1.6 }}>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {SOURCES.map((s) => (
          <div
            key={s.label}
            className="rounded-lg px-5 py-4"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={15} style={{ color: 'var(--c-primary-l)' }} />
              <h3 className="text-sm font-medium" style={{ color: 'var(--c-ink)' }}>
                {s.label}
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--c-ink-2)', lineHeight: 1.6 }}>{s.desc}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-lg px-5 py-4"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}
      >
        <h2
          className="text-xs font-medium mb-3"
          style={{ color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          What makes a High Priority lead?
        </h2>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {[
            { signal: 'No website at all', pts: '+20' },
            { signal: 'Poor/outdated website', pts: '+15' },
            { signal: 'Strong social presence', pts: '+15' },
            { signal: 'Clear services offered', pts: '+10' },
            { signal: 'Quality images/content', pts: '+10' },
            { signal: 'Good reviews visible', pts: '+10' },
            { signal: 'Established business', pts: '+10' },
            { signal: 'Clear contact information', pts: '+5' },
          ].map((row) => (
            <div key={row.signal} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--c-surface-2)' }}>
              <span className="text-xs" style={{ color: 'var(--c-ink-2)' }}>{row.signal}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--t-green)' }}>{row.pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
