import { useMemo } from 'react'
import { daysBetween, fmtDate, todayISO } from './dates'
import { canMiss, statsFor, mustAttend } from './attendance'
import { useCurrentUser, useStore } from './store'
import type { AppNotification } from './types'

export interface Alert {
  id: string
  category: AppNotification['category']
  title: string
  body: string
  link: string
  tone: 'clay' | 'gold' | 'sage'
}

/** Alerts that are computed live from the student's own data (not stored). */
export function useAlerts(): Alert[] {
  const user = useCurrentUser()
  const data = useStore((s) => (user ? s.students[user.id] : undefined))
  const assignments = useStore((s) => s.assignments)
  return useMemo(() => {
    if (!user || user.role !== 'student' || !data) return []
    const today = todayISO()
    const out: Alert[] = []
    const p = data.prefs
    if (p.notifyAttendance) {
      for (const s of data.subjects) {
        const st = statsFor(s, data.attendance)
        if (st.total > 0 && st.pct < p.attendanceMinPct) {
          out.push({ id: `att-${s.id}`, category: 'attendance', tone: 'clay', title: `${s.name}: attendance shortage`, body: `${st.pct.toFixed(1)}% — attend the next ${mustAttend(st.attended, st.total, p.attendanceMinPct)} classes to reach ${p.attendanceMinPct}%.`, link: '/attendance' })
        } else if (st.total > 0 && canMiss(st.attended, st.total, p.attendanceMinPct) <= 1) {
          out.push({ id: `attw-${s.id}`, category: 'attendance', tone: 'gold', title: `${s.name}: close to the limit`, body: `${st.pct.toFixed(1)}% — you can miss at most ${canMiss(st.attended, st.total, p.attendanceMinPct)} more class.`, link: '/attendance' })
        }
      }
    }
    if (p.notifyDeadlines) {
      for (const a of assignments) {
        const d = daysBetween(today, a.due)
        if (d >= 0 && d <= 3) out.push({ id: `as-${a.id}`, category: 'deadline', tone: d <= 1 ? 'clay' : 'gold', title: `${a.title} due ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : fmtDate(a.due)}`, body: `${a.subjectCode} — posted by ${a.postedByName}.`, link: '/calendar' })
      }
      for (const s of data.subjects) {
        if (!s.examDate) continue
        const d = daysBetween(today, s.examDate)
        if (d >= 0 && d <= 7) out.push({ id: `ex-${s.id}`, category: 'deadline', tone: 'clay', title: `${s.name} exam in ${d} day${d === 1 ? '' : 's'}`, body: 'Open the Study Planner to review your revision sessions.', link: '/study-planner' })
      }
      const todays = data.sessions.filter((s) => s.date === today && !s.done)
      if (todays.length) out.push({ id: 'sessions-today', category: 'deadline', tone: 'sage', title: `${todays.length} study session${todays.length > 1 ? 's' : ''} planned today`, body: `${todays.reduce((a, s) => a + s.hours, 0)} hours in total.`, link: '/study-planner' })
    }
    return out
  }, [user, data, assignments])
}

export function useNotifications() {
  const user = useCurrentUser()
  const all = useStore((s) => s.notifications)
  const prefs = useStore((s) => (user ? (user.role === 'student' ? s.students[user.id]?.prefs : s.facultyPrefs[user.id]) : undefined))
  const alerts = useAlerts()
  return useMemo(() => {
    if (!user) return { items: [] as AppNotification[], unread: 0, alerts: [] as Alert[] }
    const p = (prefs ?? {}) as Record<string, boolean | undefined>
    const allowed = (n: AppNotification) => {
      if (n.category === 'announcement') return p.notifyAnnouncements !== false
      if (n.category === 'event') return p.notifyEvents !== false
      if (n.category === 'lostfound') return p.notifyLostFound !== false
      if (n.category === 'deadline') return p.notifyDeadlines !== false
      return true
    }
    const items = all.filter((n) => (n.audience === 'all' || n.audience === user.role) && allowed(n))
    const unread = items.filter((n) => !n.readBy.includes(user.id)).length + alerts.length
    return { items, unread, alerts }
  }, [all, user, prefs, alerts])
}
