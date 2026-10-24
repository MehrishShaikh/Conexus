// Demonstration data. Everything here is fictional and relative to "today" so the
// prototype always looks current. It is loaded into localStorage on first visit.

import { addDays, todayISO } from './dates'
import { generatePlan } from './planner'
import type {
  AppState,
  Availability,
  CalEvent,
  ClassSlot,
  Doubt,
  LFItem,
  Prefs,
  StudentData,
  Subject,
  User,
} from './types'

export const STATE_VERSION = 1
export const DEMO_IDS = { student: 'u_aanya', faculty: 'u_meera', admin: 'u_rahul' } as const

export const defaultPrefs: Prefs = {
  notifyAnnouncements: true,
  notifyDeadlines: true,
  notifyAttendance: true,
  notifyLostFound: true,
  notifyEvents: true,
  reminderLeadMins: 60,
  attendanceMinPct: 75,
  defaultLanguage: 'hi',
  moodSuggestions: true,
}

export const INSTITUTION = 'Demo Institute of Technology'

const users = (): User[] => [
  { id: DEMO_IDS.student, name: 'Aanya Sharma', email: 'aanya@demo.conexus', role: 'student', program: 'B.Tech Information Technology', year: '2nd Year', department: 'Information Technology', academicId: 'DEMO-IT-2024-0142', demo: true },
  { id: DEMO_IDS.faculty, name: 'Prof. Meera Kulkarni', email: 'meera@demo.conexus', role: 'faculty', program: 'Faculty', year: '—', department: 'Information Technology', academicId: 'DEMO-FAC-017', demo: true },
  { id: DEMO_IDS.admin, name: 'Dr. Rahul Deshmukh', email: 'rahul@demo.conexus', role: 'admin', program: 'Administration', year: '—', department: 'Academic Administration', academicId: 'DEMO-ADM-003', demo: true },
  { id: 'u_rohan', name: 'Rohan Mehta', email: 'rohan@demo.conexus', role: 'student', program: 'B.Tech Information Technology', year: '2nd Year', department: 'Information Technology', academicId: 'DEMO-IT-2024-0120', demo: true },
  { id: 'u_sana', name: 'Sana Qureshi', email: 'sana@demo.conexus', role: 'student', program: 'B.Tech Information Technology', year: '2nd Year', department: 'Information Technology', academicId: 'DEMO-IT-2024-0188', demo: true },
  { id: 'u_kabir', name: 'Kabir Nair', email: 'kabir@demo.conexus', role: 'student', program: 'B.Tech Computer Engineering', year: '3rd Year', department: 'Computer Engineering', academicId: 'DEMO-CE-2023-0071', demo: true },
]

export function emptyStudent(): StudentData {
  return {
    subjects: [],
    availability: [3, 2, 2, 2, 2, 2, 4],
    goals: { dailyHours: 2.5, weeklyHours: 16 },
    sessions: [],
    attendance: [],
    semesterEnd: addDays(todayISO(), 75),
    prefs: { ...defaultPrefs },
    mood: null,
    notes: '',
    lastPlanAt: null,
    savedTranscripts: [],
  }
}

const T = (names: string[]) => names.map((name, i) => ({ id: `t${i}_${name.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 8)}`, name }))

export function demoSubjects(today = todayISO()): Subject[] {
  return [
    { id: 'sub_ds', name: 'Data Structures', code: 'DS201', difficulty: 4, examDate: addDays(today, 16), topics: T(['Arrays & Linked Lists', 'Stacks & Queues', 'Trees', 'Graphs', 'Hashing', 'Sorting & Searching']), baseAttended: 24, baseTotal: 30 },
    { id: 'sub_db', name: 'Database Management', code: 'DB202', difficulty: 3, examDate: addDays(today, 19), topics: T(['ER Modelling', 'Relational Algebra', 'SQL', 'Normalisation', 'Transactions', 'Indexing']), baseAttended: 21, baseTotal: 30 },
    { id: 'sub_cn', name: 'Computer Networks', code: 'CN203', difficulty: 4, examDate: addDays(today, 22), topics: T(['OSI & TCP/IP', 'Data Link Layer', 'Network Layer', 'Transport Layer', 'Application Layer']), baseAttended: 27, baseTotal: 32 },
    { id: 'sub_os', name: 'Operating Systems', code: 'OS204', difficulty: 5, examDate: addDays(today, 25), topics: T(['Processes & Threads', 'CPU Scheduling', 'Synchronisation', 'Deadlocks', 'Memory Management', 'File Systems']), baseAttended: 18, baseTotal: 26 },
    { id: 'sub_ma', name: 'Engineering Mathematics III', code: 'MA205', difficulty: 3, examDate: addDays(today, 28), topics: T(['Laplace Transforms', 'Fourier Series', 'Probability', 'Complex Variables']), baseAttended: 25, baseTotal: 28 },
  ]
}

export function demoTimetable(): ClassSlot[] {
  const s = (id: string, code: string, name: string, weekday: number, start: string, end: string, room: string, faculty: string): ClassSlot => ({ id, subjectCode: code, subjectName: name, weekday, start, end, room, faculty })
  return [
    s('c1', 'DS201', 'Data Structures', 1, '09:00', '10:00', 'A-301', 'Prof. R. Iyer'),
    s('c2', 'DB202', 'Database Management', 1, '10:00', '11:00', 'A-302', 'Prof. Meera Kulkarni'),
    s('c3', 'CN203', 'Computer Networks', 1, '11:15', '12:15', 'A-301', 'Prof. S. Shah'),
    s('c4', 'OS204', 'Operating Systems', 2, '09:00', '10:00', 'A-303', 'Prof. D. Bhatt'),
    s('c5', 'MA205', 'Engineering Mathematics III', 2, '10:00', '11:00', 'A-303', 'Prof. L. Fernandes'),
    s('c6', 'DS201', 'Data Structures (Lab)', 2, '11:15', '13:15', 'Lab-2', 'Prof. R. Iyer'),
    s('c7', 'DB202', 'Database Management', 3, '09:00', '10:00', 'A-302', 'Prof. Meera Kulkarni'),
    s('c8', 'CN203', 'Computer Networks', 3, '10:00', '11:00', 'A-301', 'Prof. S. Shah'),
    s('c9', 'OS204', 'Operating Systems', 3, '11:15', '12:15', 'A-303', 'Prof. D. Bhatt'),
    s('c10', 'MA205', 'Engineering Mathematics III', 4, '09:00', '10:00', 'A-303', 'Prof. L. Fernandes'),
    s('c11', 'DS201', 'Data Structures', 4, '10:00', '11:00', 'A-301', 'Prof. R. Iyer'),
    s('c12', 'DB202', 'Database Management (Lab)', 4, '11:15', '13:15', 'Lab-1', 'Prof. Meera Kulkarni'),
    s('c13', 'CN203', 'Computer Networks', 5, '09:00', '10:00', 'A-301', 'Prof. S. Shah'),
    s('c14', 'OS204', 'Operating Systems', 5, '10:00', '11:00', 'A-303', 'Prof. D. Bhatt'),
    s('c15', 'MA205', 'Engineering Mathematics III', 5, '11:15', '12:15', 'A-303', 'Prof. L. Fernandes'),
  ]
}

export function demoStudent(today = todayISO()): StudentData {
  const base = emptyStudent()
  const subjects = demoSubjects(today)
  const availability: Availability = [3, 2, 2, 2, 2, 2, 4]
  const from = addDays(today, -3)
  const plan = generatePlan({ subjects, availability, goals: base.goals, from })
  // Pretend the first few sessions before today were completed, except one that was missed.
  let skipped = false
  const sessions = plan.sessions.map((s) => {
    if (s.date < today) {
      if (!skipped && s.kind === 'learn' && s.date === addDays(today, -2)) {
        skipped = true
        return s
      }
      return { ...s, done: true }
    }
    return s
  })
  const rec = (id: string, sub: string, offset: number, status: 'present' | 'absent', note?: string) => ({ id, subjectId: sub, date: addDays(today, offset), status, note })
  return {
    ...base,
    subjects,
    availability,
    sessions,
    lastPlanAt: new Date().toISOString(),
    attendance: [
      rec('ar1', 'sub_ds', -1, 'present'),
      rec('ar2', 'sub_db', -1, 'absent', 'Fever'),
      rec('ar3', 'sub_os', -2, 'absent'),
      rec('ar4', 'sub_cn', -2, 'present'),
      rec('ar5', 'sub_ma', -3, 'present'),
      rec('ar6', 'sub_os', -4, 'present'),
      rec('ar7', 'sub_db', -5, 'present'),
      rec('ar8', 'sub_ds', -6, 'present'),
    ],
    notes:
      'Transactions ensure that a group of database operations either all succeed or all fail. The ACID properties — atomicity, consistency, isolation and durability — describe what a reliable transaction guarantees. Atomicity means a transaction is treated as a single unit of work. Isolation means concurrent transactions do not see each other\'s partial results. Durability means that once a transaction commits, its changes survive crashes. Locking and timestamp ordering are two common techniques used to enforce isolation. Deadlocks can occur when transactions wait for each other, and the database must detect and resolve them.',
  }
}

const iso = (offset: number, hh: number, mm = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}

export function demoEvents(today = todayISO()): CalEvent[] {
  const e = (id: string, title: string, type: CalEvent['type'], off: number, start: string, end: string, location: string, notes: string, scope: CalEvent['scope'], ownerId: string): CalEvent => ({ id, title, type, date: addDays(today, off), start, end, location, notes, scope, ownerId, reminderMins: scope === 'college' ? 60 : 30 })
  return [
    e('ev1', 'Guest lecture: AI in Healthcare', 'event', 2, '15:00', '16:30', 'Seminar Hall', 'Open to all years. Registration not required.', 'college', DEMO_IDS.admin),
    e('ev2', 'Hackathon kick-off', 'club', 4, '16:00', '17:30', 'Lab-2', 'Coding Club — team formation and problem statements.', 'college', DEMO_IDS.admin),
    e('ev3', 'Coding Club contest', 'club', 6, '17:00', '19:00', 'Lab-1', 'Bring your own laptop.', 'college', DEMO_IDS.admin),
    e('ev4', 'Innovate 2026 — Tech Fest', 'event', 9, '10:00', '17:00', 'Main Auditorium', 'Project showcase, talks and stalls.', 'college', DEMO_IDS.admin),
    e('ev5', 'Mid-semester feedback window closes', 'reminder', 5, '17:00', '17:30', 'Online', 'Student feedback survey for all courses.', 'college', DEMO_IDS.admin),
    e('ev6', 'CN study group', 'event', 1, '18:00', '19:00', 'Library, Level 2', 'Subnetting practice with Rohan and Sana.', 'personal', DEMO_IDS.student),
    e('ev7', 'Submit DBMS mini-project report', 'assignment', 3, '23:00', '23:30', 'Online', 'Upload the PDF to the course portal.', 'personal', DEMO_IDS.student),
  ]
}

export function demoDoubts(): Doubt[] {
  const t = (offsetDays: number, h: number) => iso(offsetDays, h)
  return [
    {
      id: 'd1', subjectCode: 'DB202', title: 'Difference between 3NF and BCNF — when does it matter?',
      body: 'I understand both remove redundancy, but my textbook example looks identical for 3NF and BCNF. Can someone give an example where a table is in 3NF but not in BCNF?',
      authorId: 'u_rohan', authorName: 'Rohan Mehta', createdAt: t(-2, 19), upvotes: ['u_sana', DEMO_IDS.student, 'u_kabir'], bookmarks: [], resolved: true,
      replies: [
        { id: 'r1', parentId: null, authorId: 'u_sana', authorName: 'Sana Qureshi', role: 'student', body: 'A classic case: Course(student, subject, teacher) where each teacher teaches only one subject. Candidate keys are (student, subject) and (student, teacher). The dependency teacher → subject has a non-key determinant, so it is in 3NF (subject is prime) but not BCNF.', createdAt: t(-2, 20), upvotes: ['u_rohan'], accepted: false, simulated: false },
        { id: 'r2', parentId: 'r1', authorId: 'u_rohan', authorName: 'Rohan Mehta', role: 'student', body: 'That clears it up, thank you. So we decompose into (teacher, subject) and (student, teacher)?', createdAt: t(-2, 21), upvotes: [], accepted: false, simulated: false },
        { id: 'r3', parentId: null, authorId: DEMO_IDS.faculty, authorName: 'Prof. Meera Kulkarni', role: 'faculty', body: 'Correct. The decomposition into (teacher, subject) and (student, teacher) is lossless and BCNF — but note it does not preserve the dependency (student, subject) → teacher. That trade-off is exactly why 3NF is often accepted in practice.', createdAt: t(-1, 9), upvotes: ['u_rohan', 'u_sana'], accepted: true, simulated: false },
      ],
    },
    {
      id: 'd2', subjectCode: 'OS204', title: 'Why does round-robin scheduling have a high average waiting time?',
      body: 'For processes with equal burst times, SJF gives a lower average waiting time than round-robin. Is it just the context-switch overhead or something else?',
      authorId: DEMO_IDS.student, authorName: 'Aanya Sharma', createdAt: t(-1, 14), upvotes: ['u_kabir'], bookmarks: [DEMO_IDS.student], resolved: false,
      replies: [
        { id: 'r4', parentId: null, authorId: 'u_kabir', authorName: 'Kabir Nair', role: 'student', body: 'Mostly not the context switch. With equal bursts and a small quantum, every process gets cut into slices so they all finish near the end, which pushes up the average completion — and therefore waiting — time. SJF finishes each short job as early as possible.', createdAt: t(-1, 16), upvotes: ['u_sana'], accepted: false, simulated: false },
      ],
    },
    {
      id: 'd3', subjectCode: 'CN203', title: 'How is the subnet mask for 172.16.0.0/20 written in dotted decimal?',
      body: 'I keep getting confused converting /20 into dotted decimal and finding the number of usable hosts.',
      authorId: 'u_sana', authorName: 'Sana Qureshi', createdAt: t(0, 8), upvotes: [], bookmarks: [], resolved: false, replies: [],
    },
    {
      id: 'd4', subjectCode: 'DS201', title: 'Detecting a cycle in a linked list without extra memory',
      body: 'I know about using a hash set, but is there an O(1) space approach?',
      authorId: 'u_rohan', authorName: 'Rohan Mehta', createdAt: t(-3, 11), upvotes: ['u_sana', 'u_kabir', DEMO_IDS.student], bookmarks: [DEMO_IDS.student], resolved: true,
      replies: [
        { id: 'r5', parentId: null, authorId: 'u_kabir', authorName: 'Kabir Nair', role: 'student', body: "Floyd's tortoise-and-hare: move one pointer by one node and another by two. If they ever meet, there is a cycle; if the fast pointer reaches null, there is none. O(n) time, O(1) space.", createdAt: t(-3, 12), upvotes: ['u_rohan', 'u_sana'], accepted: true, simulated: false },
      ],
    },
  ]
}

export function demoLostFound(): LFItem[] {
  const base = { claims: [], privateContact: 'hidden@demo.conexus', image: undefined as string | undefined }
  const day = (off: number) => addDays(todayISO(), off)
  return [
    { ...base, id: 'lf1', kind: 'found', title: 'Navy steel water bottle', description: 'Insulated 750 ml bottle with a small dent near the base and a sticker of a mountain.', category: 'Bottle', location: 'Canteen, near the counter', date: day(-1), status: 'open', reporterId: 'u_kabir', reporterName: 'Kabir Nair', createdAt: iso(-1, 13) },
    { ...base, id: 'lf2', kind: 'lost', title: 'Casio fx-991 scientific calculator', description: 'Blue cover, initials "SQ" written on the back in marker. Lost after the Maths lecture.', category: 'Electronics', location: 'A-303 lecture hall', date: day(-2), status: 'open', reporterId: 'u_sana', reporterName: 'Sana Qureshi', createdAt: iso(-2, 12) },
    { ...base, id: 'lf3', kind: 'found', title: 'ID card holder with green lanyard', description: 'Card holder with a student ID inside. Handed to the library desk.', category: 'ID / Cards', location: 'Library entrance', date: day(0), status: 'claim-pending', reporterId: 'u_rohan', reporterName: 'Rohan Mehta', createdAt: iso(0, 9),
      claims: [{ id: 'cl1', claimantId: 'u_kabir', claimantName: 'Kabir Nair', message: 'The lanyard is mine — the card shows my branch and year. I can describe the name on it at the library desk.', createdAt: iso(0, 10), status: 'pending' }] },
    { ...base, id: 'lf4', kind: 'lost', title: 'White wireless earbuds case', description: 'Small white charging case, left earbud is missing a silicone tip.', category: 'Electronics', location: 'Library, Level 2', date: day(-3), status: 'open', reporterId: DEMO_IDS.student, reporterName: 'Aanya Sharma', createdAt: iso(-3, 17) },
    { ...base, id: 'lf5', kind: 'found', title: 'Grey zip-up hoodie', description: 'Medium size, university crest on the sleeve, found on a bench.', category: 'Clothing', location: 'Sports ground', date: day(-4), status: 'returned', reporterId: 'u_sana', reporterName: 'Sana Qureshi', createdAt: iso(-4, 18) },
    { ...base, id: 'lf6', kind: 'lost', title: 'Black umbrella with wooden handle', description: 'Large umbrella, curved wooden handle with a brass ring.', category: 'Accessories', location: 'Bus stop outside Gate 2', date: day(-5), status: 'open', reporterId: 'u_kabir', reporterName: 'Kabir Nair', createdAt: iso(-5, 16) },
  ]
}

export function buildInitialState(): AppState {
  const today = todayISO()
  return {
    version: STATE_VERSION,
    sessionUserId: null,
    users: users(),
    students: { [DEMO_IDS.student]: demoStudent(today) },
    timetable: demoTimetable(),
    events: demoEvents(today),
    announcements: [
      { id: 'an1', title: 'Mid-semester feedback survey is open', body: 'Please share feedback on every course before the window closes. Responses are anonymous and help us improve teaching and facilities.', authorId: DEMO_IDS.admin, authorName: 'Dr. Rahul Deshmukh', authorRole: 'admin', official: true, pinned: true, createdAt: iso(-1, 10) },
      { id: 'an2', title: 'Library hours extended during exams', body: 'The central library will stay open until 10 PM from next week until the end of the examination period.', authorId: DEMO_IDS.admin, authorName: 'Dr. Rahul Deshmukh', authorRole: 'admin', official: true, pinned: false, createdAt: iso(-2, 15) },
      { id: 'an3', title: 'DBMS tutorial moved to Wednesday', body: 'This week\'s DBMS tutorial takes place on Wednesday in A-302. Please bring your ER-diagram drafts.', authorId: DEMO_IDS.faculty, authorName: 'Prof. Meera Kulkarni', authorRole: 'faculty', official: false, pinned: false, createdAt: iso(0, 8) },
    ],
    assignments: [
      { id: 'as1', title: 'ER-diagram assignment', subjectCode: 'DB202', due: addDays(today, 3), description: 'Design an ER diagram for a hospital management system and convert it into relational tables.', postedById: DEMO_IDS.faculty, postedByName: 'Prof. Meera Kulkarni', createdAt: iso(-3, 11) },
      { id: 'as2', title: 'Linked-list lab record', subjectCode: 'DS201', due: addDays(today, 6), description: 'Complete experiments 4–6 and submit the lab record.', postedById: DEMO_IDS.faculty, postedByName: 'Prof. R. Iyer', createdAt: iso(-2, 11) },
      { id: 'as3', title: 'Subnetting worksheet', subjectCode: 'CN203', due: addDays(today, 8), description: 'Worksheet on VLSM and CIDR.', postedById: DEMO_IDS.faculty, postedByName: 'Prof. S. Shah', createdAt: iso(-1, 11) },
      { id: 'as4', title: 'Fourier series problem set', subjectCode: 'MA205', due: addDays(today, 11), description: 'Problems 1–12 from the tutorial sheet.', postedById: DEMO_IDS.faculty, postedByName: 'Prof. L. Fernandes', createdAt: iso(0, 9) },
    ],
    doubts: demoDoubts(),
    lostFound: demoLostFound(),
    notifications: [
      { id: 'n1', audience: 'student', category: 'announcement', title: 'Mid-semester feedback survey is open', body: 'Open Announcements to read the full notice.', link: '/dashboard', createdAt: iso(-1, 10), readBy: [] },
      { id: 'n2', audience: 'student', category: 'lostfound', title: 'New items reported in Lost & Found', body: 'Browse recent lost and found reports on campus.', link: '/lost-found', createdAt: iso(-1, 13), readBy: [] },
      { id: 'n3', audience: 'all', category: 'event', title: 'Guest lecture in two days', body: 'AI in Healthcare — Seminar Hall, 3:00 PM.', link: '/calendar', createdAt: iso(0, 7), readBy: [] },
    ],
    facultyPrefs: {},
    usage: { logins: {}, lastLoginAt: {} },
  }
}
