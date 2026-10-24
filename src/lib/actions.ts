// All state mutations. Each action validates its input and the caller's role, and returns a Result
// so the UI can show a genuine success or error message (never a fake success).

import { addDays, todayISO, uid } from './dates'
import { demoStudent } from './seed'
import { generatePlan, missedSessions } from './planner'
import { currentUser, fail, getState, ok, setState, type Result } from './store'
import { requireRole } from './auth'
import type {
  AppNotification,
  Announcement,
  AttRecord,
  Availability,
  CalEvent,
  Doubt,
  Goals,
  LFItem,
  Prefs,
  Reply,
  Role,
  SavedTranscript,
  StudentData,
  Subject,
} from './types'

const nowISO = () => new Date().toISOString()

function mustStudent(): Result<{ id: string }> {
  const r = requireRole(['student'])
  if (!r.ok) return r as Result<{ id: string }>
  return ok({ id: r.data.id })
}

function patchStudent(id: string, fn: (s: StudentData) => StudentData) {
  setState((st) => ({ ...st, students: { ...st.students, [id]: fn(st.students[id]) } }))
}

function pushNotification(n: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>) {
  setState((st) => ({
    ...st,
    notifications: [{ ...n, id: uid('n'), createdAt: nowISO(), readBy: [] }, ...st.notifications].slice(0, 100),
  }))
}

/* ------------------------------ Profile & prefs ------------------------------ */

export function updateProfile(patch: { name?: string; program?: string; year?: string; department?: string }): Result {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  if (patch.name !== undefined && patch.name.trim().length < 2) return fail('Name must be at least 2 characters.')
  setState((st) => ({
    ...st,
    users: st.users.map((x) =>
      x.id === u.id
        ? { ...x, ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])) }
        : x,
    ),
  }))
  return ok()
}

export function updatePrefs(patch: Partial<Prefs>): Result {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  if (patch.attendanceMinPct !== undefined && (patch.attendanceMinPct < 1 || patch.attendanceMinPct > 100))
    return fail('Minimum attendance must be between 1 and 100.')
  if (u.role === 'student') {
    patchStudent(u.id, (s) => ({ ...s, prefs: { ...s.prefs, ...patch } }))
  } else {
    setState((st) => {
      const prev = st.facultyPrefs[u.id] ?? { notifyAnnouncements: true, notifyEvents: true, notifyLostFound: true }
      return {
        ...st,
        facultyPrefs: {
          ...st.facultyPrefs,
          [u.id]: {
            notifyAnnouncements: patch.notifyAnnouncements ?? prev.notifyAnnouncements,
            notifyEvents: patch.notifyEvents ?? prev.notifyEvents,
            notifyLostFound: patch.notifyLostFound ?? prev.notifyLostFound,
          },
        },
      }
    })
  }
  return ok()
}

export function loadSampleData(): Result {
  const r = mustStudent()
  if (!r.ok) return r
  patchStudent(r.data.id, () => demoStudent(todayISO()))
  return ok()
}

export function clearMyStudyData(): Result {
  const r = mustStudent()
  if (!r.ok) return r
  patchStudent(r.data.id, (s) => ({ ...s, subjects: [], sessions: [], attendance: [], lastPlanAt: null }))
  return ok()
}

/* ------------------------------- Study planner ------------------------------- */

export interface SubjectInput {
  name: string
  code: string
  difficulty: 1 | 2 | 3 | 4 | 5
  examDate: string
  topics: string[]
  baseAttended: number
  baseTotal: number
}

export function validateSubject(i: SubjectInput): string | null {
  if (!i.name.trim()) return 'Subject name is required.'
  if (!i.code.trim()) return 'Subject code is required.'
  if (i.baseAttended < 0 || i.baseTotal < 0) return 'Class counts cannot be negative.'
  if (i.baseAttended > i.baseTotal) return 'Attended classes cannot exceed total classes.'
  if (i.examDate && i.examDate < todayISO()) return 'The exam date is in the past.'
  return null
}

export function saveSubject(input: SubjectInput, id?: string): Result<string> {
  const r = mustStudent()
  if (!r.ok) return r as Result<string>
  const err = validateSubject(input)
  if (err) return fail(err)
  const sid = id ?? uid('sub')
  const topics = [...new Set(input.topics.map((t) => t.trim()).filter(Boolean))].map((name) => ({ id: uid('t'), name }))
  patchStudent(r.data.id, (s) => {
    const exists = s.subjects.some((x) => x.id === sid)
    if (!exists && s.subjects.some((x) => x.code.toLowerCase() === input.code.trim().toLowerCase())) return s
    const subject: Subject = {
      id: sid,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      difficulty: input.difficulty,
      examDate: input.examDate,
      topics,
      baseAttended: input.baseAttended,
      baseTotal: input.baseTotal,
    }
    return { ...s, subjects: exists ? s.subjects.map((x) => (x.id === sid ? subject : x)) : [...s.subjects, subject] }
  })
  const saved = getState().students[r.data.id].subjects.find((x) => x.id === sid)
  if (!saved) return fail('A subject with this code already exists.')
  return ok(sid)
}

export function deleteSubject(id: string): Result {
  const r = mustStudent()
  if (!r.ok) return r
  patchStudent(r.data.id, (s) => ({
    ...s,
    subjects: s.subjects.filter((x) => x.id !== id),
    sessions: s.sessions.filter((x) => x.subjectId !== id),
    attendance: s.attendance.filter((x) => x.subjectId !== id),
  }))
  return ok()
}

export function setAvailability(a: Availability): Result {
  const r = mustStudent()
  if (!r.ok) return r
  if (a.some((h) => h < 0 || h > 16 || Number.isNaN(h))) return fail('Daily hours must be between 0 and 16.')
  patchStudent(r.data.id, (s) => ({ ...s, availability: a }))
  return ok()
}

export function setGoals(g: Goals): Result {
  const r = mustStudent()
  if (!r.ok) return r
  if (!(g.dailyHours > 0) || g.dailyHours > 16) return fail('Daily goal must be between 0.5 and 16 hours.')
  if (!(g.weeklyHours > 0) || g.weeklyHours > 100) return fail('Weekly goal must be between 1 and 100 hours.')
  if (g.weeklyHours < g.dailyHours) return fail('Weekly goal cannot be smaller than the daily goal.')
  patchStudent(r.data.id, (s) => ({ ...s, goals: g }))
  return ok()
}

export function generateStudyPlan(): Result<{ warnings: string[]; hours: number; sessions: number }> {
  const r = mustStudent()
  if (!r.ok) return r as Result<{ warnings: string[]; hours: number; sessions: number }>
  const s = getState().students[r.data.id]
  if (s.subjects.length === 0) return fail('Add at least one subject with an exam date first.')
  if (!s.subjects.some((x) => x.examDate && x.examDate > todayISO() && x.topics.length)) return fail('No subject has both topics and a future exam date.')
  // A fresh plan keeps completed work and rebuilds everything else from today.
  const res = generatePlan({ subjects: s.subjects, availability: s.availability, goals: s.goals, from: todayISO(), existing: s.sessions })
  patchStudent(r.data.id, (x) => ({ ...x, sessions: res.sessions, lastPlanAt: nowISO() }))
  return ok({ warnings: res.warnings, hours: res.plannedHours, sessions: res.sessions.filter((x) => !x.done).length })
}

export function rescheduleMissed(): Result<{ moved: number; warnings: string[] }> {
  const r = mustStudent()
  if (!r.ok) return r as Result<{ moved: number; warnings: string[] }>
  const s = getState().students[r.data.id]
  const missed = missedSessions(s.sessions, todayISO())
  if (missed.length === 0) return fail('Nothing to reschedule — no sessions were missed.')
  const res = generatePlan({ subjects: s.subjects, availability: s.availability, goals: s.goals, from: todayISO(), existing: s.sessions })
  patchStudent(r.data.id, (x) => ({ ...x, sessions: res.sessions, lastPlanAt: nowISO() }))
  return ok({ moved: missed.length, warnings: res.warnings })
}

export function toggleSession(id: string): Result<boolean> {
  const r = mustStudent()
  if (!r.ok) return r as Result<boolean>
  const s = getState().students[r.data.id]
  const found = s.sessions.find((x) => x.id === id)
  if (!found) return fail('That study session no longer exists.')
  patchStudent(r.data.id, (x) => ({ ...x, sessions: x.sessions.map((q) => (q.id === id ? { ...q, done: !q.done } : q)) }))
  return ok(!found.done)
}

export function deleteSession(id: string): Result {
  const r = mustStudent()
  if (!r.ok) return r
  patchStudent(r.data.id, (x) => ({ ...x, sessions: x.sessions.filter((q) => q.id !== id) }))
  return ok()
}

export function addManualSession(input: { subjectId: string; topic: string; date: string; hours: number }): Result {
  const r = mustStudent()
  if (!r.ok) return r
  if (!input.subjectId) return fail('Choose a subject.')
  if (!input.topic.trim()) return fail('Enter a topic.')
  if (!input.date) return fail('Choose a date.')
  if (!(input.hours > 0) || input.hours > 12) return fail('Hours must be between 0.5 and 12.')
  patchStudent(r.data.id, (x) => ({
    ...x,
    sessions: [...x.sessions, { id: uid('ss'), subjectId: input.subjectId, topic: input.topic.trim(), date: input.date, hours: input.hours, done: false, kind: 'learn' as const }],
  }))
  return ok()
}

/* -------------------------------- Attendance -------------------------------- */

export function addAttendance(rec: Omit<AttRecord, 'id'>): Result {
  const r = mustStudent()
  if (!r.ok) return r
  if (!rec.subjectId) return fail('Choose a subject.')
  if (!rec.date) return fail('Choose a date.')
  if (rec.date > todayISO()) return fail('You can only record attendance for today or earlier.')
  const s = getState().students[r.data.id]
  if (!s.subjects.some((x) => x.id === rec.subjectId)) return fail('That subject no longer exists.')
  patchStudent(r.data.id, (x) => ({ ...x, attendance: [{ ...rec, id: uid('ar') }, ...x.attendance] }))
  return ok()
}

export function updateAttendance(id: string, patch: Partial<Omit<AttRecord, 'id'>>): Result {
  const r = mustStudent()
  if (!r.ok) return r
  if (patch.date && patch.date > todayISO()) return fail('You can only record attendance for today or earlier.')
  patchStudent(r.data.id, (x) => ({ ...x, attendance: x.attendance.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))
  return ok()
}

export function deleteAttendance(id: string): Result {
  const r = mustStudent()
  if (!r.ok) return r
  patchStudent(r.data.id, (x) => ({ ...x, attendance: x.attendance.filter((a) => a.id !== id) }))
  return ok()
}

export function setSemesterEnd(date: string): Result {
  const r = mustStudent()
  if (!r.ok) return r
  if (!date || date <= todayISO()) return fail('Semester end date must be in the future.')
  patchStudent(r.data.id, (x) => ({ ...x, semesterEnd: date }))
  return ok()
}

/* ---------------------------------- Doubts ---------------------------------- */

export function addDoubt(input: { subjectCode: string; title: string; body: string; image?: string }): Result<string> {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  if (u.role === 'admin') return fail('Administrators cannot post doubts.')
  if (input.title.trim().length < 8) return fail('Give your doubt a descriptive title (at least 8 characters).')
  if (input.body.trim().length < 15) return fail('Describe the doubt in at least 15 characters so others can help.')
  if (!input.subjectCode) return fail('Choose a subject.')
  const d: Doubt = {
    id: uid('d'), subjectCode: input.subjectCode, title: input.title.trim(), body: input.body.trim(), image: input.image,
    authorId: u.id, authorName: u.name, createdAt: nowISO(), upvotes: [], bookmarks: [], resolved: false, replies: [],
  }
  setState((st) => ({ ...st, doubts: [d, ...st.doubts] }))
  return ok(d.id)
}

export function addReply(doubtId: string, body: string, parentId: string | null = null): Result {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  if (u.role === 'admin') return fail('Administrators cannot reply to doubts.')
  if (body.trim().length < 2) return fail('Write a reply first.')
  const reply: Reply = { id: uid('r'), parentId, authorId: u.id, authorName: u.name, role: u.role, body: body.trim(), createdAt: nowISO(), upvotes: [], accepted: false, simulated: false }
  setState((st) => ({ ...st, doubts: st.doubts.map((d) => (d.id === doubtId ? { ...d, replies: [...d.replies, reply] } : d)) }))
  return ok()
}

export function addAiReply(doubtId: string, body: string, simulated: boolean): Result {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  const reply: Reply = { id: uid('r'), parentId: null, authorId: 'ai', authorName: simulated ? 'CONEXUs Demo Assistant (simulated)' : 'CONEXUs AI Assistant', role: 'ai', body, createdAt: nowISO(), upvotes: [], accepted: false, simulated }
  setState((st) => ({ ...st, doubts: st.doubts.map((d) => (d.id === doubtId ? { ...d, replies: [...d.replies, reply] } : d)) }))
  return ok()
}

export function toggleUpvote(doubtId: string, replyId?: string): Result {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  const flip = (arr: string[]) => (arr.includes(u.id) ? arr.filter((x) => x !== u.id) : [...arr, u.id])
  setState((st) => ({
    ...st,
    doubts: st.doubts.map((d) =>
      d.id !== doubtId ? d : replyId ? { ...d, replies: d.replies.map((r) => (r.id === replyId ? { ...r, upvotes: flip(r.upvotes) } : r)) } : { ...d, upvotes: flip(d.upvotes) },
    ),
  }))
  return ok()
}

export function toggleBookmark(doubtId: string): Result {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  setState((st) => ({
    ...st,
    doubts: st.doubts.map((d) => (d.id === doubtId ? { ...d, bookmarks: d.bookmarks.includes(u.id) ? d.bookmarks.filter((x) => x !== u.id) : [...d.bookmarks, u.id] } : d)),
  }))
  return ok()
}

export function setResolved(doubtId: string, resolved: boolean, acceptReplyId?: string): Result {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  const d = getState().doubts.find((x) => x.id === doubtId)
  if (!d) return fail('That doubt no longer exists.')
  if (d.authorId !== u.id && u.role !== 'faculty') return fail('Only the author or a faculty member can change the resolved status.')
  setState((st) => ({
    ...st,
    doubts: st.doubts.map((x) =>
      x.id === doubtId ? { ...x, resolved, replies: x.replies.map((r) => ({ ...r, accepted: resolved && acceptReplyId ? r.id === acceptReplyId : resolved ? r.accepted : false })) } : x,
    ),
  }))
  return ok()
}

export function deleteDoubt(doubtId: string): Result {
  const u = currentUser()
  const d = getState().doubts.find((x) => x.id === doubtId)
  if (!u || !d) return fail('That doubt no longer exists.')
  if (d.authorId !== u.id && u.role !== 'faculty') return fail('You can only delete your own doubts.')
  setState((st) => ({ ...st, doubts: st.doubts.filter((x) => x.id !== doubtId) }))
  return ok()
}

/* -------------------------------- Lost & found -------------------------------- */

export function addLostFound(input: Omit<LFItem, 'id' | 'status' | 'claims' | 'createdAt' | 'reporterId' | 'reporterName'>): Result<string> {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  if (input.title.trim().length < 3) return fail('Give the item a short title.')
  if (input.description.trim().length < 10) return fail('Add a description of at least 10 characters.')
  if (!input.location.trim()) return fail('Add an approximate location.')
  if (!input.date) return fail('Choose the date.')
  if (input.date > todayISO()) return fail('The date cannot be in the future.')
  if (!/^\S+@\S+\.\S+$/.test(input.privateContact.trim())) return fail('Add a contact email — it stays private and is never shown to other users.')
  const item: LFItem = {
    ...input, title: input.title.trim(), description: input.description.trim(), location: input.location.trim(), privateContact: input.privateContact.trim(),
    id: uid('lf'), status: 'open', claims: [], createdAt: nowISO(), reporterId: u.id, reporterName: u.name,
  }
  setState((st) => ({ ...st, lostFound: [item, ...st.lostFound] }))
  pushNotification({ audience: 'all', category: 'lostfound', title: `${item.kind === 'lost' ? 'Lost' : 'Found'}: ${item.title}`, body: `Reported near ${item.location}.`, link: '/lost-found' })
  return ok(item.id)
}

export function requestClaim(itemId: string, message: string): Result {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  const it = getState().lostFound.find((x) => x.id === itemId)
  if (!it) return fail('That item no longer exists.')
  if (it.reporterId === u.id) return fail('You reported this item, so you cannot claim it.')
  if (it.status === 'returned') return fail('This item has already been returned.')
  if (it.claims.some((c) => c.claimantId === u.id && c.status === 'pending')) return fail('You already have a pending claim for this item.')
  if (message.trim().length < 15) return fail('Describe something only the owner would know (at least 15 characters).')
  setState((st) => ({
    ...st,
    lostFound: st.lostFound.map((x) =>
      x.id === itemId ? { ...x, status: 'claim-pending' as const, claims: [...x.claims, { id: uid('cl'), claimantId: u.id, claimantName: u.name, message: message.trim(), createdAt: nowISO(), status: 'pending' as const }] } : x,
    ),
  }))
  return ok()
}

export function resolveClaim(itemId: string, claimId: string, approve: boolean): Result {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  const it = getState().lostFound.find((x) => x.id === itemId)
  if (!it) return fail('That item no longer exists.')
  if (it.reporterId !== u.id && u.role !== 'admin') return fail('Only the reporter or an administrator can review claims.')
  setState((st) => ({
    ...st,
    lostFound: st.lostFound.map((x) => {
      if (x.id !== itemId) return x
      const claims = x.claims.map((c) => (c.id === claimId ? { ...c, status: approve ? ('approved' as const) : ('declined' as const) } : c))
      const stillPending = claims.some((c) => c.status === 'pending')
      return { ...x, claims, status: approve ? ('returned' as const) : stillPending ? ('claim-pending' as const) : ('open' as const) }
    }),
  }))
  return ok()
}

export function setItemStatus(itemId: string, status: LFItem['status']): Result {
  const u = currentUser()
  const it = getState().lostFound.find((x) => x.id === itemId)
  if (!u || !it) return fail('That item no longer exists.')
  if (it.reporterId !== u.id && u.role !== 'admin') return fail('Only the reporter or an administrator can update the status.')
  setState((st) => ({ ...st, lostFound: st.lostFound.map((x) => (x.id === itemId ? { ...x, status } : x)) }))
  return ok()
}

export function deleteLostFound(itemId: string): Result {
  const u = currentUser()
  const it = getState().lostFound.find((x) => x.id === itemId)
  if (!u || !it) return fail('That item no longer exists.')
  if (it.reporterId !== u.id && u.role !== 'admin') return fail('You can only remove your own reports.')
  setState((st) => ({ ...st, lostFound: st.lostFound.filter((x) => x.id !== itemId) }))
  return ok()
}

/* ---------------------------------- Calendar ---------------------------------- */

export type EventInput = Omit<CalEvent, 'id' | 'ownerId' | 'scope'> & { scope?: CalEvent['scope'] }

function validateEvent(i: EventInput): string | null {
  if (i.title.trim().length < 2) return 'Give the event a title.'
  if (!i.date) return 'Choose a date.'
  if (i.start && i.end && i.end < i.start) return 'The end time must be after the start time.'
  return null
}

export function addEvent(input: EventInput): Result<string> {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  const err = validateEvent(input)
  if (err) return fail(err)
  const scope: CalEvent['scope'] = input.scope === 'college' ? 'college' : 'personal'
  if (scope === 'college' && u.role !== 'admin') return fail('Only administrators can create college-wide events.')
  const ev: CalEvent = { ...input, title: input.title.trim(), scope, id: uid('ev'), ownerId: u.id }
  setState((st) => ({ ...st, events: [...st.events, ev] }))
  if (scope === 'college') pushNotification({ audience: 'all', category: 'event', title: `New event: ${ev.title}`, body: `${ev.date} · ${ev.location || 'Campus'}`, link: '/calendar' })
  return ok(ev.id)
}

export function updateEvent(id: string, input: EventInput): Result {
  const u = currentUser()
  const ev = getState().events.find((x) => x.id === id)
  if (!u || !ev) return fail('That event no longer exists.')
  if (ev.scope === 'college' ? u.role !== 'admin' : ev.ownerId !== u.id) return fail('You do not have permission to edit this event.')
  const err = validateEvent(input)
  if (err) return fail(err)
  setState((st) => ({ ...st, events: st.events.map((x) => (x.id === id ? { ...x, ...input, title: input.title.trim(), scope: x.scope, ownerId: x.ownerId } : x)) }))
  return ok()
}

export function deleteEvent(id: string): Result {
  const u = currentUser()
  const ev = getState().events.find((x) => x.id === id)
  if (!u || !ev) return fail('That event no longer exists.')
  if (ev.scope === 'college' ? u.role !== 'admin' : ev.ownerId !== u.id) return fail('You do not have permission to delete this event.')
  setState((st) => ({ ...st, events: st.events.filter((x) => x.id !== id) }))
  return ok()
}

/* ------------------------- Faculty & administration ------------------------- */

export function publishAnnouncement(input: { title: string; body: string; pinned?: boolean }): Result<string> {
  const r = requireRole(['faculty', 'admin'])
  if (!r.ok) return r as Result<string>
  if (input.title.trim().length < 4) return fail('Add a title of at least 4 characters.')
  if (input.body.trim().length < 10) return fail('Write at least 10 characters in the message.')
  const u = r.data
  const a: Announcement = {
    id: uid('an'), title: input.title.trim(), body: input.body.trim(), authorId: u.id, authorName: u.name,
    authorRole: u.role === 'admin' ? 'admin' : 'faculty', official: u.role === 'admin', pinned: !!input.pinned && u.role === 'admin', createdAt: nowISO(),
  }
  setState((st) => ({ ...st, announcements: [a, ...st.announcements] }))
  pushNotification({ audience: 'student', category: 'announcement', title: a.official ? `Official notice: ${a.title}` : `${u.name}: ${a.title}`, body: a.body.slice(0, 120), link: '/dashboard' })
  return ok(a.id)
}

export function deleteAnnouncement(id: string): Result {
  const u = currentUser()
  const a = getState().announcements.find((x) => x.id === id)
  if (!u || !a) return fail('That announcement no longer exists.')
  if (!(u.role === 'admin' || (u.role === 'faculty' && a.authorId === u.id))) return fail('You can only remove your own announcements.')
  setState((st) => ({ ...st, announcements: st.announcements.filter((x) => x.id !== id) }))
  return ok()
}

export function postAssignment(input: { title: string; subjectCode: string; due: string; description: string }): Result<string> {
  const r = requireRole(['faculty', 'admin'])
  if (!r.ok) return r as Result<string>
  if (input.title.trim().length < 3) return fail('Give the assignment a title.')
  if (!input.subjectCode.trim()) return fail('Enter the subject code.')
  if (!input.due || input.due < todayISO()) return fail('Choose a due date from today onwards.')
  const a = { id: uid('as'), title: input.title.trim(), subjectCode: input.subjectCode.trim().toUpperCase(), due: input.due, description: input.description.trim(), postedById: r.data.id, postedByName: r.data.name, createdAt: nowISO() }
  setState((st) => ({ ...st, assignments: [a, ...st.assignments] }))
  pushNotification({ audience: 'student', category: 'deadline', title: `New assignment: ${a.title}`, body: `${a.subjectCode} · due ${a.due}`, link: '/calendar' })
  return ok(a.id)
}

export function deleteAssignment(id: string): Result {
  const r = requireRole(['faculty', 'admin'])
  if (!r.ok) return r
  setState((st) => ({ ...st, assignments: st.assignments.filter((x) => x.id !== id) }))
  return ok()
}

export function addClassSlot(input: { subjectCode: string; subjectName: string; weekday: number; start: string; end: string; room: string; faculty: string }): Result {
  const r = requireRole(['faculty', 'admin'])
  if (!r.ok) return r
  if (!input.subjectCode.trim() || !input.subjectName.trim()) return fail('Enter the subject code and name.')
  if (!input.start || !input.end || input.end <= input.start) return fail('The end time must be after the start time.')
  if (!input.room.trim()) return fail('Enter a room.')
  setState((st) => ({ ...st, timetable: [...st.timetable, { ...input, subjectCode: input.subjectCode.trim().toUpperCase(), id: uid('c') }] }))
  return ok()
}

export function deleteClassSlot(id: string): Result {
  const r = requireRole(['faculty', 'admin'])
  if (!r.ok) return r
  setState((st) => ({ ...st, timetable: st.timetable.filter((x) => x.id !== id) }))
  return ok()
}

/* ------------------------------- Notifications ------------------------------- */

export function markNotificationRead(id: string): void {
  const u = currentUser()
  if (!u) return
  setState((st) => ({ ...st, notifications: st.notifications.map((n) => (n.id === id && !n.readBy.includes(u.id) ? { ...n, readBy: [...n.readBy, u.id] } : n)) }))
}

export function markAllRead(role: Role): void {
  const u = currentUser()
  if (!u) return
  setState((st) => ({
    ...st,
    notifications: st.notifications.map((n) => ((n.audience === 'all' || n.audience === role) && !n.readBy.includes(u.id) ? { ...n, readBy: [...n.readBy, u.id] } : n)),
  }))
}

/* --------------------------- Productivity & transcripts --------------------------- */

export function setMood(mood: StudentData['mood']): Result {
  const r = mustStudent()
  if (!r.ok) return r
  patchStudent(r.data.id, (s) => ({ ...s, mood }))
  return ok()
}

export function saveNotes(notes: string): Result {
  const r = mustStudent()
  if (!r.ok) return r
  patchStudent(r.data.id, (s) => ({ ...s, notes }))
  return ok()
}

export function saveTranscript(t: Omit<SavedTranscript, 'id' | 'createdAt'>): Result {
  const r = mustStudent()
  if (!r.ok) return r
  if (t.lines.length === 0) return fail('There is nothing to save yet.')
  patchStudent(r.data.id, (s) => ({ ...s, savedTranscripts: [{ ...t, id: uid('tr'), createdAt: nowISO() }, ...s.savedTranscripts].slice(0, 20) }))
  return ok()
}

export function deleteTranscript(id: string): Result {
  const r = mustStudent()
  if (!r.ok) return r
  patchStudent(r.data.id, (s) => ({ ...s, savedTranscripts: s.savedTranscripts.filter((t) => t.id !== id) }))
  return ok()
}

export { addDays }
