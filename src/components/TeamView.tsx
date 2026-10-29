import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Check, CheckCheck, Clock, Crown, LogOut, Plus, Send, Trash2, UserPlus, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import * as db from '../lib/db'
import type { Profile, Team, TeamMember, TeamMessage } from '../lib/db'

type Member = TeamMember & { profile: Profile | null }

interface Props {
  meId: string
  isAdmin?: boolean
  onUnreadChange: () => void
  onError: (msg: string) => void
  onInfo: (msg: string) => void
}

const ONLINE_MS = 75_000
const isOnline = (p: Profile | null | undefined, now: number) =>
  !!p?.last_seen_at && now - new Date(p.last_seen_at).getTime() < ONLINE_MS
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'
const timeLabel = (iso: string) => {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function Receipt({ state, title }: { state: 'pending' | 'failed' | 'sent' | 'delivered' | 'read'; title: string }) {
  if (state === 'pending') return <Clock size={11} aria-label="Sending" />
  if (state === 'failed') return <AlertCircle size={12} aria-label="Not sent" />
  const Icon = state === 'sent' ? Check : CheckCheck
  return (
    <span title={title} style={{ display: 'inline-flex', color: state === 'read' ? '#93c5fd' : undefined }}>
      <Icon size={13} aria-label={state} />
    </span>
  )
}

const CARD = { background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }
const INPUT = {
  background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', color: 'var(--c-ink)',
  borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', minWidth: 0,
}
const BTN = { background: 'var(--c-primary-l)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }

export default function TeamView({ meId, isAdmin, onUnreadChange, onError, onInfo }: Props) {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [draft, setDraft] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [outbox, setOutbox] = useState<{ id: string; body: string; failed: boolean }[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  const active = teams?.find((t) => t.id === activeId) ?? null
  const isLeader = active?.leader_id === meId
  const isMember = members.some((m) => m.user_id === meId)
  const oversight = !!isAdmin && !!active && members.length > 0 && !isMember
  const nameOf = useMemo(() => {
    const map = new Map(members.map((m) => [m.user_id, m.profile?.full_name || m.profile?.email || 'Member']))
    return (id: string) => map.get(id) ?? 'Member'
  }, [members])

  const loadTeams = useCallback(async () => {
    try {
      const list = await db.getMyTeams()
      setTeams(list)
      setActiveId((cur) => (cur && list.some((t) => t.id === cur) ? cur : list[0]?.id ?? null))
    } catch {
      setTeams([])
      onError('Could not load teams. Have you run the teams migration?')
    }
  }, [onError])

  useEffect(() => { loadTeams() }, [loadTeams])

  const loadMembers = useCallback(async (teamId: string) => {
    try { setMembers(await db.getTeamMembers(teamId)); setNow(Date.now()) } catch { /* ignore */ }
  }, [])

  const loadMessages = useCallback(async (teamId: string) => {
    try { setMessages(await db.getTeamMessages(teamId)) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!activeId) { setMembers([]); setMessages([]); return }
    loadMembers(activeId)
    loadMessages(activeId)
    const poll = setInterval(() => { loadMembers(activeId); loadMessages(activeId) }, 10000)
    const channel = supabase
      .channel(`team-${activeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `team_id=eq.${activeId}` }, () => loadMessages(activeId))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_members', filter: `team_id=eq.${activeId}` }, () => loadMembers(activeId))
      .subscribe()
    return () => { clearInterval(poll); supabase.removeChannel(channel) }
  }, [activeId, loadMembers, loadMessages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
    if (!activeId || document.visibilityState !== 'visible') return
    db.markTeamRead(activeId, meId).then(onUnreadChange).catch(() => {})
  }, [messages.length, outbox.length, activeId, meId, onUnreadChange])

  useEffect(() => {
    const onVis = () => {
      if (activeId && document.visibilityState === 'visible') db.markTeamRead(activeId, meId).then(onUnreadChange).catch(() => {})
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [activeId, meId, onUnreadChange])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      const t = await db.createTeam(newName)
      setNewName('')
      setShowCreate(false)
      await loadTeams()
      setActiveId(t.id)
      onInfo(`Team "${t.name}" created`)
    } catch (err: any) {
      onError(err?.message ?? 'Could not create team')
    } finally {
      setCreating(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!active || !email.trim() || adding) return
    setAdding(true)
    try {
      await db.addTeamMember(active.id, email)
      setEmail('')
      await loadMembers(active.id)
      onInfo('Member added')
    } catch (err: any) {
      onError(err?.message ?? 'Could not add member')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(m: Member) {
    if (!active) return
    const self = m.user_id === meId
    if (!window.confirm(self ? `Leave "${active.name}"?` : `Remove ${m.profile?.full_name || 'this member'} from the team?`)) return
    try {
      await db.removeTeamMember(active.id, m.user_id)
      if (self) await loadTeams()
      else await loadMembers(active.id)
    } catch {
      onError('Could not update the team')
    }
  }

  async function handleDelete() {
    if (!active || !window.confirm(`Delete "${active.name}" and all its messages? This cannot be undone.`)) return
    try {
      await db.deleteTeam(active.id)
      await loadTeams()
      onUnreadChange()
    } catch {
      onError('Could not delete the team')
    }
  }

  async function deliver(tempId: string, body: string) {
    if (!active) return
    setOutbox((o) => o.map((x) => (x.id === tempId ? { ...x, failed: false } : x)))
    try {
      await db.sendTeamMessage(active.id, meId, body)
      await loadMessages(active.id)
      setOutbox((o) => o.filter((x) => x.id !== tempId))
    } catch {
      setOutbox((o) => o.map((x) => (x.id === tempId ? { ...x, failed: true } : x)))
    }
  }

  function send() {
    if (!active || !draft.trim()) return
    const tempId = `tmp-${Date.now()}`
    const body = draft.trim()
    setOutbox((o) => [...o, { id: tempId, body, failed: false }])
    setDraft('')
    deliver(tempId, body)
  }

  function receiptFor(m: TeamMessage): { state: 'sent' | 'delivered' | 'read'; title: string } {
    const others = members.filter((x) => x.user_id !== meId)
    if (others.length === 0) return { state: 'sent', title: 'Sent' }
    const t = new Date(m.created_at).getTime()
    const read = others.filter((x) => x.last_read_at && new Date(x.last_read_at).getTime() >= t).length
    const got = others.filter((x) => {
      const d = Math.max(x.last_delivered_at ? new Date(x.last_delivered_at).getTime() : 0, x.last_read_at ? new Date(x.last_read_at).getTime() : 0)
      return d >= t
    }).length
    if (read === others.length) return { state: 'read', title: 'Read by everyone' }
    if (got === others.length) return { state: 'delivered', title: `Delivered to everyone. Read by ${read}/${others.length}` }
    return { state: 'sent', title: `Delivered to ${got}/${others.length}. Read by ${read}/${others.length}` }
  }

  const createForm = (
    <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-2">
      <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Team name, e.g. Lagos Outreach" style={{ ...INPUT, flex: '1 1 220px' }} />
      <button type="submit" disabled={creating || !newName.trim()} style={{ ...BTN, opacity: creating || !newName.trim() ? 0.6 : 1 }}>
        Create team
      </button>
    </form>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: 'var(--c-ink)', letterSpacing: '0' }}>Team</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--c-ink-3)' }}>
            {isAdmin ? 'Admin view: you can read every team and its messages' : 'Create a team, add accounts by email, and chat together'}
          </p>
        </div>
        {teams && teams.length > 0 && (
          <button onClick={() => setShowCreate((s) => !s)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md" style={{ background: 'var(--c-surface-2)', color: 'var(--c-ink-2)', border: '1px solid var(--c-edge)', cursor: 'pointer' }}>
            {showCreate ? <X size={13} /> : <Plus size={13} />} New team
          </button>
        )}
      </div>

      {teams === null && <p className="text-sm" style={{ color: 'var(--c-ink-3)' }}>Loading…</p>}

      {teams && teams.length === 0 && (
        <div className="rounded-lg px-5 py-6" style={CARD}>
          <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--c-ink)' }}>
            <Users size={16} style={{ color: 'var(--c-primary-l)' }} />
            <span className="text-sm font-medium">You are not in a team yet</span>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--c-ink-3)' }}>
            Create one and you become its leader, so you can add other accounts. Or ask a team leader to add your email.
          </p>
          {createForm}
        </div>
      )}

      {showCreate && teams && teams.length > 0 && (
        <div className="rounded-lg px-5 py-4" style={CARD}>{createForm}</div>
      )}

      {teams && teams.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className="text-sm px-3 py-1.5 rounded-md"
              style={{
                background: t.id === activeId ? 'var(--c-primary-l)' : 'var(--c-surface)',
                color: t.id === activeId ? '#fff' : 'var(--c-ink-2)',
                border: '1px solid var(--c-edge)',
                cursor: 'pointer',
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="rounded-lg overflow-hidden flex" style={{ ...CARD, height: 'calc(100vh - 230px)', minHeight: 380 }}>
          <aside
            className={showMembers ? 'flex' : 'hidden md:flex'}
            style={{ width: '100%', maxWidth: 290, flexDirection: 'column', borderRight: '1px solid var(--c-edge)', flexShrink: 0, overflowY: 'auto' }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--c-edge)' }}>
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--c-ink)' }}>{active.name}</div>
              <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
                {members.length} member{members.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="flex-1">
              {members.map((m) => {
                const online = isOnline(m.profile, now)
                const name = m.profile?.full_name || m.profile?.email || 'Member'
                return (
                  <div key={m.user_id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="relative flex-shrink-0">
                      <div className="flex items-center justify-center rounded-full" style={{ width: 30, height: 30, background: 'var(--c-edge-2)', color: 'var(--c-primary-l)', fontSize: 11, fontWeight: 600 }}>
                        {initials(name)}
                      </div>
                      <span style={{ position: 'absolute', right: -1, bottom: -1, width: 10, height: 10, borderRadius: '50%', background: m.user_id === meId || online ? 'var(--t-green)' : 'var(--c-ink-3)', border: '2px solid var(--c-surface)' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate flex items-center gap-1" style={{ color: 'var(--c-ink)' }}>
                        {name}{m.user_id === meId && <span style={{ color: 'var(--c-ink-3)' }}> (you)</span>}
                        {m.user_id === active.leader_id && <Crown size={12} style={{ color: 'var(--c-primary-l)', flexShrink: 0 }} aria-label="Team leader" />}
                      </div>
                      <div className="text-xs" style={{ color: m.user_id === meId || online ? 'var(--t-green)' : 'var(--c-ink-3)' }}>
                        {m.user_id === meId || online ? 'Online' : 'Offline'}
                      </div>
                    </div>
                    {isLeader && !oversight && m.user_id !== meId && (
                      <button onClick={() => handleRemove(m)} title="Remove from team" aria-label="Remove from team" style={{ color: 'var(--c-ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--c-edge)' }}>
              {isLeader && !oversight && (
                <form onSubmit={handleAdd} className="flex gap-1.5">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Add by email" style={{ ...INPUT, flex: 1, padding: '6px 10px' }} />
                  <button type="submit" disabled={adding || !email.trim()} aria-label="Add member" style={{ ...BTN, padding: '6px 10px', opacity: adding || !email.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center' }}>
                    <UserPlus size={14} />
                  </button>
                </form>
              )}
              {oversight ? (
                <div className="text-xs" style={{ color: 'var(--c-ink-3)' }}>
                  Read-only oversight. Leader: {nameOf(active.leader_id)}
                </div>
              ) : isLeader ? (
                <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--t-red)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={12} /> Delete team
                </button>
              ) : (
                <button onClick={() => handleRemove({ team_id: active.id, user_id: meId, added_at: '', last_read_at: null, profile: null })} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--t-red)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <LogOut size={12} /> Leave team
                </button>
              )}
            </div>
          </aside>

          <section className={showMembers ? 'hidden md:flex' : 'flex'} style={{ flex: 1, flexDirection: 'column', minWidth: 0 }}>
            <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--c-edge)' }}>
              <div className="text-sm font-medium truncate" style={{ color: 'var(--c-ink)' }}># {active.name}</div>
              <button className="md:hidden flex items-center gap-1 text-xs" onClick={() => setShowMembers(true)} style={{ color: 'var(--c-ink-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Users size={14} /> Members
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {messages.length === 0 && (
                <p className="text-xs text-center pt-6" style={{ color: 'var(--c-ink-3)' }}>No messages yet. Start the conversation.</p>
              )}
              {messages.map((m, i) => {
                const mine = m.sender_id === meId
                const showName = !mine && messages[i - 1]?.sender_id !== m.sender_id
                return (
                  <div key={m.id} className="flex flex-col" style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                    {showName && <span className="text-xs mb-0.5 ml-1" style={{ color: 'var(--c-primary-l)' }}>{nameOf(m.sender_id)}</span>}
                    <div
                      style={{
                        maxWidth: '78%', padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                        background: mine ? 'var(--c-primary-l)' : 'var(--c-surface-2)', color: mine ? '#fff' : 'var(--c-ink)',
                        border: mine ? 'none' : '1px solid var(--c-edge)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                      }}
                    >
                      {m.body}
                      <div className="flex items-center justify-end gap-1" style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                        {timeLabel(m.created_at)}
                        {mine && !oversight && (() => { const r = receiptFor(m); return <Receipt state={r.state} title={r.title} /> })()}
                      </div>
                    </div>
                  </div>
                )
              })}
              {outbox.map((o) => (
                <div key={o.id} className="flex flex-col" style={{ alignItems: 'flex-end' }}>
                  <div style={{ maxWidth: '78%', padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5, background: 'var(--c-primary-l)', color: '#fff', opacity: o.failed ? 0.6 : 0.85, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {o.body}
                    <div className="flex items-center justify-end gap-1" style={{ fontSize: 10, marginTop: 2 }}>
                      <Receipt state={o.failed ? 'failed' : 'pending'} title="" />
                      {o.failed ? 'Not sent' : 'Sending…'}
                    </div>
                  </div>
                  {o.failed && (
                    <div className="text-xs mt-1 flex gap-3">
                      <button onClick={() => deliver(o.id, o.body)} style={{ color: 'var(--c-primary-l)', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
                      <button onClick={() => setOutbox((x) => x.filter((y) => y.id !== o.id))} style={{ color: 'var(--c-ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>Discard</button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {oversight ? (
              <div className="px-4 py-3 text-xs" style={{ borderTop: '1px solid var(--c-edge)', color: 'var(--c-ink-3)' }}>
                You are viewing this team as admin. Messaging is disabled.
              </div>
            ) : (
            <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex items-end gap-2 p-3" style={{ borderTop: '1px solid var(--c-edge)' }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                rows={1}
                placeholder="Message the team…"
                style={{ ...INPUT, flex: 1, resize: 'none', maxHeight: 120 }}
              />
              <button type="submit" disabled={!draft.trim()} aria-label="Send" style={{ ...BTN, padding: '9px 12px', opacity: !draft.trim() ? 0.5 : 1, display: 'flex' }}>
                <Send size={15} />
              </button>
            </form>
            )}
            {showMembers && (
              <button className="md:hidden text-xs py-2" onClick={() => setShowMembers(false)} style={{ color: 'var(--c-ink-2)', background: 'none', border: 'none', borderTop: '1px solid var(--c-edge)', cursor: 'pointer' }}>
                Back to chat
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
