import { useMemo } from 'react'
import { addDays, weekdayOf } from './dates'
import { useCurrentUser, useStore } from './store'
import type { CalEvent } from './types'

export type CalKind = CalEvent['type'] | 'study'

export interface CalItem {
  id: string
  title: string
  kind: CalKind
  date: string
  start: string
  end: string
  location: string
  notes: string
  source: 'timetable' | 'event' | 'assignment' | 'exam' | 'study'
  /** id of the editable CalEvent, when source === 'event' */
  eventId?: string
  scope?: 'personal' | 'college'
  ownerId?: string
  link?: string
}

export const KIND_LABEL: Record<CalKind, string> = {
  class: 'Class',
  assignment: 'Assignment',
  exam: 'Exam',
  event: 'College event',
  club: 'Club activity',
  reminder: 'Reminder',
  study: 'Study session',
}

export const KIND_DOT: Record<CalKind, string> = {
  class: 'bg-ink',
  assignment: 'bg-gold',
  exam: 'bg-clay',
  event: 'bg-sage',
  club: 'bg-sand',
  reminder: 'bg-muted',
  study: 'bg-gold-hi',
}

/** Merges the timetable, events, assignments, exams and study sessions into a single list for a date range. */
export function useCalendarItems(from: string, to: string, opts: { study?: boolean } = {}): CalItem[] {
  const user = useCurrentUser()
  const timetable = useStore((s) => s.timetable)
  const events = useStore((s) => s.events)
  const assignments = useStore((s) => s.assignments)
  const data = useStore((s) => (user ? s.students[user.id] : undefined))
  return useMemo(() => {
    if (!user) return []
    const out: CalItem[] = []
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const wd = weekdayOf(d)
      for (const c of timetable.filter((c) => c.weekday === wd)) {
        out.push({ id: `c-${c.id}-${d}`, title: `${c.subjectName}`, kind: 'class', date: d, start: c.start, end: c.end, location: c.room, notes: c.faculty, source: 'timetable', link: '/attendance' })
      }
    }
    for (const e of events) {
      if (e.date < from || e.date > to) continue
      if (e.scope === 'personal' && e.ownerId !== user.id) continue
      out.push({ id: `e-${e.id}`, title: e.title, kind: e.type, date: e.date, start: e.start, end: e.end, location: e.location, notes: e.notes, source: 'event', eventId: e.id, scope: e.scope, ownerId: e.ownerId })
    }
    for (const a of assignments) {
      if (a.due < from || a.due > to) continue
      out.push({ id: `a-${a.id}`, title: `${a.title} — due`, kind: 'assignment', date: a.due, start: '', end: '', location: a.subjectCode, notes: `${a.postedByName}. ${a.description}`, source: 'assignment' })
    }
    if (data) {
      for (const s of data.subjects) {
        if (s.examDate && s.examDate >= from && s.examDate <= to) out.push({ id: `x-${s.id}`, title: `${s.name} exam`, kind: 'exam', date: s.examDate, start: '', end: '', location: '', notes: 'Exam date from your Study Planner.', source: 'exam', link: '/study-planner' })
      }
      if (opts.study) {
        for (const s of data.sessions) {
          if (s.date < from || s.date > to) continue
          const sub = data.subjects.find((x) => x.id === s.subjectId)
          out.push({ id: `s-${s.id}`, title: `Study: ${sub?.name ?? 'Subject'}`, kind: 'study', date: s.date, start: '', end: '', location: '', notes: `${s.topic} · ${s.hours}h${s.done ? ' · done' : ''}`, source: 'study', link: '/study-planner' })
        }
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date) || (a.start || '99').localeCompare(b.start || '99'))
  }, [user, timetable, events, assignments, data, from, to, opts.study])
}
