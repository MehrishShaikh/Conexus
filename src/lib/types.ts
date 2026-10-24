export type Role = 'student' | 'faculty' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  program: string
  year: string
  department: string
  academicId: string
  demo: boolean
}

export interface Topic {
  id: string
  name: string
}

/** One subject record shared by the Study Planner and the Attendance Planner. */
export interface Subject {
  id: string
  name: string
  code: string
  difficulty: 1 | 2 | 3 | 4 | 5
  examDate: string // YYYY-MM-DD, '' if unknown
  topics: Topic[]
  baseAttended: number
  baseTotal: number
}

export interface StudySession {
  id: string
  subjectId: string
  topic: string
  date: string
  hours: number
  done: boolean
  kind: 'learn' | 'revise'
  movedFrom?: string
}

/** Study hours available per weekday, index 0 = Sunday. */
export type Availability = [number, number, number, number, number, number, number]

export interface Goals {
  dailyHours: number
  weeklyHours: number
}

export interface AttRecord {
  id: string
  subjectId: string
  date: string
  status: 'present' | 'absent'
  note?: string
}

export type EventType = 'class' | 'assignment' | 'exam' | 'event' | 'club' | 'reminder'

export interface CalEvent {
  id: string
  title: string
  type: EventType
  date: string
  start: string
  end: string
  location: string
  notes: string
  scope: 'personal' | 'college'
  ownerId: string
  reminderMins: number | null
}

/** Weekly recurring class published on the division timetable. */
export interface ClassSlot {
  id: string
  subjectCode: string
  subjectName: string
  weekday: number // 0 = Sunday
  start: string
  end: string
  room: string
  faculty: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  authorId: string
  authorName: string
  authorRole: 'faculty' | 'admin'
  official: boolean
  pinned: boolean
  createdAt: string
}

export interface Assignment {
  id: string
  title: string
  subjectCode: string
  due: string
  description: string
  postedById: string
  postedByName: string
  createdAt: string
}

export type ReplyRole = Role | 'ai'

export interface Reply {
  id: string
  parentId: string | null
  authorId: string
  authorName: string
  role: ReplyRole
  body: string
  createdAt: string
  upvotes: string[]
  accepted: boolean
  /** true when the reply is from the built-in simulated assistant */
  simulated: boolean
}

export interface Doubt {
  id: string
  subjectCode: string
  title: string
  body: string
  authorId: string
  authorName: string
  createdAt: string
  upvotes: string[]
  bookmarks: string[]
  resolved: boolean
  image?: string
  replies: Reply[]
}

export type LFStatus = 'open' | 'claim-pending' | 'returned'

export interface Claim {
  id: string
  claimantId: string
  claimantName: string
  message: string
  createdAt: string
  status: 'pending' | 'approved' | 'declined'
}

export interface LFItem {
  id: string
  kind: 'lost' | 'found'
  title: string
  description: string
  category: string
  location: string
  date: string
  image?: string
  status: LFStatus
  reporterId: string
  reporterName: string
  /** Stored but never rendered anywhere; claims go through the platform. */
  privateContact: string
  claims: Claim[]
  createdAt: string
}

export interface AppNotification {
  id: string
  audience: Role | 'all'
  category: 'announcement' | 'deadline' | 'attendance' | 'lostfound' | 'event' | 'system'
  title: string
  body: string
  link: string
  createdAt: string
  readBy: string[]
}

export interface Prefs {
  notifyAnnouncements: boolean
  notifyDeadlines: boolean
  notifyAttendance: boolean
  notifyLostFound: boolean
  notifyEvents: boolean
  reminderLeadMins: number
  attendanceMinPct: number
  defaultLanguage: string
  moodSuggestions: boolean
}

export interface StudentData {
  subjects: Subject[]
  availability: Availability
  goals: Goals
  sessions: StudySession[]
  attendance: AttRecord[]
  semesterEnd: string
  prefs: Prefs
  mood: 'energised' | 'steady' | 'tired' | 'stressed' | null
  notes: string
  lastPlanAt: string | null
  savedTranscripts: SavedTranscript[]
}

export interface SavedTranscript {
  id: string
  createdAt: string
  title: string
  sourceLang: string
  targetLang: string
  mode: 'live' | 'demo'
  lines: { original: string; translated: string }[]
}

export interface AppState {
  version: number
  sessionUserId: string | null
  users: User[]
  students: Record<string, StudentData>
  timetable: ClassSlot[]
  events: CalEvent[]
  announcements: Announcement[]
  assignments: Assignment[]
  doubts: Doubt[]
  lostFound: LFItem[]
  notifications: AppNotification[]
  facultyPrefs: Record<string, Pick<Prefs, 'notifyAnnouncements' | 'notifyEvents' | 'notifyLostFound'>>
  usage: { logins: Record<string, number>; lastLoginAt: Record<string, string> }
}
