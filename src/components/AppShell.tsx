import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Bell, BookOpenCheck, CalendarDays, ChevronDown, ClipboardCheck, GraduationCap, Languages, LayoutDashboard,
  LogOut, Menu, MessagesSquare, PackageSearch, ScrollText, Settings, ShieldCheck, Sparkles, X,
} from 'lucide-react'
import { Wordmark } from './Wordmark'
import { Badge, Notice } from './ui'
import { homeFor, logOut } from '../lib/auth'
import { markAllRead, markNotificationRead } from '../lib/actions'
import { useNotifications } from '../lib/notifications'
import { useCurrentUser, usePersistError } from '../lib/store'
import { timeAgo } from '../lib/dates'
import type { Role } from '../lib/types'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

const ic = 'h-[18px] w-[18px]'
const NAV: Record<Role, NavItem[]> = {
  student: [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className={ic} /> },
    { to: '/study-planner', label: 'Study Planner', icon: <BookOpenCheck className={ic} /> },
    { to: '/doubts', label: 'Doubts', icon: <MessagesSquare className={ic} /> },
    { to: '/attendance', label: 'Attendance', icon: <ClipboardCheck className={ic} /> },
    { to: '/lecture-translator', label: 'Lecture Translator', icon: <Languages className={ic} /> },
    { to: '/lost-found', label: 'Lost & Found', icon: <PackageSearch className={ic} /> },
    { to: '/calendar', label: 'Calendar', icon: <CalendarDays className={ic} /> },
    { to: '/productivity', label: 'Productivity', icon: <Sparkles className={ic} /> },
  ],
  faculty: [
    { to: '/faculty', label: 'Faculty Console', icon: <GraduationCap className={ic} /> },
    { to: '/doubts', label: 'Doubts', icon: <MessagesSquare className={ic} /> },
    { to: '/calendar', label: 'Calendar', icon: <CalendarDays className={ic} /> },
    { to: '/lost-found', label: 'Lost & Found', icon: <PackageSearch className={ic} /> },
  ],
  admin: [
    { to: '/admin', label: 'Admin Console', icon: <ShieldCheck className={ic} /> },
    { to: '/calendar', label: 'Calendar', icon: <CalendarDays className={ic} /> },
    { to: '/lost-found', label: 'Lost & Found', icon: <PackageSearch className={ic} /> },
    { to: '/doubts', label: 'Doubts (view)', icon: <MessagesSquare className={ic} /> },
  ],
}

export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const user = useCurrentUser()
  const loc = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (roles && !roles.includes(user.role)) return <AccessDenied role={user.role} />
  return <>{children}</>
}

function AccessDenied({ role }: { role: Role }) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-gold" />
      <h1 className="text-4xl">This area isn't available to your role</h1>
      <p className="mt-3 text-muted">You are signed in as <strong>{role}</strong>. This section is restricted. Official announcements, for example, can only be published by faculty and administrators.</p>
      <Link to={homeFor(role)} className="btn btn-primary mt-6">Go to my home</Link>
    </div>
  )
}

function NotificationBell() {
  const user = useCurrentUser()!
  const { items, unread, alerts } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  useEffect(() => {
    if (!open) return
    const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', click)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', click)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  return (
    <div className="relative" ref={ref}>
      <button className="relative rounded-full border border-ink/10 bg-paper p-2.5 hover:border-gold" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="fade-up absolute right-0 z-50 mt-2 w-[min(92vw,380px)] rounded-2xl border border-ink/10 bg-paper p-3 shadow-[var(--shadow-lift)]">
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="font-display text-xl">Notifications</p>
            <button className="text-xs font-semibold text-gold hover:underline" onClick={() => markAllRead(user.role)}>Mark all read</button>
          </div>
          <div className="scroll-thin max-h-[60vh] space-y-1 overflow-y-auto">
            {alerts.length > 0 && <p className="eyebrow px-2 pt-1">Needs attention</p>}
            {alerts.map((a) => (
              <button key={a.id} className="block w-full rounded-xl px-3 py-2.5 text-left hover:bg-beige/60" onClick={() => { setOpen(false); nav(a.link) }}>
                <p className="flex items-center gap-2 text-sm font-semibold"><span className={`h-2 w-2 rounded-full ${a.tone === 'clay' ? 'bg-clay' : a.tone === 'gold' ? 'bg-gold' : 'bg-sage'}`} />{a.title}</p>
                <p className="mt-0.5 pl-4 text-xs text-muted">{a.body}</p>
              </button>
            ))}
            {items.length > 0 && <p className="eyebrow px-2 pt-2">Recent</p>}
            {items.slice(0, 12).map((n) => {
              const unreadItem = !n.readBy.includes(user.id)
              return (
                <button key={n.id} className="block w-full rounded-xl px-3 py-2.5 text-left hover:bg-beige/60" onClick={() => { markNotificationRead(n.id); setOpen(false); nav(n.link) }}>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {unreadItem && <span className="h-2 w-2 rounded-full bg-gold" aria-label="unread" />}
                    {n.title}
                  </p>
                  <p className={`mt-0.5 text-xs text-muted ${unreadItem ? 'pl-4' : ''}`}>{n.body} · {timeAgo(n.createdAt)}</p>
                </button>
              )
            })}
            {items.length === 0 && alerts.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">You're all caught up.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export function AppShell() {
  const user = useCurrentUser()
  const persistError = usePersistError()
  const [drawer, setDrawer] = useState(false)
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  useEffect(() => {
    setDrawer(false)
    setMenu(false)
    window.scrollTo({ top: 0 })
  }, [loc.pathname])
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  const items = NAV[user.role]
  const initials = user.name.split(' ').filter((p) => !/^(prof|dr)\.?$/i.test(p)).map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  const links = (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-gold text-ink' : 'text-ivory/75 hover:bg-ivory/10 hover:text-ivory'}`
          }
        >
          {i.icon}
          {i.label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[268px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-ivory">Skip to content</a>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col justify-between bg-ink p-5 lg:flex">
        <div>
          <div className="mb-8 px-1.5 pt-1"><Wordmark light to={homeFor(user.role)} /></div>
          {links}
        </div>
        <div className="space-y-1">
          <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${isActive ? 'bg-gold text-ink' : 'text-ivory/75 hover:bg-ivory/10 hover:text-ivory'}`}><Settings className={ic} />Settings</NavLink>
          <NavLink to="/phase-3" className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${isActive ? 'bg-gold text-ink' : 'text-ivory/75 hover:bg-ivory/10 hover:text-ivory'}`}><ScrollText className={ic} />Phase 3 report</NavLink>
          <p className="px-3.5 pt-3 text-[11px] leading-snug text-ivory/45">Prototype · demo data stored only in this browser.</p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setDrawer(false)} />
          <div className="fade-up absolute left-0 top-0 flex h-full w-[82vw] max-w-[310px] flex-col justify-between bg-ink p-5">
            <div>
              <div className="mb-6 flex items-center justify-between"><Wordmark light to={homeFor(user.role)} size="sm" /><button aria-label="Close menu" className="text-ivory" onClick={() => setDrawer(false)}><X className="h-6 w-6" /></button></div>
              {links}
            </div>
            <div className="space-y-1">
              <NavLink to="/settings" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ivory/80 hover:bg-ivory/10"><Settings className={ic} />Settings</NavLink>
              <NavLink to="/phase-3" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ivory/80 hover:bg-ivory/10"><ScrollText className={ic} />Phase 3 report</NavLink>
            </div>
          </div>
        </div>
      )}

      <div className="min-w-0">
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-ink/10 bg-ivory/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-full border border-ink/10 bg-paper p-2.5 lg:hidden" aria-label="Open menu" onClick={() => setDrawer(true)}><Menu className="h-[18px] w-[18px]" /></button>
            <div className="lg:hidden"><Wordmark to={homeFor(user.role)} size="sm" /></div>
            <Badge tone="gold"><BarChart3 className="h-3 w-3" />Demo mode</Badge>
          </div>
          <div className="flex items-center gap-2.5">
            <NotificationBell />
            <div className="relative">
              <button className="flex items-center gap-2.5 rounded-full border border-ink/10 bg-paper py-1.5 pl-1.5 pr-3 hover:border-gold" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Account menu">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-bold text-gold">{initials}</span>
                <span className="hidden text-left text-sm font-semibold leading-tight sm:block">{user.name.split(' ').slice(0, 2).join(' ')}<span className="block text-[11px] font-medium capitalize text-muted">{user.role}</span></span>
                <ChevronDown className="h-4 w-4 text-muted" />
              </button>
              {menu && (
                <div className="fade-up absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-ink/10 bg-paper p-2 shadow-[var(--shadow-lift)]">
                  <Link to="/settings" className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-beige/60">Profile & preferences</Link>
                  <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-clay hover:bg-clay/10" onClick={() => { logOut(); nav('/') }}><LogOut className="h-4 w-4" />Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
        {persistError && <div className="px-4 pt-4 md:px-8"><Notice kind="warn" title="Changes may not be saved">{persistError}</Notice></div>}
        <main id="main" className="mx-auto max-w-[1280px] px-4 py-8 md:px-8 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
