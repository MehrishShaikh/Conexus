import { describe, expect, it } from 'vitest'
import { generatePlan, hoursPerTopic, missedSessions, planProgress } from '../lib/planner'
import { addDays, daysBetween, toISO } from '../lib/dates'
import type { Subject } from '../lib/types'

const today = toISO(new Date())
const subj = (over: Partial<Subject> = {}): Subject => ({
  id: 's1', name: 'Data Structures', code: 'DS201', difficulty: 3, examDate: addDays(today, 14),
  topics: [{ id: 't1', name: 'Trees' }, { id: 't2', name: 'Graphs' }, { id: 't3', name: 'Hashing' }],
  baseAttended: 0, baseTotal: 0, ...over,
})
const avail: [number, number, number, number, number, number, number] = [2, 2, 2, 2, 2, 3, 3]

describe('study planner', () => {
  it('assigns more hours per topic to harder subjects', () => {
    expect(hoursPerTopic(1)).toBeLessThan(hoursPerTopic(5))
    expect(hoursPerTopic(99)).toBe(hoursPerTopic(5))
  })

  it('never schedules a session after the exam date or before today', () => {
    const s = subj()
    const { sessions } = generatePlan({ subjects: [s], availability: avail, goals: { dailyHours: 3, weeklyHours: 14 }, from: today })
    expect(sessions.length).toBeGreaterThan(0)
    for (const x of sessions) {
      expect(x.date >= today).toBe(true)
      expect(x.date <= s.examDate).toBe(true)
    }
  })

  it('respects the daily study goal', () => {
    const { sessions } = generatePlan({ subjects: [subj()], availability: avail, goals: { dailyHours: 1.5, weeklyHours: 20 }, from: today })
    const perDay = new Map<string, number>()
    for (const x of sessions) perDay.set(x.date, (perDay.get(x.date) ?? 0) + x.hours)
    for (const h of perDay.values()) expect(h).toBeLessThanOrEqual(1.5 + 1e-9)
  })

  it('respects the weekly study goal', () => {
    const { sessions } = generatePlan({ subjects: [subj({ examDate: addDays(today, 40) })], availability: avail, goals: { dailyHours: 3, weeklyHours: 5 }, from: today })
    const perWeek = new Map<string, number>()
    for (const x of sessions) {
      const wk = addDays(x.date, -((new Date(x.date + 'T00:00:00').getDay() + 6) % 7))
      perWeek.set(wk, (perWeek.get(wk) ?? 0) + x.hours)
    }
    for (const h of perWeek.values()) expect(h).toBeLessThanOrEqual(5 + 1e-9)
  })

  it('warns instead of pretending when the time cannot fit before the exam', () => {
    const tight = subj({ examDate: addDays(today, 2), difficulty: 5 })
    const r = generatePlan({ subjects: [tight], availability: [1, 1, 1, 1, 1, 1, 1], goals: { dailyHours: 1, weeklyHours: 7 }, from: today })
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('is deterministic for identical input (ignoring generated ids)', () => {
    const run = () => generatePlan({ subjects: [subj()], availability: avail, goals: { dailyHours: 3, weeklyHours: 14 }, from: today }).sessions.map((x) => [x.date, x.topic, x.hours, x.kind])
    expect(run()).toEqual(run())
  })

  it('keeps completed sessions when the plan is rebuilt', () => {
    const s = subj()
    const first = generatePlan({ subjects: [s], availability: avail, goals: { dailyHours: 3, weeklyHours: 14 }, from: today })
    const done = { ...first.sessions[0], done: true }
    const second = generatePlan({ subjects: [s], availability: avail, goals: { dailyHours: 3, weeklyHours: 14 }, from: today, existing: [done, ...first.sessions.slice(1)] })
    expect(second.sessions.some((x) => x.id === done.id && x.done)).toBe(true)
  })

  it('reports progress and finds missed sessions', () => {
    const s = subj()
    const { sessions } = generatePlan({ subjects: [s], availability: avail, goals: { dailyHours: 3, weeklyHours: 14 }, from: addDays(today, -3) })
    expect(planProgress(sessions).done).toBe(0)
    const marked = sessions.map((x, i) => (i === 0 ? { ...x, done: true } : x))
    expect(planProgress(marked).done).toBeGreaterThan(0)
    const missed = missedSessions(marked, today)
    expect(missed.every((x) => !x.done && x.date < today)).toBe(true)
    expect(daysBetween(today, addDays(today, 5))).toBe(5)
  })
})
