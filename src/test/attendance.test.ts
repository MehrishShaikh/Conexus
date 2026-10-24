import { describe, expect, it } from 'vitest'
import { canMiss, mustAttend, overall, project, statsFor, statusOf } from '../lib/attendance'
import type { AttRecord, Subject } from '../lib/types'

const sub = (id: string, a: number, t: number): Subject => ({ id, name: id, code: id, difficulty: 3, examDate: '', topics: [], baseAttended: a, baseTotal: t })
const rec = (subjectId: string, status: 'present' | 'absent', n = 1): AttRecord => ({ id: `${subjectId}${status}${n}`, subjectId, date: '2025-01-01', status })

describe('attendance maths', () => {
  it('computes percentages from base counts plus records', () => {
    const s = sub('A', 15, 20)
    expect(statsFor(s, []).pct).toBeCloseTo(75)
    expect(statsFor(s, [rec('A', 'present')]).pct).toBeCloseTo((16 / 21) * 100)
    expect(statsFor(s, [rec('A', 'absent')]).pct).toBeCloseTo((15 / 21) * 100)
  })

  it('ignores records belonging to other subjects', () => {
    expect(statsFor(sub('A', 10, 10), [rec('B', 'absent')]).total).toBe(10)
  })

  it('handles zero classes without dividing by zero', () => {
    expect(statsFor(sub('A', 0, 0), []).pct).toBe(0)
    expect(overall([], []).pct).toBe(0)
  })

  it('calculates how many classes can still be missed', () => {
    expect(canMiss(15, 20, 75)).toBe(0) // exactly at the limit
    expect(canMiss(18, 20, 75)).toBe(4) // 18/24 = 75%
    expect(canMiss(10, 20, 75)).toBe(0) // already short
  })

  it('calculates how many classes must be attended to recover', () => {
    expect(mustAttend(15, 20, 75)).toBe(0)
    const n = mustAttend(10, 20, 75)
    expect((10 + n) / (20 + n)).toBeGreaterThanOrEqual(0.75)
    expect((10 + n - 1) / (20 + n - 1)).toBeLessThan(0.75)
  })

  it('classifies status against a configurable minimum', () => {
    expect(statusOf(90, 20, 75)).toBe('safe')
    expect(statusOf(60, 20, 75)).toBe('shortage')
    expect(statusOf(60, 20, 50)).not.toBe('shortage')
    expect(statusOf(0, 0, 75)).toBe('none')
  })

  it('projects future attendance', () => {
    expect(project(15, 20, 10, 10)).toBeCloseTo((25 / 30) * 100)
    expect(project(15, 20, 10, 0)).toBeCloseTo(50)
  })

  it('aggregates across subjects', () => {
    expect(overall([sub('A', 8, 10), sub('B', 6, 10)], []).pct).toBeCloseTo(70)
  })
})
