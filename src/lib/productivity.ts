// Productivity helpers. Everything here runs locally in the browser — no generative AI.
// Each function is described honestly in the UI:
//   • summariseNotes  → extractive summariser (picks the highest-scoring sentences)
//   • predictPerformance → transparent heuristic estimate, not a trained model
//   • revisionPlan    → rule-based recommendations from attendance + study progress
//   • moodSuggestion  → fixed suggestion table keyed by mood
//   • assistantReply  → rule-based assistant that answers from the student's own data

import { daysBetween, fmtDate, todayISO } from './dates'
import { canMiss, mustAttend, overall, statsFor } from './attendance'
import { planProgress } from './planner'
import type { AppState, StudentData, Subject } from './types'

const STOP = new Set('a an the and or but if then of to in on at for with by from as is are was were be been being it its this that these those which who whom what when where why how can could should would may might will shall do does did not no than so such also into over under between each other more most some any their there they them we you your our he she his her i me my'.split(' '))

export function summariseNotes(text: string, maxSentences = 3): { summary: string[]; keywords: string[] } {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length < 40) return { summary: [], keywords: [] }
  const sentences = clean.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [clean]
  const freq = new Map<string, number>()
  for (const w of clean.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? []) if (!STOP.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1)
  const scored = sentences.map((s, i) => {
    const words = s.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? []
    const score = words.reduce((a, w) => a + (freq.get(w) ?? 0), 0) / Math.max(8, words.length)
    return { s, i, score }
  })
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, Math.min(maxSentences, sentences.length)).sort((a, b) => a.i - b.i)
  const keywords = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w)
  return { summary: top.map((t) => t.s), keywords }
}

export interface Prediction {
  subject: Subject
  score: number
  band: string
  factors: string[]
}

/** Transparent heuristic: 45% study coverage, 30% attendance, 25% time left vs. difficulty. */
export function predictPerformance(data: StudentData, today = todayISO()): Prediction[] {
  return data.subjects.map((subject) => {
    const prog = planProgress(data.sessions, subject.id)
    const att = statsFor(subject, data.attendance)
    const coverage = prog.total ? prog.done / prog.total : 0
    const attScore = att.total ? Math.min(1, att.pct / 90) : 0.5
    const days = subject.examDate ? daysBetween(today, subject.examDate) : 30
    const timeScore = Math.min(1, Math.max(0, days / 21)) * (1 - (subject.difficulty - 1) * 0.05)
    const score = Math.round(100 * (0.45 * (0.35 + 0.65 * coverage) + 0.3 * attScore + 0.25 * timeScore))
    const band = score >= 75 ? 'On track' : score >= 55 ? 'Needs attention' : 'At risk'
    return {
      subject,
      score,
      band,
      factors: [`Study coverage ${Math.round(coverage * 100)}%`, `Attendance ${att.total ? att.pct.toFixed(0) + '%' : 'not recorded'}`, `${days >= 0 ? days + ' days to exam' : 'exam passed'}`],
    }
  })
}

export interface Revision {
  subject: Subject
  priority: number
  reason: string
}

export function revisionPlan(data: StudentData, today = todayISO()): Revision[] {
  return data.subjects
    .map((subject) => {
      const prog = planProgress(data.sessions, subject.id)
      const days = subject.examDate ? daysBetween(today, subject.examDate) : 60
      const att = statsFor(subject, data.attendance)
      let priority = subject.difficulty * 10 + (days >= 0 ? Math.max(0, 30 - days) : 0) + (1 - (prog.total ? prog.done / prog.total : 0)) * 20
      const reasons: string[] = []
      if (subject.difficulty >= 4) reasons.push('high difficulty')
      if (days >= 0 && days <= 14) reasons.push(`exam in ${days} day${days === 1 ? '' : 's'}`)
      if (prog.total && prog.pct < 40) reasons.push(`only ${prog.pct}% of planned study done`)
      if (att.total && att.pct < data.prefs.attendanceMinPct) {
        priority += 5
        reasons.push('attendance below target — catch up on missed lectures')
      }
      return { subject, priority, reason: reasons.length ? reasons.join(', ') : 'steady progress — light revision' }
    })
    .sort((a, b) => b.priority - a.priority)
}

export const MOODS = {
  energised: { label: 'Energised', tip: 'Tackle your hardest subject first and use 50-minute focus blocks with 10-minute breaks.' },
  steady: { label: 'Steady', tip: 'Follow your plan as scheduled. Alternate a heavy topic with a lighter one to keep momentum.' },
  tired: { label: 'Tired', tip: 'Switch to light work today: revise notes, redo solved problems or review flashcards. Keep sessions to 25 minutes.' },
  stressed: { label: 'Stressed', tip: 'Pick just one small topic, set a 20-minute timer, and take a short walk afterwards. Postponing a heavy session is fine — use Reschedule later.' },
} as const

export function weekStatsFor(state: AppState, userId: string) {
  const data = state.students[userId]
  if (!data) return null
  const today = todayISO()
  const mon = (() => {
    const d = new Date()
    const wd = d.getDay()
    d.setDate(d.getDate() + (wd === 0 ? -6 : 1 - wd))
    return d
  })()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const list = data.sessions.filter((s) => s.date === iso)
    return { iso, planned: list.reduce((a, s) => a + s.hours, 0), done: list.filter((s) => s.done).reduce((a, s) => a + s.hours, 0) }
  })
  return { days, today }
}

/** Rule-based assistant that answers only from the signed-in student's own data. */
export function assistantReply(question: string, data: StudentData, today = todayISO()): string {
  const q = question.toLowerCase()
  const min = data.prefs.attendanceMinPct
  const find = (): Subject | undefined =>
    data.subjects.find((s) => q.includes(s.code.toLowerCase()) || q.includes(s.name.toLowerCase()) || s.name.toLowerCase().split(' ').some((w) => w.length > 3 && q.includes(w)))

  if (data.subjects.length === 0) return 'I can answer questions about your subjects, attendance and study plan, but nothing has been added yet. Add subjects in the Study Planner or load the sample data from Settings.'

  if (/(skip|bunk|miss|leave).*(class|lecture)|can i (skip|miss)|how many.*(miss|skip)/.test(q)) {
    const sub = find()
    const list = sub ? [sub] : data.subjects
    return list
      .map((s) => {
        const st = statsFor(s, data.attendance)
        const m = canMiss(st.attended, st.total, min)
        return st.pct >= min ? `${s.name}: ${st.pct.toFixed(1)}% — you can miss up to ${m} more class${m === 1 ? '' : 'es'} and stay at or above ${min}%.` : `${s.name}: ${st.pct.toFixed(1)}% — already below ${min}%. Attend the next ${mustAttend(st.attended, st.total, min)} classes in a row to recover.`
      })
      .join('\n')
  }
  if (/attendance|shortage|percentage/.test(q)) {
    const o = overall(data.subjects, data.attendance)
    const low = data.subjects.filter((s) => statsFor(s, data.attendance).pct < min && statsFor(s, data.attendance).total > 0)
    return `Overall attendance is ${o.pct.toFixed(1)}% (${o.attended}/${o.total}). ${low.length ? `Below ${min}%: ${low.map((s) => s.name).join(', ')}.` : `Every subject is at or above ${min}%.`}`
  }
  if (/exam|test|countdown|when is/.test(q)) {
    const upcoming = data.subjects.filter((s) => s.examDate >= today).sort((a, b) => a.examDate.localeCompare(b.examDate))
    if (!upcoming.length) return 'No upcoming exam dates are set. Add them in the Study Planner.'
    return upcoming.slice(0, 4).map((s) => `${s.name}: ${fmtDate(s.examDate)} (${daysBetween(today, s.examDate)} days)`).join('\n')
  }
  if (/today|plan|study|schedule|revise|revision|next/.test(q)) {
    const todays = data.sessions.filter((s) => s.date === today)
    if (todays.length) {
      const name = (id: string) => data.subjects.find((s) => s.id === id)?.name ?? 'Subject'
      return `Today's plan:\n${todays.map((s) => `${s.done ? '✓' : '•'} ${name(s.subjectId)} — ${s.topic} (${s.hours}h)`).join('\n')}`
    }
    const rec = revisionPlan(data, today)[0]
    return rec ? `You have nothing scheduled today. If you want to study, start with ${rec.subject.name} (${rec.reason}).` : 'Nothing is scheduled today.'
  }
  if (/hello|hi\b|hey|help/.test(q)) return 'I can answer from your own data: try "How many classes can I skip in DBMS?", "When are my exams?", "What should I study today?" or "What is my attendance?"'
  return "I'm a simple rule-based demo assistant — I only understand questions about attendance, exams and today's study plan. Connect an AI endpoint (see README) for open-ended answers."
}
