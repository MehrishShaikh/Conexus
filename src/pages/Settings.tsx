import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, RotateCcw, UserRound } from 'lucide-react'
import { Card, CardTitle, Confirm, Field, Notice, PageHeader, useFieldId, useToast } from '../components/ui'
import { clearMyStudyData, loadSampleData, updatePrefs, updateProfile } from '../lib/actions'
import { logOut } from '../lib/auth'
import { resetDemoData, useCurrentUser, useStore } from '../lib/store'
import type { Prefs } from '../lib/types'

const LANGS = [['en', 'English'], ['hi', 'Hindi'], ['mr', 'Marathi'], ['es', 'Spanish'], ['fr', 'French']]

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-ink/8 bg-ivory/70 px-4 py-3 focus-within:ring-2 focus-within:ring-gold">
      <span><span className="block text-sm font-bold">{label}</span>{desc && <span className="block text-xs text-muted">{desc}</span>}</span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="absolute inset-0 rounded-full bg-sand transition peer-checked:bg-gold" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-paper shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

export default function Settings() {
  const user = useCurrentUser()!
  const prefs = useStore((s) => (user.role === 'student' ? s.students[user.id]?.prefs : s.facultyPrefs[user.id])) as Partial<Prefs> | undefined
  const { report } = useToast()
  const nav = useNavigate()
  const [p, setP] = useState({ name: user.name, program: user.program, year: user.year, department: user.department })
  const [err, setErr] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const ids = { n: useFieldId('n'), pr: useFieldId('pr'), y: useFieldId('y'), d: useFieldId('d'), lang: useFieldId('lang'), lead: useFieldId('lead') }
  const on = (k: keyof Prefs) => prefs?.[k] !== false
  const set = (patch: Partial<Prefs>, msg = 'Preference saved.') => report(updatePrefs(patch), msg)

  return (
    <div>
      <PageHeader eyebrow="Account" title="Profile & preferences" intro="Changes are saved in this browser and kept across refreshes." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle icon={<UserRound className="h-5 w-5" />}>Profile</CardTitle>
          <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); const r = updateProfile(p); if (!r.ok) return setErr(r.error); setErr(''); report(r, 'Profile updated.') }}>
            {err && <p className="text-sm text-clay" role="alert">{err}</p>}
            <Field label="Full name" htmlFor={ids.n}><input id={ids.n} className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
            <Field label="Email"><p className="input !bg-beige/50 text-muted">{user.email}</p></Field>
            {user.role === 'student' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Programme" htmlFor={ids.pr}><input id={ids.pr} className="input" value={p.program} onChange={(e) => setP({ ...p, program: e.target.value })} /></Field>
                <Field label="Year" htmlFor={ids.y}><select id={ids.y} className="input" value={p.year} onChange={(e) => setP({ ...p, year: e.target.value })}>{['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'].map((y) => <option key={y}>{y}</option>)}</select></Field>
              </div>
            )}
            <Field label="Department" htmlFor={ids.d}><input id={ids.d} className="input" value={p.department} onChange={(e) => setP({ ...p, department: e.target.value })} /></Field>
            <div className="flex items-center justify-between"><p className="text-xs text-muted">Role: <strong className="capitalize">{user.role}</strong> · ID {user.academicId}</p><button className="btn btn-primary">Save profile</button></div>
          </form>
        </Card>

        <Card>
          <CardTitle icon={<Bell className="h-5 w-5" />}>Notifications</CardTitle>
          <div className="space-y-2.5">
            <Toggle label="Announcements" desc="Faculty and official notices" checked={on('notifyAnnouncements')} onChange={(v) => set({ notifyAnnouncements: v })} />
            <Toggle label="Campus events" desc="New and upcoming college events" checked={on('notifyEvents')} onChange={(v) => set({ notifyEvents: v })} />
            <Toggle label="Lost & found" desc="New reports on campus" checked={on('notifyLostFound')} onChange={(v) => set({ notifyLostFound: v })} />
            {user.role === 'student' && (
              <>
                <Toggle label="Deadlines & exams" desc="Assignments, exams and today's study sessions" checked={on('notifyDeadlines')} onChange={(v) => set({ notifyDeadlines: v })} />
                <Toggle label="Attendance warnings" desc="Shortage and close-to-limit alerts" checked={on('notifyAttendance')} onChange={(v) => set({ notifyAttendance: v })} />
                <Toggle label="Mood-based study tips" desc="Show the optional mood suggestion in Productivity" checked={on('moodSuggestions')} onChange={(v) => set({ moodSuggestions: v })} />
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">These switches control what appears in the in-app notification bell and dashboard alerts. Browser push or email notifications are not implemented in this prototype.</p>
        </Card>

        {user.role === 'student' && (
          <Card>
            <CardTitle>Study & attendance</CardTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum attendance (%)" htmlFor={ids.lead} hint="Configurable demo value."><input id={ids.lead} type="number" min={1} max={100} className="input" value={prefs?.attendanceMinPct ?? 75} onChange={(e) => { const v = Number(e.target.value); if (v >= 1 && v <= 100) set({ attendanceMinPct: v }, `Minimum attendance set to ${v}%.`) }} /></Field>
              <Field label="Default subtitle language" htmlFor={ids.lang}><select id={ids.lang} className="input" value={prefs?.defaultLanguage ?? 'hi'} onChange={(e) => set({ defaultLanguage: e.target.value }, 'Default language saved.')}>{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></Field>
            </div>
          </Card>
        )}

        <Card className={user.role === 'student' ? '' : 'lg:col-span-2'}>
          <CardTitle icon={<RotateCcw className="h-5 w-5" />}>Demo data</CardTitle>
          <Notice>All data lives only in this browser's local storage. Resetting restores the original fictional demo data and signs nobody out.</Notice>
          <div className="mt-4 flex flex-wrap gap-2">
            {user.role === 'student' && <button className="btn btn-ghost btn-sm" onClick={() => report(loadSampleData(), 'Sample data loaded into your workspace.')}>Load sample study data</button>}
            {user.role === 'student' && <button className="btn btn-ghost btn-sm" onClick={() => setClearOpen(true)}>Clear my study data</button>}
            <button className="btn btn-danger btn-sm" onClick={() => setResetOpen(true)}>Reset all demo data</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { logOut(); nav('/') }}>Sign out</button>
          </div>
        </Card>
      </div>
      <Confirm open={resetOpen} title="Reset all demo data?" text="Every change made in this browser — doubts, reports, events, plans — will be replaced by the original demo data. Accounts you created remain." confirmLabel="Reset" onClose={() => setResetOpen(false)} onConfirm={() => { resetDemoData(true); report({ ok: true, data: undefined }, 'Demo data reset.') }} />
      <Confirm open={clearOpen} title="Clear your study data?" text="Subjects, study sessions and attendance records will be deleted from your workspace." confirmLabel="Clear" onClose={() => setClearOpen(false)} onConfirm={() => report(clearMyStudyData(), 'Your study data was cleared.')} />
    </div>
  )
}
