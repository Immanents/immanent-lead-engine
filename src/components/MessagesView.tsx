import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, CheckCheck, Send, ShieldCheck } from 'lucide-react'
import * as db from '../lib/db'
import type { Message, Profile } from '../lib/db'

interface Props {
  meId: string
  isAdmin: boolean
  messages: Message[]
  onRefresh: () => Promise<void> | void
  onError: (msg: string) => void
}

const ONLINE_MS = 75_000

function isOnline(p: Profile | null | undefined, now: number) {
  return !!p?.last_seen_at && now - new Date(p.last_seen_at).getTime() < ONLINE_MS
}

function lastSeenLabel(p: Profile | null | undefined, now: number) {
  if (!p?.last_seen_at) return 'Offline'
  if (isOnline(p, now)) return 'Online'
  const mins = Math.floor((now - new Date(p.last_seen_at).getTime()) / 60000)
  if (mins < 60) return `Last seen ${Math.max(mins, 1)} min ago`
  const d = new Date(p.last_seen_at)
  return d.toDateString() === new Date(now).toDateString()
    ? `Last seen today at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : `Last seen ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

function Receipt({ m }: { m: Message }) {
  if (m.read_at) return <CheckCheck size={12} style={{ color: '#bfdbfe' }} aria-label="Read" />
  if (m.delivered_at) return <CheckCheck size={12} aria-label="Delivered" />
  return <Check size={12} aria-label="Sent" />
}

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'

function timeLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function MessagesView({ meId, isAdmin, messages, onRefresh, onError }: Props) {
  const [contacts, setContacts] = useState<Profile[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let first = true
    const load = () =>
      (isAdmin
        ? db.getAllProfiles().then((all) => all.filter((p) => p.id !== meId))
        : db.getAdminProfile().then((a) => (a ? [a] : []))
      ).then((c) => {
        setContacts(c)
        setNow(Date.now())
        if (first && !isAdmin && c[0]) setActiveId(c[0].id)
        first = false
      }).catch(() => {
        if (first) onError('Could not load contacts. Have you run the messages migration?')
        first = false
      })
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [isAdmin, meId, onError])

  const threads = useMemo(() => {
    const map = new Map<string, Message[]>()
    for (const m of messages) {
      const other = m.sender_id === meId ? m.recipient_id : m.sender_id
      map.set(other, [...(map.get(other) ?? []), m])
    }
    return map
  }, [messages, meId])

  const sorted = useMemo(() => {
    const last = (id: string) => threads.get(id)?.at(-1)?.created_at ?? ''
    return [...contacts].sort((a, b) => last(b.id).localeCompare(last(a.id)) || a.full_name.localeCompare(b.full_name))
  }, [contacts, threads])

  const active = contacts.find((c) => c.id === activeId) ?? null
  const thread = (activeId && threads.get(activeId)) || []
  const unreadFrom = (id: string) => (threads.get(id) ?? []).filter((m) => m.recipient_id === meId && !m.read_at).length

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [thread.length, activeId])

  useEffect(() => {
    const markIfSeen = () => {
      if (activeId && document.visibilityState === 'visible' && unreadFrom(activeId) > 0) {
        db.markMessagesRead(activeId, meId).then(() => onRefresh()).catch(() => {})
      }
    }
    markIfSeen()
    document.addEventListener('visibilitychange', markIfSeen)
    return () => document.removeEventListener('visibilitychange', markIfSeen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, messages])

  const send = useCallback(async () => {
    if (!activeId || !draft.trim() || sending) return
    setSending(true)
    try {
      await db.sendMessage(meId, activeId, draft)
      setDraft('')
      await onRefresh()
    } catch {
      onError('Message failed to send')
    } finally {
      setSending(false)
    }
  }, [activeId, draft, sending, meId, onRefresh, onError])

  const showList = isAdmin && !activeId

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-medium" style={{ color: 'var(--c-ink)', letterSpacing: '0' }}>Messages</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--c-ink-3)' }}>
          {isAdmin ? 'Message any sub account directly' : 'Send a message to your admin'}
        </p>
      </div>

      <div
        className="rounded-lg overflow-hidden flex"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)', height: 'calc(100vh - 190px)', minHeight: 360 }}
      >
        {isAdmin && (
          <div
            className={activeId ? 'hidden md:flex' : 'flex'}
            style={{ width: '100%', maxWidth: 280, flexDirection: 'column', borderRight: '1px solid var(--c-edge)', overflowY: 'auto', flexShrink: 0 }}
          >
            {sorted.length === 0 && (
              <p className="text-xs p-4" style={{ color: 'var(--c-ink-3)' }}>No other accounts yet.</p>
            )}
            {sorted.map((c) => {
              const unread = unreadFrom(c.id)
              const lastMsg = threads.get(c.id)?.at(-1)
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className="flex items-center gap-3 px-4 py-3 text-left"
                  style={{
                    background: activeId === c.id ? 'var(--c-surface-2)' : 'transparent',
                    borderBottom: '1px solid var(--c-edge)',
                    border: 'none',
                    borderBottomWidth: 1,
                    borderBottomStyle: 'solid',
                    borderBottomColor: 'var(--c-edge)',
                    cursor: 'pointer',
                  }}
                >
                  <div className="relative flex-shrink-0">
                    <div className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'var(--c-edge-2)', color: 'var(--c-primary-l)', fontSize: 11, fontWeight: 600 }}>
                      {initials(c.full_name || c.email || '')}
                    </div>
                    <span
                      title={lastSeenLabel(c, now)}
                      style={{
                        position: 'absolute', right: -1, bottom: -1, width: 10, height: 10, borderRadius: '50%',
                        background: isOnline(c, now) ? 'var(--t-green)' : 'var(--c-ink-3)',
                        border: '2px solid var(--c-surface)',
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate" style={{ color: 'var(--c-ink)' }}>{c.full_name || c.email}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--c-ink-3)' }}>{lastMsg ? lastMsg.body : c.email}</div>
                  </div>
                  {unread > 0 && (
                    <span style={{ background: 'var(--c-primary-l)', color: '#fff', borderRadius: 9999, minWidth: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingInline: 4 }}>
                      {unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div className={showList ? 'hidden md:flex' : 'flex'} style={{ flex: 1, flexDirection: 'column', minWidth: 0 }}>
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--c-ink-3)' }}>
              {isAdmin ? 'Select an account to start a conversation' : 'No admin account found'}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--c-edge)' }}>
                {isAdmin && (
                  <button className="md:hidden" onClick={() => setActiveId(null)} style={{ color: 'var(--c-ink-2)', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Back">
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: 'var(--c-ink)' }}>
                    {active.full_name || active.email}
                    {active.role === 'admin' && <ShieldCheck size={13} style={{ color: 'var(--c-primary-l)' }} />}
                  </div>
                  <div className="text-xs truncate flex items-center gap-1.5" style={{ color: isOnline(active, now) ? 'var(--t-green)' : 'var(--c-ink-3)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOnline(active, now) ? 'var(--t-green)' : 'var(--c-ink-3)', flexShrink: 0 }} />
                    {lastSeenLabel(active, now)}
                    <span style={{ color: 'var(--c-ink-3)' }}>· {active.role === 'admin' ? 'Admin' : 'Sub account'}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {thread.length === 0 && (
                  <p className="text-xs text-center pt-6" style={{ color: 'var(--c-ink-3)' }}>No messages yet. Say hello.</p>
                )}
                {thread.map((m) => {
                  const mine = m.sender_id === meId
                  return (
                    <div key={m.id} className="flex" style={{ justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div
                        style={{
                          maxWidth: '78%',
                          padding: '8px 12px',
                          borderRadius: 12,
                          background: mine ? 'var(--c-primary-l)' : 'var(--c-surface-2)',
                          color: mine ? '#fff' : 'var(--c-ink)',
                          border: mine ? 'none' : '1px solid var(--c-edge)',
                          fontSize: 13,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {m.body}
                        <div className="flex items-center justify-end gap-1" style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>
                          {timeLabel(m.created_at)}
                          {mine && <Receipt m={m} />}
                          {mine && m.read_at && <span>Read</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); send() }}
                className="flex items-end gap-2 p-3"
                style={{ borderTop: '1px solid var(--c-edge)' }}
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                  }}
                  rows={1}
                  placeholder="Write a message…"
                  style={{
                    flex: 1, resize: 'none', background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)',
                    color: 'var(--c-ink)', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', maxHeight: 120,

                  }}
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  aria-label="Send"
                  style={{
                    background: 'var(--c-primary-l)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 12px',
                    cursor: 'pointer', opacity: !draft.trim() || sending ? 0.5 : 1, display: 'flex',
                  }}
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
