import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, Bookmark, BookmarkCheck, Bot, CheckCircle2, ChevronUp, ImagePlus, Loader2, MessageCircle, Plus, Search, Trash2 } from 'lucide-react'
import { Badge, Card, EmptyState, Field, Modal, Notice, PageHeader, useFieldId, useToast } from '../components/ui'
import { addAiReply, addDoubt, addReply, deleteDoubt, setResolved, toggleBookmark, toggleUpvote } from '../lib/actions'
import { AI_ENDPOINT, askAi, aiConfigured } from '../lib/ai'
import { timeAgo } from '../lib/dates'
import { fileToDataUrl } from '../lib/image'
import { useCurrentUser, useStore } from '../lib/store'
import type { Doubt, Reply } from '../lib/types'

function RoleBadge({ r }: { r: Reply }) {
  if (r.role === 'faculty') return <Badge tone="ink">Faculty</Badge>
  if (r.role === 'ai') return r.simulated ? <Badge tone="gold">Simulated AI · demo</Badge> : <Badge tone="gold">AI assistant</Badge>
  return <Badge>Peer</Badge>
}

function AskModal({ open, onClose, subjects, onCreated }: { open: boolean; onClose: () => void; subjects: { code: string; name: string }[]; onCreated: (id: string) => void }) {
  const { toast, report } = useToast()
  const [f, setF] = useState({ subjectCode: subjects[0]?.code ?? '', title: '', body: '' })
  const [image, setImage] = useState<string | undefined>()
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const ids = { s: useFieldId('s'), t: useFieldId('t'), b: useFieldId('b'), i: useFieldId('i') }
  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      setImage(await fileToDataUrl(file))
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Could not use that image.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Ask a doubt" wide>
      <form noValidate className="space-y-4" onSubmit={(e) => {
        e.preventDefault()
        const r = addDoubt({ ...f, subjectCode: f.subjectCode || subjects[0]?.code, image })
        if (!r.ok) return setErr(r.error)
        report(r, 'Your doubt is posted. Peers and faculty can now reply.')
        onCreated(r.data)
        setF({ ...f, title: '', body: '' }); setImage(undefined); setErr(''); onClose()
      }}>
        {err && <p className="rounded-xl border border-clay/40 bg-clay/5 px-3 py-2 text-sm text-clay" role="alert">{err}</p>}
        <Field label="Subject" htmlFor={ids.s}><select id={ids.s} className="input" value={f.subjectCode || subjects[0]?.code} onChange={(e) => setF({ ...f, subjectCode: e.target.value })}>{subjects.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}</select></Field>
        <Field label="Title" htmlFor={ids.t} hint="Summarise it in one line."><input id={ids.t} className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Describe your doubt" htmlFor={ids.b} hint="What have you tried? Where exactly do you get stuck?"><textarea id={ids.b} rows={5} className="input" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <div>
          <label className="label" htmlFor={ids.i}>Photo of your working (optional)</label>
          <input ref={fileRef} id={ids.i} type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          {image ? (
            <div className="flex items-center gap-3"><img src={image} alt="Attachment preview" className="h-24 rounded-xl border border-ink/10 object-cover" /><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setImage(undefined); if (fileRef.current) fileRef.current.value = '' }}>Remove</button></div>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}Choose image</button>
          )}
          <p className="mt-1 text-xs text-muted">Images are resized and stored only in this browser. They are not analysed by AI in this prototype.</p>
        </div>
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary">Post doubt</button></div>
      </form>
    </Modal>
  )
}

function ReplyItem({ doubt, r, depth, onReply }: { doubt: Doubt; r: Reply; depth: number; onReply: (id: string) => void }) {
  const user = useCurrentUser()!
  const { report } = useToast()
  const canResolve = user.id === doubt.authorId || user.role === 'faculty'
  const voted = r.upvotes.includes(user.id)
  const kids = doubt.replies.filter((x) => x.parentId === r.id)
  return (
    <li className={depth ? 'ml-5 border-l-2 border-sand/60 pl-4' : ''}>
      <div className={`rounded-2xl border p-4 ${r.accepted ? 'border-sage/60 bg-sage/10' : r.role === 'ai' ? 'border-gold/40 bg-gold/10' : 'border-ink/8 bg-paper'}`}>
        <div className="mb-1.5 flex flex-wrap items-center gap-2"><span className="text-sm font-bold">{r.authorName}</span><RoleBadge r={r} />{r.accepted && <Badge tone="sage"><CheckCircle2 className="h-3 w-3" />Accepted answer</Badge>}<span className="text-xs text-muted">{timeAgo(r.createdAt)}</span></div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${voted ? 'border-gold bg-gold/20' : 'border-ink/15 hover:border-gold'}`} aria-pressed={voted} aria-label={`Upvote reply, ${r.upvotes.length} upvotes`} onClick={() => report(toggleUpvote(doubt.id, r.id), voted ? 'Upvote removed.' : 'Upvoted.')}><ChevronUp className="h-3.5 w-3.5" />{r.upvotes.length}</button>
          {user.role !== 'admin' && depth === 0 && <button className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-semibold hover:border-gold" onClick={() => onReply(r.id)}>Reply</button>}
          {canResolve && depth === 0 && !r.accepted && <button className="rounded-full border border-sage/50 px-2.5 py-1 text-xs font-semibold text-[#4c5742] hover:bg-sage/15" onClick={() => report(setResolved(doubt.id, true, r.id), 'Marked as resolved with this answer.')}>Accept answer</button>}
        </div>
      </div>
      {kids.length > 0 && <ul className="mt-2 space-y-2">{kids.map((k) => <ReplyItem key={k.id} doubt={doubt} r={k} depth={depth + 1} onReply={onReply} />)}</ul>}
    </li>
  )
}

function Thread({ doubt, onBack }: { doubt: Doubt; onBack: () => void }) {
  const user = useCurrentUser()!
  const { toast, report } = useToast()
  const [text, setText] = useState('')
  const [parent, setParent] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const id = useFieldId('reply')
  const roots = doubt.replies.filter((r) => r.parentId === null)
  const bookmarked = doubt.bookmarks.includes(user.id)
  const voted = doubt.upvotes.includes(user.id)
  const canResolve = user.id === doubt.authorId || user.role === 'faculty'
  const readOnly = user.role === 'admin'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const r = addReply(doubt.id, text, parent)
    if (!r.ok) return toast('error', r.error)
    toast('success', user.role === 'faculty' ? 'Faculty response posted.' : 'Reply posted.')
    setText(''); setParent(null)
  }
  const askAssistant = async () => {
    setThinking(true)
    try {
      const a = await askAi(`${doubt.title}\n${doubt.body}`, doubt.subjectCode)
      report(addAiReply(doubt.id, a.text, a.simulated), a.simulated ? 'Simulated demo reply added (no live AI is connected).' : 'AI reply added.')
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'The AI service could not be reached.')
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="space-y-5">
      <button className="btn btn-ghost btn-sm lg:hidden" onClick={onBack}><ArrowLeft className="h-4 w-4" />All doubts</button>
      <Card>
        <div className="flex flex-wrap items-center gap-2"><Badge tone="gold">{doubt.subjectCode}</Badge>{doubt.resolved ? <Badge tone="sage"><CheckCircle2 className="h-3 w-3" />Resolved</Badge> : <Badge>Open</Badge>}</div>
        <h2 className="mt-3 text-3xl leading-tight">{doubt.title}</h2>
        <p className="mt-1 text-xs text-muted">Asked by {doubt.authorName} · {timeAgo(doubt.createdAt)}</p>
        <p className="mt-4 whitespace-pre-wrap text-[0.95rem] leading-relaxed">{doubt.body}</p>
        {doubt.image && <img src={doubt.image} alt="Attached by the author" className="mt-4 max-h-80 rounded-2xl border border-ink/10" />}
        <div className="mt-5 flex flex-wrap gap-2">
          <button className={`btn btn-sm ${voted ? 'btn-gold' : 'btn-ghost'}`} aria-pressed={voted} onClick={() => report(toggleUpvote(doubt.id), voted ? 'Upvote removed.' : 'Upvoted.')}><ChevronUp className="h-4 w-4" />Upvote · {doubt.upvotes.length}</button>
          <button className={`btn btn-sm ${bookmarked ? 'btn-gold' : 'btn-ghost'}`} aria-pressed={bookmarked} onClick={() => report(toggleBookmark(doubt.id), bookmarked ? 'Bookmark removed.' : 'Saved to your bookmarks.')}>{bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{bookmarked ? 'Bookmarked' : 'Bookmark'}</button>
          {canResolve && <button className="btn btn-ghost btn-sm" onClick={() => report(setResolved(doubt.id, !doubt.resolved), doubt.resolved ? 'Reopened.' : 'Marked as resolved.')}><CheckCircle2 className="h-4 w-4" />{doubt.resolved ? 'Reopen' : 'Mark resolved'}</button>}
          {(user.id === doubt.authorId || user.role === 'faculty') && <button className="btn btn-danger btn-sm" onClick={() => { const r = deleteDoubt(doubt.id); if (r.ok) onBack(); report(r, 'Doubt deleted.') }}><Trash2 className="h-4 w-4" />Delete</button>}
        </div>
      </Card>

      {!readOnly && (
        <Card className="border-gold/50 !bg-gold/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3"><Bot className="mt-0.5 h-5 w-5 text-gold" /><div><p className="font-display text-xl">AI assistance</p><p className="text-xs text-charcoal/75">{aiConfigured ? `Live AI endpoint configured (${new URL(AI_ENDPOINT!, location.href).host}).` : 'No live AI is connected, so replies are SIMULATED demo answers and are labelled as such.'}</p></div></div>
            <button className="btn btn-primary btn-sm" onClick={askAssistant} disabled={thinking}>{thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}{thinking ? 'Thinking…' : aiConfigured ? 'Ask AI' : 'Get a demo answer'}</button>
          </div>
        </Card>
      )}

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-2xl"><MessageCircle className="h-5 w-5 text-gold" />{doubt.replies.length} {doubt.replies.length === 1 ? 'reply' : 'replies'}</h3>
        {roots.length === 0 ? <EmptyState title="No replies yet" text={readOnly ? 'No one has replied yet.' : 'Be the first to help — or ask the AI assistant above.'} /> : <ul className="space-y-3">{roots.map((r) => <ReplyItem key={r.id} doubt={doubt} r={r} depth={0} onReply={(rid) => { setParent(rid); document.getElementById(id)?.focus() }} />)}</ul>}
      </div>

      {readOnly ? <Notice>Administrators can read doubt threads but cannot post or reply.</Notice> : (
        <form onSubmit={submit} className="card p-5" noValidate>
          <label htmlFor={id} className="label">{parent ? `Replying to ${doubt.replies.find((r) => r.id === parent)?.authorName}` : user.role === 'faculty' ? 'Faculty response' : 'Add a reply'}{parent && <button type="button" className="ml-2 font-bold text-gold" onClick={() => setParent(null)}>cancel</button>}</label>
          <textarea id={id} rows={3} className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Share an explanation, a hint or a resource…" />
          <div className="mt-3 flex justify-end"><button className="btn btn-primary btn-sm">{user.role === 'faculty' ? 'Post faculty response' : 'Post reply'}</button></div>
        </form>
      )}
    </div>
  )
}

export default function Doubts() {
  const user = useCurrentUser()!
  const doubts = useStore((s) => s.doubts)
  const timetable = useStore((s) => s.timetable)
  const mySubjects = useStore((s) => (s.students[user.id]?.subjects ?? []))
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('all')
  const [view, setView] = useState<'all' | 'open' | 'resolved' | 'saved' | 'mine'>('all')
  const [sel, setSel] = useState<string | null>(null)
  const [ask, setAsk] = useState(false)
  const subjects = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of timetable) m.set(c.subjectCode, c.subjectName.replace(/ \(Lab\)/, ''))
    for (const s of mySubjects) m.set(s.code, s.name)
    return [...m.entries()].map(([code, name]) => ({ code, name }))
  }, [timetable, mySubjects])

  const list = useMemo(() => doubts
    .filter((d) => (subject === 'all' || d.subjectCode === subject)
      && (view === 'all' || (view === 'open' && !d.resolved) || (view === 'resolved' && d.resolved) || (view === 'saved' && d.bookmarks.includes(user.id)) || (view === 'mine' && d.authorId === user.id))
      && (!q || (d.title + d.body).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [doubts, subject, view, q, user.id])
  const selected = doubts.find((d) => d.id === sel) ?? null
  const searchId = useFieldId('q')

  return (
    <div>
      <PageHeader
        eyebrow="Feature 02"
        title="AI Doubt Sharing"
        intro="Ask by subject, attach a photo of your working, and get help from peers, faculty and an AI assistant in one threaded discussion."
        actions={user.role !== 'admin' && <button className="btn btn-primary" onClick={() => setAsk(true)}><Plus className="h-4 w-4" />Ask a doubt</button>}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.9fr)_1.5fr]">
        <div className={selected ? 'hidden lg:block' : ''}>
          <div className="relative mb-3"><label htmlFor={searchId} className="sr-only">Search doubts</label><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input id={searchId} className="input pl-10" placeholder="Search doubts…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by subject">
            {[{ code: 'all', name: 'All' }, ...subjects].map((s) => <button key={s.code} aria-pressed={subject === s.code} onClick={() => setSubject(s.code)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${subject === s.code ? 'border-ink bg-ink text-ivory' : 'border-ink/15 bg-paper hover:border-gold'}`}>{s.code === 'all' ? 'All subjects' : s.code}</button>)}
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
            {([['all', 'All'], ['open', 'Open'], ['resolved', 'Resolved'], ['saved', 'Bookmarked'], ['mine', 'Mine']] as const).map(([v, l]) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 text-xs font-semibold ${view === v ? 'bg-gold text-ink' : 'bg-beige text-charcoal hover:bg-sand/60'}`}>{l}</button>)}
          </div>
          {list.length === 0 ? <EmptyState icon={<MessageCircle className="h-8 w-8" strokeWidth={1.3} />} title="No doubts found" text={q || subject !== 'all' || view !== 'all' ? 'Try clearing the search or filters.' : 'Be the first to ask a question.'} /> : (
            <ul className="space-y-2.5">
              {list.map((d) => (
                <li key={d.id}>
                  <button onClick={() => setSel(d.id)} className={`block w-full rounded-2xl border p-4 text-left transition hover:border-gold ${sel === d.id ? 'border-gold bg-gold/10' : 'border-ink/10 bg-paper'}`}>
                    <div className="mb-1.5 flex items-center gap-1.5"><Badge tone="gold">{d.subjectCode}</Badge>{d.resolved && <Badge tone="sage">Resolved</Badge>}{d.bookmarks.includes(user.id) && <BookmarkCheck className="h-4 w-4 text-gold" aria-label="Bookmarked" />}</div>
                    <p className="text-sm font-bold leading-snug">{d.title}</p>
                    <p className="mt-1.5 text-xs text-muted">{d.authorName} · {timeAgo(d.createdAt)} · {d.replies.length} repl{d.replies.length === 1 ? 'y' : 'ies'} · ▲ {d.upvotes.length}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={selected ? '' : 'hidden lg:block'}>
          {selected ? <Thread key={selected.id} doubt={selected} onBack={() => setSel(null)} /> : <EmptyState icon={<MessageCircle className="h-9 w-9" strokeWidth={1.2} />} title="Select a doubt" text="Open a thread to read replies, upvote, bookmark or respond." />}
        </div>
      </div>
      <AskModal key={String(ask)} open={ask} onClose={() => setAsk(false)} subjects={subjects} onCreated={(id) => { setSel(id); setView('all'); setSubject('all'); setQ('') }} />
    </div>
  )
}
