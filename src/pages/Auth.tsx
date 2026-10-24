import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, GraduationCap, Loader2, ShieldCheck, UserRound } from 'lucide-react'
import { Wordmark } from '../components/Wordmark'
import { Field, Notice, useFieldId } from '../components/ui'
import { EMAIL_RE, homeFor, logIn, loginDemo, signUp, validateSignUp } from '../lib/auth'
import { useCurrentUser } from '../lib/store'
import type { Role } from '../lib/types'

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="relative hidden flex-col justify-between bg-ink p-12 text-ivory lg:flex">
        <Wordmark light />
        <div>
          <p className="eyebrow mb-3">The Intelligent Campus Experience</p>
          <p className="font-display text-5xl leading-[1.1]">Everything your campus asks of you, <span className="italic text-gold">in one place.</span></p>
          <ul className="mt-8 space-y-2 text-sm text-ivory/65">
            <li>— Study plans that adapt to your exams</li>
            <li>— Attendance you can plan around</li>
            <li>— Lectures in the language you think in</li>
          </ul>
        </div>
        <p className="text-xs text-ivory/40">Prototype. Accounts and data are stored only in this browser.</p>
        <svg className="pointer-events-none absolute -right-24 -top-24 opacity-[0.07]" width="420" height="420" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 8 L56 56 M56 8 L8 56" stroke="#D3BC8A" strokeWidth="1.2" /><circle cx="32" cy="32" r="30" stroke="#D3BC8A" strokeWidth=".6" fill="none" /></svg>
      </div>
      <div className="flex flex-col justify-center px-5 py-10 sm:px-12">
        <div className="mb-8 lg:hidden"><Wordmark /></div>
        <div className="mx-auto w-full max-w-[460px]">
          <h1 className="text-4xl md:text-5xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}

function PasswordInput({ id, value, onChange, invalid, autoComplete }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input id={id} className="input pr-12" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} autoComplete={autoComplete} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
        {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  )
}

const DEMOS: { role: Role; label: string; sub: string; icon: ReactNode }[] = [
  { role: 'student', label: 'Student', sub: 'Aanya Sharma · 2nd-year B.Tech', icon: <GraduationCap className="h-5 w-5" /> },
  { role: 'faculty', label: 'Faculty', sub: 'Prof. Meera Kulkarni', icon: <UserRound className="h-5 w-5" /> },
  { role: 'admin', label: 'Administrator', sub: 'Dr. Rahul Deshmukh', icon: <ShieldCheck className="h-5 w-5" /> },
]

function DemoLogin({ from }: { from?: string }) {
  const nav = useNavigate()
  const [err, setErr] = useState('')
  const go = (role: Role) => {
    const r = loginDemo(role)
    if (!r.ok) return setErr(r.error)
    nav(from && role === 'student' ? from : homeFor(role), { replace: true })
  }
  return (
    <div className="rounded-3xl border border-gold/50 bg-gold/10 p-5">
      <p className="eyebrow mb-1">Demo mode</p>
      <p className="mb-4 text-sm text-charcoal/80">No password needed — explore with a fictional account. Data is stored only in this browser.</p>
      <div className="grid gap-2">
        {DEMOS.map((d) => (
          <button key={d.role} onClick={() => go(d.role)} className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3 text-left transition hover:border-gold hover:shadow-[var(--shadow-soft)]">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-gold">{d.icon}</span>
            <span><span className="block text-sm font-bold">Continue as {d.label}</span><span className="block text-xs text-muted">{d.sub}</span></span>
          </button>
        ))}
      </div>
      {err && <p className="mt-3 text-sm text-clay" role="alert">{err}</p>}
    </div>
  )
}

export function Login() {
  const user = useCurrentUser()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)
  const eid = useFieldId('email')
  const pid = useFieldId('pw')
  if (user) return <Navigate to={homeFor(user.role)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    const r = await logIn(email, password)
    setBusy(false)
    if (!r.ok) return setErrors({ form: r.error })
    nav(from && r.data.role === 'student' ? from : homeFor(r.data.role), { replace: true })
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your CONEXUs workspace.">
      <DemoLogin from={from} />
      <div className="my-7 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-ink/10" />or sign in with an account created in this browser<span className="h-px flex-1 bg-ink/10" /></div>
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && <Notice kind="warn">{errors.form}</Notice>}
        <Field label="Email" htmlFor={eid} error={errors.email}>
          <input id={eid} className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor={pid} error={errors.password}>
          <PasswordInput id={pid} value={password} onChange={setPassword} invalid={!!errors.password} autoComplete="current-password" />
        </Field>
        <button className="btn btn-primary w-full py-3" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">New here? <Link to="/signup" className="font-semibold text-ink underline decoration-gold underline-offset-4">Create an account</Link></p>
      <p className="mt-2 text-center text-xs text-muted">Prototype authentication: passwords are salted and hashed in your browser, but there is no server. Not for real credentials.</p>
    </AuthLayout>
  )
}

export function Signup() {
  const user = useCurrentUser()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', role: 'student' as Role, program: '', year: '1st Year', department: '', academicId: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formErr, setFormErr] = useState('')
  const [busy, setBusy] = useState(false)
  const ids = { name: useFieldId('n'), email: useFieldId('e'), pw: useFieldId('p'), cf: useFieldId('c'), prog: useFieldId('pr'), year: useFieldId('y'), dept: useFieldId('d'), aid: useFieldId('a') }
  if (user) return <Navigate to={homeFor(user.role)} replace />
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validateSignUp(f)
    setErrors(errs)
    setFormErr('')
    if (Object.keys(errs).length) return
    setBusy(true)
    const r = await signUp(f)
    setBusy(false)
    if (!r.ok) return setFormErr(r.error)
    nav(homeFor(r.data.role), { replace: true })
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join CONEXUs as a student, faculty member or administrator.">
      <DemoLogin />
      <div className="my-7 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-ink/10" />or create a local account<span className="h-px flex-1 bg-ink/10" /></div>
      <form onSubmit={submit} noValidate className="space-y-4">
        {formErr && <Notice kind="warn">{formErr}</Notice>}
        <fieldset>
          <legend className="label">I am a</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {(['student', 'faculty', 'admin'] as Role[]).map((r) => (
              <label key={r} className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-semibold capitalize transition focus-within:ring-2 focus-within:ring-gold ${f.role === r ? 'border-ink bg-ink text-ivory' : 'border-ink/15 bg-paper hover:border-gold'}`}>
                <input type="radio" name="role" className="sr-only" checked={f.role === r} onChange={() => set('role', r)} />
                {r === 'admin' ? 'Administrator' : r}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Full name" htmlFor={ids.name} error={errors.name}><input id={ids.name} className="input" autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} /></Field>
        <Field label="Email" htmlFor={ids.email} error={errors.email}><input id={ids.email} className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errors.email} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor={ids.pw} error={errors.password} hint="8+ characters, with a letter and a number."><PasswordInput id={ids.pw} value={f.password} onChange={(v) => set('password', v)} invalid={!!errors.password} autoComplete="new-password" /></Field>
          <Field label="Confirm password" htmlFor={ids.cf} error={errors.confirm}><PasswordInput id={ids.cf} value={f.confirm} onChange={(v) => set('confirm', v)} invalid={!!errors.confirm} autoComplete="new-password" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department" htmlFor={ids.dept} error={errors.department}><input id={ids.dept} className="input" placeholder="e.g. Information Technology" value={f.department} onChange={(e) => set('department', e.target.value)} aria-invalid={!!errors.department} /></Field>
          <Field label={f.role === 'student' ? 'College / roll ID' : 'Employee ID'} htmlFor={ids.aid} error={errors.academicId}><input id={ids.aid} className="input" value={f.academicId} onChange={(e) => set('academicId', e.target.value)} aria-invalid={!!errors.academicId} /></Field>
        </div>
        {f.role === 'student' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Programme" htmlFor={ids.prog} error={errors.program}><input id={ids.prog} className="input" placeholder="e.g. B.Tech IT" value={f.program} onChange={(e) => set('program', e.target.value)} aria-invalid={!!errors.program} /></Field>
            <Field label="Year" htmlFor={ids.year} error={errors.year}>
              <select id={ids.year} className="input" value={f.year} onChange={(e) => set('year', e.target.value)}>{['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'].map((y) => <option key={y}>{y}</option>)}</select>
            </Field>
          </div>
        )}
        <button className="btn btn-primary w-full py-3" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link to="/login" className="font-semibold text-ink underline decoration-gold underline-offset-4">Sign in</Link></p>
      <p className="mt-2 text-center text-xs text-muted">Roles are chosen freely in this demo so every interface can be reviewed. A real deployment would assign roles from the institution's directory.</p>
    </AuthLayout>
  )
}
