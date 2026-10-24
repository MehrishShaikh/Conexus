import { useEffect, useState } from 'react'
import { Field, Modal, useFieldId, useToast } from './ui'
import { saveSubject, validateSubject, type SubjectInput } from '../lib/actions'
import { todayISO } from '../lib/dates'
import type { Subject } from '../lib/types'

const blank: SubjectInput = { name: '', code: '', difficulty: 3, examDate: '', topics: [], baseAttended: 0, baseTotal: 0 }

export function SubjectModal({ open, onClose, subject }: { open: boolean; onClose: () => void; subject?: Subject }) {
  const { report } = useToast()
  const [f, setF] = useState<SubjectInput>(blank)
  const [topicsText, setTopicsText] = useState('')
  const [err, setErr] = useState('')
  const ids = { n: useFieldId('n'), c: useFieldId('c'), d: useFieldId('d'), e: useFieldId('e'), t: useFieldId('t'), a: useFieldId('a'), tot: useFieldId('tot') }

  useEffect(() => {
    if (!open) return
    setErr('')
    if (subject) {
      setF({ name: subject.name, code: subject.code, difficulty: subject.difficulty, examDate: subject.examDate, topics: subject.topics.map((t) => t.name), baseAttended: subject.baseAttended, baseTotal: subject.baseTotal })
      setTopicsText(subject.topics.map((t) => t.name).join('\n'))
    } else {
      setF(blank)
      setTopicsText('')
    }
  }, [open, subject])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const input = { ...f, topics: topicsText.split('\n') }
    const v = validateSubject(input)
    if (v) return setErr(v)
    const r = saveSubject(input, subject?.id)
    if (!r.ok) return setErr(r.error)
    report(r, subject ? 'Subject updated.' : 'Subject added.')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={subject ? 'Edit subject' : 'Add a subject'}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {err && <p className="rounded-xl border border-clay/40 bg-clay/5 px-3 py-2 text-sm text-clay" role="alert">{err}</p>}
        <div className="grid gap-4 sm:grid-cols-[1fr_130px]">
          <Field label="Subject name" htmlFor={ids.n}><input id={ids.n} className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Code" htmlFor={ids.c}><input id={ids.c} className="input" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Difficulty (1 easy – 5 hard)" htmlFor={ids.d}>
            <select id={ids.d} className="input" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: Number(e.target.value) as SubjectInput['difficulty'] })}>
              {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d} — {['Easy', 'Fairly easy', 'Moderate', 'Hard', 'Very hard'][d - 1]}</option>)}
            </select>
          </Field>
          <Field label="Exam date" htmlFor={ids.e}><input id={ids.e} type="date" min={todayISO()} className="input" value={f.examDate} onChange={(e) => setF({ ...f, examDate: e.target.value })} /></Field>
        </div>
        <Field label="Topics (one per line)" htmlFor={ids.t} hint="The planner schedules each topic. Hours per topic grow with difficulty.">
          <textarea id={ids.t} rows={5} className="input" value={topicsText} onChange={(e) => setTopicsText(e.target.value)} placeholder={'Arrays & Linked Lists\nTrees\nGraphs'} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Classes attended so far" htmlFor={ids.a}><input id={ids.a} type="number" min={0} className="input" value={f.baseAttended} onChange={(e) => setF({ ...f, baseAttended: Math.max(0, Number(e.target.value)) })} /></Field>
          <Field label="Classes held so far" htmlFor={ids.tot}><input id={ids.tot} type="number" min={0} className="input" value={f.baseTotal} onChange={(e) => setF({ ...f, baseTotal: Math.max(0, Number(e.target.value)) })} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">{subject ? 'Save changes' : 'Add subject'}</button>
        </div>
      </form>
    </Modal>
  )
}
