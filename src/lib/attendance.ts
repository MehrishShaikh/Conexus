// Attendance maths. Everything here is a pure function so it can be unit-tested.
//
// Assumptions used by the projections (also shown to the user in the UI):
//  • "Minimum attendance" is a configurable demo value (default 75%) — it is not
//    a universal institutional rule. Use your own college's policy.
//  • Every scheduled class counts equally, and cancelled classes are simply not recorded.
//  • Future classes are counted from the division timetable between today and the
//    semester-end date; holidays are not modelled.

import { addDays, fromISO, weekdayOf } from './dates'
import type { AttRecord, ClassSlot, Subject } from './types'

export interface AttStats {
  attended: number
  total: number
  pct: number
}

export function statsFor(subject: Subject, records: AttRecord[]): AttStats {
  const mine = records.filter((r) => r.subjectId === subject.id)
  const attended = subject.baseAttended + mine.filter((r) => r.status === 'present').length
  const total = subject.baseTotal + mine.length
  return { attended, total, pct: total === 0 ? 0 : (attended / total) * 100 }
}

export function overall(subjects: Subject[], records: AttRecord[]): AttStats {
  let attended = 0
  let total = 0
  for (const s of subjects) {
    const st = statsFor(s, records)
    attended += st.attended
    total += st.total
  }
  return { attended, total, pct: total === 0 ? 0 : (attended / total) * 100 }
}

/** How many further classes can be missed while staying at or above `min` %. */
export function canMiss(attended: number, total: number, min: number): number {
  const m = min / 100
  if (m <= 0) return Infinity
  if (total === 0) return 0
  const x = Math.floor(attended / m - total + 1e-9)
  return Math.max(0, x)
}

/** How many consecutive classes must be attended to climb back to `min` %. 0 if already there. */
export function mustAttend(attended: number, total: number, min: number): number {
  const m = min / 100
  if (total === 0) return 0
  if (attended / total >= m) return 0
  if (m >= 1) return Infinity
  return Math.ceil((m * total - attended) / (1 - m) - 1e-9)
}

export type AttStatus = 'safe' | 'borderline' | 'shortage' | 'none'

export function statusOf(pct: number, total: number, min: number): AttStatus {
  if (total === 0) return 'none'
  if (pct < min) return 'shortage'
  if (pct < min + 5) return 'borderline'
  return 'safe'
}

/** Projected % if the student attends `attendFuture` of the next `future` classes. */
export function project(attended: number, total: number, future: number, attendFuture: number): number {
  const t = total + future
  return t === 0 ? 0 : ((attended + Math.min(future, attendFuture)) / t) * 100
}

/** Count weekly-recurring classes for one subject between two dates (inclusive). */
export function countClasses(slots: ClassSlot[], subjectCode: string, from: string, to: string): number {
  if (to < from) return 0
  const perWeekday = new Array(7).fill(0)
  for (const s of slots) if (s.subjectCode === subjectCode) perWeekday[s.weekday]++
  let n = 0
  for (let d = from; d <= to; d = addDays(d, 1)) n += perWeekday[weekdayOf(d)]
  return n
}

export function remainingClasses(slots: ClassSlot[], subjectCode: string, today: string, semesterEnd: string) {
  return countClasses(slots, subjectCode, addDays(today, 1), semesterEnd)
}

export interface LeaveImpact {
  subject: Subject
  missed: number
  before: number
  after: number
  status: AttStatus
}

export function leaveImpact(
  subjects: Subject[],
  records: AttRecord[],
  slots: ClassSlot[],
  from: string,
  to: string,
  min: number,
): LeaveImpact[] {
  if (!from || !to || fromISO(to) < fromISO(from)) return []
  return subjects.map((subject) => {
    const st = statsFor(subject, records)
    const missed = countClasses(slots, subject.code, from, to)
    const afterPct = st.total + missed === 0 ? 0 : (st.attended / (st.total + missed)) * 100
    return { subject, missed, before: st.pct, after: afterPct, status: statusOf(afterPct, st.total + missed, min) }
  })
}
