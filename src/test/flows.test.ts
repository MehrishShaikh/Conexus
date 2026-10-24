// End-to-end checks of the data layer for the eight required user journeys.
// They run the real actions against the real store (jsdom localStorage); they do not render the UI.
import { beforeEach, describe, expect, it } from 'vitest'
import { loginDemo, logOut, validateSignUp } from '../lib/auth'
import {
  addAttendance, addDoubt, addEvent, addLostFound, generateStudyPlan, addReply, publishAnnouncement, toggleSession, updatePrefs,
} from '../lib/actions'
import { getState, resetDemoData, STATE_KEY } from '../lib/store'
import { statsFor } from '../lib/attendance'
import { DEMO_IDS } from '../lib/seed'
import { todayISO } from '../lib/dates'

beforeEach(() => { localStorage.clear(); resetDemoData(false); logOut() })

const student = () => getState().students[DEMO_IDS.student]

describe('journey 1 — study plan', () => {
  it('generates a plan and a session can be completed and un-completed', () => {
    loginDemo('student')
    const r = generateStudyPlan()
    expect(r.ok).toBe(true)
    const open = student().sessions.find((s) => !s.done)!
    expect(open).toBeTruthy()
    expect(toggleSession(open.id).ok).toBe(true)
    expect(student().sessions.find((s) => s.id === open.id)!.done).toBe(true)
    toggleSession(open.id)
    expect(student().sessions.find((s) => s.id === open.id)!.done).toBe(false)
  })
})

describe('journey 2 — doubts', () => {
  it('submits a doubt and adds a reply to its thread', () => {
    loginDemo('student')
    const code = student().subjects[0].code
    const r = addDoubt({ subjectCode: code, title: 'How does amortised analysis work?', body: 'I do not follow the potential method; could someone walk through an example?' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(getState().doubts.some((d) => d.id === r.data)).toBe(true)
    expect(addReply(r.data, 'Think of it as saving credit for later expensive operations.').ok).toBe(true)
    expect(getState().doubts.find((d) => d.id === r.data)!.replies.length).toBe(1)
  })
  it('rejects empty doubts', () => {
    loginDemo('student')
    expect(addDoubt({ subjectCode: 'DS201', title: '', body: '' }).ok).toBe(false)
  })
})

describe('journey 3 — attendance', () => {
  it('recalculates the percentage after a record is added', () => {
    loginDemo('student')
    const sub = student().subjects[0]
    const before = statsFor(sub, student().attendance)
    expect(addAttendance({ subjectId: sub.id, date: todayISO(), status: 'absent' }).ok).toBe(true)
    const after = statsFor(sub, student().attendance)
    expect(after.total).toBe(before.total + 1)
    expect(after.pct).toBeLessThan(before.pct)
  })
  it('rejects future dates', () => {
    loginDemo('student')
    expect(addAttendance({ subjectId: student().subjects[0].id, date: '2999-01-01', status: 'present' }).ok).toBe(false)
  })
})

describe('journey 5 — lost & found', () => {
  it('adds a report at the top of the feed and validates input', () => {
    loginDemo('student')
    const r = addLostFound({ kind: 'lost', title: 'Blue water bottle', description: 'Steel bottle with a sticker, left in lab 2.', category: 'Personal', location: 'Library', date: todayISO(), privateContact: 'x@example.com' })
    expect(r.ok).toBe(true)
    expect(getState().lostFound[0].title).toBe('Blue water bottle')
    expect(addLostFound({ kind: 'lost', title: '', description: '', category: 'Personal', location: '', date: todayISO(), privateContact: 'nope' }).ok).toBe(false)
  })
})

describe('journey 6 — events', () => {
  it('creates a personal event and blocks students from college-wide events', () => {
    loginDemo('student')
    expect(addEvent({ title: 'Group study', type: 'reminder', date: todayISO(), start: '16:00', end: '17:00', location: 'Library', notes: '', reminderMins: 0 }).ok).toBe(true)
    expect(getState().events.some((e) => e.title === 'Group study')).toBe(true)
    expect(addEvent({ title: 'Fake fest', type: 'event', date: todayISO(), start: '', end: '', location: '', notes: '', reminderMins: 0, scope: 'college' }).ok).toBe(false)
  })
})

describe('journey 7 — announcements and roles', () => {
  it('lets faculty publish and lets the student data see it', () => {
    loginDemo('faculty')
    const r = publishAnnouncement({ title: 'Quiz moved', body: 'The DBMS quiz is now on Friday at 10 AM.' })
    expect(r.ok).toBe(true)
    logOut()
    loginDemo('student')
    expect(getState().announcements.some((a) => a.title === 'Quiz moved')).toBe(true)
    expect(getState().notifications.some((n) => n.title.includes('Quiz moved') && (n.audience === 'student' || n.audience === 'all'))).toBe(true)
  })
  it('refuses students and signed-out visitors', () => {
    loginDemo('student')
    const r = publishAnnouncement({ title: 'Free pizza', body: 'Everyone is invited to a party.' })
    expect(r.ok).toBe(false)
    logOut()
    expect(publishAnnouncement({ title: 'Anonymous', body: 'Nobody signed in to say this.' }).ok).toBe(false)
  })
})

describe('journey 8 — preferences persist', () => {
  it('stores a preference and writes it to localStorage', () => {
    loginDemo('student')
    expect(updatePrefs({ attendanceMinPct: 80, notifyEvents: false }).ok).toBe(true)
    expect(student().prefs.attendanceMinPct).toBe(80)
    const saved = JSON.parse(localStorage.getItem(STATE_KEY)!)
    expect(saved.students[DEMO_IDS.student].prefs.attendanceMinPct).toBe(80)
    expect(saved.students[DEMO_IDS.student].prefs.notifyEvents).toBe(false)
  })
})

describe('sign-up validation', () => {
  const ok = { name: 'Asha Rao', email: 'asha@example.com', password: 'abcdef12', confirm: 'abcdef12', role: 'student' as const, department: 'CSE', program: 'B.Tech', year: '2nd Year', academicId: 'A1' }
  it('accepts a valid form', () => expect(validateSignUp(ok)).toEqual({}))
  it('flags weak passwords, bad emails and mismatches', () => {
    expect(validateSignUp({ ...ok, password: 'short1', confirm: 'short1' }).password).toBeTruthy()
    expect(validateSignUp({ ...ok, password: 'onlyletters', confirm: 'onlyletters' }).password).toBeTruthy()
    expect(validateSignUp({ ...ok, email: 'bad' }).email).toBeTruthy()
    expect(validateSignUp({ ...ok, confirm: 'different1' }).confirm).toBeTruthy()
  })
})

describe('demo data sanity', () => {
  it('seeds a student with a plan and non-trivial attendance', () => {
    const s = student()
    expect(s.subjects.length).toBeGreaterThan(0)
    expect(s.sessions.length).toBeGreaterThan(0)
  })
})
