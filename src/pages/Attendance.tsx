import { useMemo, useState } from 'react'
import { CalendarOff, Check, ClipboardCheck, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Badge, Card, CardTitle, Confirm, EmptyState, Field, Modal, Notice, PageHeader, ProgressBar, useFieldId, useToast } from '../components/ui'
import { SubjectModal } from '../components/SubjectModal'
import { addAttendance, deleteAttendance, loadSampleData, setSemesterEnd, updateAttendance, updatePrefs } from '../lib/actions'
import { canMiss, leaveImpact, mustAttend, overall, project, remainingClasses, statsFor, statusOf, type AttStatus } from '../lib/attendance'
import { addDays, fmtDate, todayISO } from '../lib/dates'
import { useStore, useStudent } from '../lib/store'
import type { AttRecord, Subject } from '../lib/types'

const STATUS_UI: Record<AttStatus, { label: string; tone: 'sage' | 'gold' | 'clay' | 'neutral' }> = {
  safe: { label: 'On track', tone: 'sage' },
  borderline: { label: 'Borderline', tone: 'gold' },
  shortage: { label: 'Shortage', tone: 'clay' },
  none: { label: 'No classes yet', tone: 'neutral' },
}

function EditRecord({ rec, subjects, onClose }: { rec: AttRecord | null; subjects: Subject[]; onClose: () => void }) {
  const { report } = useToast()
  const [f, setF] = useState<Pick<AttRecord, 'date' | 'status' | 'note'>>({ date: rec?.date ?? todayISO(), status: rec?.status ?? 'present', note: rec?.note ?? '' })
  const [err, setErr] = useState('')
  const id1 = useFieldId('d')
  const id2 = useFieldId('s')
  const id3 = useFieldId('n')
  if (!rec) return null
  const sub = subjects.find((s) => s.id === rec.subjectId)
  return (
    <Modal open onClose={onClose} title="Edit attendance record">
      <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); const r = updateAttendance(rec.id, f); if (!r.ok) return setErr(r.error); report(r, 'Record updated — percentages recalculated.'); onClose() }}>
        <p className="text-sm text-muted">{sub?.name}</p>
        {err && <p className="text-sm text-clay" role="alert">{err}</p>}
        <Field label="Date" htmlFor={id1}><input id={id1} type="date" max={todayISO()} className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Status" htmlFor={id2}><select id={id2} className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as AttRecord['status'] })}><option value="present">Present</option><option value="absent">Absent</option></select></Field>
        <Field label="Note (optional)" htmlFor={id3}><input id={id3} className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">Save</button></div>
      </form>
    </Modal>
  )
}

export default function Attendance() {
  const data = useStudent()!
  const timetable = useStore((s) => s.timetable)
  const { report, toast } = useToast()
  const today = todayISO()
  const min = data.prefs.attendanceMinPct
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; subject?: Subject }>({ open: false })
  const [edit, setEdit] = useState<AttRecord | null>(null)
  const [del, setDel] = useState<AttRecord | null>(null)
  const [form, setForm] = useState({ subjectId: '', date: today, status: 'present' as AttRecord['status'], note: '' })
  const [filter, setFilter] = useState('all')
  const [willAttend, setWillAttend] = useState(85)
  const [leave, setLeave] = useState({ from: addDays(today, 1), to: addDays(today, 3) })
  const [minInput, setMinInput] = useState(String(min))
  const ids = { sub: useFieldId('sub'), date: useFieldId('date'), st: useFieldId('st'), note: useFieldId('note'), min: useFieldId('min'), end: useFieldId('end'), f: useFieldId('f'), t: useFieldId('t') }

  const stats = useMemo(() => data.subjects.map((s) => ({ s, st: statsFor(s, data.attendance) })), [data.subjects, data.attendance])
  const ov = overall(data.subjects, data.attendance)
  const impacts = useMemo(() => leaveImpact(data.subjects, data.attendance, timetable, leave.from, leave.to, min), [data.subjects, data.attendance, timetable, leave, min])
  const history = data.attendance.filter((r) => filter === 'all' || r.subjectId === filter).sort((a, b) => b.date.localeCompare(a.date))

  if (data.subjects.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Feature 03" title="Smart Attendance Planner" intro="Track every subject, see shortages coming, and plan leave with confidence." />
        <EmptyState icon={<ClipboardCheck className="h-9 w-9" strokeWidth={1.3} />} title="No subjects yet" text="Add the subjects you attend classes for, with the classes attended and held so far." action={<div className="flex gap-2"><button className="btn btn-primary" onClick={() => setSubjectModal({ open: true })}><Plus className="h-4 w-4" />Add subject</button><button className="btn btn-ghost" onClick={() => report(loadSampleData(), 'Sample data loaded.')}>Load sample data</button></div>} />
        <SubjectModal open={subjectModal.open} onClose={() => setSubjectModal({ open: false })} />
      </div>
    )
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const subjectId = form.subjectId || data.subjects[0].id
    const r = addAttendance({ subjectId, date: form.date, status: form.status, note: form.note.trim() || undefined })
    if (!r.ok) return toast('error', r.error)
    const sub = data.subjects.find((s) => s.id === subjectId)!
    const after = statsFor(sub, [{ id: 'tmp', subjectId, date: form.date, status: form.status }, ...data.attendance])
    toast('success', `${sub.name} is now ${after.pct.toFixed(1)}% (${after.attended}/${after.total}).`)
    setForm({ ...form, note: '' })
  }

  const saveMin = () => {
    const v = Number(minInput)
    if (!Number.isFinite(v)) return toast('error', 'Enter a number between 1 and 100.')
    report(updatePrefs({ attendanceMinPct: v }), `Minimum attendance set to ${v}%.`)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Feature 03"
        title="Smart Attendance Planner"
        intro="Live percentages for every subject, early shortage warnings, leave planning and projections — recalculated the moment you add or edit a record."
        actions={<button className="btn btn-primary" onClick={() => setSubjectModal({ open: true })}><Plus className="h-4 w-4" />Add subject</button>}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="label">Overall attendance</p>
              <p className="font-display text-7xl leading-none">{ov.pct.toFixed(1)}<span className="text-3xl text-muted">%</span></p>
              <p className="mt-1 text-xs text-muted">{ov.attended} of {ov.total} classes</p>
            </div>
            <div className="min-w-[200px] flex-1">
              <ProgressBar value={ov.pct} tone={ov.pct < min ? 'clay' : 'sage'} label="Overall attendance" />
              <p className="mt-2 text-xs text-muted">Minimum target: <strong>{min}%</strong> (configurable demo value)</p>
              {stats.some(({ st }) => st.total > 0 && st.pct < min) && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-clay">⚠ {stats.filter(({ st }) => st.total > 0 && st.pct < min).map(({ s }) => s.name).join(', ')} below target</p>}
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>Settings</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Minimum attendance %" htmlFor={ids.min} hint="75% is only a demonstration default. Use your college's rule.">
              <div className="flex gap-2"><input id={ids.min} type="number" min={1} max={100} className="input" value={minInput} onChange={(e) => setMinInput(e.target.value)} /><button className="btn btn-ghost btn-sm" onClick={saveMin} aria-label="Save minimum attendance"><Check className="h-4 w-4" /></button></div>
            </Field>
            <Field label="Semester ends" htmlFor={ids.end} hint="Used for projections.">
              <input id={ids.end} type="date" min={addDays(today, 1)} className="input" value={data.semesterEnd} onChange={(e) => report(setSemesterEnd(e.target.value), 'Semester end date updated.')} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ s, st }) => {
          const status = statusOf(st.pct, st.total, min)
          const ui = STATUS_UI[status]
          const remaining = remainingClasses(timetable, s.code, today, data.semesterEnd)
          const proj = project(st.attended, st.total, remaining, Math.round((remaining * willAttend) / 100))
          const miss = canMiss(st.attended, st.total, min)
          const need = mustAttend(st.attended, st.total, min)
          return (
            <Card key={s.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-xs font-semibold text-muted">{s.code}</p><h3 className="text-xl leading-tight">{s.name}</h3></div>
                <div className="flex items-center gap-1"><Badge tone={ui.tone}>{ui.label}</Badge><button className="rounded-full p-1.5 text-muted hover:bg-beige hover:text-ink" aria-label={`Edit ${s.name} counts`} onClick={() => setSubjectModal({ open: true, subject: s })}><Pencil className="h-3.5 w-3.5" /></button></div>
              </div>
              <p className={`mt-3 font-display text-5xl leading-none ${status === 'shortage' ? 'text-clay' : ''}`}>{st.total ? st.pct.toFixed(1) : '—'}<span className="text-xl text-muted">%</span></p>
              <p className="mb-2 mt-1 text-xs text-muted">{st.attended} attended of {st.total} held</p>
              <ProgressBar value={st.pct} tone={status === 'shortage' ? 'clay' : status === 'borderline' ? 'gold' : 'sage'} label={`${s.name} attendance`} />
              <p className="mt-3 text-sm">
                {st.total === 0 ? 'Record your first class to see predictions.' : status === 'shortage' ? <>Attend the next <strong>{Number.isFinite(need) ? need : '—'}</strong> class{need === 1 ? '' : 'es'} in a row to get back to {min}%.</> : <>You can miss <strong>{miss}</strong> more class{miss === 1 ? '' : 'es'} and stay at {min}%.</>}
              </p>
              <div className="mt-auto border-t border-ink/10 pt-3">
                <p className="text-xs text-muted">If you attend {willAttend}% of the {remaining} remaining classes: <strong className={proj < min ? 'text-clay' : 'text-sage'}>{proj.toFixed(1)}%</strong> by {fmtDate(data.semesterEnd)}</p>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle icon={<Plus className="h-5 w-5" />}>Add a record</CardTitle>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Subject" htmlFor={ids.sub}><select id={ids.sub} className="input" value={form.subjectId || data.subjects[0].id} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
              <Field label="Date" htmlFor={ids.date}><input id={ids.date} type="date" max={today} className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            </div>
            <fieldset><legend className="label">Status</legend>
              <div className="grid grid-cols-2 gap-2">
                {(['present', 'absent'] as const).map((v) => (
                  <label key={v} className={`cursor-pointer rounded-xl border px-4 py-2.5 text-center text-sm font-semibold capitalize transition focus-within:ring-2 focus-within:ring-gold ${form.status === v ? (v === 'present' ? 'border-sage bg-sage/15' : 'border-clay bg-clay/10') : 'border-ink/15 bg-paper hover:border-gold'}`}>
                    <input type="radio" className="sr-only" name="att-status" checked={form.status === v} onChange={() => setForm({ ...form, status: v })} />{v}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Note (optional)" htmlFor={ids.note}><input id={ids.note} className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Medical leave" /></Field>
            <button className="btn btn-primary w-full">Add record</button>
          </form>
        </Card>

        <Card>
          <CardTitle icon={<CalendarOff className="h-5 w-5" />}>Leave planner</CardTitle>
          <p className="mb-4 text-sm text-muted">Planning to be away? See what missing every scheduled class in that period would do. Classes are counted from the division timetable.</p>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Field label="From" htmlFor={ids.f}><input id={ids.f} type="date" min={today} className="input" value={leave.from} onChange={(e) => setLeave({ ...leave, from: e.target.value })} /></Field>
            <Field label="To" htmlFor={ids.t}><input id={ids.t} type="date" min={leave.from} className="input" value={leave.to} onChange={(e) => setLeave({ ...leave, to: e.target.value })} /></Field>
          </div>
          {impacts.length === 0 ? <p className="text-sm text-clay" role="alert">The end date must not be before the start date.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-semibold">Subject</th><th className="pb-2 text-right font-semibold">Missed</th><th className="pb-2 text-right font-semibold">Now</th><th className="pb-2 text-right font-semibold">After</th></tr></thead>
                <tbody>
                  {impacts.map((i) => (
                    <tr key={i.subject.id} className="border-t border-ink/5">
                      <td className="py-2 font-semibold">{i.subject.name}</td>
                      <td className="py-2 text-right">{i.missed}</td>
                      <td className="py-2 text-right text-muted">{i.before.toFixed(1)}%</td>
                      <td className={`py-2 text-right font-bold ${i.after < min ? 'text-clay' : 'text-sage'}`}>{i.after.toFixed(1)}%{i.after < min && i.missed > 0 ? ' ⚠' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="mb-8">
        <CardTitle action={
          <select aria-label="Filter history by subject" className="input !w-auto !py-1.5 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All subjects</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        }>Attendance history</CardTitle>
        {history.length === 0 ? <EmptyState title="No records yet" text="Records you add appear here. They are added on top of the counts recorded when you created each subject." /> : (
          <ul className="divide-y divide-ink/5">
            {history.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${r.status === 'present' ? 'bg-sage/20 text-sage' : 'bg-clay/15 text-clay'}`}>{r.status === 'present' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{data.subjects.find((s) => s.id === r.subjectId)?.name}</p><p className="truncate text-xs text-muted">{fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {r.status}{r.note ? ` · ${r.note}` : ''}</p></div>
                <button className="rounded-full p-2 text-muted hover:bg-beige hover:text-ink" aria-label="Edit record" onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></button>
                <button className="rounded-full p-2 text-muted hover:bg-clay/10 hover:text-clay" aria-label="Delete record" onClick={() => setDel(r)}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardTitle>Projection scenario</CardTitle>
          <label htmlFor="wa" className="label">I will attend <strong className="text-ink">{willAttend}%</strong> of the remaining classes</label>
          <input id="wa" type="range" min={0} max={100} step={5} value={willAttend} onChange={(e) => setWillAttend(Number(e.target.value))} className="w-full accent-[#B69A62]" />
          <div className="mt-1 flex justify-between text-[11px] text-muted"><span>0%</span><span>100%</span></div>
        </Card>
        <Notice title="Assumptions behind these numbers">
          <ul className="list-disc space-y-1 pl-5">
            <li>The {min}% minimum is a configurable demo value, not a universal rule.</li>
            <li>Percentage = classes attended ÷ classes held. Records you add are combined with the counts you entered per subject.</li>
            <li>Remaining classes are counted from the weekly timetable between tomorrow and the semester end date; holidays and cancellations are not modelled.</li>
            <li>“Can miss” assumes every future class counts equally and that you attend the rest.</li>
          </ul>
        </Notice>
      </div>

      <SubjectModal open={subjectModal.open} subject={subjectModal.subject} onClose={() => setSubjectModal({ open: false })} />
      {edit && <EditRecord key={edit.id} rec={edit} subjects={data.subjects} onClose={() => setEdit(null)} />}
      <Confirm open={!!del} title="Delete this record?" text="The attendance percentage will be recalculated without it." onClose={() => setDel(null)} onConfirm={() => del && report(deleteAttendance(del.id), 'Record deleted — percentages recalculated.')} />
    </div>
  )
}
