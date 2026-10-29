import { useState, useEffect, useCallback, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import * as db from './lib/db'

import Sidebar, { type ViewId, SIDEBAR_EXPANDED, SIDEBAR_COLLAPSED } from './components/Sidebar'
import AuthScreen from './components/auth/AuthScreen'
import Dashboard from './components/Dashboard'
import LeadsList from './components/LeadsList'
import LeadProfile from './components/LeadProfile'
import OutreachView from './components/OutreachView'
import CampaignsView from './components/CampaignsView'
import ProposalsView from './components/ProposalsView'
import ClientsView from './components/ClientsView'
import AnalyticsView from './components/AnalyticsView'
import DiscoverView from './components/DiscoverView'
import AddLeadModal from './components/AddLeadModal'
import CsvImportModal from './components/CsvImportModal'

import type { Lead, LeadStatus, Outreach, Campaign, Proposal, Client, Activity } from './types'
import { LogOut, CheckCircle, XCircle, X, Sun, Moon } from 'lucide-react'
import { useTheme } from './lib/theme'
import type { Profile, Message } from './lib/db'
import MessagesView from './components/MessagesView'
import TeamView from './components/TeamView'

const STALE_MS = 10 * 60 * 1000 // 10 minutes

// ── Toast ──────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error' }

function ToastStack({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: t.type === 'error' ? 'var(--t-red-bg)' : 'var(--t-green-bg)',
            border: `1px solid ${t.type === 'error' ? 'var(--t-red-bd)' : 'var(--t-green-bd)'}`,
            borderRadius: 8, padding: '10px 14px',
            color: t.type === 'error' ? 'var(--t-red)' : 'var(--t-green)',
            fontSize: 13, minWidth: 260, maxWidth: 360,
            boxShadow: '0 8px 28px rgba(10,11,13,0.12)',
          }}
        >
          {t.type === 'error'
            ? <XCircle size={15} style={{ flexShrink: 0 }} />
            : <CheckCircle size={15} style={{ flexShrink: 0 }} />}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

function SettingsView({ onSignOut, profile, displayName, onViewAs, viewingId, selfId, onNameSaved }: { onSignOut: () => void; profile: Profile | null; displayName: string; onViewAs: (m: Profile | null) => void; viewingId?: string; selfId?: string; onNameSaved: (p: Profile) => void }) {
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const [nameDraft, setNameDraft] = useState(displayName)
  const [savingName, setSavingName] = useState(false)
  useEffect(() => setNameDraft(displayName), [displayName])
  const { theme, setTheme } = useTheme()
  const isAdmin = profile?.role === 'admin'
  const [team, setTeam] = useState<Profile[]>([])
  useEffect(() => {
    if (!isAdmin) return
    db.getAllProfiles().then(setTeam).catch(() => {})
  }, [isAdmin])
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-medium" style={{ color: 'var(--c-ink)', letterSpacing: '0' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--c-ink-2)' }}>Application settings and preferences</p>
      </div>
      <div className="rounded-lg px-5 py-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}>
        <h2 className="text-xs font-medium mb-4" style={{ color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Follow-up Sequence
        </h2>
        <div className="space-y-3">
          {[
            { day: 'Day 0', label: 'Initial outreach' },
            { day: 'Day 2', label: 'Follow-up #1' },
            { day: 'Day 5', label: 'Follow-up #2' },
            { day: 'Day 10', label: 'Final follow-up' },
            { day: 'No response', label: 'Move to Nurture' },
          ].map((row) => (
            <div key={row.day} className="flex items-center gap-4">
              <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--c-primary-l)' }}>
                {row.day}
              </span>
              <span className="text-sm" style={{ color: 'var(--c-ink-2)' }}>{row.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--c-ink-3)', lineHeight: 1.6 }}>
          Intervals are configurable. The system creates reminders — it does not mass-send messages.
        </p>
      </div>
      <div className="rounded-lg px-5 py-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}>
        <h2 className="text-xs font-medium mb-3" style={{ color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Profile
        </h2>
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium" style={{ color: 'var(--c-ink)' }}>{displayName}</div>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: isAdmin ? 'var(--t-orange-bg)' : 'var(--t-blue-bg)', color: isAdmin ? 'var(--c-primary-l)' : 'var(--t-blue)' }}>
            {isAdmin ? 'Admin' : profile ? 'Sub account' : 'Account'}
          </span>
        </div>
        {profile?.email && <p className="text-xs mt-1" style={{ color: 'var(--c-ink-3)' }}>{profile.email}</p>}
        {profile && (
          <form
            className="flex items-center gap-2 mt-3"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!nameDraft.trim() || nameDraft.trim() === profile.full_name) return
              setSavingName(true)
              try { onNameSaved(await db.updateProfileName(profile.id, nameDraft.trim())) } catch { /* ignore */ }
              setSavingName(false)
            }}
          >
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Display name"
              className="text-sm px-3 py-1.5 rounded-md"
              style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)', color: 'var(--c-ink)', outline: 'none', minWidth: 0, flex: '0 1 260px' }}
            />
            <button
              type="submit"
              disabled={savingName}
              className="text-sm px-3 py-1.5 rounded-md"
              style={{ background: 'var(--c-primary-l)', color: '#fff', border: 'none', cursor: 'pointer', opacity: savingName ? 0.6 : 1 }}
            >
              Save name
            </button>
          </form>
        )}
      </div>
      {isAdmin && (
        <div className="rounded-lg px-5 py-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}>
          <h2 className="text-xs font-medium mb-3" style={{ color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Team ({team.length})
          </h2>
          <div className="space-y-2">
            {team.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate" style={{ color: 'var(--c-ink)' }}>{m.full_name || m.email}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--c-ink-3)' }}>{m.email}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs" style={{ color: m.role === 'admin' ? 'var(--c-primary-l)' : 'var(--t-blue)' }}>
                    {m.role === 'admin' ? 'Admin' : 'Sub'}
                  </span>
                  {m.id !== selfId && (
                    <button
                      onClick={() => onViewAs(m)}
                      className="text-xs px-2.5 py-1 rounded-md"
                      style={{
                        background: viewingId === m.id ? 'var(--c-primary-l)' : 'var(--c-surface-2)',
                        color: viewingId === m.id ? '#fff' : 'var(--c-ink-2)',
                        border: '1px solid var(--c-edge)',
                        cursor: 'pointer',
                      }}
                    >
                      {viewingId === m.id ? 'Viewing' : 'View data'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="rounded-lg px-5 py-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}>
        <h2 className="text-xs font-medium mb-3" style={{ color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Notifications
        </h2>
        <p className="text-sm mb-3" style={{ color: 'var(--c-ink-2)' }}>
          Get a desktop alert when a new message arrives while this tab is in the background.
        </p>
        {notifPerm === 'granted' ? (
          <span className="text-xs" style={{ color: 'var(--t-green)' }}>Enabled</span>
        ) : notifPerm === 'denied' ? (
          <span className="text-xs" style={{ color: 'var(--t-red)' }}>Blocked in your browser. Allow notifications for this site in the address bar settings.</span>
        ) : notifPerm === 'unsupported' ? (
          <span className="text-xs" style={{ color: 'var(--c-ink-3)' }}>Not supported in this browser.</span>
        ) : (
          <button
            onClick={async () => setNotifPerm(await Notification.requestPermission())}
            className="text-sm px-3 py-1.5 rounded-md"
            style={{ background: 'var(--c-primary-l)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Enable notifications
          </button>
        )}
      </div>
      <div className="rounded-lg px-5 py-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}>
        <h2 className="text-xs font-medium mb-3" style={{ color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Appearance
        </h2>
        <div className="inline-flex rounded-md p-0.5" style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-edge)' }}>
          {([['light', 'Light', Sun], ['dark', 'Dark', Moon]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              aria-pressed={theme === id}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded"
              style={{
                background: theme === id ? 'var(--c-primary-l)' : 'transparent',
                color: theme === id ? '#fff' : 'var(--c-ink-2)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg px-5 py-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-edge)' }}>
        <h2 className="text-xs font-medium mb-3" style={{ color: 'var(--c-ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Account
        </h2>
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-md"
          style={{ background: 'var(--t-red-bg)', color: 'var(--t-red)', border: '1px solid var(--t-red-bd)' }}
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '2px solid var(--c-edge)',
            borderTopColor: 'var(--c-primary-l)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <p style={{ fontSize: 13, color: 'var(--c-ink-3)' }}>Loading…</p>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [view, setView] = useState<ViewId>('dashboard')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [viewAs, setViewAs] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [teamUnread, setTeamUnread] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAddLead, setShowAddLead] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)

  // Data state
  const [leads, setLeads] = useState<Lead[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [outreach, setOutreach] = useState<Outreach[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dbReady, setDbReady] = useState(true)

  // Cache tracking — only reload data if it's older than 10 minutes or missing
  const lastLoadedAt = useRef<number>(0)
  const hasLoadedData = useRef(false)
  const loadedFor = useRef<string | null>(null)

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([])
  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load profile (name + role)
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) { setProfile(null); return }
    db.getProfile(userId).then(setProfile).catch(() => setProfile(null))
  }, [userId])

  const meta = session?.user?.user_metadata as { full_name?: string } | undefined
  const displayName = (profile?.full_name || meta?.full_name || session?.user?.email?.split('@')[0] || 'You').trim()
  const userRole: 'admin' | 'sub' | null = profile?.role ?? null

  // Load data when session is available
  const loadData = useCallback(async (userId: string) => {
    setDataLoading(true)
    try {
      const leadsResult = await db.getLeads(userId)
      setDbReady(true)
      const [c, o, p, cl, a] = await Promise.all([
        db.getCampaigns(userId).catch(() => []),
        db.getOutreach(userId).catch(() => []),
        db.getProposals(userId).catch(() => []),
        db.getClients(userId).catch(() => []),
        db.getActivities(userId).catch(() => []),
      ])
      setLeads(leadsResult)
      setCampaigns(c)
      setOutreach(o as Outreach[])
      setProposals(p as Proposal[])
      setClients(cl)
      setActivities(a)
      lastLoadedAt.current = Date.now()
      hasLoadedData.current = true
      loadedFor.current = userId
    } catch (err: any) {
      // Table doesn't exist yet — schema hasn't been run
      if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
        setDbReady(false)
      }
    } finally {
      setDataLoading(false)
    }
  }, [])

  const viewRef = useRef(view)
  viewRef.current = view
  const knownMsgIds = useRef<Set<string> | null>(null)
  const baseTitle = useRef(typeof document !== 'undefined' ? document.title : '')

  const notifyIncoming = useCallback(async (incoming: Message[]) => {
    if (incoming.length === 0 || !userId) return
    const latest = incoming[incoming.length - 1]
    let sender = 'New message'
    try { sender = (await db.getVisibleProfile(latest.sender_id))?.full_name || sender } catch { /* ignore */ }
    const text = incoming.length > 1 ? `${incoming.length} new messages` : latest.body
    const looking = document.visibilityState === 'visible' && viewRef.current === 'messages'
    if (!looking) showToast(`${sender}: ${text.length > 80 ? text.slice(0, 80) + '…' : text}`, 'success')
    if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(sender, { body: text, tag: 'ile-message', icon: '/favicon.png' })
      n.onclick = () => { window.focus(); setView('messages'); setSelectedLeadId(null); n.close() }
    }
  }, [userId, showToast])

  const refreshMessages = useCallback(async () => {
    if (!userId) return
    try {
      const list = await db.getMessages()
      setMessages(list)
      const incoming = list.filter((m) => m.recipient_id === userId)
      if (incoming.some((m) => !m.delivered_at)) db.markMessagesDelivered(userId).catch(() => {})
      if (knownMsgIds.current === null) {
        knownMsgIds.current = new Set(incoming.map((m) => m.id))
      } else {
        const fresh = incoming.filter((m) => !knownMsgIds.current!.has(m.id))
        fresh.forEach((m) => knownMsgIds.current!.add(m.id))
        notifyIncoming(fresh)
      }
    } catch { /* messages table not migrated yet */ }
  }, [userId, notifyIncoming])

  useEffect(() => {
    knownMsgIds.current = null
    if (!userId) { setMessages([]); return }
    refreshMessages()
    const t = setInterval(refreshMessages, 10000)
    // Realtime: instant delivery, read receipts and notifications (falls back to polling if unavailable)
    const channel = supabase
      .channel(`messages-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, () => { refreshMessages() })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` }, () => { refreshMessages() })
      .subscribe()
    return () => { clearInterval(t); supabase.removeChannel(channel) }
  }, [userId, refreshMessages])

  const refreshTeamUnread = useCallback(async () => {
    if (!userId) return
    try {
      await db.markTeamDelivered().catch(() => {})
      setTeamUnread(await db.getTeamUnread())
    } catch { /* teams not migrated yet */ }
  }, [userId])

  useEffect(() => {
    if (!userId) { setTeamUnread(0); return }
    refreshTeamUnread()
    const t = setInterval(refreshTeamUnread, 15000)
    const channel = supabase
      .channel(`team-inbox-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, async (payload) => {
        const row = payload.new as { sender_id: string; body: string }
        if (row.sender_id === userId) return
        refreshTeamUnread()
        const looking = document.visibilityState === 'visible' && viewRef.current === 'team'
        let sender = 'Team'
        try { sender = (await db.getVisibleProfile(row.sender_id))?.full_name || sender } catch { /* ignore */ }
        const text = row.body.length > 80 ? row.body.slice(0, 80) + '…' : row.body
        if (!looking) showToast(`${sender} (team): ${text}`, 'success')
        if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(`${sender} · Team`, { body: text, tag: 'ile-team', icon: '/favicon.png' })
          n.onclick = () => { window.focus(); setView('team'); setSelectedLeadId(null); n.close() }
        }
      })
      .subscribe()
    return () => { clearInterval(t); supabase.removeChannel(channel) }
  }, [userId, refreshTeamUnread, showToast])

  // Presence heartbeat: lets others see when this account is online
  useEffect(() => {
    if (!userId) return
    const beat = () => { if (document.visibilityState === 'visible') db.touchPresence(userId).catch(() => {}) }
    beat()
    const t = setInterval(beat, 30000)
    document.addEventListener('visibilitychange', beat)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', beat) }
  }, [userId])

  const unreadMessages = messages.filter((m) => m.recipient_id === userId && !m.read_at).length

  useEffect(() => {
    const n = unreadMessages + teamUnread
    document.title = n > 0 ? `(${n}) ${baseTitle.current}` : baseTitle.current
  }, [unreadMessages, teamUnread])

  const targetId = viewAs?.id ?? session?.user?.id
  const readOnly = viewAs !== null

  useEffect(() => {
    if (!targetId) return
    const isFresh = hasLoadedData.current && loadedFor.current === targetId && (Date.now() - lastLoadedAt.current < STALE_MS)
    if (!isFresh) loadData(targetId)
  }, [targetId, loadData])

  function handleViewAs(member: Profile | null) {
    setViewAs(member && member.id !== session?.user?.id ? member : null)
    setView('dashboard')
    setSelectedLeadId(null)
  }

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED
  const pendingOutreach = outreach.filter((o) => o.status === 'PENDING_APPROVAL')

  function handleViewLead(id: string) {
    setSelectedLeadId(id)
    setView('leads')
  }

  function handleNavigate(v: string) {
    setView(v as ViewId)
    setSelectedLeadId(null)
  }

  async function handleUpdateStatus(id: string, status: LeadStatus) {
    if (readOnly) { showToast('Read-only: you are viewing another account', 'error'); return }
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l))
    await db.updateLeadStatus(id, status)
  }

  async function handleAddLead(data: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'lead_score' | 'priority'>) {
    if (readOnly) { showToast('Read-only: you are viewing another account', 'error'); return }
    if (!session?.user) return
    try {
      const newLead = await db.createLead(session.user.id, {
        ...data,
        lead_score: 50,
        priority: 'Maybe',
      })
      setLeads((prev) => [newLead, ...prev])
      showToast(`Lead "${newLead.business_name}" added successfully`)
    } catch (err: any) {
      console.error('Failed to create lead:', err)
      showToast(
        err?.message?.includes('does not exist')
          ? 'Database not set up yet. Please run the schema SQL in your Supabase dashboard.'
          : `Failed to save lead: ${err?.message ?? 'Unknown error'}`,
        'error'
      )
    }
  }

  async function handleCsvImport(rows: Omit<Lead, 'id' | 'created_at' | 'updated_at'>[]) {
    if (readOnly) { showToast('Read-only: you are viewing another account', 'error'); return }
    if (!session?.user) return
    const imported = await db.bulkInsertLeads(session.user.id, rows)
    setLeads((prev) => [...imported, ...prev])
    setView('leads')
  }

  async function handleAddCampaign(
    campaign: Omit<Campaign, 'id' | 'created_at' | 'total_leads' | 'qualified' | 'contacted' | 'replies' | 'interested' | 'proposals' | 'won' | 'revenue'>
  ) {
    if (readOnly) { showToast('Read-only: you are viewing another account', 'error'); return }
    if (!session?.user) return
    const created = await db.createCampaign(session.user.id, campaign)
    setCampaigns((prev) => [created, ...prev])
  }

  async function handleAddProposal(
    proposal: Omit<Proposal, 'id' | 'created_at' | 'sent_at' | 'accepted_at' | 'business_name'>
  ) {
    if (readOnly) { showToast('Read-only: you are viewing another account', 'error'); return }
    if (!session?.user) return
    const created = await db.createProposal(session.user.id, proposal)
    setProposals((prev) => [created, ...prev])
  }

  async function handleProposalStatusChange(
  id: string,
  status: Proposal['status'],
) {
    if (readOnly) { showToast('Read-only: you are viewing another account', 'error'); return }
  await db.updateProposalStatus(
    id,
    status,
  )

  setProposals((prev) =>
    prev.map((proposal) =>
      proposal.id === id
        ? {
            ...proposal,
            status,
            ...(status === 'SENT'
              ? {
                  sent_at:
                    new Date().toISOString(),
                }
              : {}),
            ...(status === 'ACCEPTED'
              ? {
                  accepted_at:
                    new Date().toISOString(),
                }
              : {}),
          }
        : proposal,
    ),
  )
}

  async function handleApproveOutreach(id: string) {
    if (readOnly) { showToast('Read-only: you are viewing another account', 'error'); return }
    setOutreach((prev) => prev.map((o) => o.id === id ? { ...o, status: 'SENT' as const } : o))
    await db.approveOutreach(id)
  }

  async function handleRejectOutreach(id: string) {
    if (readOnly) { showToast('Read-only: you are viewing another account', 'error'); return }
    setOutreach((prev) => prev.filter((o) => o.id !== id))
    await db.rejectOutreach(id)
  }

  async function handleSignOut() {
    setViewAs(null)
    await supabase.auth.signOut()
    setLeads([]); setCampaigns([]); setOutreach([]); setProposals([]); setClients([]); setActivities([])
  }

  // Compute campaign metrics from live lead data
  const campaignsWithMetrics: Campaign[] = campaigns.map((c) => {
    const cLeads = leads.filter((l) => l.campaign_id === c.id)
    return {
      ...c,
      total_leads: cLeads.length,
      qualified: cLeads.filter((l) => ['QUALIFIED', 'CONTACTED', 'INTERESTED', 'PROPOSAL', 'WON'].includes(l.status)).length,
      contacted: cLeads.filter((l) => ['CONTACTED', 'INTERESTED', 'PROPOSAL', 'WON'].includes(l.status)).length,
      replies: cLeads.filter((l) => ['INTERESTED', 'PROPOSAL', 'WON'].includes(l.status)).length,
      interested: cLeads.filter((l) => ['INTERESTED', 'PROPOSAL', 'WON'].includes(l.status)).length,
      proposals: cLeads.filter((l) => l.status === 'PROPOSAL').length,
      won: cLeads.filter((l) => l.status === 'WON').length,
      revenue: cLeads.filter((l) => l.status === 'WON').reduce((s, l) => s + (l.suggested_price ?? 0), 0),
    }
  })

  const selectedLead = selectedLeadId ? leads.find((l) => l.id === selectedLeadId) : null

  // Auth loading
  if (session === undefined) return <LoadingScreen />

  // Not authenticated
  if (!session) return <AuthScreen onAuth={() => {}} />

  // Authenticated but data loading
  if (dataLoading && leads.length === 0) return <LoadingScreen />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)' }}>
      <Sidebar
        active={view}
        onNavigate={(v) => { setView(v); setSelectedLeadId(null) }}
        pendingApprovals={pendingOutreach.length}
        unreadMessages={unreadMessages}
        unreadTeam={teamUnread}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        userName={displayName}
        userRole={userRole}
      />

      {/* Mobile top bar */}
      <header
        className="mobile-header"
        style={{
          display: 'none',
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 52,
          background: 'var(--c-surface)',
          borderBottom: '1px solid var(--c-edge)',
          zIndex: 30,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <button
          onClick={() => setMobileMenuOpen(true)}
          style={{ background: 'none', border: 'none', color: 'var(--c-ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect y="3" width="18" height="1.5" rx="0.75" fill="currentColor"/>
            <rect y="8.25" width="18" height="1.5" rx="0.75" fill="currentColor"/>
            <rect y="13.5" width="18" height="1.5" rx="0.75" fill="currentColor"/>
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 22, height: 22, background: 'var(--c-primary-l)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>Immanent</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={toggleTheme}
          aria-label="Toggle light/dark mode"
          style={{ background: 'none', border: 'none', color: 'var(--c-ink-2)', cursor: 'pointer', display: 'flex', padding: 0 }}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        {pendingOutreach.length > 0 ? (
          <span style={{ background: 'var(--c-primary-l)', color: '#fff', borderRadius: 9999, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
            {pendingOutreach.length}
          </span>
        ) : null}
        </div>
      </header>

      {viewAs && (
        <div
          className="viewas-banner"
          style={{
            marginLeft: sidebarWidth,
            position: 'sticky', top: 0, zIndex: 25,
            background: 'var(--t-orange-bg)', borderBottom: '1px solid var(--c-primary-l)',
            padding: '8px 32px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            fontSize: 13, color: 'var(--c-ink)', transition: 'margin-left 0.2s ease',
          }}
        >
          <span>
            Viewing <strong>{viewAs.full_name || viewAs.email}</strong>'s workspace — read-only
          </span>
          <button
            onClick={() => handleViewAs(null)}
            className="text-xs px-3 py-1 rounded-md"
            style={{ background: 'var(--c-primary-l)', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            Back to my workspace
          </button>
        </div>
      )}

      {/* Main content */}
      <main
        className="app-main"
        style={{ marginLeft: sidebarWidth, minHeight: '100vh', padding: '28px 32px', transition: 'margin-left 0.2s ease' }}
      >
        {view === 'dashboard' && (
          <Dashboard
            leads={leads}
            activities={activities}
            pendingOutreach={pendingOutreach}
            onViewLead={handleViewLead}
            onNavigate={handleNavigate}
            userName={displayName}
          />
        )}

        {view === 'leads' && !selectedLead && (
          <LeadsList
            leads={leads}
            onViewLead={handleViewLead}
            onAddLead={() => setShowAddLead(true)}
            onImportCsv={() => setShowCsvImport(true)}
            onDeleteLead={async (id) => {
              try {
                await db.deleteLead(id)
                setLeads((prev) => prev.filter((l) => l.id !== id))
              } catch (err: any) {
                showToast(`Failed to delete lead: ${err?.message ?? 'Unknown error'}`, 'error')
              }
            }}
          />
        )}

        {view === 'leads' && selectedLead && (
          <LeadProfile
            lead={selectedLead}
            onBack={() => setSelectedLeadId(null)}
            onUpdateStatus={handleUpdateStatus}
            onLeadUpdate={(updated) =>
              setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
            }
          />
        )}

        {view === 'discover' && <DiscoverView />}

        {view === 'outreach' && (
          <OutreachView
            outreach={outreach}
            onApprove={handleApproveOutreach}
            onReject={handleRejectOutreach}
          />
        )}

        {view === 'campaigns' && <CampaignsView campaigns={campaignsWithMetrics} onAdd={handleAddCampaign} />}

        {view === 'proposals' && (
  <ProposalsView
    proposals={proposals}
    leads={leads}
    onAdd={handleAddProposal}
    onStatusChange={handleProposalStatusChange}
  />
)}

        {view === 'clients' && <ClientsView clients={clients} />}

        {view === 'analytics' && <AnalyticsView leads={leads} campaigns={campaignsWithMetrics} />}

        {view === 'messages' && (
          <MessagesView
            meId={session.user.id}
            isAdmin={userRole === 'admin'}
            messages={messages}
            onRefresh={refreshMessages}
            onError={(m) => showToast(m, 'error')}
          />
        )}

        {view === 'team' && (
          <TeamView
            meId={session.user.id}
            isAdmin={profile?.role === 'admin'}
            onUnreadChange={refreshTeamUnread}
            onError={(m) => showToast(m, 'error')}
            onInfo={(m) => showToast(m, 'success')}
          />
        )}

        {view === 'settings' && <SettingsView onSignOut={handleSignOut} profile={profile} displayName={displayName} onViewAs={handleViewAs} viewingId={viewAs?.id} selfId={session.user.id} onNameSaved={setProfile} />}
      </main>

      {showAddLead && (
        <AddLeadModal
          onClose={() => setShowAddLead(false)}
          onAdd={handleAddLead}
          campaigns={campaigns}
        />
      )}

      {showCsvImport && (
        <CsvImportModal
          onClose={() => { setShowCsvImport(false) }}
          onImport={handleCsvImport}
          campaigns={campaigns}
        />
      )}

      {/* DB not ready banner */}
      {!dbReady && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 190,
          background: 'var(--t-amber-bg)', borderTop: '1px solid var(--t-amber-bd)',
          padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <XCircle size={16} style={{ color: 'var(--t-amber)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'var(--t-amber)', flex: 1 }}>
            <strong>Database not set up.</strong> Leads and data will not save until you run the schema SQL in your{' '}
            <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{ color: 'var(--t-amber)', textDecoration: 'underline' }}>
              Supabase SQL Editor
            </a>.
          </p>
          <button onClick={() => setDbReady(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-amber)', padding: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}

      <ToastStack toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  )
}
