import {
  LayoutDashboard,
  Users,
  Compass,
  Send,
  Megaphone,
  FileText,
  Briefcase,
  BarChart2,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  X,
  Sun,
  Moon,
  MessageSquare,
  UsersRound,
} from 'lucide-react'
import { useTheme } from '../lib/theme'

export type ViewId =
  | 'dashboard'
  | 'leads'
  | 'discover'
  | 'outreach'
  | 'campaigns'
  | 'proposals'
  | 'clients'
  | 'analytics'
  | 'messages'
  | 'team'
  | 'settings'

interface NavItem {
  id: ViewId
  label: string
  icon: React.ElementType
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'outreach', label: 'Outreach', icon: Send },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'proposals', label: 'Proposals', icon: FileText },
  { id: 'clients', label: 'Clients', icon: Briefcase },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'team', label: 'Team', icon: UsersRound },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export const SIDEBAR_EXPANDED = 220
export const SIDEBAR_COLLAPSED = 60

interface SidebarProps {
  active: ViewId
  onNavigate: (id: ViewId) => void
  pendingApprovals: number
  unreadMessages: number
  unreadTeam: number
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onMobileClose: () => void
  userName: string
  userRole: 'admin' | 'sub' | null
}

export default function Sidebar({
  active,
  onNavigate,
  pendingApprovals,
  unreadMessages,
  unreadTeam,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  userName,
  userRole,
}: SidebarProps) {
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'
  const w = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED
  const { theme, toggle } = useTheme()

  function handleNav(id: ViewId) {
    onNavigate(id)
    onMobileClose()
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0"
          style={{ background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
          onClick={onMobileClose}
        />
      )}

      <aside
        data-open={mobileOpen ? 'true' : 'false'}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100%',
          width: w,
          background: 'var(--c-surface)',
          borderRight: '1px solid var(--c-edge)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease, transform 0.25s ease',
          overflow: 'hidden',
        }}
        className="mobile-sidebar"
      >
        {/* Brand */}
        <div
          style={{
            borderBottom: '1px solid var(--c-edge)',
            padding: collapsed ? '16px 0' : '16px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: 'var(--c-primary-l)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Zap size={14} color="#fff" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--c-ink)',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Immanent
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--c-ink-3)',

                    whiteSpace: 'nowrap',
                  }}
                >
                  Lead Engine
                </div>
              </div>
            )}
          </div>

          {/* Mobile close */}
          {mobileOpen && !collapsed && (
            <button onClick={onMobileClose} style={{ color: 'var(--c-ink-3)', flexShrink: 0 }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: '12px 8px',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {NAV.map((item) => {
            const isActive = item.id === active
            const badgeCount = item.id === 'outreach' ? pendingApprovals : item.id === 'messages' ? unreadMessages : item.id === 'team' ? unreadTeam : 0
            const hasBadge = badgeCount > 0

            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: collapsed ? 0 : 10,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '9px 0' : '9px 10px',
                  borderRadius: 6,
                  background: isActive ? 'var(--t-blue-bg)' : 'transparent',
                  color: isActive ? 'var(--c-ink)' : 'var(--c-ink-2)',
                  cursor: 'pointer',
                  border: 'none',
                  position: 'relative',
                  transition: 'background 0.12s, color 0.12s',
                  textAlign: 'left',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'var(--c-surface-2)'
                    el.style.color = 'var(--c-ink-2)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'transparent'
                    el.style.color = 'var(--c-ink-2)'
                  }
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 6,
                      bottom: 6,
                      width: 3,
                      background: 'var(--c-primary-l)',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                <item.icon size={16} strokeWidth={isActive ? 2 : 1.75} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{item.label}</span>
                )}
                {hasBadge && !collapsed && (
                  <span
                    style={{
                      background: 'var(--c-primary-l)',
                      color: '#fff',
                      borderRadius: 9999,
                      minWidth: 18,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,

                      paddingInline: 4,
                    }}
                  >
                    {badgeCount}
                  </span>
                )}
                {hasBadge && collapsed && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 10,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'var(--c-primary-l)',
                    }}
                  />
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer: collapse toggle + user */}
        <div
          style={{
            borderTop: '1px solid var(--c-edge)',
            padding: collapsed ? '12px 0' : '12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flexShrink: 0,
          }}
        >
          {/* Collapse toggle — hidden on mobile */}
          <button
            onClick={onToggleCollapse}
            className="desktop-only"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-end',
              padding: '6px 4px',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--c-ink-3)',
              cursor: 'pointer',
              border: 'none',
              transition: 'color 0.12s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--c-ink-2)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--c-ink-3)')}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10,
              padding: collapsed ? '8px 0' : '8px 10px',
              borderRadius: 6,
              background: 'var(--c-surface-2)',
              color: 'var(--c-ink-2)',
              border: '1px solid var(--c-edge)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
          </button>

          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--c-edge-2)',
                  color: 'var(--c-primary-l)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                  {userName}
                </div>
                <div style={{ fontSize: 11, color: userRole === 'admin' ? 'var(--c-primary-l)' : 'var(--c-ink-3)' }}>{userRole === 'admin' ? 'Admin' : userRole === 'sub' ? 'Sub account' : 'Account'}</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'var(--c-edge-2)',
                color: 'var(--c-primary-l)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                margin: '0 auto',
              }}
              title={`${userName} · ${userRole === 'admin' ? 'Admin' : userRole === 'sub' ? 'Sub account' : 'Account'}`}
            >
              {initials}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
