import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Download, Mic, MicOff, Play, Save, Square, Trash2, Volume2, VolumeX } from 'lucide-react'
import { Badge, Card, CardTitle, EmptyState, Field, Notice, PageHeader, Tabs, useFieldId, useToast } from '../components/ui'
import { deleteTranscript, saveTranscript } from '../lib/actions'
import { TRANSLATE_ENDPOINT } from '../lib/ai'
import { fmtDate } from '../lib/dates'
import { useCurrentUser, useStudent } from '../lib/store'

/* eslint-disable @typescript-eslint/no-explicit-any */
const LANGS = [
  { code: 'en', speech: 'en-IN', name: 'English' },
  { code: 'hi', speech: 'hi-IN', name: 'Hindi — हिन्दी' },
  { code: 'mr', speech: 'mr-IN', name: 'Marathi — मराठी' },
  { code: 'es', speech: 'es-ES', name: 'Spanish — Español' },
  { code: 'fr', speech: 'fr-FR', name: 'French — Français' },
]
const nameOf = (c: string) => LANGS.find((l) => l.code === c)?.name ?? c
const speechOf = (c: string) => LANGS.find((l) => l.code === c)?.speech ?? c

// Scripted sample lecture for DEMO mode. The translations were written by hand for this demo —
// they are NOT produced by live machine translation.
const DEMO_LECTURE: { en: string; hi: string; mr: string; es: string; fr: string }[] = [
  { en: 'Good morning everyone. Today we will study deadlocks in operating systems.', hi: 'सभी को शुभ प्रभात। आज हम ऑपरेटिंग सिस्टम में डेडलॉक का अध्ययन करेंगे।', mr: 'सर्वांना शुभ सकाळ. आज आपण ऑपरेटिंग सिस्टममधील डेडलॉकचा अभ्यास करणार आहोत.', es: 'Buenos días a todos. Hoy estudiaremos los interbloqueos en los sistemas operativos.', fr: "Bonjour à tous. Aujourd'hui, nous allons étudier les interblocages dans les systèmes d'exploitation." },
  { en: 'A deadlock occurs when a set of processes are each waiting for a resource held by another process in the set.', hi: 'डेडलॉक तब होता है जब प्रोसेसों का एक समूह ऐसे संसाधन की प्रतीक्षा करता है जो उसी समूह की किसी दूसरी प्रोसेस के पास है।', mr: 'डेडलॉक तेव्हा होतो जेव्हा प्रोसेसचा एक गट त्याच गटातील दुसऱ्या प्रोसेसकडे असलेल्या संसाधनाची वाट पाहत असतो.', es: 'Un interbloqueo ocurre cuando un conjunto de procesos espera cada uno un recurso que tiene otro proceso del conjunto.', fr: "Un interblocage se produit lorsque chaque processus d'un ensemble attend une ressource détenue par un autre processus de l'ensemble." },
  { en: 'Four conditions must hold at the same time: mutual exclusion, hold and wait, no preemption, and circular wait.', hi: 'चार शर्तें एक साथ पूरी होनी चाहिए: म्यूचुअल एक्सक्लूज़न, होल्ड एंड वेट, नो प्रीएम्प्शन और सर्कुलर वेट।', mr: 'चार अटी एकाच वेळी पूर्ण व्हायला हव्यात: म्युच्युअल एक्सक्लूजन, होल्ड अँड वेट, नो प्रीएम्प्शन आणि सर्क्युलर वेट.', es: 'Deben cumplirse cuatro condiciones a la vez: exclusión mutua, retención y espera, no apropiación y espera circular.', fr: "Quatre conditions doivent être réunies en même temps : l'exclusion mutuelle, la détention et l'attente, l'absence de préemption et l'attente circulaire." },
  { en: 'If we break any one of these conditions, a deadlock cannot occur.', hi: 'यदि हम इनमें से कोई एक शर्त तोड़ दें, तो डेडलॉक नहीं हो सकता।', mr: 'यापैकी कोणतीही एक अट मोडली तर डेडलॉक होऊ शकत नाही.', es: 'Si rompemos cualquiera de estas condiciones, no puede producirse un interbloqueo.', fr: "Si nous brisons l'une de ces conditions, un interblocage ne peut pas se produire." },
  { en: 'A resource allocation graph helps us see whether a cycle exists.', hi: 'रिसोर्स एलोकेशन ग्राफ़ हमें यह देखने में मदद करता है कि कोई चक्र मौजूद है या नहीं।', mr: 'रिसोर्स अलोकेशन ग्राफमुळे चक्र अस्तित्वात आहे की नाही हे पाहता येते.', es: 'Un grafo de asignación de recursos nos ayuda a ver si existe un ciclo.', fr: "Un graphe d'allocation de ressources nous aide à voir s'il existe un cycle." },
  { en: "The Banker's algorithm avoids deadlock by granting a request only if the system stays in a safe state.", hi: 'बैंकर्स एल्गोरिद्म तभी अनुरोध स्वीकार करता है जब सिस्टम सुरक्षित अवस्था में बना रहे, इस तरह डेडलॉक से बचाता है।', mr: 'बँकर्स अल्गोरिदम फक्त तेव्हाच विनंती मंजूर करतो जेव्हा प्रणाली सुरक्षित स्थितीत राहते, अशा प्रकारे डेडलॉक टाळतो.', es: 'El algoritmo del banquero evita el interbloqueo concediendo una solicitud solo si el sistema permanece en un estado seguro.', fr: "L'algorithme du banquier évite l'interblocage en n'accordant une demande que si le système reste dans un état sûr." },
  { en: 'For homework, solve the three safe-state problems on page forty-two.', hi: 'गृहकार्य के लिए, पृष्ठ बयालीस पर दी गई तीन सुरक्षित-अवस्था की समस्याएँ हल करें।', mr: 'गृहपाठासाठी, बेचाळीसाव्या पानावरील तीन सुरक्षित-स्थितीची उदाहरणे सोडवा.', es: 'De tarea, resuelvan los tres problemas de estado seguro de la página cuarenta y dos.', fr: 'Pour les devoirs, résolvez les trois problèmes d\'état sûr de la page quarante-deux.' },
]

interface Line {
  id: number
  original: string
  translated: string
  pending?: boolean
  failed?: boolean
}

type Mode = 'live' | 'demo'

function getRecognition(): any {
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

async function translateText(text: string, source: string, target: string): Promise<string | null> {
  if (source === target) return text
  const w = self as any
  if (w.Translator && typeof w.Translator.create === 'function') {
    try {
      const avail = await w.Translator.availability({ sourceLanguage: source, targetLanguage: target })
      if (avail !== 'unavailable') {
        const t = await w.Translator.create({ sourceLanguage: source, targetLanguage: target })
        return await t.translate(text)
      }
    } catch {
      /* fall through */
    }
  }
  if (TRANSLATE_ENDPOINT) {
    const res = await fetch(TRANSLATE_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, source, target }) })
    if (!res.ok) throw new Error(`Translation service responded with ${res.status}.`)
    const data = (await res.json()) as { translation?: string }
    if (!data.translation) throw new Error('Translation service returned nothing.')
    return data.translation
  }
  return null
}

export default function LectureTranslator() {
  const user = useCurrentUser()!
  const data = useStudent()
  const { toast, report } = useToast()
  const [mode, setMode] = useState<Mode>('demo')
  const [source, setSource] = useState('en')
  const [target, setTarget] = useState(data?.prefs.defaultLanguage ?? 'hi')
  const [running, setRunning] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [interim, setInterim] = useState('')
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const [speak, setSpeak] = useState(false)
  const [translationNote, setTranslationNote] = useState('')
  const recRef = useRef<any>(null)
  const wantRun = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const idRef = useRef(0)
  const speakRef = useRef(speak)
  speakRef.current = speak
  const targetRef = useRef(target)
  targetRef.current = target
  const sourceRef = useRef(source)
  sourceRef.current = source
  const endRef = useRef<HTMLDivElement>(null)
  const ids = { s: useFieldId('s'), t: useFieldId('t') }

  const hasSpeech = typeof window !== 'undefined' && !!getRecognition()
  const hasTts = typeof window !== 'undefined' && 'speechSynthesis' in window
  const hasBrowserTranslator = typeof self !== 'undefined' && !!(self as any).Translator
  const liveTranslation = hasBrowserTranslator || !!TRANSLATE_ENDPOINT

  const say = useCallback((text: string, lang: string) => {
    if (!hasTts || !text) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = speechOf(lang)
    window.speechSynthesis.speak(u)
  }, [hasTts])

  const stop = useCallback(() => {
    wantRun.current = false
    window.clearTimeout(timer.current)
    try { recRef.current?.stop() } catch { /* already stopped */ }
    recRef.current = null
    if (hasTts) window.speechSynthesis.cancel()
    setRunning(false)
    setInterim('')
  }, [hasTts])

  useEffect(() => () => stop(), [stop])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [lines.length])

  const switchMode = (m: Mode) => { stop(); setMode(m); setLines([]); setTranslationNote('') }

  const startDemo = () => {
    if (!['en'].includes(source)) { setSource('en') }
    setLines([]); setRunning(true)
    let i = 0
    const next = () => {
      if (i >= DEMO_LECTURE.length) { setRunning(false); toast('info', 'Demo lecture finished.'); return }
      const row = DEMO_LECTURE[i++]
      const tr = (row as any)[targetRef.current] as string
      const line: Line = { id: ++idRef.current, original: row.en, translated: targetRef.current === 'en' ? row.en : tr }
      setLines((l) => [...l, line])
      if (speakRef.current) say(line.translated, targetRef.current)
      timer.current = window.setTimeout(next, 3800)
    }
    next()
  }

  const startLive = async () => {
    const SR = getRecognition()
    if (!SR) return toast('error', 'This browser does not support live speech recognition. Use Chrome or Edge, or switch to the demo mode.')
    if (!navigator.mediaDevices?.getUserMedia) return toast('error', 'Microphone access is not available here. Open the app over HTTPS or on localhost.')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setPermission('granted')
    } catch (e) {
      setPermission('denied')
      const name = e instanceof DOMException ? e.name : ''
      return toast('error', name === 'NotFoundError' ? 'No microphone was found on this device.' : 'Microphone permission was denied. Allow it in your browser’s site settings and try again.')
    }
    setTranslationNote(liveTranslation ? '' : 'Live translation is not available in this browser and no translation service is configured, so only the original transcript is shown.')
    const rec = new SR()
    rec.lang = speechOf(sourceRef.current)
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (ev: any) => {
      let live = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        const text = r[0].transcript.trim()
        if (r.isFinal && text) {
          const id = ++idRef.current
          setLines((l) => [...l, { id, original: text, translated: '', pending: true }])
          translateText(text, sourceRef.current, targetRef.current)
            .then((t) => {
              setLines((l) => l.map((x) => (x.id === id ? { ...x, translated: t ?? '', pending: false } : x)))
              if (t && speakRef.current) say(t, targetRef.current)
            })
            .catch(() => setLines((l) => l.map((x) => (x.id === id ? { ...x, pending: false, failed: true } : x))))
        } else live += text + ' '
      }
      setInterim(live.trim())
    }
    rec.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { setPermission('denied'); toast('error', 'Microphone permission was denied.') }
      else if (e.error === 'network') toast('error', 'Speech recognition needs an internet connection in this browser.')
      else toast('error', `Speech recognition error: ${e.error}`)
      wantRun.current = false
      setRunning(false)
    }
    rec.onend = () => {
      if (wantRun.current) { try { rec.start() } catch { /* restarting */ } } else setRunning(false)
    }
    recRef.current = rec
    wantRun.current = true
    try { rec.start(); setRunning(true); toast('info', 'Listening… start speaking.') } catch { toast('error', 'Could not start the microphone.') }
  }

  const start = () => (mode === 'demo' ? startDemo() : startLive())
  const latest = lines[lines.length - 1]
  const text = useMemo(() => lines.map((l, i) => `${i + 1}. [${nameOf(source)}] ${l.original}\n   [${nameOf(target)}] ${l.translated || '(no translation)'}`).join('\n\n'), [lines, source, target])
  const header = `CONEXUs lecture transcript — ${mode === 'demo' ? 'DEMONSTRATION (scripted sample, hand-written translations)' : 'live browser speech recognition'}\n${new Date().toLocaleString()}\n\n`

  const copy = async () => {
    if (!lines.length) return toast('error', 'There is no transcript to copy yet.')
    try { await navigator.clipboard.writeText(header + text); toast('success', 'Transcript copied to the clipboard.') } catch { toast('error', 'Copying was blocked by the browser. Use Download instead.') }
  }
  const download = () => {
    if (!lines.length) return toast('error', 'There is no transcript to download yet.')
    const url = URL.createObjectURL(new Blob([header + text], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `conexus-transcript-${new Date().toISOString().slice(0, 10)}.txt`; a.click()
    URL.revokeObjectURL(url)
    toast('success', 'Transcript downloaded.')
  }
  const save = () => report(saveTranscript({ title: lines[0]?.original.slice(0, 48) || 'Lecture', sourceLang: source, targetLang: target, mode, lines: lines.map((l) => ({ original: l.original, translated: l.translated })) }), 'Transcript saved to your account.')

  return (
    <div>
      <PageHeader eyebrow="Feature 04" title="Multilingual Lecture Translator" intro="Follow a lecture in the language you think in: live speech-to-text, translated subtitles, voice playback and downloadable transcripts." />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Tabs label="Translator mode" value={mode} onChange={switchMode} options={[{ value: 'demo', label: 'Demonstration' }, { value: 'live', label: 'Live microphone' }]} />
        <div className="flex flex-wrap gap-2">
          <Badge tone={hasSpeech ? 'sage' : 'clay'}>Speech recognition: {hasSpeech ? 'available' : 'not supported'}</Badge>
          <Badge tone={liveTranslation ? 'sage' : 'gold'}>Live translation: {hasBrowserTranslator ? 'browser Translator API' : TRANSLATE_ENDPOINT ? 'configured service' : 'not available'}</Badge>
          <Badge tone={hasTts ? 'sage' : 'clay'}>Voice playback: {hasTts ? 'available' : 'not supported'}</Badge>
        </div>
      </div>

      {mode === 'demo' ? (
        <div className="mb-6"><Notice kind="demo" title="Demonstration mode — nothing here is live">A scripted sample lecture on deadlocks plays line by line. The subtitles are <strong>hand-written translations</strong> prepared for this demo; no microphone, speech recognition or machine translation is used. Switch to “Live microphone” to try real transcription.</Notice></div>
      ) : (
        <div className="mb-6"><Notice title="Live mode">Uses your browser's speech recognition (Chrome / Edge) after you grant microphone permission. Audio may be processed by your browser vendor's speech service. {liveTranslation ? 'Translation uses ' + (hasBrowserTranslator ? "your browser's on-device Translator API." : 'the configured translation service.') : 'No translation engine is available here, so you will see the original transcript only — this is expected, not a bug.'}</Notice></div>
      )}
      {permission === 'denied' && <div className="mb-6"><Notice kind="warn" title="Microphone blocked">Allow microphone access for this site in your browser settings, then press Start again.</Notice></div>}
      {translationNote && mode === 'live' && <div className="mb-6"><Notice kind="warn">{translationNote}</Notice></div>}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lecture language (spoken)" htmlFor={ids.s}><select id={ids.s} className="input" value={source} onChange={(e) => setSource(e.target.value)} disabled={running || mode === 'demo'}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select></Field>
              <Field label="Subtitle language" htmlFor={ids.t}><select id={ids.t} className="input" value={target} onChange={(e) => setTarget(e.target.value)}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select></Field>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {!running ? <button className="btn btn-primary" onClick={start}>{mode === 'live' ? <Mic className="h-4 w-4" /> : <Play className="h-4 w-4" />}{mode === 'live' ? 'Start listening' : 'Start demo lecture'}</button> : <button className="btn btn-primary" onClick={stop}><Square className="h-4 w-4" />Stop</button>}
              <button className={`btn ${speak ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setSpeak((s) => !s)} aria-pressed={speak} disabled={!hasTts}>{speak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}Auto voice {speak ? 'on' : 'off'}</button>
              <button className="btn btn-ghost" onClick={() => latest?.translated && say(latest.translated, target)} disabled={!hasTts || !latest?.translated}><Volume2 className="h-4 w-4" />Replay last</button>
              {running && <span className="inline-flex items-center gap-2 text-sm font-semibold text-clay"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-clay" />{mode === 'live' ? 'Listening' : 'Playing demo'}</span>}
            </div>
          </Card>

          <div className="overflow-hidden rounded-3xl bg-ink p-8 text-center text-ivory" aria-live="polite" aria-label="Translated subtitles">
            <p className="eyebrow mb-4 !text-gold-hi">Subtitles · {nameOf(target)}</p>
            <p className="font-display text-3xl leading-snug md:text-4xl">{latest ? (latest.pending ? '…' : latest.translated || latest.original) : <span className="text-ivory/35">{running ? 'Waiting for speech…' : 'Subtitles appear here'}</span>}</p>
            {latest && latest.translated && <p className="mt-4 text-sm text-ivory/55">{latest.original}</p>}
            {interim && <p className="mt-4 text-sm italic text-gold-hi/80">{interim}</p>}
          </div>

          <Card>
            <CardTitle action={<div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={copy}><Copy className="h-3.5 w-3.5" />Copy</button><button className="btn btn-ghost btn-sm" onClick={download}><Download className="h-3.5 w-3.5" />Download</button>{user.role === 'student' && <button className="btn btn-ghost btn-sm" onClick={save}><Save className="h-3.5 w-3.5" />Save</button>}</div>}>Transcript</CardTitle>
            {lines.length === 0 ? <EmptyState icon={<MicOff className="h-8 w-8" strokeWidth={1.3} />} title="No transcript yet" text={mode === 'demo' ? 'Start the demo lecture to see the original and translated lines.' : 'Press Start listening and speak, or play a lecture near your microphone.'} /> : (
              <div className="scroll-thin max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {lines.map((l) => (
                  <div key={l.id} className="grid gap-3 rounded-2xl border border-ink/5 bg-ivory/70 p-4 md:grid-cols-2">
                    <div><p className="eyebrow mb-1 !text-muted">{nameOf(source)}</p><p className="text-sm leading-relaxed">{l.original}</p></div>
                    <div><p className="eyebrow mb-1">{nameOf(target)}</p><p className="text-sm leading-relaxed">{l.pending ? <span className="text-muted">Translating…</span> : l.failed ? <span className="text-clay">Translation failed for this line.</span> : l.translated || <span className="text-muted">Translation unavailable</span>}</p></div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardTitle>Saved transcripts</CardTitle>
            {user.role !== 'student' ? <p className="text-sm text-muted">Saving is available to student accounts.</p> : !data || data.savedTranscripts.length === 0 ? <p className="text-sm text-muted">Nothing saved yet. Use Save above to keep a transcript in this browser.</p> : (
              <ul className="space-y-2">
                {data.savedTranscripts.map((t) => (
                  <li key={t.id} className="rounded-xl border border-ink/5 bg-ivory/70 p-3">
                    <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold leading-snug">{t.title}…</p><button aria-label="Delete saved transcript" className="text-muted hover:text-clay" onClick={() => report(deleteTranscript(t.id), 'Transcript deleted.')}><Trash2 className="h-4 w-4" /></button></div>
                    <p className="mt-1 text-xs text-muted">{fmtDate(t.createdAt.slice(0, 10))} · {nameOf(t.sourceLang).split(' ')[0]} → {nameOf(t.targetLang).split(' ')[0]} · {t.lines.length} lines · {t.mode === 'demo' ? 'demo' : 'live'}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardTitle>What is real here</CardTitle>
            <ul className="space-y-2 text-sm text-charcoal/85">
              <li><strong>Live speech-to-text</strong> — real, via the browser's SpeechRecognition (Chrome/Edge).</li>
              <li><strong>Live translation</strong> — real only if the browser offers the Translator API or a service URL is configured at build time.</li>
              <li><strong>Voice playback</strong> — real, via the browser's speech synthesis voices installed on your device.</li>
              <li><strong>Demonstration mode</strong> — scripted, with hand-written sample translations.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
