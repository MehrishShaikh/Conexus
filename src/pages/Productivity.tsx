import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Brain, FileText, Gauge, Lightbulb, Loader2, Mic, Send, Smile, TrendingUp } from 'lucide-react'
import { Badge, Card, CardTitle, EmptyState, Notice, PageHeader, ProgressBar, useToast } from '../components/ui'
import { saveNotes, setMood } from '../lib/actions'
import { AI_ENDPOINT, aiConfigured, askAi } from '../lib/ai'
import { statsFor } from '../lib/attendance'
import { daysBetween, todayISO } from '../lib/dates'
import { planProgress } from '../lib/planner'
import { assistantReply, MOODS, predictPerformance, revisionPlan, summariseNotes } from '../lib/productivity'
import { useStudent } from '../lib/store'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Msg { from: 'you' | 'bot'; text: string; simulated?: boolean }

const VOICE_ROUTES: [RegExp, string, string][] = [
  [/dashboard|home/, '/dashboard', 'Dashboard'],
  [/study|planner|plan/, '/study-planner', 'Study Planner'],
  [/doubt|question/, '/doubts', 'Doubts'],
  [/attendance/, '/attendance', 'Attendance'],
  [/translat|lecture|subtitle/, '/lecture-translator', 'Lecture Translator'],
  [/lost|found/, '/lost-found', 'Lost & Found'],
  [/calendar|timetable|event|schedule/, '/calendar', 'Calendar'],
  [/setting|profile|preference/, '/settings', 'Settings'],
]

export default function Productivity() {
  const data = useStudent()!
  const { report, toast } = useToast()
  const nav = useNavigate()
  const today = todayISO()
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'bot', text: 'Hi! I can answer from your own data. Try “How many classes can I skip in DBMS?”, “When are my exams?” or “What should I study today?”', simulated: !aiConfigured }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [notes, setNotes] = useState(data.notes)
  const [summary, setSummary] = useState<{ summary: string[]; keywords: string[] } | null>(null)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [msgs.length])

  const predictions = useMemo(() => predictPerformance(data, today), [data, today])
  const revision = useMemo(() => revisionPlan(data, today), [data, today])
  const hoursBySubject = useMemo(() => data.subjects.map((s) => ({ s, ...planProgress(data.sessions, s.id), att: statsFor(s, data.attendance) })), [data])
  const maxHours = Math.max(1, ...hoursBySubject.map((h) => h.total))
  const SR = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    if (!q) return
    setInput('')
    setMsgs((m) => [...m, { from: 'you', text: q }])
    if (aiConfigured) {
      setThinking(true)
      try {
        const ctx = `Subjects: ${data.subjects.map((s) => `${s.name} (exam ${s.examDate}, ${statsFor(s, data.attendance).pct.toFixed(0)}% attendance)`).join('; ')}`
        const a = await askAi(q, ctx)
        setMsgs((m) => [...m, { from: 'bot', text: a.text }])
      } catch (err) {
        setMsgs((m) => [...m, { from: 'bot', text: `The AI service could not be reached (${err instanceof Error ? err.message : 'unknown error'}). Falling back to the built-in rules:\n${assistantReply(q, data, today)}`, simulated: true }])
      } finally { setThinking(false) }
    } else {
      setMsgs((m) => [...m, { from: 'bot', text: assistantReply(q, data, today), simulated: true }])
    }
  }

  const summarise = () => {
    const r = summariseNotes(notes)
    if (!r.summary.length) return toast('error', 'Paste at least a couple of sentences of notes first.')
    setSummary(r)
    saveNotes(notes)
    toast('success', 'Summary created from your notes.')
  }

  const listen = () => {
    if (!SR) return toast('error', 'Voice commands need speech recognition, which this browser does not support. Try Chrome or Edge.')
    const rec = new SR()
    rec.lang = 'en-IN'; rec.interimResults = false; rec.maxAlternatives = 1
    rec.onstart = () => { setListening(true); setHeard('') }
    rec.onerror = (e: any) => { setListening(false); toast('error', e.error === 'not-allowed' ? 'Microphone permission was denied.' : e.error === 'no-speech' ? 'I did not hear anything. Try again.' : `Voice error: ${e.error}`) }
    rec.onend = () => setListening(false)
    rec.onresult = (ev: any) => {
      const said: string = ev.results[0][0].transcript.toLowerCase()
      setHeard(said)
      const hit = VOICE_ROUTES.find(([re]) => re.test(said))
      if (/open|go to|show|take me/.test(said) && hit) { toast('success', `Opening ${hit[2]}…`); nav(hit[1]) }
      else if (hit && said.split(' ').length <= 3) { toast('success', `Opening ${hit[2]}…`); nav(hit[1]) }
      else toast('info', `Heard “${said}”, but that isn't a command I know. Try “open attendance”.`)
    }
    try { rec.start() } catch { toast('error', 'Could not start the microphone.') }
  }

  return (
    <div>
      <PageHeader eyebrow="Productivity" title="Your learning companion" intro="An assistant that knows your timetable, notes summarisation, revision priorities, analytics and an estimate of how each subject is going." />
      <div className="mb-6"><Notice kind="demo" title="Honest labelling">{aiConfigured ? `A live AI endpoint is configured (${new URL(AI_ENDPOINT!, location.href).host}) and is used for the assistant. ` : 'No live AI service is connected. '}Everything else on this page — summaries, revision priorities, predictions, mood tips — is computed locally with transparent rules, and each card says so.</Notice></div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Assistant */}
        <Card className="flex flex-col lg:row-span-2">
          <CardTitle icon={<Bot className="h-5 w-5" />} action={<Badge tone={aiConfigured ? 'sage' : 'gold'}>{aiConfigured ? 'Live AI' : 'Rule-based demo'}</Badge>}>Productivity assistant</CardTitle>
          <div className="scroll-thin mb-4 min-h-[260px] flex-1 space-y-3 overflow-y-auto rounded-2xl bg-ivory/70 p-4 lg:max-h-[420px]" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'you' ? 'justify-end' : ''}`}>
                <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.from === 'you' ? 'bg-ink text-ivory' : 'border border-ink/10 bg-paper'}`}>{m.text}{m.from === 'bot' && m.simulated && <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-gold">Rule-based demo reply</span>}</div>
              </div>
            ))}
            {thinking && <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />Thinking…</div>}
            <div ref={endRef} />
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">{['How many classes can I skip in DBMS?', 'When are my exams?', 'What should I study today?'].map((q) => <button key={q} className="rounded-full border border-ink/15 px-3 py-1 text-xs font-semibold hover:border-gold" onClick={() => setInput(q)}>{q}</button>)}</div>
          <form onSubmit={send} className="flex gap-2"><label htmlFor="assistant-q" className="sr-only">Ask the assistant</label><input id="assistant-q" className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about attendance, exams, today's plan…" /><button className="btn btn-primary" aria-label="Send"><Send className="h-4 w-4" /></button></form>
        </Card>

        {/* Voice */}
        <Card>
          <CardTitle icon={<Mic className="h-5 w-5" />}>Voice commands</CardTitle>
          <p className="mb-4 text-sm text-muted">Say “open attendance”, “go to calendar”, “show study planner” and so on. Uses your browser's speech recognition.</p>
          <button className={`btn ${listening ? 'btn-gold' : 'btn-primary'}`} onClick={listen} disabled={!SR}>{listening ? <><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-clay" />Listening…</> : <><Mic className="h-4 w-4" />Speak a command</>}</button>
          {!SR && <p className="mt-3 text-sm text-clay">Not supported in this browser — use Chrome or Edge.</p>}
          {heard && <p className="mt-3 text-sm text-muted">Heard: “{heard}”</p>}
        </Card>

        {/* Mood */}
        <Card>
          <CardTitle icon={<Smile className="h-5 w-5" />}>Mood-based study suggestion</CardTitle>
          {!data.prefs.moodSuggestions ? <p className="text-sm text-muted">Mood suggestions are turned off in Settings.</p> : (
            <>
              <p className="mb-3 text-sm text-muted">Optional — pick how you feel and get a lightweight tip. The tips are fixed suggestions, not a diagnosis or an AI judgement.</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="How are you feeling?">{(Object.keys(MOODS) as (keyof typeof MOODS)[]).map((m) => <button key={m} aria-pressed={data.mood === m} onClick={() => report(setMood(data.mood === m ? null : m), data.mood === m ? 'Mood cleared.' : 'Mood saved.')} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${data.mood === m ? 'border-ink bg-ink text-ivory' : 'border-ink/15 bg-paper hover:border-gold'}`}>{MOODS[m].label}</button>)}</div>
              {data.mood && <p className="mt-4 rounded-2xl bg-gold/15 p-4 text-sm leading-relaxed">{MOODS[data.mood].tip}</p>}
            </>
          )}
        </Card>

        {/* Notes */}
        <Card className="lg:col-span-2">
          <CardTitle icon={<FileText className="h-5 w-5" />} action={<Badge>Extractive summariser</Badge>}>Note summarisation</CardTitle>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="notes" className="label">Paste your notes</label>
              <textarea id="notes" rows={9} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste lecture notes or a textbook passage…" />
              <div className="mt-3 flex gap-2"><button className="btn btn-primary btn-sm" onClick={summarise}>Summarise</button><button className="btn btn-ghost btn-sm" onClick={() => { setNotes(''); setSummary(null); saveNotes('') }}>Clear</button></div>
            </div>
            <div>
              <p className="label">Summary</p>
              {!summary ? <EmptyState title="No summary yet" text="This picks the most informative sentences from your own text — it does not write new sentences." /> : (
                <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4"><ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">{summary.summary.map((s) => <li key={s}>{s}</li>)}</ul><div className="mt-3 flex flex-wrap gap-1.5">{summary.keywords.map((k) => <span key={k} className="chip">{k}</span>)}</div></div>
              )}
            </div>
          </div>
        </Card>

        {/* Revision */}
        <Card>
          <CardTitle icon={<Lightbulb className="h-5 w-5" />}>Smart revision recommendations</CardTitle>
          {revision.length === 0 ? <EmptyState title="Add subjects first" /> : (
            <ol className="space-y-3">{revision.slice(0, 5).map((r, i) => <li key={r.subject.id} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-gold">{i + 1}</span><span><span className="block text-sm font-bold">{r.subject.name}</span><span className="block text-xs text-muted">{r.reason}</span></span></li>)}</ol>
          )}
          <p className="mt-4 text-[11px] text-muted">Ranked by difficulty, days to exam, unfinished study and attendance gaps.</p>
        </Card>

        {/* Prediction */}
        <Card>
          <CardTitle icon={<Gauge className="h-5 w-5" />} action={<Badge>Heuristic estimate</Badge>}>Performance outlook</CardTitle>
          {predictions.length === 0 ? <EmptyState title="Add subjects first" /> : (
            <ul className="space-y-4">{predictions.map((p) => <li key={p.subject.id}><div className="mb-1 flex items-center justify-between text-sm"><span className="font-bold">{p.subject.name}</span><Badge tone={p.score >= 75 ? 'sage' : p.score >= 55 ? 'gold' : 'clay'}>{p.band} · {p.score}</Badge></div><ProgressBar value={p.score} tone={p.score >= 75 ? 'sage' : p.score >= 55 ? 'gold' : 'clay'} label={`${p.subject.name} readiness`} /><p className="mt-1 text-[11px] text-muted">{p.factors.join(' · ')}</p></li>)}</ul>
          )}
          <p className="mt-4 rounded-xl bg-beige/60 p-3 text-[11px] leading-relaxed text-muted">A readiness score from 0–100, not a predicted mark: 45% study coverage, 30% attendance, 25% time left relative to difficulty. It is a transparent rule of thumb, not a trained model.</p>
        </Card>

        {/* Analytics */}
        <Card className="lg:col-span-2">
          <CardTitle icon={<TrendingUp className="h-5 w-5" />}>Learning analytics</CardTitle>
          {hoursBySubject.length === 0 ? <EmptyState title="No data yet" text="Add subjects and generate a study plan to see analytics." /> : (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="label">Planned vs completed study hours</p>
                <ul className="space-y-3">{hoursBySubject.map((h) => <li key={h.s.id}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{h.s.name}</span><span className="text-muted">{h.done}h / {h.total}h</span></div><div className="relative h-2.5 overflow-hidden rounded-full bg-beige"><div className="absolute inset-y-0 left-0 rounded-full bg-sand" style={{ width: `${(h.total / maxHours) * 100}%` }} /><div className="absolute inset-y-0 left-0 rounded-full bg-gold" style={{ width: `${(h.done / maxHours) * 100}%` }} /></div></li>)}</ul>
              </div>
              <div>
                <p className="label">Study coverage vs attendance</p>
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted"><th className="pb-2">Subject</th><th className="pb-2 text-right">Coverage</th><th className="pb-2 text-right">Attendance</th><th className="pb-2 text-right">Exam</th></tr></thead><tbody>{hoursBySubject.map((h) => <tr key={h.s.id} className="border-t border-ink/5"><td className="py-2 font-semibold">{h.s.code}</td><td className="py-2 text-right">{h.pct}%</td><td className={`py-2 text-right ${h.att.total && h.att.pct < data.prefs.attendanceMinPct ? 'font-bold text-clay' : ''}`}>{h.att.total ? h.att.pct.toFixed(0) + '%' : '—'}</td><td className="py-2 text-right text-muted">{h.s.examDate ? daysBetween(today, h.s.examDate) + 'd' : '—'}</td></tr>)}</tbody></table></div>
              </div>
            </div>
          )}
        </Card>
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-muted"><Brain className="h-4 w-4 text-gold" />Everything on this page is derived from data stored in this browser.</p>
    </div>
  )
}
