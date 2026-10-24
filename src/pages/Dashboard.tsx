import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, Bell, BookOpenCheck, CalendarDays, ClipboardCheck, Megaphone, MessagesSquare, PackageSearch, PartyPopper, Plus, Sparkles, Timer } from 'lucide-react'
import { Badge, Card, CardTitle, EmptyState, PageHeader, ProgressBar, Skeleton, useLoading, useToast } from '../components/ui'
import { loadSampleData, toggleSession } from '../lib/actions'
import { overall, statsFor, statusOf } from '../lib/attendance'
import { useCalendarItems } from '../lib/calendar'
import { addDays, daysBetween, fmtDate, fmtTime, relativeDay, startOfWeek, timeAgo, todayISO } from '../lib/dates'
import { useAlerts } from '../lib/notifications'
import { planProgress, weeklyHours } from '../lib/planner'
import { useCurrentUser, useStore, useStudent } from '../lib/store'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function ViewAll({ to, label = 'Open' }: { to: string; label?: string }) {
  return <Link to={to} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gold hover:text-ink">{label}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
}

export default function Dashboard() {
  const user = useCurrentUser()!
  const data = useStudent()
  const loading = useLoading(380)
  const nav = useNavigate()
  const { report } = useToast()
  const today = todayISO()
  const announcements = useStore((s) => s.announcements)
  const doubts = useStore((s) => s.doubts)
  const lf = useStore((s) => s.lostFound)
  const alerts = useAlerts()
  const week = startOfWeek(today)
  const todayItems = useCalendarItems(today, today)
  const upcoming = useCalendarItems(today, addDays(today, 21))
  const assignmentsExams = upcoming.filter((i) => i.kind === 'assignment' || i.kind === 'exam').slice(0, 5)
  const events = upcoming.filter((i) => i.kind === 'event' || i.kind === 'club').slice(0, 4)
  const att = useMemo(() => (data ? overall(data.subjects, data.attendance) : null), [data])
  const prog = useMemo(() => (data ? planProgress(data.sessions) : null), [data])
  const wk = useMemo(() => (data ? weeklyHours(data.sessions, week) : []), [data, week])
  const wkMax = Math.max(1, ...wk.map((d) => d.planned))
  const todays = data?.sessions.filter((s) => s.date === today) ?? []
  const nextExam = data?.subjects.filter((s) => s.examDate >= today).sort((a, b) => a.examDate.localeCompare(b.examDate))[0]
  const sortedAnn = [...announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
  const lfRecent = [...lf].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
  const openDoubts = doubts.filter((d) => !d.resolved).slice(0, 3)
  const myMin = data?.prefs.attendanceMinPct ?? 75

  const noData = !data || data.subjects.length === 0

  return (
    <div>
      <PageHeader
        eyebrow={`${user.program} · ${user.year}`}
        title={`${greeting()}, ${user.name.split(' ')[0]}.`}
        intro={nextExam ? `${nextExam.name} is your next exam — ${daysBetween(today, nextExam.examDate)} days away. Here is your day at a glance.` : 'Here is your day at a glance.'}
        actions={<Link to="/doubts" className="btn btn-primary"><MessagesSquare className="h-4 w-4" />Ask a doubt</Link>}
      />

      {noData && (
        <div className="mb-8">
          <EmptyState
            icon={<Sparkles className="h-8 w-8" strokeWidth={1.4} />}
            title="Your workspace is empty"
            text="Add your subjects in the Study Planner to unlock attendance tracking, your plan and exam countdowns — or explore with sample data."
            action={<div className="flex flex-wrap justify-center gap-2"><Link to="/study-planner" className="btn btn-primary">Add subjects</Link><button className="btn btn-ghost" onClick={() => report(loadSampleData(), 'Sample data loaded.')}>Load sample data</button></div>}
          />
        </div>
      )}

      {alerts.length > 0 && (
        <div className="mb-6 grid gap-2 md:grid-cols-2">
          {alerts.slice(0, 4).map((a) => (
            <button key={a.id} onClick={() => nav(a.link)} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition hover:shadow-[var(--shadow-soft)] ${a.tone === 'clay' ? 'border-clay/40 bg-clay/5' : a.tone === 'gold' ? 'border-gold/50 bg-gold/10' : 'border-sage/40 bg-sage/10'}`}>
              {a.tone === 'sage' ? <Timer className="mt-0.5 h-5 w-5 shrink-0 text-sage" /> : <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${a.tone === 'clay' ? 'text-clay' : 'text-gold'}`} />}
              <span><span className="block text-sm font-bold">{a.title}</span><span className="block text-xs text-charcoal/75">{a.body}</span></span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Timetable */}
        <Card className="lg:col-span-1">
          <CardTitle icon={<CalendarDays className="h-5 w-5" />} action={<ViewAll to="/calendar" />}>Today</CardTitle>
          {loading ? <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : todayItems.length === 0 ? (
            <EmptyState icon={<PartyPopper className="h-7 w-7" strokeWidth={1.4} />} title="A clear day" text="No classes or events are scheduled today." />
          ) : (
            <ol className="space-y-2.5">
              {todayItems.map((i) => (
                <li key={i.id} className="flex gap-3 rounded-xl border border-ink/5 bg-ivory/70 p-3">
                  <span className="w-[62px] shrink-0 text-xs font-bold text-gold">{i.start ? fmtTime(i.start) : 'All day'}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-bold">{i.title}</span><span className="block truncate text-xs text-muted">{[i.location, i.kind === 'class' ? i.notes : ''].filter(Boolean).join(' · ')}</span></span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Attendance */}
        <Card>
          <CardTitle icon={<ClipboardCheck className="h-5 w-5" />} action={<ViewAll to="/attendance" />}>Attendance</CardTitle>
          {loading ? <Skeleton className="h-40" /> : !data || data.subjects.length === 0 ? <EmptyState title="No attendance yet" text="Add subjects to start tracking." /> : (
            <>
              <div className="flex items-end gap-3">
                <p className="font-display text-6xl leading-none">{att!.pct.toFixed(1)}<span className="text-3xl text-muted">%</span></p>
                <p className="pb-1 text-xs text-muted">overall · {att!.attended}/{att!.total} classes<br />target {myMin}%</p>
              </div>
              <ul className="mt-5 space-y-3">
                {data.subjects.slice(0, 5).map((s) => {
                  const st = statsFor(s, data.attendance)
                  const status = statusOf(st.pct, st.total, myMin)
                  return (
                    <li key={s.id}>
                      <div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{s.name}</span><span className={status === 'shortage' ? 'font-bold text-clay' : 'text-muted'}>{st.pct.toFixed(0)}%</span></div>
                      <ProgressBar value={st.pct} tone={status === 'shortage' ? 'clay' : status === 'borderline' ? 'gold' : 'sage'} label={`${s.name} attendance`} />
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </Card>

        {/* Assignments & exams */}
        <Card>
          <CardTitle icon={<Bell className="h-5 w-5" />} action={<ViewAll to="/calendar" label="Calendar" />}>Deadlines &amp; exams</CardTitle>
          {loading ? <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : assignmentsExams.length === 0 ? <EmptyState title="Nothing due soon" text="No assignments or exams in the next three weeks." /> : (
            <ul className="space-y-2.5">
              {assignmentsExams.map((i) => {
                const d = daysBetween(today, i.date)
                return (
                  <li key={i.id} className="flex items-center gap-3 rounded-xl border border-ink/5 bg-ivory/70 p-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-center text-[10px] font-bold leading-tight ${i.kind === 'exam' ? 'bg-clay/15 text-clay' : 'bg-gold/20 text-[#7a6330]'}`}>{d}<br />day{d === 1 ? '' : 's'}</span>
                    <span className="min-w-0"><span className="block truncate text-sm font-bold">{i.title}</span><span className="block text-xs text-muted">{relativeDay(i.date)}{i.location ? ` · ${i.location}` : ''}</span></span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Study plan */}
        <Card className="lg:col-span-2">
          <CardTitle icon={<BookOpenCheck className="h-5 w-5" />} action={<ViewAll to="/study-planner" />}>Study plan</CardTitle>
          {loading ? <Skeleton className="h-40" /> : !data || data.sessions.length === 0 ? (
            <EmptyState title="No study plan yet" text="Add subjects with exam dates, then generate a plan." action={<Link to="/study-planner" className="btn btn-primary btn-sm"><Plus className="h-4 w-4" />Create a plan</Link>} />
          ) : (
            <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
              <div>
                <p className="font-display text-5xl leading-none">{prog!.pct}<span className="text-2xl text-muted">%</span></p>
                <p className="mt-1 text-xs text-muted">{prog!.done}h of {prog!.total}h completed</p>
                <div className="mt-3"><ProgressBar value={prog!.pct} label="Study plan progress" /></div>
                {nextExam && <p className="mt-4 text-sm"><Badge tone="clay">{daysBetween(today, nextExam.examDate)} days</Badge> <span className="ml-1 font-semibold">{nextExam.name}</span> exam</p>}
              </div>
              <div>
                <p className="label">Today's sessions</p>
                {todays.length === 0 ? <p className="text-sm text-muted">Nothing planned today — enjoy the breathing room.</p> : (
                  <ul className="space-y-2">
                    {todays.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 rounded-xl border border-ink/5 bg-ivory/70 px-3 py-2.5">
                        <input type="checkbox" className="h-4 w-4 accent-[#B69A62]" checked={s.done} onChange={() => report(toggleSession(s.id), s.done ? 'Marked as not done.' : 'Session completed. Nice work!')} aria-label={`Mark ${s.topic} as complete`} />
                        <span className={`min-w-0 flex-1 text-sm ${s.done ? 'text-muted line-through' : 'font-semibold'}`}>{data.subjects.find((x) => x.id === s.subjectId)?.name} — {s.topic}</span>
                        <span className="text-xs text-muted">{s.hours}h</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Weekly productivity */}
        <Card>
          <CardTitle icon={<Sparkles className="h-5 w-5" />} action={<ViewAll to="/productivity" />}>This week</CardTitle>
          {loading ? <Skeleton className="h-40" /> : !data || data.sessions.length === 0 ? <EmptyState title="No data yet" text="Weekly study hours appear once you have a plan." /> : (
            <div>
              <div className="flex h-36 items-end gap-2" role="img" aria-label="Planned versus completed study hours for each day this week">
                {wk.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="relative flex h-28 w-full items-end overflow-hidden rounded-lg bg-beige/70">
                      <div className="absolute bottom-0 w-full rounded-lg bg-sand/70" style={{ height: `${(d.planned / wkMax) * 100}%` }} />
                      <div className="absolute bottom-0 w-full rounded-lg bg-gold" style={{ height: `${(d.done / wkMax) * 100}%` }} />
                    </div>
                    <span className={`text-[10px] font-bold ${d.date === today ? 'text-gold' : 'text-muted'}`}>{fmtDate(d.date, { weekday: 'narrow' })}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted"><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-gold" />completed <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-sand/70" />planned · {wk.reduce((a, d) => a + d.done, 0)}h done of {wk.reduce((a, d) => a + d.planned, 0)}h</p>
            </div>
          )}
        </Card>

        {/* Doubts */}
        <Card>
          <CardTitle icon={<MessagesSquare className="h-5 w-5" />} action={<ViewAll to="/doubts" />}>Doubt resolution</CardTitle>
          {openDoubts.length === 0 ? <EmptyState title="All doubts resolved" text="Ask a new one anytime." /> : (
            <ul className="space-y-2.5">
              {openDoubts.map((d) => (
                <li key={d.id}><Link to="/doubts" className="block rounded-xl border border-ink/5 bg-ivory/70 p-3 transition hover:border-gold"><Badge>{d.subjectCode}</Badge><span className="mt-1.5 block text-sm font-bold leading-snug">{d.title}</span><span className="text-xs text-muted">{d.replies.length} repl{d.replies.length === 1 ? 'y' : 'ies'} · {timeAgo(d.createdAt)}</span></Link></li>
              ))}
            </ul>
          )}
        </Card>

        {/* Announcements */}
        <Card>
          <CardTitle icon={<Megaphone className="h-5 w-5" />}>Announcements</CardTitle>
          {sortedAnn.length === 0 ? <EmptyState title="No announcements" text="Faculty and administration notices will appear here." /> : (
            <ul className="space-y-3">
              {sortedAnn.map((a) => (
                <li key={a.id} className="rounded-xl border border-ink/5 bg-ivory/70 p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">{a.official ? <Badge tone="ink">Official notice</Badge> : <Badge tone="gold">Faculty</Badge>}{a.pinned && <Badge tone="neutral">Pinned</Badge>}</div>
                  <p className="text-sm font-bold leading-snug">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{a.body}</p>
                  <p className="mt-1.5 text-[11px] text-muted">{a.authorName} · {timeAgo(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Events */}
        <Card>
          <CardTitle icon={<PartyPopper className="h-5 w-5" />} action={<ViewAll to="/calendar" label="Calendar" />}>Upcoming events</CardTitle>
          {events.length === 0 ? <EmptyState title="No events soon" text="Campus events will appear here." /> : (
            <ul className="space-y-2.5">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-xl border border-ink/5 bg-ivory/70 p-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-center text-[10px] font-bold leading-tight text-ivory"><span><span className="block text-base text-gold-hi">{fmtDate(e.date, { day: 'numeric' })}</span>{fmtDate(e.date, { month: 'short' })}</span></span>
                  <span className="min-w-0"><span className="block truncate text-sm font-bold">{e.title}</span><span className="block truncate text-xs text-muted">{e.start ? fmtTime(e.start) : ''}{e.location ? ` · ${e.location}` : ''}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Lost & found */}
        <Card>
          <CardTitle icon={<PackageSearch className="h-5 w-5" />} action={<ViewAll to="/lost-found" />}>Lost &amp; found</CardTitle>
          {lfRecent.length === 0 ? <EmptyState title="No reports" text="Be the first to report an item." /> : (
            <ul className="space-y-2.5">
              {lfRecent.map((i) => (
                <li key={i.id}><Link to="/lost-found" className="flex items-center gap-3 rounded-xl border border-ink/5 bg-ivory/70 p-3 transition hover:border-gold">
                  <Badge tone={i.kind === 'lost' ? 'clay' : 'sage'}>{i.kind === 'lost' ? 'Lost' : 'Found'}</Badge>
                  <span className="min-w-0"><span className="block truncate text-sm font-bold">{i.title}</span><span className="block truncate text-xs text-muted">{i.location} · {timeAgo(i.createdAt)}</span></span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
