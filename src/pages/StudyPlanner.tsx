import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Check, Pencil, Plus, RefreshCw, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { Badge, Card, CardTitle, Confirm, EmptyState, Field, Modal, Notice, PageHeader, ProgressBar, Tabs, useFieldId, useToast } from '../components/ui'
import { SubjectModal } from '../components/SubjectModal'
import {
  addManualSession, deleteSession, deleteSubject, generateStudyPlan, loadSampleData, rescheduleMissed, setAvailability, setGoals, toggleSession,
} from '../lib/actions'
import { daysBetween, fmtDate, relativeDay, startOfWeek, todayISO, WEEKDAYS } from '../lib/dates'
import { missedSessions, planProgress } from '../lib/planner'
import { useStudent } from '../lib/store'
import type { Availability, Subject } from '../lib/types'

type Tab = 'plan' | 'subjects' | 'availability'

function AddSessionModal({ open, onClose, subjects }: { open: boolean; onClose: () => void; subjects: Subject[] }) {
  const { report } = useToast()
  const [f, setF] = useState({ subjectId: subjects[0]?.id ?? '', topic: '', date: todayISO(), hours: 1 })
  const [err, setErr] = useState('')
  const ids = { s: useFieldId('s'), t: useFieldId('t'), d: useFieldId('d'), h: useFieldId('h') }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const r = addManualSession({ ...f, subjectId: f.subjectId || subjects[0]?.id })
    if (!r.ok) return setErr(r.error)
    report(r, 'Session added to your plan.')
    setErr('')
    setF({ ...f, topic: '' })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Add a study session">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {err && <p className="text-sm text-clay" role="alert">{err}</p>}
        <Field label="Subject" htmlFor={ids.s}><select id={ids.s} className="input" value={f.subjectId || subjects[0]?.id} onChange={(e) => setF({ ...f, subjectId: e.target.value })}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Topic" htmlFor={ids.t}><input id={ids.t} className="input" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" htmlFor={ids.d}><input id={ids.d} type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Hours" htmlFor={ids.h}><input id={ids.h} type="number" step={0.5} min={0.5} max={12} className="input" value={f.hours} onChange={(e) => setF({ ...f, hours: Number(e.target.value) })} /></Field>
        </div>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">Add session</button></div>
      </form>
    </Modal>
  )
}

export default function StudyPlanner() {
  const data = useStudent()!
  const { toast, report } = useToast()
  const [tab, setTab] = useState<Tab>('plan')
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; subject?: Subject }>({ open: false })
  const [sessionModal, setSessionModal] = useState(false)
  const [confirmDel, setConfirmDel] = useState<Subject | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [avail, setAvail] = useState<Availability>(data.availability)
  const [goals, setGoalState] = useState(data.goals)
  const today = todayISO()
  const weekStart = startOfWeek(today)

  const sub = (id: string) => data.subjects.find((s) => s.id === id)
  const prog = planProgress(data.sessions)
  const missed = missedSessions(data.sessions, today)
  const upcoming = useMemo(() => {
    const byDate = new Map<string, typeof data.sessions>()
    for (const s of data.sessions.filter((x) => x.date >= today)) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s])
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 14)
  }, [data.sessions, today])

  const todayHours = data.sessions.filter((s) => s.date === today)
  const weekHours = data.sessions.filter((s) => s.date >= weekStart && s.date < fmtWeekEnd(weekStart))
  const sum = (l: typeof data.sessions, done = false) => l.filter((s) => (done ? s.done : true)).reduce((a, s) => a + s.hours, 0)
  const reminders = [
    ...missed.slice(0, 2).map((s) => ({ key: s.id, tone: 'clay', text: `Missed: ${sub(s.subjectId)?.name} — ${s.topic} (${fmtDate(s.date)})` })),
    ...todayHours.filter((s) => !s.done).map((s) => ({ key: s.id, tone: 'gold', text: `Today: ${sub(s.subjectId)?.name} — ${s.topic} (${s.hours}h)` })),
    ...data.subjects.filter((s) => s.examDate && daysBetween(today, s.examDate) >= 0 && daysBetween(today, s.examDate) <= 7).map((s) => ({ key: 'x' + s.id, tone: 'clay', text: `${s.name} exam in ${daysBetween(today, s.examDate)} days — prioritise revision` })),
  ]

  const generate = () => {
    const r = generateStudyPlan()
    if (!r.ok) return toast('error', r.error)
    setWarnings(r.data.warnings)
    toast(r.data.warnings.length ? 'info' : 'success', r.data.warnings.length ? `Plan generated with ${r.data.warnings.length} warning(s) — see below.` : `Plan generated: ${r.data.sessions} sessions, ${r.data.hours}h scheduled.`)
  }
  const reschedule = () => {
    const r = rescheduleMissed()
    if (!r.ok) return toast('error', r.error)
    setWarnings(r.data.warnings)
    toast('success', `Rescheduled ${r.data.moved} missed session(s) into the coming days.`)
  }
  const saveAvail = () => {
    if (!report(setAvailability(avail), 'Weekly availability saved.')) return
    report(setGoals(goals), 'Study goals saved. Regenerate your plan to apply them.')
  }

  const noSubjects = data.subjects.length === 0

  return (
    <div>
      <PageHeader
        eyebrow="Feature 01"
        title="AI Study Planner"
        intro="Add your subjects, exam dates and free hours. The smart scheduler prioritises urgent and difficult subjects, reserves revision before each exam, and re-plans when you fall behind."
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => setSessionModal(true)} disabled={noSubjects}><Plus className="h-4 w-4" />Add session</button>
            <button className="btn btn-gold" onClick={generate}><Wand2 className="h-4 w-4" />Generate plan</button>
          </>
        }
      />
      <div className="mb-6"><Notice kind="demo" title="How scheduling works">The planner is a transparent rule-based scheduler running in your browser — not a generative-AI service. Each topic needs 1–2 hours depending on difficulty; hours are handed out in 30-minute blocks to whichever subject is under the most time pressure, with the last two days before each exam reserved for revision.</Notice></div>

      {noSubjects ? (
        <EmptyState
          icon={<CalendarClock className="h-9 w-9" strokeWidth={1.3} />}
          title="Start by adding a subject"
          text="Each subject needs a name, difficulty, exam date and topics. You can also load sample data to see how it works."
          action={<div className="flex gap-2"><button className="btn btn-primary" onClick={() => setSubjectModal({ open: true })}><Plus className="h-4 w-4" />Add subject</button><button className="btn btn-ghost" onClick={() => report(loadSampleData(), 'Sample data loaded.')}>Load sample data</button></div>}
        />
      ) : (
        <>
          {/* Exam countdown */}
          <div className="mb-6 flex gap-3 overflow-x-auto pb-2 scroll-thin" aria-label="Exam countdown">
            {[...data.subjects].filter((s) => s.examDate).sort((a, b) => a.examDate.localeCompare(b.examDate)).map((s) => {
              const d = daysBetween(today, s.examDate)
              const p = planProgress(data.sessions, s.id)
              return (
                <div key={s.id} className="card min-w-[200px] flex-1 p-4">
                  <p className="text-xs font-semibold text-muted">{s.code}</p>
                  <p className="truncate text-sm font-bold">{s.name}</p>
                  <p className="mt-2 font-display text-4xl leading-none">{d < 0 ? '—' : d}<span className="ml-1 text-sm text-muted">{d < 0 ? 'passed' : d === 1 ? 'day' : 'days'}</span></p>
                  <p className="mb-2 mt-1 text-[11px] text-muted">{fmtDate(s.examDate, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <ProgressBar value={p.pct} tone={d >= 0 && d < 7 && p.pct < 60 ? 'clay' : 'gold'} label={`${s.name} plan progress`} />
                  <p className="mt-1 text-[11px] text-muted">{p.pct}% of planned study done</p>
                </div>
              )
            })}
          </div>

          <div className="mb-6"><Tabs label="Study planner sections" value={tab} onChange={setTab} options={[{ value: 'plan', label: 'Plan' }, { value: 'subjects', label: 'Subjects & topics' }, { value: 'availability', label: 'Availability & goals' }]} /></div>

          {tab === 'plan' && (
            <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
              <div className="space-y-5">
                {warnings.length > 0 && <Notice kind="warn" title="Some work could not be scheduled"><ul className="list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul></Notice>}
                {missed.length > 0 && (
                  <Notice kind="warn" title={`${missed.length} session${missed.length > 1 ? 's' : ''} missed`}>
                    <div className="flex flex-wrap items-center justify-between gap-3"><span>Not done and now in the past. Reschedule them into the coming days — completed work is kept.</span><button className="btn btn-primary btn-sm" onClick={reschedule}><RefreshCw className="h-3.5 w-3.5" />Reschedule missed</button></div>
                  </Notice>
                )}
                {data.sessions.length === 0 ? (
                  <EmptyState icon={<Sparkles className="h-8 w-8" strokeWidth={1.3} />} title="No plan yet" text="Press “Generate plan” to build a schedule from your subjects, availability and goals." action={<button className="btn btn-gold" onClick={generate}><Wand2 className="h-4 w-4" />Generate plan</button>} />
                ) : upcoming.length === 0 ? (
                  <EmptyState title="Nothing scheduled ahead" text="Add exam dates or regenerate your plan." action={<button className="btn btn-gold" onClick={generate}>Generate plan</button>} />
                ) : (
                  upcoming.map(([date, list]) => (
                    <Card key={date}>
                      <CardTitle action={<span className="text-xs font-semibold text-muted">{list.reduce((a, s) => a + s.hours, 0)}h</span>}>
                        <span className={date === today ? 'text-gold' : ''}>{relativeDay(date)}</span> <span className="text-base text-muted">{fmtDate(date, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                      </CardTitle>
                      <ul className="space-y-2">
                        {list.map((s) => (
                          <li key={s.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${s.done ? 'border-sage/30 bg-sage/10' : 'border-ink/5 bg-ivory/70'}`}>
                            <input type="checkbox" className="h-[18px] w-[18px] accent-[#B69A62]" checked={s.done} onChange={() => report(toggleSession(s.id), s.done ? 'Marked as not done.' : 'Session completed — progress updated.')} aria-label={`Mark ${sub(s.subjectId)?.name} ${s.topic} as complete`} />
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-sm font-bold ${s.done ? 'text-muted line-through' : ''}`}>{sub(s.subjectId)?.name ?? 'Subject'}</p>
                              <p className="truncate text-xs text-muted">{s.topic}{s.movedFrom ? ` · moved from ${fmtDate(s.movedFrom)}` : ''}</p>
                            </div>
                            {s.kind === 'revise' && <Badge tone="clay">Revision</Badge>}
                            <span className="text-xs font-semibold text-muted">{s.hours}h</span>
                            <button className="rounded-full p-1.5 text-muted hover:bg-clay/10 hover:text-clay" aria-label="Remove session" onClick={() => report(deleteSession(s.id), 'Session removed.')}><Trash2 className="h-4 w-4" /></button>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))
                )}
              </div>

              <div className="space-y-5">
                <Card>
                  <CardTitle>Goals</CardTitle>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 flex justify-between text-xs"><span className="font-semibold">Today</span><span className="text-muted">{sum(todayHours, true)}h / {Math.min(data.goals.dailyHours, data.availability[new Date().getDay()])}h</span></div>
                      <ProgressBar value={(sum(todayHours, true) / Math.max(0.5, Math.min(data.goals.dailyHours, data.availability[new Date().getDay()]))) * 100} tone="sage" label="Daily goal" />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs"><span className="font-semibold">This week</span><span className="text-muted">{sum(weekHours, true)}h / {data.goals.weeklyHours}h goal</span></div>
                      <ProgressBar value={(sum(weekHours, true) / data.goals.weeklyHours) * 100} label="Weekly goal" />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs"><span className="font-semibold">Whole plan</span><span className="text-muted">{prog.done}h / {prog.total}h</span></div>
                      <ProgressBar value={prog.pct} tone="sage" label="Overall plan" />
                    </div>
                  </div>
                </Card>
                <Card>
                  <CardTitle icon={<AlertTriangle className="h-5 w-5" />}>Smart reminders</CardTitle>
                  {reminders.length === 0 ? <p className="text-sm text-muted">You're on track — no reminders right now.</p> : (
                    <ul className="space-y-2">{reminders.slice(0, 6).map((r) => <li key={r.key} className="flex gap-2.5 text-sm"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${r.tone === 'clay' ? 'bg-clay' : 'bg-gold'}`} />{r.text}</li>)}</ul>
                  )}
                  <p className="mt-3 text-[11px] text-muted">Reminders appear here, on your dashboard and in the notification bell (configurable in Settings).</p>
                </Card>
                <Card>
                  <CardTitle>Subject progress</CardTitle>
                  <ul className="space-y-3">
                    {data.subjects.map((s) => { const p = planProgress(data.sessions, s.id); return <li key={s.id}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{s.name}</span><span className="text-muted">{p.pct}%</span></div><ProgressBar value={p.pct} label={`${s.name} progress`} /></li> })}
                  </ul>
                </Card>
              </div>
            </div>
          )}

          {tab === 'subjects' && (
            <div className="space-y-4">
              <div className="flex justify-end"><button className="btn btn-primary" onClick={() => setSubjectModal({ open: true })}><Plus className="h-4 w-4" />Add subject</button></div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.subjects.map((s) => (
                  <Card key={s.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-xs font-semibold text-muted">{s.code}</p><h3 className="text-2xl">{s.name}</h3></div>
                      <div className="flex gap-1"><button className="rounded-full p-2 text-muted hover:bg-beige hover:text-ink" aria-label={`Edit ${s.name}`} onClick={() => setSubjectModal({ open: true, subject: s })}><Pencil className="h-4 w-4" /></button><button className="rounded-full p-2 text-muted hover:bg-clay/10 hover:text-clay" aria-label={`Delete ${s.name}`} onClick={() => setConfirmDel(s)}><Trash2 className="h-4 w-4" /></button></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2"><Badge tone="gold">Difficulty {s.difficulty}/5</Badge><Badge>{s.examDate ? `Exam ${fmtDate(s.examDate)}` : 'No exam date'}</Badge></div>
                    <ul className="mt-4 flex flex-wrap gap-1.5">{s.topics.map((t) => <li key={t.id} className="chip">{t.name}</li>)}{s.topics.length === 0 && <li className="text-sm text-muted">No topics yet — edit to add some.</li>}</ul>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tab === 'availability' && (
            <Card className="max-w-3xl">
              <CardTitle>Study-hour availability</CardTitle>
              <p className="mb-5 text-sm text-muted">How many hours can you realistically study on each weekday? The scheduler never exceeds these, your daily goal, or your weekly goal.</p>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <div key={d}>
                    <label className="label text-center" htmlFor={`av-${d}`}>{WEEKDAYS[d]}</label>
                    <input id={`av-${d}`} type="number" min={0} max={16} step={0.5} className="input text-center" value={avail[d]} onChange={(e) => { const a = [...avail] as Availability; a[d] = Number(e.target.value); setAvail(a) }} />
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Daily goal (hours)" htmlFor="dg"><input id="dg" type="number" min={0.5} max={16} step={0.5} className="input" value={goals.dailyHours} onChange={(e) => setGoalState({ ...goals, dailyHours: Number(e.target.value) })} /></Field>
                <Field label="Weekly goal (hours)" htmlFor="wg"><input id="wg" type="number" min={1} max={100} step={0.5} className="input" value={goals.weeklyHours} onChange={(e) => setGoalState({ ...goals, weeklyHours: Number(e.target.value) })} /></Field>
              </div>
              <div className="mt-6 flex justify-end"><button className="btn btn-primary" onClick={saveAvail}><Check className="h-4 w-4" />Save availability &amp; goals</button></div>
            </Card>
          )}
        </>
      )}

      <SubjectModal open={subjectModal.open} subject={subjectModal.subject} onClose={() => setSubjectModal({ open: false })} />
      <AddSessionModal key={String(sessionModal)} open={sessionModal} onClose={() => setSessionModal(false)} subjects={data.subjects} />
      <Confirm open={!!confirmDel} title="Delete this subject?" text={`“${confirmDel?.name}” and its study sessions and attendance records will be removed from your workspace.`} onClose={() => setConfirmDel(null)} onConfirm={() => confirmDel && report(deleteSubject(confirmDel.id), 'Subject deleted.')} />
    </div>
  )
}

function fmtWeekEnd(weekStart: string) {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
