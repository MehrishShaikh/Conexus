import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, ChevronLeft, ChevronRight, Download, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Badge, Card, Confirm, EmptyState, Field, Modal, Notice, PageHeader, Tabs, useFieldId, useToast } from '../components/ui'
import { addEvent, deleteEvent, updateEvent, type EventInput } from '../lib/actions'
import { KIND_DOT, KIND_LABEL, useCalendarItems, type CalItem, type CalKind } from '../lib/calendar'
import { addDays, fmtDate, fmtLong, fmtTime, fromISO, monthGrid, MONTHS, startOfWeek, todayISO, WEEKDAYS } from '../lib/dates'
import { useCurrentUser, useStore } from '../lib/store'
import type { EventType } from '../lib/types'

type View = 'day' | 'week' | 'month'
const CREATABLE: EventType[] = ['event', 'club', 'assignment', 'exam', 'reminder']
const ALL_KINDS: CalKind[] = ['class', 'assignment', 'exam', 'event', 'club', 'reminder', 'study']

function toICS(items: CalItem[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CONEXUs//Prototype//EN', 'CALSCALE:GREGORIAN']
  for (const i of items) {
    const d = i.date.replace(/-/g, '')
    lines.push('BEGIN:VEVENT', `UID:${i.id}@conexus.prototype`, `DTSTAMP:${stamp}`)
    if (i.start) {
      lines.push(`DTSTART:${d}T${i.start.replace(':', '')}00`, `DTEND:${d}T${(i.end || i.start).replace(':', '')}00`)
    } else {
      lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${addDays(i.date, 1).replace(/-/g, '')}`)
    }
    lines.push(`SUMMARY:${esc(i.title)}`, `LOCATION:${esc(i.location)}`, `DESCRIPTION:${esc(i.notes)}`, 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function EventModal({ open, onClose, initial, defaultDate }: { open: boolean; onClose: () => void; initial?: CalItem; defaultDate: string }) {
  const user = useCurrentUser()!
  const events = useStore((s) => s.events)
  const existing = initial?.eventId ? events.find((e) => e.id === initial.eventId) : undefined
  const { report } = useToast()
  const [f, setF] = useState<EventInput>({
    title: existing?.title ?? '', type: existing?.type ?? 'event', date: existing?.date ?? defaultDate, start: existing?.start ?? '10:00', end: existing?.end ?? '11:00',
    location: existing?.location ?? '', notes: existing?.notes ?? '', reminderMins: existing ? existing.reminderMins : 30, scope: existing?.scope ?? 'personal',
  })
  const [err, setErr] = useState('')
  const ids = { t: useFieldId('t'), ty: useFieldId('ty'), d: useFieldId('d'), s: useFieldId('s'), e: useFieldId('e'), l: useFieldId('l'), n: useFieldId('n'), r: useFieldId('r'), sc: useFieldId('sc') }
  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit event' : 'New event'}>
      <form noValidate className="space-y-4" onSubmit={(e) => {
        e.preventDefault()
        const r = existing ? updateEvent(existing.id, f) : addEvent(f)
        if (!r.ok) return setErr(r.error)
        report(r, existing ? 'Event updated.' : 'Event created — it now appears in your calendar.')
        onClose()
      }}>
        {err && <p className="rounded-xl border border-clay/40 bg-clay/5 px-3 py-2 text-sm text-clay" role="alert">{err}</p>}
        <Field label="Title" htmlFor={ids.t}><input id={ids.t} className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor={ids.ty}><select id={ids.ty} className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as EventType })}>{CREATABLE.map((t) => <option key={t} value={t}>{KIND_LABEL[t]}</option>)}</select></Field>
          <Field label="Date" htmlFor={ids.d}><input id={ids.d} type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" htmlFor={ids.s}><input id={ids.s} type="time" className="input" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
          <Field label="Ends" htmlFor={ids.e}><input id={ids.e} type="time" className="input" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
        </div>
        <Field label="Location" htmlFor={ids.l}><input id={ids.l} className="input" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
        <Field label="Notes" htmlFor={ids.n}><textarea id={ids.n} rows={2} className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reminder" htmlFor={ids.r}>
            <select id={ids.r} className="input" value={f.reminderMins ?? ''} onChange={(e) => setF({ ...f, reminderMins: e.target.value === '' ? null : Number(e.target.value) })}>
              <option value="">No reminder</option><option value={15}>15 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option><option value={1440}>1 day before</option>
            </select>
          </Field>
          {user.role === 'admin' && !existing && (
            <Field label="Visible to" htmlFor={ids.sc}><select id={ids.sc} className="input" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value as 'personal' | 'college' })}><option value="college">Everyone (college event)</option><option value="personal">Only me</option></select></Field>
          )}
        </div>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">{existing ? 'Save changes' : 'Create event'}</button></div>
      </form>
    </Modal>
  )
}

function Pill({ i, onClick, compact = false }: { i: CalItem; onClick: () => void; compact?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-1.5 truncate rounded-lg text-left transition hover:bg-gold/20 ${compact ? 'px-1.5 py-0.5 text-[11px]' : 'bg-ivory/80 px-2.5 py-1.5 text-xs'}`} title={i.title}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${KIND_DOT[i.kind]}`} />
      {i.start && <span className="shrink-0 font-bold text-muted">{fmtTime(i.start).replace(' AM', 'a').replace(' PM', 'p')}</span>}
      <span className="truncate font-semibold">{i.title}</span>
    </button>
  )
}

export default function CalendarPage() {
  const user = useCurrentUser()!
  const today = todayISO()
  const { toast, report } = useToast()
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(today)
  const [kinds, setKinds] = useState<Set<CalKind>>(new Set(ALL_KINDS.filter((k) => k !== 'study')))
  const [modal, setModal] = useState<{ open: boolean; item?: CalItem; date?: string }>({ open: false })
  const [detail, setDetail] = useState<CalItem | null>(null)
  const [del, setDel] = useState<CalItem | null>(null)

  const range = useMemo(() => {
    if (view === 'day') return [cursor, cursor] as const
    if (view === 'week') return [startOfWeek(cursor), addDays(startOfWeek(cursor), 6)] as const
    const grid = monthGrid(fromISO(cursor).getFullYear(), fromISO(cursor).getMonth())
    return [grid[0], grid[41]] as const
  }, [view, cursor])
  const all = useCalendarItems(range[0], range[1], { study: kinds.has('study') })
  const items = all.filter((i) => kinds.has(i.kind))
  const byDate = useMemo(() => { const m = new Map<string, CalItem[]>(); for (const i of items) m.set(i.date, [...(m.get(i.date) ?? []), i]); return m }, [items])

  const step = (dir: -1 | 1) => {
    const d = fromISO(cursor)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir)
    else d.setMonth(d.getMonth() + dir, 1)
    setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  const title = view === 'month' ? `${MONTHS[fromISO(cursor).getMonth()]} ${fromISO(cursor).getFullYear()}` : view === 'week' ? `${fmtDate(range[0])} – ${fmtDate(range[1], { day: 'numeric', month: 'short', year: 'numeric' })}` : fmtLong(cursor)
  const canEdit = (i: CalItem) => i.source === 'event' && (i.scope === 'college' ? user.role === 'admin' : i.ownerId === user.id)
  const toggleKind = (k: CalKind) => setKinds((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })

  const exportICS = () => {
    if (!items.length) return toast('error', 'There is nothing in this view to export.')
    const url = URL.createObjectURL(new Blob([toICS(items)], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'conexus-calendar.ics'; a.click(); URL.revokeObjectURL(url)
    toast('success', `Exported ${items.length} item(s) as an .ics file you can import into Google Calendar.`)
  }

  return (
    <div>
      <PageHeader eyebrow="Feature 06" title="Timetable & College Events" intro="Classes, assignment deadlines, exams, club activities and campus events in one daily, weekly and monthly view." actions={<><button className="btn btn-ghost" onClick={exportICS}><Download className="h-4 w-4" />Export .ics</button><button className="btn btn-primary" onClick={() => setModal({ open: true, date: view === 'day' ? cursor : today })}><CalendarPlus className="h-4 w-4" />New event</button></>} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCursor(today)}>Today</button>
          <button className="btn btn-ghost btn-sm" onClick={() => step(1)} aria-label="Next"><ChevronRight className="h-4 w-4" /></button>
          <h2 className="ml-2 text-2xl md:text-3xl" aria-live="polite">{title}</h2>
        </div>
        <Tabs label="Calendar view" value={view} onChange={setView} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5" role="group" aria-label="Show or hide event types">
        {ALL_KINDS.filter((k) => user.role === 'student' || k !== 'study').map((k) => (
          <button key={k} aria-pressed={kinds.has(k)} onClick={() => toggleKind(k)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${kinds.has(k) ? 'border-ink bg-paper' : 'border-ink/10 bg-transparent text-muted line-through'}`}><span className={`h-2 w-2 rounded-full ${KIND_DOT[k]}`} />{KIND_LABEL[k]}</button>
        ))}
      </div>

      {view === 'month' && (
        <Card className="!p-3 md:!p-4">
          <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted">{[...WEEKDAYS.slice(1), WEEKDAYS[0]].map((d) => <div key={d}>{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid(fromISO(cursor).getFullYear(), fromISO(cursor).getMonth()).map((d) => {
              const inMonth = fromISO(d).getMonth() === fromISO(cursor).getMonth()
              const list = byDate.get(d) ?? []
              return (
                <div key={d} className={`min-h-[84px] rounded-xl border p-1.5 md:min-h-[112px] ${d === today ? 'border-gold bg-gold/10' : 'border-ink/5'} ${inMonth ? 'bg-paper' : 'bg-beige/30 opacity-60'}`}>
                  <button className={`mb-1 grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${d === today ? 'bg-ink text-ivory' : 'hover:bg-beige'}`} onClick={() => { setCursor(d); setView('day') }} aria-label={`Open ${fmtLong(d)}`}>{fromISO(d).getDate()}</button>
                  <div className="hidden space-y-0.5 md:block">{list.slice(0, 3).map((i) => <Pill key={i.id} i={i} compact onClick={() => setDetail(i)} />)}{list.length > 3 && <button className="px-1.5 text-[11px] font-bold text-gold" onClick={() => { setCursor(d); setView('day') }}>+{list.length - 3} more</button>}</div>
                  <div className="flex flex-wrap gap-0.5 md:hidden">{list.slice(0, 6).map((i) => <span key={i.id} className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[i.kind]}`} />)}</div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {view === 'week' && (
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, n) => addDays(range[0], n)).map((d) => {
            const list = byDate.get(d) ?? []
            return (
              <Card key={d} className={`!p-3 ${d === today ? '!border-gold !bg-gold/10' : ''}`}>
                <button className="mb-2 w-full text-left" onClick={() => { setCursor(d); setView('day') }}><p className="text-[11px] font-bold uppercase tracking-wider text-muted">{fmtDate(d, { weekday: 'short' })}</p><p className="font-display text-2xl">{fromISO(d).getDate()}</p></button>
                <div className="space-y-1">{list.length === 0 ? <p className="text-xs text-muted">Free</p> : list.map((i) => <Pill key={i.id} i={i} onClick={() => setDetail(i)} />)}</div>
              </Card>
            )
          })}
        </div>
      )}

      {view === 'day' && (
        <Card>
          {(byDate.get(cursor) ?? []).length === 0 ? <EmptyState title="Nothing scheduled" text="Enjoy the free day, or add something to your calendar." action={<button className="btn btn-primary btn-sm" onClick={() => setModal({ open: true, date: cursor })}>New event</button>} /> : (
            <ul className="space-y-3">
              {(byDate.get(cursor) ?? []).map((i) => (
                <li key={i.id}>
                  <button onClick={() => setDetail(i)} className="flex w-full items-start gap-4 rounded-2xl border border-ink/8 bg-ivory/70 p-4 text-left transition hover:border-gold">
                    <span className="w-24 shrink-0 text-sm font-bold text-gold">{i.start ? `${fmtTime(i.start)}${i.end ? ' – ' + fmtTime(i.end) : ''}` : 'All day'}</span>
                    <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${KIND_DOT[i.kind]}`} /><span className="font-bold">{i.title}</span></span><span className="mt-0.5 block text-xs text-muted">{KIND_LABEL[i.kind]}{i.location ? ` · ${i.location}` : ''}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="mt-6"><Notice title="Google Calendar sync is not connected">Two-way sync needs Google Cloud OAuth credentials and a server component, neither of which are configured in this prototype, so there is no sync button. As a working alternative, use <strong>Export .ics</strong> to import this view into Google Calendar, Apple Calendar or Outlook.</Notice></div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ''}>
        {detail && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2"><Badge tone="gold">{KIND_LABEL[detail.kind]}</Badge>{detail.scope === 'college' && <Badge tone="ink">College-wide</Badge>}{detail.source !== 'event' && <Badge>Auto-added</Badge>}</div>
            <p className="text-sm font-semibold">{fmtLong(detail.date)}{detail.start ? ` · ${fmtTime(detail.start)}${detail.end ? ' – ' + fmtTime(detail.end) : ''}` : ''}</p>
            {detail.location && <p className="flex items-center gap-1.5 text-sm text-muted"><MapPin className="h-4 w-4 text-gold" />{detail.location}</p>}
            {detail.notes && <p className="text-sm leading-relaxed">{detail.notes}</p>}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {detail.link && <Link to={detail.link} className="btn btn-ghost btn-sm">Open related page</Link>}
              {canEdit(detail) && <><button className="btn btn-ghost btn-sm" onClick={() => { setModal({ open: true, item: detail }); setDetail(null) }}><Pencil className="h-4 w-4" />Edit</button><button className="btn btn-danger btn-sm" onClick={() => { setDel(detail); setDetail(null) }}><Trash2 className="h-4 w-4" />Delete</button></>}
            </div>
            {detail.source === 'event' && !canEdit(detail) && <p className="text-xs text-muted">Only the creator (or an administrator for college events) can change this event.</p>}
          </div>
        )}
      </Modal>
      {modal.open && <EventModal key={modal.item?.id ?? 'new'} open onClose={() => setModal({ open: false })} initial={modal.item} defaultDate={modal.date ?? today} />}
      <Confirm open={!!del} title="Delete this event?" text={`“${del?.title}” will be removed from the calendar.`} onClose={() => setDel(null)} onConfirm={() => del?.eventId && report(deleteEvent(del.eventId), 'Event deleted.')} />
    </div>
  )
}
