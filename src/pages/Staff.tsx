import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, GraduationCap, Megaphone, Pin, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Badge, Card, CardTitle, Confirm, EmptyState, Field, Notice, PageHeader, useFieldId, useToast } from '../components/ui'
import { addClassSlot, addEvent, deleteAnnouncement, deleteAssignment, deleteClassSlot, deleteEvent, postAssignment, publishAnnouncement } from '../lib/actions'
import { overall } from '../lib/attendance'
import { addDays, fmtDate, fmtTime, timeAgo, todayISO, WEEKDAYS_LONG } from '../lib/dates'
import { planProgress } from '../lib/planner'
import { useCurrentUser, useStore } from '../lib/store'

function AnnouncementForm({ official }: { official: boolean }) {
  const { report } = useToast()
  const [f, setF] = useState({ title: '', body: '', pinned: false })
  const [err, setErr] = useState('')
  const t = useFieldId('t'); const b = useFieldId('b')
  return (
    <Card>
      <CardTitle icon={<Megaphone className="h-5 w-5" />}>{official ? 'Publish an official notice' : 'Publish an announcement'}</CardTitle>
      <form noValidate className="space-y-4" onSubmit={(e) => {
        e.preventDefault()
        const r = publishAnnouncement(f)
        if (!r.ok) return setErr(r.error)
        setErr(''); setF({ title: '', body: '', pinned: false })
        report(r, 'Published. It is now visible on every student dashboard.')
      }}>
        {err && <p className="text-sm text-clay" role="alert">{err}</p>}
        <Field label="Title" htmlFor={t}><input id={t} className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Message" htmlFor={b}><textarea id={b} rows={4} className="input" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        {official && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-[#B69A62]" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /><Pin className="h-4 w-4 text-gold" />Pin to the top of student dashboards</label>}
        <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted">{official ? 'Shown with an “Official notice” label.' : 'Shown with a “Faculty” label.'}</p><button className="btn btn-primary">Publish</button></div>
      </form>
    </Card>
  )
}

function AnnouncementList({ mine }: { mine: boolean }) {
  const user = useCurrentUser()!
  const list = useStore((s) => s.announcements)
  const { report } = useToast()
  const shown = list.filter((a) => !mine || a.authorId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <Card>
      <CardTitle>{mine ? 'My announcements' : 'Published notices'}</CardTitle>
      {shown.length === 0 ? <EmptyState title="Nothing published yet" text="Announcements you publish will be listed here." /> : (
        <ul className="space-y-2.5">
          {shown.map((a) => (
            <li key={a.id} className="flex items-start gap-3 rounded-xl border border-ink/5 bg-ivory/70 p-3">
              <div className="min-w-0 flex-1"><div className="mb-1 flex flex-wrap gap-1.5">{a.official ? <Badge tone="ink">Official</Badge> : <Badge tone="gold">Faculty</Badge>}{a.pinned && <Badge>Pinned</Badge>}</div><p className="text-sm font-bold">{a.title}</p><p className="mt-0.5 line-clamp-2 text-xs text-muted">{a.body}</p><p className="mt-1 text-[11px] text-muted">{a.authorName} · {timeAgo(a.createdAt)}</p></div>
              {(user.role === 'admin' || a.authorId === user.id) && <button className="rounded-full p-2 text-muted hover:bg-clay/10 hover:text-clay" aria-label={`Delete ${a.title}`} onClick={() => report(deleteAnnouncement(a.id), 'Announcement removed.')}><Trash2 className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function FacultyConsole() {
  const user = useCurrentUser()!
  const timetable = useStore((s) => s.timetable)
  const assignments = useStore((s) => s.assignments)
  const doubts = useStore((s) => s.doubts)
  const { report } = useToast()
  const codes = useMemo(() => [...new Map(timetable.map((c) => [c.subjectCode, c.subjectName.replace(/ \(Lab\)/, '')])).entries()], [timetable])
  const [a, setA] = useState({ title: '', subjectCode: '', due: addDays(todayISO(), 7), description: '' })
  const [aErr, setAErr] = useState('')
  const [slot, setSlot] = useState({ subjectCode: '', subjectName: '', weekday: 1, start: '09:00', end: '10:00', room: '', faculty: user.name })
  const [sErr, setSErr] = useState('')
  const [delSlot, setDelSlot] = useState<string | null>(null)
  const ids = { at: useFieldId('at'), as: useFieldId('as'), ad: useFieldId('ad'), an: useFieldId('an'), sc: useFieldId('sc'), sn: useFieldId('sn'), sw: useFieldId('sw'), ss: useFieldId('ss'), se: useFieldId('se'), sr: useFieldId('sr') }
  const needReply = doubts.filter((d) => !d.resolved && !d.replies.some((r) => r.role === 'faculty'))
  const mine = assignments.filter((x) => x.postedById === user.id)

  return (
    <div>
      <PageHeader eyebrow="Faculty" title={`Welcome, ${user.name.split(' ').slice(0, 2).join(' ')}`} intro="Publish announcements, post assignments, respond to student doubts and keep the class timetable accurate." actions={<Link to="/doubts" className="btn btn-primary">Open doubts ({needReply.length} awaiting)</Link>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[['Doubts awaiting faculty', needReply.length], ['Open doubts', doubts.filter((d) => !d.resolved).length], ['Assignments I posted', mine.length], ['Weekly class slots', timetable.length]].map(([l, v]) => <Card key={l as string} className="!p-5"><p className="label">{l}</p><p className="font-display text-5xl">{v}</p></Card>)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5"><AnnouncementForm official={false} /><AnnouncementList mine /></div>
        <div className="space-y-5">
          <Card>
            <CardTitle icon={<GraduationCap className="h-5 w-5" />}>Post an assignment</CardTitle>
            <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); const r = postAssignment({ ...a, subjectCode: a.subjectCode || codes[0]?.[0] || '' }); if (!r.ok) return setAErr(r.error); setAErr(''); setA({ ...a, title: '', description: '' }); report(r, 'Assignment posted — students see it in their calendar and notifications.') }}>
              {aErr && <p className="text-sm text-clay" role="alert">{aErr}</p>}
              <Field label="Title" htmlFor={ids.at}><input id={ids.at} className="input" value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Subject" htmlFor={ids.as}><select id={ids.as} className="input" value={a.subjectCode || codes[0]?.[0]} onChange={(e) => setA({ ...a, subjectCode: e.target.value })}>{codes.map(([c, n]) => <option key={c} value={c}>{c} — {n}</option>)}</select></Field>
                <Field label="Due date" htmlFor={ids.ad}><input id={ids.ad} type="date" min={todayISO()} className="input" value={a.due} onChange={(e) => setA({ ...a, due: e.target.value })} /></Field>
              </div>
              <Field label="Instructions" htmlFor={ids.an}><textarea id={ids.an} rows={3} className="input" value={a.description} onChange={(e) => setA({ ...a, description: e.target.value })} /></Field>
              <div className="flex justify-end"><button className="btn btn-primary">Post assignment</button></div>
            </form>
          </Card>
          <Card>
            <CardTitle>Assignments I posted</CardTitle>
            {mine.length === 0 ? <EmptyState title="No assignments yet" /> : <ul className="space-y-2">{mine.map((x) => <li key={x.id} className="flex items-center gap-3 rounded-xl border border-ink/5 bg-ivory/70 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{x.title}</p><p className="text-xs text-muted">{x.subjectCode} · due {fmtDate(x.due)}</p></div><button className="rounded-full p-2 text-muted hover:bg-clay/10 hover:text-clay" aria-label={`Delete ${x.title}`} onClick={() => report(deleteAssignment(x.id), 'Assignment removed.')}><Trash2 className="h-4 w-4" /></button></li>)}</ul>}
          </Card>
        </div>
      </div>

      <Card className="mt-5">
        <CardTitle icon={<CalendarPlus className="h-5 w-5" />}>Academic information — class timetable</CardTitle>
        <p className="mb-4 text-sm text-muted">Changes here appear immediately in every student's calendar and in attendance projections.</p>
        <form noValidate className="mb-6 grid gap-3 rounded-2xl bg-ivory/70 p-4 md:grid-cols-6" onSubmit={(e) => { e.preventDefault(); const r = addClassSlot(slot); if (!r.ok) return setSErr(r.error); setSErr(''); report(r, 'Class added to the timetable.') }}>
          <Field label="Code" htmlFor={ids.sc}><input id={ids.sc} className="input" value={slot.subjectCode} onChange={(e) => setSlot({ ...slot, subjectCode: e.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="Subject name" htmlFor={ids.sn}><input id={ids.sn} className="input" value={slot.subjectName} onChange={(e) => setSlot({ ...slot, subjectName: e.target.value })} /></Field></div>
          <Field label="Day" htmlFor={ids.sw}><select id={ids.sw} className="input" value={slot.weekday} onChange={(e) => setSlot({ ...slot, weekday: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{WEEKDAYS_LONG[d]}</option>)}</select></Field>
          <Field label="Start" htmlFor={ids.ss}><input id={ids.ss} type="time" className="input" value={slot.start} onChange={(e) => setSlot({ ...slot, start: e.target.value })} /></Field>
          <Field label="End" htmlFor={ids.se}><input id={ids.se} type="time" className="input" value={slot.end} onChange={(e) => setSlot({ ...slot, end: e.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="Room" htmlFor={ids.sr}><input id={ids.sr} className="input" value={slot.room} onChange={(e) => setSlot({ ...slot, room: e.target.value })} /></Field></div>
          <div className="flex items-end md:col-span-4 md:justify-end"><button className="btn btn-primary"><Plus className="h-4 w-4" />Add class</button></div>
          {sErr && <p className="text-sm text-clay md:col-span-6" role="alert">{sErr}</p>}
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="pb-2">Day</th><th className="pb-2">Time</th><th className="pb-2">Subject</th><th className="pb-2">Room</th><th className="pb-2">Faculty</th><th /></tr></thead>
            <tbody>
              {[...timetable].sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)).map((c) => (
                <tr key={c.id} className="border-t border-ink/5"><td className="py-2 font-semibold">{WEEKDAYS_LONG[c.weekday]}</td><td className="py-2">{fmtTime(c.start)}–{fmtTime(c.end)}</td><td className="py-2">{c.subjectCode} · {c.subjectName}</td><td className="py-2">{c.room}</td><td className="py-2 text-muted">{c.faculty}</td><td className="py-2 text-right"><button className="rounded-full p-1.5 text-muted hover:bg-clay/10 hover:text-clay" aria-label={`Remove ${c.subjectName} on ${WEEKDAYS_LONG[c.weekday]}`} onClick={() => setDelSlot(c.id)}><Trash2 className="h-4 w-4" /></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Confirm open={!!delSlot} title="Remove this class?" text="It will disappear from every student's calendar and attendance projections." onClose={() => setDelSlot(null)} onConfirm={() => delSlot && report(deleteClassSlot(delSlot), 'Class removed.')} />
    </div>
  )
}

export function AdminConsole() {
  const users = useStore((s) => s.users)
  const students = useStore((s) => s.students)
  const doubts = useStore((s) => s.doubts)
  const lf = useStore((s) => s.lostFound)
  const events = useStore((s) => s.events)
  const ann = useStore((s) => s.announcements)
  const usage = useStore((s) => s.usage)
  const { report } = useToast()
  const [ev, setEv] = useState({ title: '', type: 'event' as const, date: addDays(todayISO(), 7), start: '10:00', end: '12:00', location: '', notes: '' })
  const [err, setErr] = useState('')
  const [del, setDel] = useState<string | null>(null)
  const ids = { t: useFieldId('t'), d: useFieldId('d'), s: useFieldId('s'), e: useFieldId('e'), l: useFieldId('l'), n: useFieldId('n') }

  const stats = useMemo(() => {
    const studentData = Object.values(students)
    const att = studentData.map((s) => overall(s.subjects, s.attendance)).filter((a) => a.total > 0)
    const avgAtt = att.length ? att.reduce((a, x) => a + x.pct, 0) / att.length : 0
    const prog = studentData.map((s) => planProgress(s.sessions)).filter((p) => p.total > 0)
    const avgProg = prog.length ? prog.reduce((a, x) => a + x.pct, 0) / prog.length : 0
    return {
      byRole: (['student', 'faculty', 'admin'] as const).map((r) => ({ r, n: users.filter((u) => u.role === r).length })),
      logins: Object.values(usage.logins).reduce((a, b) => a + b, 0),
      doubts: doubts.length, resolved: doubts.filter((d) => d.resolved).length, replies: doubts.reduce((a, d) => a + d.replies.length, 0),
      lf: lf.length, returned: lf.filter((i) => i.status === 'returned').length,
      events: events.filter((e) => e.scope === 'college').length,
      avgAtt, avgProg,
    }
  }, [users, students, doubts, lf, events, usage])
  const collegeEvents = events.filter((e) => e.scope === 'college').sort((a, b) => a.date.localeCompare(b.date))
  const maxRole = Math.max(1, ...stats.byRole.map((x) => x.n))

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Admin console" intro="Publish official notices, manage college events and review basic platform usage." actions={<Badge tone="ink"><ShieldCheck className="h-3 w-3" />Administrator</Badge>} />
      <div className="mb-6"><Notice kind="demo" title="About these statistics">Figures are computed live from the data stored in <strong>this browser</strong> (seeded demo data plus anything you create). They illustrate the reporting a real deployment would offer; they are not real institutional analytics.</Notice></div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Registered users', users.length, stats.byRole.map((x) => `${x.n} ${x.r}`).join(' · ')],
          ['Sign-ins recorded', stats.logins, 'in this browser'],
          ['Doubts resolved', `${stats.resolved}/${stats.doubts}`, `${stats.replies} replies`],
          ['Lost & found returned', `${stats.returned}/${stats.lf}`, 'items reunited'],
        ].map(([l, v, s]) => <Card key={l as string} className="!p-5"><p className="label">{l}</p><p className="font-display text-5xl">{v}</p><p className="mt-1 text-xs text-muted">{s}</p></Card>)}
      </div>
      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <Card><CardTitle>Users by role</CardTitle><div className="space-y-3">{stats.byRole.map((x) => <div key={x.r}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold capitalize">{x.r}</span><span className="text-muted">{x.n}</span></div><div className="h-2.5 rounded-full bg-beige"><div className="h-full rounded-full bg-gold" style={{ width: `${(x.n / maxRole) * 100}%` }} /></div></div>)}</div></Card>
        <Card><CardTitle>Average attendance</CardTitle><p className="font-display text-5xl">{stats.avgAtt ? stats.avgAtt.toFixed(1) + '%' : '—'}</p><p className="mt-1 text-xs text-muted">across students with recorded classes</p></Card>
        <Card><CardTitle>Average study-plan progress</CardTitle><p className="font-display text-5xl">{stats.avgProg ? Math.round(stats.avgProg) + '%' : '—'}</p><p className="mt-1 text-xs text-muted">across students with a plan</p></Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5"><AnnouncementForm official /><AnnouncementList mine={false} /></div>
        <div className="space-y-5">
          <Card>
            <CardTitle icon={<CalendarPlus className="h-5 w-5" />}>Create a college event</CardTitle>
            <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); const r = addEvent({ ...ev, scope: 'college', reminderMins: 60 }); if (!r.ok) return setErr(r.error); setErr(''); setEv({ ...ev, title: '', notes: '', location: '' }); report(r, 'Event published to every calendar.') }}>
              {err && <p className="text-sm text-clay" role="alert">{err}</p>}
              <Field label="Title" htmlFor={ids.t}><input id={ids.t} className="input" value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-3"><Field label="Date" htmlFor={ids.d}><input id={ids.d} type="date" className="input" value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} /></Field><Field label="Starts" htmlFor={ids.s}><input id={ids.s} type="time" className="input" value={ev.start} onChange={(e) => setEv({ ...ev, start: e.target.value })} /></Field><Field label="Ends" htmlFor={ids.e}><input id={ids.e} type="time" className="input" value={ev.end} onChange={(e) => setEv({ ...ev, end: e.target.value })} /></Field></div>
              <Field label="Location" htmlFor={ids.l}><input id={ids.l} className="input" value={ev.location} onChange={(e) => setEv({ ...ev, location: e.target.value })} /></Field>
              <Field label="Details" htmlFor={ids.n}><textarea id={ids.n} rows={2} className="input" value={ev.notes} onChange={(e) => setEv({ ...ev, notes: e.target.value })} /></Field>
              <div className="flex justify-end"><button className="btn btn-primary">Publish event</button></div>
            </form>
          </Card>
          <Card>
            <CardTitle action={<Link to="/calendar" className="text-xs font-bold uppercase tracking-wider text-gold">Calendar</Link>}>College events ({collegeEvents.length})</CardTitle>
            {collegeEvents.length === 0 ? <EmptyState title="No college events" /> : <ul className="space-y-2">{collegeEvents.map((e) => <li key={e.id} className="flex items-center gap-3 rounded-xl border border-ink/5 bg-ivory/70 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{e.title}</p><p className="text-xs text-muted">{fmtDate(e.date)} · {fmtTime(e.start)} · {e.location}</p></div><button className="rounded-full p-2 text-muted hover:bg-clay/10 hover:text-clay" aria-label={`Delete ${e.title}`} onClick={() => setDel(e.id)}><Trash2 className="h-4 w-4" /></button></li>)}</ul>}
          </Card>
          <Card>
            <CardTitle>Directory (demo accounts)</CardTitle>
            <ul className="divide-y divide-ink/5 text-sm">{users.map((u) => <li key={u.id} className="flex items-center justify-between gap-3 py-2"><span><span className="font-semibold">{u.name}</span><span className="block text-xs text-muted">{u.department}{u.demo ? ' · demo' : ''}</span></span><Badge tone={u.role === 'admin' ? 'ink' : u.role === 'faculty' ? 'gold' : 'neutral'}>{u.role}</Badge></li>)}</ul>
          </Card>
        </div>
      </div>
      <p className="mt-6 text-xs text-muted">{ann.length} notices on record.</p>
      <Confirm open={!!del} title="Delete this event?" text="It will disappear from every student's calendar." onClose={() => setDel(null)} onConfirm={() => del && report(deleteEvent(del), 'Event deleted.')} />
    </div>
  )
}
