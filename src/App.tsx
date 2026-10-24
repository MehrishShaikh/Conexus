import { Suspense, lazy } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell, RequireAuth } from './components/AppShell'
import { ToastProvider, Skeleton } from './components/ui'
import { Wordmark } from './components/Wordmark'
import { homeFor } from './lib/auth'
import { useCurrentUser } from './lib/store'
import Landing from './pages/Landing'
import { Login, Signup } from './pages/Auth'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const StudyPlanner = lazy(() => import('./pages/StudyPlanner'))
const Doubts = lazy(() => import('./pages/Doubts'))
const Attendance = lazy(() => import('./pages/Attendance'))
const LectureTranslator = lazy(() => import('./pages/LectureTranslator'))
const LostFound = lazy(() => import('./pages/LostFound'))
const CalendarPage = lazy(() => import('./pages/Calendar'))
const Productivity = lazy(() => import('./pages/Productivity'))
const Settings = lazy(() => import('./pages/Settings'))
const Phase3 = lazy(() => import('./pages/Phase3'))
const FacultyConsole = lazy(() => import('./pages/Staff').then((m) => ({ default: m.FacultyConsole })))
const AdminConsole = lazy(() => import('./pages/Staff').then((m) => ({ default: m.AdminConsole })))

function Fallback() {
  return <div className="space-y-4" aria-busy="true" aria-label="Loading"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-6 w-1/2" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div></div>
}

function NotFound() {
  const user = useCurrentUser()
  return (
    <div className="grid min-h-screen place-items-center bg-ivory px-6 text-center">
      <div><div className="mb-6 flex justify-center"><Wordmark /></div><p className="eyebrow">Error 404</p><h1 className="mt-2 text-6xl">This page doesn't exist</h1><p className="mx-auto mt-3 max-w-md text-muted">The link may be broken or the page may have moved.</p><Link to={user ? homeFor(user.role) : '/'} className="btn btn-primary mt-7">{user ? 'Back to my workspace' : 'Back to the home page'}</Link></div>
    </div>
  )
}

/** Students only: the six feature modules and personal tools. */
const S = ['student'] as const

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Suspense fallback={<div className="mx-auto max-w-5xl p-10"><Fallback /></div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/phase-3" element={<Phase3 />} />
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<RequireAuth roles={[...S]}><Dashboard /></RequireAuth>} />
              <Route path="/study-planner" element={<RequireAuth roles={[...S]}><StudyPlanner /></RequireAuth>} />
              <Route path="/attendance" element={<RequireAuth roles={[...S]}><Attendance /></RequireAuth>} />
              <Route path="/lecture-translator" element={<RequireAuth roles={[...S]}><LectureTranslator /></RequireAuth>} />
              <Route path="/productivity" element={<RequireAuth roles={[...S]}><Productivity /></RequireAuth>} />
              <Route path="/doubts" element={<RequireAuth><Doubts /></RequireAuth>} />
              <Route path="/lost-found" element={<RequireAuth><LostFound /></RequireAuth>} />
              <Route path="/calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="/faculty" element={<RequireAuth roles={['faculty']}><FacultyConsole /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth roles={['admin']}><AdminConsole /></RequireAuth>} />
            </Route>
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </BrowserRouter>
  )
}
