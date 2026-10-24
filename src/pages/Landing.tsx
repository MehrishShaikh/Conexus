import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, ClipboardCheck, Compass, GraduationCap, Languages, Menu, MessagesSquare,
  PackageSearch, Quote, ShieldCheck, Sparkles, Users, X,
} from 'lucide-react'
import { Wordmark } from '../components/Wordmark'
import { useCurrentUser } from '../lib/store'
import { homeFor } from '../lib/auth'

const FEATURES = [
  { icon: BookOpenCheck, title: 'AI Study Planner', to: '/study-planner', text: 'Turns subjects, exam dates and your free hours into a daily and weekly plan that prioritises weak and urgent subjects.' },
  { icon: MessagesSquare, title: 'AI Doubt Sharing', to: '/doubts', text: 'Ask by subject, add a photo of your working, and get answers from peers, faculty and an assistant — in one thread.' },
  { icon: ClipboardCheck, title: 'Smart Attendance Planner', to: '/attendance', text: 'Live percentages, shortage warnings, leave planning and projections — before a shortfall becomes a problem.' },
  { icon: Languages, title: 'Multilingual Lecture Translator', to: '/lecture-translator', text: 'Live speech-to-text with translated subtitles, voice playback and downloadable transcripts.' },
  { icon: PackageSearch, title: 'Lost & Found Community', to: '/lost-found', text: 'Report, browse and claim items with location tagging — while contact details stay private.' },
  { icon: CalendarDays, title: 'Timetable & College Events', to: '/calendar', text: 'Classes, deadlines, exams, club activities and campus events in a single daily, weekly and monthly view.' },
]

const STATS = [
  { v: '52.1%', t: 'struggle with study planning' },
  { v: '52.1%', t: 'find attendance hard to manage' },
  { v: '57.5%', t: 'say fast teaching pace blocks understanding' },
  { v: '62.1%', t: 'are dissatisfied with doubt-resolution time' },
  { v: '66.7%', t: 'depend on WhatsApp for college updates' },
]

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[1000px]" aria-label="Illustrative preview of the CONEXUs student dashboard">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-b from-gold/20 to-transparent blur-2xl" aria-hidden="true" />
      <div className="overflow-hidden rounded-[1.75rem] border border-ink/15 bg-ivory shadow-[var(--shadow-lift)]">
        <div className="flex items-center gap-2 border-b border-ink/10 bg-beige/60 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink/20" /><span className="h-2.5 w-2.5 rounded-full bg-ink/20" /><span className="h-2.5 w-2.5 rounded-full bg-ink/20" />
          <span className="mx-auto rounded-full bg-paper px-4 py-0.5 text-[11px] text-muted">conexus · dashboard</span>
        </div>
        <div className="grid md:grid-cols-[170px_1fr]">
          <div className="hidden flex-col gap-1.5 bg-ink p-4 md:flex">
            <div className="mb-3 font-display text-lg tracking-wider text-ivory">CONE<span className="text-gold">X</span>US</div>
            {['Dashboard', 'Study Planner', 'Doubts', 'Attendance', 'Translator', 'Lost & Found', 'Calendar'].map((l, i) => (
              <div key={l} className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold ${i === 0 ? 'bg-gold text-ink' : 'text-ivory/65'}`}>{l}</div>
            ))}
          </div>
          <div className="p-5 text-left">
            <p className="eyebrow">Good morning</p>
            <p className="font-display text-3xl">Aanya, here is your day.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="card p-4">
                <p className="text-[11px] font-semibold text-muted">Attendance</p>
                <p className="font-display text-3xl">78.6%</p>
                <div className="mt-2 h-1.5 rounded-full bg-beige"><div className="h-full w-[79%] rounded-full bg-sage" /></div>
                <p className="mt-2 text-[11px] text-muted">2 subjects need attention</p>
              </div>
              <div className="card p-4">
                <p className="text-[11px] font-semibold text-muted">Study plan</p>
                <p className="font-display text-3xl">11%</p>
                <div className="mt-2 h-1.5 rounded-full bg-beige"><div className="h-full w-[11%] rounded-full bg-gold" /></div>
                <p className="mt-2 text-[11px] text-muted">DS exam in 16 days</p>
              </div>
              <div className="card p-4">
                <p className="text-[11px] font-semibold text-muted">Next up</p>
                <p className="font-display text-xl leading-tight">ER-diagram assignment</p>
                <p className="mt-2 text-[11px] text-muted">Due in 3 days · DB202</p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
              <div className="card p-4">
                <p className="mb-2 text-[11px] font-semibold text-muted">Today's timetable</p>
                {[['09:00', 'Data Structures', 'A-301'], ['10:00', 'Database Management', 'A-302'], ['11:15', 'Computer Networks', 'A-301']].map(([t, s, r]) => (
                  <div key={t} className="flex items-center gap-3 border-t border-ink/5 py-1.5 text-xs first:border-0">
                    <span className="w-11 font-semibold text-gold">{t}</span><span className="flex-1 font-semibold">{s}</span><span className="text-muted">{r}</span>
                  </div>
                ))}
              </div>
              <div className="card p-4">
                <p className="mb-2 text-[11px] font-semibold text-muted">Announcements</p>
                <p className="text-xs font-semibold">Mid-semester feedback is open</p>
                <p className="mt-1 text-[11px] text-muted">Official notice · Administration</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Illustrative preview — the live dashboard is available in demo mode.</p>
    </div>
  )
}

export default function Landing() {
  const user = useCurrentUser()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const explore = () => nav(user ? homeFor(user.role) : '/dashboard')
  const links = [
    ['#features', 'Features'],
    ['#problem', 'The problem'],
    ['#how', 'How it works'],
    ['#benefits', 'Who benefits'],
  ]
  return (
    <div className="bg-ivory">
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-ivory/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4">
          <Wordmark />
          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
            {links.map(([h, l]) => <a key={h} href={h} className="text-sm font-semibold text-muted transition hover:text-ink">{l}</a>)}
            <Link to="/phase-3" className="text-sm font-semibold text-muted transition hover:text-ink">Phase 3</Link>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? <Link to={homeFor(user.role)} className="btn btn-primary btn-sm">Open my workspace</Link> : <><Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link><Link to="/signup" className="btn btn-primary btn-sm">Create account</Link></>}
          </div>
          <button className="rounded-full border border-ink/10 p-2.5 md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
        {open && (
          <div className="fade-up border-t border-ink/10 bg-ivory px-5 pb-5 md:hidden">
            {links.map(([h, l]) => <a key={h} href={h} onClick={() => setOpen(false)} className="block border-b border-ink/5 py-3 text-sm font-semibold">{l}</a>)}
            <Link to="/phase-3" className="block border-b border-ink/5 py-3 text-sm font-semibold">Phase 3 report</Link>
            <div className="mt-4 flex gap-2"><Link to="/login" className="btn btn-ghost flex-1">Sign in</Link><Link to="/signup" className="btn btn-primary flex-1">Create account</Link></div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pb-20 pt-16 text-center md:pt-24">
        <div className="mx-auto max-w-[900px]">
          <p className="eyebrow fade-up">The Intelligent Campus Experience</p>
          <h1 className="fade-up mt-5 text-[2.9rem] leading-[1.05] sm:text-6xl md:text-[5.2rem]">
            Your Campus. Your World. <span className="italic text-gold">Connected.</span>
          </h1>
          <p className="fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            CONEXUs brings study planning, attendance, doubt resolution, multilingual lectures, lost &amp; found and campus events into one calm, student-friendly workspace — so nothing important slips between five different apps.
          </p>
          <div className="fade-up mt-9 flex flex-wrap items-center justify-center gap-3">
            <button className="btn btn-primary px-7 py-3.5" onClick={explore}>Explore Your Dashboard <ArrowRight className="h-4 w-4" /></button>
            <a href="#features" className="btn btn-ghost px-7 py-3.5"><Compass className="h-4 w-4" />Discover CONEXUs</a>
          </div>
          <p className="mt-4 text-xs text-muted">Prototype · runs entirely in your browser with demonstration data.</p>
        </div>
        <div className="mx-auto mt-16 max-w-[1000px]"><DashboardPreview /></div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 bg-paper px-5 py-24">
        <div className="mx-auto max-w-[1180px]">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="eyebrow">Six core features</p>
            <h2 className="mt-3 text-4xl md:text-5xl">One platform, six everyday problems solved</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Link key={f.title} to={f.to} className="card card-hover group flex flex-col p-7">
                <div className="mb-5 flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-gold/50 bg-gold/10 text-gold transition group-hover:bg-gold group-hover:text-ink"><f.icon className="h-6 w-6" strokeWidth={1.5} /></span>
                  <span className="font-display text-2xl text-sand">0{i + 1}</span>
                </div>
                <h3 className="text-2xl">{f.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{f.text}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink group-hover:text-gold">Try it <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="scroll-mt-20 bg-ink px-5 py-24 text-ivory">
        <div className="mx-auto grid max-w-[1180px] gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow">The problem we found</p>
            <h2 className="mt-3 text-4xl leading-tight md:text-5xl">Students don't have a time-management problem. They have a fragmentation problem.</h2>
            <p className="mt-6 text-base leading-relaxed text-ivory/70">
              Our research found students running academics and campus life across five or more disconnected platforms — then reacting once a deadline, shortage or announcement becomes urgent. Missed deadlines and low attendance are symptoms; the root cause is that nothing connects them.
            </p>
            <div className="mt-8 rounded-3xl border border-gold/40 bg-ivory/5 p-6">
              <p className="eyebrow mb-2">Problem statement</p>
              <p className="font-display text-xl leading-relaxed text-ivory">
                College students need a simple and unified way to manage their academic responsibilities and stay connected with campus information because fragmented platforms, poor time management, fast-paced lectures, delayed doubt resolution and scattered communication make it difficult to learn, plan and participate effectively.
              </p>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((s, i) => (
                <div key={s.t} className={`rounded-3xl border border-ivory/10 bg-ivory/5 p-5 ${i === 4 ? 'col-span-2' : ''}`}>
                  <p className="font-display text-4xl text-gold-hi">{s.v}</p>
                  <p className="mt-1 text-sm text-ivory/70">{s.t}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ivory/50">Source: CONEXUs student survey, 48 responses across all academic years (TII Session 6).</p>
            <figure className="mt-6 rounded-3xl bg-gold p-6 text-ink">
              <Quote className="h-6 w-6" />
              <blockquote className="mt-2 font-display text-xl leading-snug">“I just want everything to be in one place so I can focus on studying and not worry about missing important things.”</blockquote>
              <figcaption className="mt-3 text-sm font-semibold">Aanya Sharma — our primary persona, 2nd-year B.Tech student</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 px-5 py-24">
        <div className="mx-auto max-w-[1180px]">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-4xl md:text-5xl">Plan. Learn. Connect.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { n: 'I', t: 'Plan', icon: Sparkles, d: 'Add subjects and exam dates. CONEXUs builds your study schedule, tracks attendance and puts every class, deadline and event on one calendar.' },
              { n: 'II', t: 'Learn', icon: Languages, d: 'Follow lectures with live translated subtitles, get doubts resolved by peers, faculty or an assistant, and revise what matters most.' },
              { n: 'III', t: 'Connect', icon: Users, d: 'Stay in step with announcements, campus events and the lost-and-found community — all in the same place you study.' },
            ].map((s) => (
              <div key={s.t} className="relative rounded-[2rem] border border-ink/10 bg-paper p-8">
                <span className="font-display text-6xl text-beige">{s.n}</span>
                <s.icon className="mt-4 h-7 w-7 text-gold" strokeWidth={1.5} />
                <h3 className="mt-3 text-3xl">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="scroll-mt-20 bg-beige/60 px-5 py-24">
        <div className="mx-auto max-w-[1180px]">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="eyebrow">Built for the whole campus</p>
            <h2 className="mt-3 text-4xl md:text-5xl">Benefits for every stakeholder</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: GraduationCap, t: 'Students', pts: ['One place for plans, attendance, doubts and events', 'Warnings before an attendance shortfall', 'Lectures that are easier to follow'] },
              { icon: Users, t: 'Faculty', pts: ['Publish announcements and assignments once', 'Answer doubts in organised subject threads', 'Manage the class timetable'] },
              { icon: ShieldCheck, t: 'Administration', pts: ['Issue official notices that stand apart', 'Manage campus events centrally', 'See platform usage at a glance'] },
            ].map((b) => (
              <div key={b.t} className="rounded-[2rem] border border-ink/10 bg-paper p-8">
                <b.icon className="h-7 w-7 text-gold" strokeWidth={1.5} />
                <h3 className="mt-4 text-3xl">{b.t}</h3>
                <ul className="mt-4 space-y-2.5">
                  {b.pts.map((p) => <li key={p} className="flex gap-2.5 text-sm text-charcoal"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" />{p}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <button className="btn btn-primary px-8 py-3.5" onClick={explore}>Explore Your Dashboard <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      <footer className="bg-ink px-5 py-14 text-ivory">
        <div className="mx-auto grid max-w-[1180px] gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Wordmark light />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory/60">An AI-powered smart campus platform — a student innovation project from the “Transforming Ideas to Innovation” course.</p>
          </div>
          <div>
            <p className="eyebrow mb-3">Explore</p>
            <ul className="space-y-2 text-sm text-ivory/70">
              {FEATURES.slice(0, 3).map((f) => <li key={f.to}><Link className="hover:text-gold-hi" to={f.to}>{f.title}</Link></li>)}
              <li><Link className="hover:text-gold-hi" to="/phase-3">Phase 3 — Prototype Implementation</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-3">Prototype notice</p>
            <p className="text-sm leading-relaxed text-ivory/60">All people, courses and data shown are fictional demonstration data stored in your browser. No real institutional systems are connected.</p>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-[1180px] border-t border-ivory/10 pt-6 text-xs text-ivory/40">© {new Date().getFullYear()} CONEXUs — student project prototype.</p>
      </footer>
    </div>
  )
}
