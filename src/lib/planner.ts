// Study-plan scheduling algorithm.
//
// This is a deterministic, rule-based scheduler — NOT a generative-AI service.
// It is labelled "Smart scheduler" in the UI. An external AI endpoint can be
// wired in through src/lib/ai.ts, but nothing in this file calls one.
//
// How it works
//  1. Every topic needs study time that grows with the subject's difficulty.
//  2. Each day offers min(availability for that weekday, daily goal) hours,
//     further capped by the weekly goal.
//  3. Time is handed out in 30-minute blocks. For each block we pick the
//     subject with the highest "required pace" = remaining hours ÷ days left,
//     weighted slightly by difficulty — so near exams and hard subjects win.
//  4. The two days before each exam are reserved for revision first.
//  5. If a subject cannot fit before its exam, a warning explains the shortfall.

import { addDays, daysBetween, startOfWeek, uid, weekdayOf } from './dates'
import type { Availability, Goals, StudySession, Subject } from './types'

export const BLOCK = 0.5

/** Hours of focused study assumed per topic, by difficulty (1–5). */
export function hoursPerTopic(difficulty: number): number {
  return [1, 1, 1.5, 1.5, 2][Math.min(5, Math.max(1, Math.round(difficulty))) - 1]
}

export interface PlanResult {
  sessions: StudySession[]
  warnings: string[]
  plannedHours: number
}

interface QueueItem {
  topic: string
  remaining: number
}

interface SubjectState {
  subject: Subject
  queue: QueueItem[]
  learnRemaining: number
  reviseRemaining: number
  examDate: string
  missedTopics: Map<string, string>
}

function sumDone(sessions: StudySession[], subjectId: string, topic: string): number {
  return sessions
    .filter((s) => s.done && s.subjectId === subjectId && s.kind === 'learn' && s.topic === topic)
    .reduce((a, s) => a + s.hours, 0)
}

export function generatePlan(opts: {
  subjects: Subject[]
  availability: Availability
  goals: Goals
  from: string
  existing?: StudySession[]
}): PlanResult {
  const { subjects, availability, goals, from } = opts
  const existing = opts.existing ?? []
  const warnings: string[] = []

  // Sessions already completed are kept untouched. Missed sessions (past, not done) are dropped
  // and their topics are re-queued, remembering the original date.
  const keep = existing.filter((s) => s.done)
  const missed = existing.filter((s) => !s.done && s.date < from)

  const states: SubjectState[] = []
  for (const subject of subjects) {
    if (!subject.examDate || subject.examDate <= from || subject.topics.length === 0) {
      if (subject.topics.length === 0 && subject.examDate && subject.examDate > from) {
        warnings.push(`${subject.name}: add at least one topic so it can be scheduled.`)
      }
      if (!subject.examDate) warnings.push(`${subject.name}: no exam date set, so it was skipped.`)
      continue
    }
    const per = hoursPerTopic(subject.difficulty)
    const queue: QueueItem[] = subject.topics
      .map((t) => ({ topic: t.name, remaining: Math.max(0, per - sumDone(keep, subject.id, t.name)) }))
      .filter((q) => q.remaining > 0)
    const learnTotal = per * subject.topics.length
    const reviseTotal = Math.max(1, Math.ceil(learnTotal * 0.25 * 2) / 2)
    const reviseDone = keep
      .filter((s) => s.subjectId === subject.id && s.kind === 'revise')
      .reduce((a, s) => a + s.hours, 0)
    const missedTopics = new Map<string, string>()
    for (const m of missed) if (m.subjectId === subject.id && !missedTopics.has(m.topic)) missedTopics.set(m.topic, m.date)
    states.push({
      subject,
      queue,
      learnRemaining: queue.reduce((a, q) => a + q.remaining, 0),
      reviseRemaining: Math.max(0, reviseTotal - reviseDone),
      examDate: subject.examDate,
      missedTopics,
    })
  }

  const lastDay = states.reduce((m, s) => (s.examDate > m ? s.examDate : m), from)
  const out: StudySession[] = []
  const weekUsed = new Map<string, number>()
  // account for hours already used this week by kept sessions on/after the start of the week
  for (const k of keep) {
    const wk = startOfWeek(k.date)
    weekUsed.set(wk, (weekUsed.get(wk) ?? 0) + k.hours)
  }

  const push = (st: SubjectState, date: string, topic: string, hours: number, kind: 'learn' | 'revise') => {
    const found = out.find((o) => o.subjectId === st.subject.id && o.date === date && o.topic === topic && o.kind === kind)
    if (found) {
      found.hours += hours
      return
    }
    out.push({
      id: uid('ss'),
      subjectId: st.subject.id,
      topic,
      date,
      hours,
      done: false,
      kind,
      movedFrom: kind === 'learn' ? st.missedTopics.get(topic) : undefined,
    })
  }

  for (let day = from; day < lastDay; day = addDays(day, 1)) {
    const wd = weekdayOf(day)
    const wk = startOfWeek(day)
    const weeklyLeft = Math.max(0, goals.weeklyHours - (weekUsed.get(wk) ?? 0))
    let cap = Math.min(availability[wd] ?? 0, goals.dailyHours, weeklyLeft)
    cap = Math.floor(cap / BLOCK) * BLOCK
    if (cap <= 0) continue
    const active = states.filter((s) => s.examDate > day)
    if (active.length === 0) continue

    // 1) revision blocks on the two days before an exam
    for (const st of active) {
      const daysToExam = daysBetween(day, st.examDate)
      if (daysToExam <= 2 && st.reviseRemaining > 0 && cap > 0) {
        const share = Math.min(st.reviseRemaining, daysToExam === 1 ? cap : Math.max(BLOCK, cap / 2))
        const h = Math.floor(Math.min(share, cap) / BLOCK) * BLOCK
        if (h > 0) {
          push(st, day, 'Revision — full syllabus', h, 'revise')
          st.reviseRemaining -= h
          cap -= h
        }
      }
    }

    // 2) learning blocks by required pace
    while (cap >= BLOCK) {
      let best: SubjectState | null = null
      let bestScore = -1
      for (const st of active) {
        if (st.learnRemaining <= 0) continue
        const daysToExam = Math.max(1, daysBetween(day, st.examDate) - 1) // keep last day for revision
        const pace = st.learnRemaining / daysToExam
        const score = pace * (0.6 + 0.1 * st.subject.difficulty)
        if (score > bestScore) {
          bestScore = score
          best = st
        }
      }
      if (!best) break
      const item = best.queue[0]
      push(best, day, item.topic, BLOCK, 'learn')
      item.remaining -= BLOCK
      best.learnRemaining -= BLOCK
      if (item.remaining <= 0.001) best.queue.shift()
      cap -= BLOCK
    }
    const dayTotal = out.filter((o) => o.date === day).reduce((a, o) => a + o.hours, 0)
    weekUsed.set(wk, (weekUsed.get(wk) ?? 0) + dayTotal)
  }

  for (const st of states) {
    if (st.learnRemaining > 0.001) {
      warnings.push(
        `${st.subject.name}: ${st.learnRemaining.toFixed(1)}h of learning could not fit before the exam on ${st.examDate}. ` +
          `Add study hours, raise the daily/weekly goal, or reduce topics.`,
      )
    }
    if (st.reviseRemaining > 0.001 && st.subject.examDate) {
      warnings.push(`${st.subject.name}: ${st.reviseRemaining.toFixed(1)}h of planned revision did not fit.`)
    }
  }

  const sessions = [...keep, ...out].sort((a, b) => a.date.localeCompare(b.date) || a.subjectId.localeCompare(b.subjectId))
  return { sessions, warnings, plannedHours: out.reduce((a, s) => a + s.hours, 0) }
}

export function planProgress(sessions: StudySession[], subjectId?: string) {
  const list = subjectId ? sessions.filter((s) => s.subjectId === subjectId) : sessions
  const total = list.reduce((a, s) => a + s.hours, 0)
  const done = list.filter((s) => s.done).reduce((a, s) => a + s.hours, 0)
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
}

export function missedSessions(sessions: StudySession[], today: string): StudySession[] {
  return sessions.filter((s) => !s.done && s.date < today)
}

export function weeklyHours(sessions: StudySession[], weekStart: string) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  return days.map((d) => {
    const list = sessions.filter((s) => s.date === d)
    return {
      date: d,
      planned: list.reduce((a, s) => a + s.hours, 0),
      done: list.filter((s) => s.done).reduce((a, s) => a + s.hours, 0),
    }
  })
}
