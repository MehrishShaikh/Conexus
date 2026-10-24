import { useMemo, useRef, useState } from 'react'
import { Backpack, CheckCircle2, Clock, Headphones, ImagePlus, Loader2, MapPin, Package, Plus, Search, Shirt, ShieldCheck, Trash2, Wallet } from 'lucide-react'
import { Badge, EmptyState, Field, Modal, Notice, PageHeader, Tabs, useFieldId, useToast } from '../components/ui'
import { addLostFound, deleteLostFound, requestClaim, resolveClaim, setItemStatus } from '../lib/actions'
import { fmtDate, timeAgo, todayISO } from '../lib/dates'
import { fileToDataUrl } from '../lib/image'
import { useCurrentUser, useStore } from '../lib/store'
import type { LFItem } from '../lib/types'

const CATEGORIES = ['Electronics', 'Bottle', 'ID / Cards', 'Clothing', 'Accessories', 'Books & Stationery', 'Keys', 'Other']
const STATUS: Record<LFItem['status'], { label: string; tone: 'gold' | 'sage' | 'clay' }> = {
  open: { label: 'Open', tone: 'gold' },
  'claim-pending': { label: 'Claim pending', tone: 'clay' },
  returned: { label: 'Returned', tone: 'sage' },
}

function CategoryIcon({ c }: { c: string }) {
  const cls = 'h-9 w-9'
  const p = { className: cls, strokeWidth: 1.2 }
  return c === 'Electronics' ? <Headphones {...p} /> : c === 'Clothing' ? <Shirt {...p} /> : c === 'ID / Cards' ? <Wallet {...p} /> : c === 'Accessories' ? <Backpack {...p} /> : <Package {...p} />
}

function ReportModal({ open, onClose, defaultKind }: { open: boolean; onClose: () => void; defaultKind: LFItem['kind'] }) {
  const { toast, report } = useToast()
  const user = useCurrentUser()!
  const [f, setF] = useState({ kind: defaultKind, title: '', description: '', category: CATEGORIES[0], location: '', date: todayISO(), privateContact: user.email.endsWith('@demo.conexus') ? '' : user.email })
  const [image, setImage] = useState<string | undefined>()
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const ids = { t: useFieldId('t'), d: useFieldId('d'), c: useFieldId('c'), l: useFieldId('l'), dt: useFieldId('dt'), p: useFieldId('p'), i: useFieldId('i') }
  return (
    <Modal open={open} onClose={onClose} title="Report an item" wide>
      <form noValidate className="space-y-4" onSubmit={(e) => {
        e.preventDefault()
        const r = addLostFound({ ...f, image })
        if (!r.ok) return setErr(r.error)
        report(r, `Your ${f.kind} report is live in the feed.`)
        onClose()
      }}>
        {err && <p className="rounded-xl border border-clay/40 bg-clay/5 px-3 py-2 text-sm text-clay" role="alert">{err}</p>}
        <fieldset><legend className="label">This item was</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['lost', 'found'] as const).map((k) => <label key={k} className={`cursor-pointer rounded-xl border px-4 py-2.5 text-center text-sm font-semibold capitalize transition focus-within:ring-2 focus-within:ring-gold ${f.kind === k ? 'border-ink bg-ink text-ivory' : 'border-ink/15 bg-paper hover:border-gold'}`}><input type="radio" className="sr-only" name="kind" checked={f.kind === k} onChange={() => setF({ ...f, kind: k })} />{k === 'lost' ? 'Lost by me' : 'Found by me'}</label>)}
          </div>
        </fieldset>
        <Field label="Item" htmlFor={ids.t}><input id={ids.t} className="input" placeholder="e.g. Navy steel water bottle" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Description" htmlFor={ids.d} hint="Colour, brand, marks. Keep one identifying detail back to verify the real owner."><textarea id={ids.d} rows={3} className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor={ids.c}><select id={ids.c} className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Date" htmlFor={ids.dt}><input id={ids.dt} type="date" max={todayISO()} className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        </div>
        <Field label="Approximate location" htmlFor={ids.l}><input id={ids.l} className="input" placeholder="e.g. Library, Level 2" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
        <div>
          <label className="label" htmlFor={ids.i}>Photo (optional)</label>
          <input ref={fileRef} id={ids.i} type="file" accept="image/*" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { setImage(await fileToDataUrl(file)) } catch (x) { toast('error', x instanceof Error ? x.message : 'Could not use that image.') } finally { setBusy(false) } }} />
          {image ? <div className="flex items-center gap-3"><img src={image} alt="Item preview" className="h-24 rounded-xl border border-ink/10 object-cover" /><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setImage(undefined); if (fileRef.current) fileRef.current.value = '' }}>Remove</button></div> : <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}Choose photo</button>}
        </div>
        <Field label="Your contact email (kept private)" htmlFor={ids.p} hint="Never shown to other users. Claimants contact you only through CONEXUs."><input id={ids.p} type="email" className="input" value={f.privateContact} onChange={(e) => setF({ ...f, privateContact: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">Submit report</button></div>
      </form>
    </Modal>
  )
}

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const user = useCurrentUser()!
  const item = useStore((s) => s.lostFound.find((x) => x.id === id))
  const { toast, report } = useToast()
  const [msg, setMsg] = useState('')
  const mid = useFieldId('msg')
  if (!item) return null
  const mine = item.reporterId === user.id
  const canManage = mine || user.role === 'admin'
  const st = STATUS[item.status]
  return (
    <Modal open onClose={onClose} title={item.title} wide>
      <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
        {item.image ? <img src={item.image} alt={item.title} className="w-full rounded-2xl border border-ink/10 object-cover" /> : <div className="grid min-h-[180px] place-items-center rounded-2xl border border-dashed border-sand bg-beige/50 text-gold"><CategoryIcon c={item.category} /></div>}
        <div>
          <div className="mb-3 flex flex-wrap gap-2"><Badge tone={item.kind === 'lost' ? 'clay' : 'sage'}>{item.kind === 'lost' ? 'Lost' : 'Found'}</Badge><Badge tone={st.tone}>{st.label}</Badge><Badge>{item.category}</Badge></div>
          <p className="text-sm leading-relaxed">{item.description}</p>
          <dl className="mt-4 space-y-1.5 text-sm"><div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 text-gold" /><dd>{item.location}</dd></div><div className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 text-gold" /><dd>{fmtDate(item.date, { weekday: 'long', day: 'numeric', month: 'long' })} · reported {timeAgo(item.createdAt)}</dd></div><div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-gold" /><dd>Reported by {item.reporterName}. Contact details are private.</dd></div></dl>
        </div>
      </div>

      {!mine && item.status !== 'returned' && user.role !== 'admin' && (
        <form className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 p-4" noValidate onSubmit={(e) => { e.preventDefault(); const r = requestClaim(item.id, msg); if (r.ok) setMsg(''); report(r, 'Claim request sent. The reporter will review it — you will be notified through CONEXUs.') }}>
          <label className="label" htmlFor={mid}>{item.kind === 'found' ? 'Is this yours? Describe something only the owner would know' : 'Have you found this? Describe where and how'}</label>
          <textarea id={mid} rows={3} className="input" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <div className="mt-3 flex justify-end"><button className="btn btn-primary btn-sm">{item.kind === 'found' ? 'Request to claim' : 'Send claim'}</button></div>
        </form>
      )}

      {canManage && (
        <div className="mt-6">
          <h3 className="mb-2 text-xl">Claim requests ({item.claims.length})</h3>
          {item.claims.length === 0 ? <p className="text-sm text-muted">No claims yet.</p> : (
            <ul className="space-y-2">
              {item.claims.map((c) => (
                <li key={c.id} className="rounded-xl border border-ink/10 bg-paper p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold">{c.claimantName} <span className="text-xs font-normal text-muted">· {timeAgo(c.createdAt)}</span></p><Badge tone={c.status === 'approved' ? 'sage' : c.status === 'declined' ? 'clay' : 'gold'}>{c.status}</Badge></div>
                  <p className="mt-1 text-sm">{c.message}</p>
                  {c.status === 'pending' && <div className="mt-2 flex gap-2"><button className="btn btn-primary btn-sm" onClick={() => report(resolveClaim(item.id, c.id, true), 'Claim approved — item marked as returned.')}>Approve</button><button className="btn btn-ghost btn-sm" onClick={() => report(resolveClaim(item.id, c.id, false), 'Claim declined.')}>Decline</button></div>}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
            {item.status !== 'returned' ? <button className="btn btn-ghost btn-sm" onClick={() => report(setItemStatus(item.id, 'returned'), 'Marked as returned.')}><CheckCircle2 className="h-4 w-4" />Mark as returned</button> : <button className="btn btn-ghost btn-sm" onClick={() => report(setItemStatus(item.id, 'open'), 'Reopened.')}>Reopen</button>}
            <button className="btn btn-danger btn-sm" onClick={() => { const r = deleteLostFound(item.id); if (!r.ok) return toast('error', r.error); toast('success', 'Report removed.'); onClose() }}><Trash2 className="h-4 w-4" />Remove report</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function LostFound() {
  const user = useCurrentUser()!
  const items = useStore((s) => s.lostFound)
  const [kind, setKind] = useState<'all' | 'lost' | 'found'>('all')
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [report, setReport] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const sid = useFieldId('q')
  const list = useMemo(() => items
    .filter((i) => (kind === 'all' || i.kind === kind) && (cat === 'all' || i.category === cat) && (status === 'all' || i.status === status) && (!q || (i.title + i.description + i.location).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [items, kind, cat, status, q])

  return (
    <div>
      <PageHeader eyebrow="Feature 05" title="Campus Lost & Found" intro="Report what you've lost or found, browse by category and location, and request a claim — your contact details always stay private." actions={<button className="btn btn-primary" onClick={() => setReport(true)}><Plus className="h-4 w-4" />Report an item</button>} />
      <div className="mb-6"><Notice title="AI image matching — planned">Matching a photo of a lost item against found-item photos is a <strong>future enhancement</strong> described in our project report. It is not implemented in this prototype; search and filters below are plain text and category matching.</Notice></div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tabs label="Report type" value={kind} onChange={setKind} options={[{ value: 'all', label: 'All' }, { value: 'lost', label: 'Lost' }, { value: 'found', label: 'Found' }]} />
        <div className="relative min-w-[220px] flex-1"><label htmlFor={sid} className="sr-only">Search lost and found</label><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input id={sid} className="input pl-10" placeholder="Search items, places, descriptions…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select aria-label="Filter by category" className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select aria-label="Filter by status" className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Any status</option><option value="open">Open</option><option value="claim-pending">Claim pending</option><option value="returned">Returned</option></select>
      </div>

      {list.length === 0 ? <EmptyState icon={<Package className="h-9 w-9" strokeWidth={1.2} />} title="No matching reports" text={items.length ? 'Try clearing the search or filters.' : 'Nothing has been reported yet.'} action={<button className="btn btn-primary" onClick={() => setReport(true)}>Report an item</button>} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => {
            const st = STATUS[i.status]
            return (
              <button key={i.id} onClick={() => setOpen(i.id)} className="card card-hover overflow-hidden text-left">
                {i.image ? <img src={i.image} alt="" className="h-40 w-full object-cover" /> : <div className="grid h-40 place-items-center bg-beige/60 text-gold"><CategoryIcon c={i.category} /></div>}
                <div className="p-5">
                  <div className="mb-2 flex flex-wrap gap-1.5"><Badge tone={i.kind === 'lost' ? 'clay' : 'sage'}>{i.kind === 'lost' ? 'Lost' : 'Found'}</Badge><Badge tone={st.tone}>{st.label}</Badge>{i.reporterId === user.id && <Badge tone="ink">Yours</Badge>}</div>
                  <h3 className="text-xl leading-snug">{i.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{i.description}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><MapPin className="h-3.5 w-3.5" />{i.location} · {fmtDate(i.date)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
      <ReportModal key={String(report)} open={report} onClose={() => setReport(false)} defaultKind="lost" />
      {open && <DetailModal id={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
