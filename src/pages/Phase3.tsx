import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CircleDashed, ExternalLink, FileWarning, Printer } from 'lucide-react'
import { Wordmark } from '../components/Wordmark'
import { Badge, Notice } from '../components/ui'

const DEPLOY_URL = (import.meta.env.VITE_DEPLOY_URL as string | undefined)?.trim() || ''

/* ----------------------------- Architecture diagram ----------------------------- */

const GOLD = '#B69A62'
const INK = '#151513'

function Box({ x, y, w, h, title, sub, planned = false, dark = false }: { x: number; y: number; w: number; h: number; title: string; sub?: string; planned?: boolean; dark?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={dark ? INK : planned ? 'transparent' : '#FFFCF6'} stroke={planned ? '#8a8272' : GOLD} strokeWidth={planned ? 1.4 : 1.8} strokeDasharray={planned ? '6 5' : undefined} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 5 : h / 2 + 5)} textAnchor="middle" fontSize="13.5" fontWeight="700" fill={dark ? '#F7F2E8' : planned ? '#6B665C' : INK} fontFamily="Manrope, sans-serif">{title}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize="10.5" fill={dark ? '#D3BC8A' : '#6B665C'} fontFamily="Manrope, sans-serif">{sub}</text>}
    </g>
  )
}

function Arrow({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <g stroke={GOLD} strokeWidth="1.8" fill={GOLD}>
      <line x1={x} y1={y1} x2={x} y2={y2 - 6} />
      <path d={`M ${x - 5} ${y2 - 7} L ${x} ${y2} L ${x + 5} ${y2 - 7} Z`} />
    </g>
  )
}

function Layer({ y, label }: { y: number; label: string }) {
  return <text x={14} y={y} fontSize="10" fontWeight="700" letterSpacing="1.6" fill={GOLD} fontFamily="Manrope, sans-serif">{label}</text>
}

function ArchitectureDiagram() {
  return (
    <div className="overflow-x-auto rounded-3xl border border-ink/10 bg-paper p-3 md:p-5 print:overflow-visible">
      <svg viewBox="0 0 1000 800" className="mx-auto h-auto w-full min-w-[760px] print:min-w-0" role="img" aria-label="CONEXUs architecture diagram: users, interface, authentication and roles, six feature modules, services, data layer and integrations">
        {/* 1 users */}
        <Layer y={22} label="1 · USERS" />
        <Box x={190} y={32} w={180} h={50} title="Students" sub="primary users" dark />
        <Box x={410} y={32} w={180} h={50} title="Faculty" sub="secondary stakeholder" dark />
        <Box x={630} y={32} w={180} h={50} title="Administrators" sub="secondary stakeholder" dark />
        <Arrow x={500} y1={86} y2={116} />

        {/* 2 interface */}
        <Layer y={112} label="2 · INTERFACE" />
        <Box x={190} y={122} w={620} h={56} title="Responsive CONEXUs Interface" sub="React 19 · TypeScript · Tailwind CSS 4 · React Router 7 — desktop, tablet, mobile" />
        <Arrow x={500} y1={182} y2={212} />

        {/* 3 auth */}
        <Layer y={208} label="3 · ACCESS" />
        <Box x={190} y={218} w={300} h={56} title="Authentication (demo)" sub="PBKDF2-hashed local accounts + demo mode" />
        <Box x={510} y={218} w={300} h={56} title="Role-Based Access" sub="route guards + role checks in every action" />
        <Arrow x={500} y1={278} y2={308} />

        {/* 4 modules */}
        <Layer y={304} label="4 · SIX CORE MODULES" />
        {[
          ['AI Study Planner', '/study-planner'], ['Doubt Sharing', '/doubts'], ['Attendance Planner', '/attendance'],
          ['Lecture Translator', '/lecture-translator'], ['Lost & Found', '/lost-found'], ['Timetable & Events', '/calendar'],
        ].map(([t, s], i) => <Box key={t} x={40 + i * 156} y={314} w={146} h={56} title={t} sub={s} />)}
        <Arrow x={500} y1={374} y2={404} />

        {/* 5 services */}
        <Layer y={400} label="5 · APPLICATION SERVICES & BUSINESS LOGIC (browser)" />
        {[
          ['Rule-based scheduler', 'planner.ts'], ['Attendance engine', 'attendance.ts'], ['Calendar aggregator', 'calendar.ts'],
          ['Notification engine', 'notifications.ts'], ['Productivity rules', 'summariser · assistant'],
        ].map(([t, s], i) => <Box key={t} x={40 + i * 188} y={410} w={178} h={52} title={t} sub={s} />)}
        <Arrow x={500} y1={466} y2={496} />

        {/* 6 data */}
        <Layer y={492} label="6 · DATA, STORAGE & NOTIFICATIONS" />
        <Box x={40} y={502} w={290} h={56} title="Browser local store" sub="localStorage · persists across refreshes" />
        <Box x={355} y={502} w={290} h={56} title="Image & transcript storage" sub="resized images / text kept locally" />
        <Box x={670} y={502} w={290} h={56} title="In-app notifications" sub="bell + dashboard alerts" />
        <Box x={40} y={566} w={290} h={44} title="Server database" sub="PostgreSQL / Firebase — planned" planned />
        <Box x={355} y={566} w={290} h={44} title="Cloud file storage" sub="planned" planned />
        <Box x={670} y={566} w={290} h={44} title="Push & email notifications" sub="planned" planned />
        <Arrow x={500} y1={614} y2={644} />

        {/* 7 integrations */}
        <Layer y={640} label="7 · INTEGRATIONS" />
        <Box x={40} y={650} w={214} h={56} title="Web Speech API" sub="speech-to-text · voice playback" />
        <Box x={266} y={650} w={214} h={56} title="Browser Translator API" sub="used when the browser has it" />
        <Box x={492} y={650} w={214} h={56} title=".ics calendar export" sub="works today" />
        <Box x={718} y={650} w={242} h={56} title="Optional AI / translation URL" sub="hook built · not connected" />
        <Box x={40} y={714} w={214} h={44} title="Live LLM service" sub="planned" planned />
        <Box x={266} y={714} w={214} h={44} title="Cloud translation" sub="planned" planned />
        <Box x={492} y={714} w={214} h={44} title="Google Calendar sync" sub="needs OAuth credentials" planned />
        <Box x={718} y={714} w={242} h={44} title="AI image matching · SSO" sub="planned" planned />

        {/* legend */}
        <rect x={40} y={772} width="28" height="14" rx="4" fill="#FFFCF6" stroke={GOLD} strokeWidth="1.8" />
        <text x={76} y={783} fontSize="11" fill={INK} fontFamily="Manrope, sans-serif">Implemented in this prototype</text>
        <rect x={290} y={772} width="28" height="14" rx="4" fill="none" stroke="#8a8272" strokeWidth="1.4" strokeDasharray="5 4" />
        <text x={326} y={783} fontSize="11" fill={INK} fontFamily="Manrope, sans-serif">Planned / not connected</text>
      </svg>
    </div>
  )
}

/* ----------------------------- Content ----------------------------- */

const SHOTS = [
  { file: '01-landing.png', title: 'Landing page', route: '/', how: 'Open the site while signed out. Capture the hero and dashboard preview.' },
  { file: '02-login.png', title: 'Login / sign-up with demo mode', route: '/login', how: 'Open /login. Capture the demo-mode panel and the form.' },
  { file: '03-dashboard.png', title: 'Student dashboard', route: '/dashboard', how: 'Choose “Continue as Student”. Capture the full dashboard.' },
  { file: '04-study-planner.png', title: 'AI Study Planner', route: '/study-planner', how: 'Open Study Planner → Plan tab with sessions and exam countdowns visible.' },
  { file: '05-doubts.png', title: 'Doubt-sharing platform', route: '/doubts', how: 'Open a thread with faculty and peer replies.' },
  { file: '06-attendance.png', title: 'Attendance dashboard', route: '/attendance', how: 'Capture subject cards, the shortage warning and the leave planner.' },
  { file: '07-lecture-translator.png', title: 'Lecture translator (demo mode)', route: '/lecture-translator', how: 'Press “Start demo lecture” and capture after 2–3 lines.' },
  { file: '08-lost-found.png', title: 'Lost & found', route: '/lost-found', how: 'Capture the feed with filters.' },
  { file: '09-calendar.png', title: 'Timetable & events (month view)', route: '/calendar', how: 'Month view with events visible.' },
  { file: '10-faculty.png', title: 'Faculty console', route: '/faculty', how: 'Sign out, choose “Continue as Faculty”.' },
  { file: '11-admin.png', title: 'Admin console', route: '/admin', how: 'Sign out, choose “Continue as Administrator”.' },
  { file: '12-mobile-dashboard.png', title: 'Mobile responsive interface', route: '/dashboard', how: 'Use browser device mode at 390 × 844 and capture the dashboard.' },
]

const ARTEFACTS = [
  { src: '/artefacts/survey-page-2.jpg', title: 'Empathy research — survey & bias review (Session 3)', note: 'Survey questionnaire design and Google Form link.' },
  { src: '/artefacts/stakeholder-canvas.jpg', title: 'Stakeholder canvas (Session 4)', note: 'Primary and secondary stakeholders of CONEXUS.' },
  { src: '/artefacts/empathy-map-page-3.jpg', title: 'Empathy map — SAYS / THINKS / FEELS / DOES (Session 5)', note: 'Part 1 of the submitted empathy map.' },
  { src: '/artefacts/empathy-map-page-4.jpg', title: 'Empathy map — PAINS / GAINS (Session 5)', note: 'Part 2 of the submitted empathy map.' },
  { src: '/artefacts/persona.jpg', title: 'User persona — Aanya Sharma (Session 5)', note: 'Primary persona used to shape the prototype.' },
  { src: '/artefacts/problem-definition-page-4.jpg', title: 'Problem definition (Session 6)', note: 'Refined final problem statement and logic check.' },
  { src: '/artefacts/mind-map.jpg', title: 'Ideation mind map (Session 7)', note: 'Solution themes clustered around the problem statement.' },
]

type Status = 'working' | 'demo' | 'planned'
const FEATURES: [string, Status, string][] = [
  ['Landing page, navigation, responsive layout', 'working', 'All routes reachable; mobile drawer navigation.'],
  ['Login / sign-up', 'working', 'Validated forms, password visibility, roles. Local accounts hashed with PBKDF2; “demo mode” skips passwords. No server.'],
  ['Role-based access', 'working', 'Route guards plus role checks in every data action. Client-side only — see limitations.'],
  ['Student dashboard', 'working', 'Timetable, attendance, deadlines, study progress, doubts, announcements, events, lost & found, notifications, weekly chart.'],
  ['AI Study Planner', 'working', 'Rule-based scheduler (not generative AI): subjects, topics, exam dates, difficulty, availability, goals, completion, rescheduling, countdowns.'],
  ['AI Doubt Sharing', 'working', 'Posting, image upload, threads, upvotes, bookmarks, faculty replies, resolved status. AI replies are simulated unless an endpoint is configured, and are labelled.'],
  ['Smart Attendance Planner', 'working', 'Add/edit/delete records, instant recalculation, configurable minimum, shortage warnings, leave planner, projections.'],
  ['Multilingual Lecture Translator', 'demo', 'Live microphone transcription is real in Chrome/Edge. Live translation only where the browser provides it; otherwise transcript only. Demonstration mode uses hand-written sample translations.'],
  ['Lost & Found', 'working', 'Reports, image upload, filters, search, claim requests, approve/decline, status. Contact email stored privately and never displayed. AI image matching not built.'],
  ['Timetable & Events', 'working', 'Day/week/month views, create/edit/delete, role-restricted college events, .ics export. Google Calendar sync not connected.'],
  ['Faculty & admin consoles', 'working', 'Announcements, assignments, timetable management, official notices, college events, usage statistics computed from local data.'],
  ['Productivity tools', 'demo', 'Rule-based assistant, extractive note summariser, revision ranking, readiness estimate, mood tips, voice navigation (browser speech). No generative AI.'],
  ['Google Calendar sync · push/email notifications · server database · live LLM · AI image matching', 'planned', 'Described in the project report; require credentials/servers not present in this prototype.'],
]

const FLOWS: [string, string, string][] = [
  ['1', 'Create a study plan and complete a session', 'Study Planner → Generate plan → tick a session.'],
  ['2', 'Submit a doubt and view a discussion', 'Doubts → Ask a doubt → open it → reply / “Get a demo answer”.'],
  ['3', 'Add attendance and see the recalculated %', 'Attendance → Add a record → toast and card update immediately.'],
  ['4', 'Use the lecture translator', 'Lecture Translator → Start demo lecture (or Live microphone).'],
  ['5', 'Submit a lost-item report', 'Lost & Found → Report an item → it appears at the top of the feed.'],
  ['6', 'Create an event', 'Calendar → New event → it appears in the month/week/day views.'],
  ['7', 'Publish a faculty announcement', 'Sign in as Faculty → Publish → sign in as Student → dashboard Announcements.'],
  ['8', 'Update a preference and keep it', 'Settings → toggle a notification or change the minimum attendance → refresh the page.'],
]

const LIMITS = [
  'Front-end only: there is no server, so data lives in each browser’s localStorage and is not shared between users or devices. “Multi-user” behaviour (e.g. a faculty announcement appearing for a student) works within one browser profile.',
  'Authentication and role checks run in the browser, so they demonstrate the workflow but are not real security. Production needs a server-side identity provider and enforcement.',
  'Roles can be chosen freely at sign-up so every interface can be reviewed; a real deployment would assign roles from the institution’s directory.',
  'No generative AI is connected. Doubt answers are simulated, the assistant is rule-based, and the summariser is extractive. An optional endpoint hook exists (VITE_AI_ENDPOINT) but is unconfigured.',
  'Live transcription needs Chrome/Edge and an internet connection; live translation needs the browser’s Translator API or a configured service. Demonstration mode translations are hand-written.',
  'Images are downscaled and kept in localStorage (≈5 MB limit); heavy use can fill it, and the app shows a warning when saving fails.',
  'Google Calendar sync, push/email notifications, AI image matching and institutional integrations are not implemented.',
  'Demo data is fictional. Survey percentages quoted on the landing page come from the team’s 48-response survey (Session 6).',
  'Session 9 wireframes were not supplied when this prototype was built, so no wireframe is shown — see the placeholder below.',
]

const FUTURE = ['Server back end with PostgreSQL/Firebase and real institutional SSO', 'Live LLM-powered doubt answers and study-plan refinement through a server proxy', 'Cloud speech-to-text and translation for classroom-grade lecture captions', 'Google Calendar two-way sync and push/email reminders', 'AI image matching for Lost & Found', 'Pilot interviews to validate which of the six features students value most (an open question from Session 5)']

function StatusPill({ s }: { s: Status }) {
  return s === 'working' ? <Badge tone="sage"><CheckCircle2 className="h-3 w-3" />Working</Badge> : s === 'demo' ? <Badge tone="gold">Working + labelled demo</Badge> : <Badge><CircleDashed className="h-3 w-3" />Planned</Badge>
}

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-ink/10 py-12 first:border-0">
      <p className="eyebrow mb-2">Section {n}</p>
      <h2 className="mb-6 text-4xl md:text-5xl">{title}</h2>
      {children}
    </section>
  )
}

interface ShotManifest { generatedAt: string; tool: string; shots: { file: string; title: string; viewport: string }[] }
interface TestReport { numTotalTests: number; numPassedTests: number; numFailedTests: number; startTime?: number; testResults: { name: string; assertionResults: { title: string; status: string; fullName?: string }[] }[] }

export default function Phase3() {
  const [manifest, setManifest] = useState<ShotManifest | null>(null)
  const [tests, setTests] = useState<TestReport | null>(null)
  useEffect(() => {
    fetch('/screenshots/manifest.json').then((r) => (r.ok ? r.json() : null)).then((j) => setManifest(j && j.shots ? j : null)).catch(() => setManifest(null))
    fetch('/test-report.json').then((r) => (r.ok ? r.json() : null)).then((j) => setTests(j && j.testResults ? j : null)).catch(() => setTests(null))
  }, [])

  return (
    <div className="min-h-screen bg-ivory">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-ivory/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-3.5">
          <Wordmark size="sm" />
          <div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer className="h-4 w-4" />Print / save as PDF</button><Link to="/login" className="btn btn-primary btn-sm">Open the app</Link></div>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-5 py-12">
        <p className="eyebrow">TII project · CONEXUs</p>
        <h1 className="mt-2 text-5xl leading-tight md:text-7xl">Phase 3 — Prototype Implementation</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">This page documents the working CONEXUs prototype: where to run it, how it is built, what it looks like, and — just as importantly — what is real and what is demonstration.</p>
        <nav className="mt-6 flex flex-wrap gap-2 text-sm print:hidden" aria-label="Sections">{[['link', 'A · Executable link'], ['architecture', 'B · Architecture'], ['screenshots', 'C · Screenshots'], ['report', 'D · Implementation report']].map(([h, l]) => <a key={h} href={`#${h}`} className="chip hover:bg-gold/30">{l}</a>)}</nav>

        <Section id="link" n="A" title="Executable link">
          {DEPLOY_URL ? (
            <div className="card flex flex-wrap items-center justify-between gap-4 p-6"><div><p className="label">Public deployment</p><a href={DEPLOY_URL} className="break-all font-display text-2xl text-ink underline decoration-gold underline-offset-4">{DEPLOY_URL}</a></div><a className="btn btn-primary" href={DEPLOY_URL} target="_blank" rel="noreferrer">Open <ExternalLink className="h-4 w-4" /></a></div>
          ) : (
            <>
              <Notice kind="warn" title="Public URL: PENDING — not yet deployed">The prototype has been built and tested but has not been published to a public host, so there is no public link yet. Nothing below is a real URL; once you deploy, set it in <code>VITE_DEPLOY_URL</code> and rebuild so it appears here automatically.</Notice>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {[
                  ['Run locally (works now)', ['npm install', 'npm run dev', 'Open http://localhost:5173']],
                  ['Deploy on Vercel / Netlify', ['Push the project to a GitHub repository', 'Import the repo on vercel.com or netlify.com', 'Build: npm run build · Output: dist', 'Set VITE_DEPLOY_URL to the issued URL and redeploy']],
                  ['Deploy on GitHub Pages', ['Push to GitHub (main branch)', 'Settings → Pages → Source: GitHub Actions', 'The included workflow builds and publishes', 'Paste the resulting URL into VITE_DEPLOY_URL']],
                ].map(([t, steps]) => <div key={t as string} className="card p-5"><h3 className="mb-3 text-xl">{t as string}</h3><ol className="list-decimal space-y-1.5 pl-5 text-sm text-charcoal/85">{(steps as string[]).map((s) => <li key={s}>{s}</li>)}</ol></div>)}
              </div>
            </>
          )}
        </Section>

        <Section id="architecture" n="B" title="Architecture of the prototype">
          <p className="mb-5 max-w-3xl text-muted">A single-page React application. Because there is no back end, application services run in the browser and state is persisted to <code>localStorage</code>. Solid gold boxes exist in the code today; dashed boxes are planned and are <strong>not</strong> connected.</p>
          <ArchitectureDiagram />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ['Presentation', 'Pages in src/pages, shared UI in src/components, “quiet luxury” design tokens in index.css (ivory, beige, sand, champagne gold, rich black).'],
              ['Domain logic', 'Pure, unit-tested functions in src/lib — planner.ts (scheduler), attendance.ts (percentages and projections), productivity.ts, calendar.ts, notifications.ts.'],
              ['State & access', 'store.ts (persistent store), actions.ts (every mutation validates input and role and returns a Result), auth.ts (hashed demo accounts and demo mode).'],
            ].map(([t, d]) => <div key={t} className="card p-5"><h3 className="text-xl">{t}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{d}</p></div>)}
          </div>
        </Section>

        <Section id="screenshots" n="C" title="Screenshots of the prototype">
          {manifest ? (
            <>
              <p className="mb-5 text-sm text-muted">Captured automatically from the running application ({manifest.tool}) on {new Date(manifest.generatedAt).toLocaleString()}. Desktop shots are 1440 px wide; the mobile shot is 390 px.</p>
              <div className="grid gap-5 md:grid-cols-2">
                {manifest.shots.map((s) => <figure key={s.file} className="card overflow-hidden"><img src={`/screenshots/${s.file}`} alt={s.title} loading="lazy" className="w-full border-b border-ink/10" /><figcaption className="p-4 text-sm"><strong>{s.title}</strong><span className="block text-xs text-muted">{s.viewport}</span></figcaption></figure>)}
              </div>
            </>
          ) : (
            <>
              <Notice kind="warn" title="Automatic screenshots have not been generated yet">Screenshots must come from the running app, so none are shown rather than faking them. Run <code>npm run screenshots</code> (see README) to produce them automatically, or capture them with this checklist and save each file into <code>public/screenshots/</code>.</Notice>
              <div className="card mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="text-left text-xs text-muted"><th className="p-3">✓</th><th className="p-3">File name</th><th className="p-3">Screen</th><th className="p-3">Route</th><th className="p-3">How to capture</th></tr></thead><tbody>{SHOTS.map((s) => <tr key={s.file} className="border-t border-ink/5 align-top"><td className="p-3">☐</td><td className="p-3 font-mono text-xs">{s.file}</td><td className="p-3 font-semibold">{s.title}</td><td className="p-3 font-mono text-xs">{s.route}</td><td className="p-3 text-muted">{s.how}</td></tr>)}</tbody></table></div>
            </>
          )}

          <h3 className="mb-2 mt-14 text-3xl">Design-thinking artefacts (original submissions)</h3>
          <p className="mb-5 max-w-3xl text-sm text-muted">These are taken directly from the team's submitted session files — they show how the prototype traces back to research. They are original artefacts, not screenshots of the software.</p>
          <div className="grid gap-5 md:grid-cols-2">
            {ARTEFACTS.map((a) => <figure key={a.src} className="card overflow-hidden"><img src={a.src} alt={a.title} loading="lazy" className="w-full border-b border-ink/10 bg-paper" /><figcaption className="p-4 text-sm"><strong>{a.title}</strong><span className="block text-xs text-muted">{a.note}</span></figcaption></figure>)}
            <figure className="card grid place-items-center border-dashed p-8 text-center"><FileWarning className="mb-3 h-8 w-8 text-gold" /><figcaption className="text-sm"><strong>Session 9 — wireframes &amp; user flows</strong><span className="mt-1 block text-xs text-muted">Not supplied when this prototype was built. Add the original wireframe images to <code>public/artefacts/</code> and list them in <code>ARTEFACTS</code> in this file.</span></figcaption></figure>
          </div>
        </Section>

        <Section id="report" n="D" title="Implementation report">
          <div className="space-y-10">
            <div><h3 className="text-2xl">Objective</h3><p className="mt-2 max-w-3xl leading-relaxed">To turn the team's CONEXUs concept into a working prototype that addresses the final problem statement: <em>college students need a simple and unified way to manage their academic responsibilities and stay connected with campus information, because fragmented platforms, poor time management, fast-paced lectures, delayed doubt resolution and scattered communication make it difficult to learn, plan and participate effectively.</em></p></div>

            <div><h3 className="mb-3 text-2xl">Implemented features</h3>
              <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><tbody>{FEATURES.map(([f, s, d]) => <tr key={f} className="border-t border-ink/5 align-top first:border-0"><td className="p-3 font-semibold">{f}</td><td className="p-3"><StatusPill s={s} /></td><td className="p-3 text-muted">{d}</td></tr>)}</tbody></table></div>
            </div>

            <div><h3 className="mb-3 text-2xl">Actual technology stack</h3>
              <ul className="grid gap-2 text-sm sm:grid-cols-2">{['React 19 with TypeScript', 'Vite 8 build tooling', 'Tailwind CSS 4 with custom design tokens', 'React Router 7 (client-side routing)', 'lucide-react line icons', 'Browser APIs: localStorage, Web Crypto (PBKDF2), Web Speech (recognition & synthesis), optional Translator API', 'Vitest + jsdom for automated tests', 'No back end, database or third-party AI service'].map((s) => <li key={s} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" />{s}</li>)}</ul>
            </div>

            <div><h3 className="mb-3 text-2xl">Core user flows</h3>
              <div className="card overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><tbody>{FLOWS.map(([n, t, h]) => <tr key={n} className="border-t border-ink/5 first:border-0"><td className="w-10 p-3 font-display text-2xl text-gold">{n}</td><td className="p-3 font-semibold">{t}</td><td className="p-3 text-muted">{h}</td></tr>)}</tbody></table></div>
            </div>

            <div><h3 className="mb-3 text-2xl">Tests performed</h3>
              {tests ? (
                <div className="card p-5">
                  <p className="mb-3 text-sm"><strong>{tests.numPassedTests} of {tests.numTotalTests}</strong> automated tests passed{tests.numFailedTests ? <span className="font-bold text-clay"> · {tests.numFailedTests} failed</span> : ''}. Run with <code>npm test</code>.</p>
                  {tests.testResults.map((f) => <div key={f.name} className="mb-3"><p className="font-mono text-xs text-muted">{f.name.split('/').slice(-1)[0]}</p><ul className="mt-1 space-y-1 text-sm">{f.assertionResults.map((a) => <li key={a.title} className="flex gap-2"><span className={a.status === 'passed' ? 'text-sage' : 'text-clay'}>{a.status === 'passed' ? '✓' : '✗'}</span>{a.title}</li>)}</ul></div>)}
                </div>
              ) : <Notice kind="warn">No test report is bundled with this build. Run <code>npm run test:report</code> to generate <code>public/test-report.json</code> and rebuild.</Notice>}
              <p className="mt-3 text-sm text-muted">Automated tests cover the scheduler, attendance maths and the role-guarded data actions. Browser-only behaviour (microphone, speech, layout) must be checked manually — use the eight flows above and the responsive checks in the README.</p>
            </div>

            <div><h3 className="mb-3 text-2xl">Limitations</h3><ul className="space-y-2 text-sm leading-relaxed">{LIMITS.map((l) => <li key={l} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />{l}</li>)}</ul></div>
            <div><h3 className="mb-3 text-2xl">Future scope</h3><ul className="space-y-2 text-sm leading-relaxed">{FUTURE.map((l) => <li key={l} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{l}</li>)}</ul></div>
            <div><h3 className="mb-3 text-2xl">Final executable link</h3>{DEPLOY_URL ? <a className="font-display text-2xl underline decoration-gold underline-offset-4" href={DEPLOY_URL}>{DEPLOY_URL}</a> : <p className="text-sm"><Badge tone="clay">Pending</Badge> <span className="ml-2 text-muted">Deploy using the steps in Section A, then set <code>VITE_DEPLOY_URL</code> and rebuild.</span></p>}</div>
          </div>
        </Section>
      </main>
    </div>
  )
}
