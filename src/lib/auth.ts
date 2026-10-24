// Demo authentication.
//
// IMPORTANT — this is a front-end prototype with no server. Accounts live in this browser's
// localStorage. Passwords are never stored in plain text: each is salted and hashed with
// PBKDF2-SHA-256 (Web Crypto) before it is saved. That protects against casual inspection
// but is NOT a substitute for server-side authentication. Production use needs a real
// identity provider (see docs/ARCHITECTURE.md → "Planned integrations").

import { ACCOUNTS_KEY, currentUser, fail, getState, ok, setState, type Result } from './store'
import { DEMO_IDS, emptyStudent } from './seed'
import { uid } from './dates'
import type { Role, User } from './types'

interface Account {
  userId: string
  email: string
  salt: string
  hash: string
}

const enc = new TextEncoder()
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)))

async function derive(password: string, saltHex: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('Secure hashing is unavailable. Open the app over HTTPS or on localhost.')
  const key = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex) as BufferSource, iterations: 120_000 }, key, 256)
  return toHex(bits)
}

function readAccounts(): Account[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]') as Account[]
  } catch {
    return []
  }
}

function writeAccounts(list: Account[]): boolean {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

export interface SignUpInput {
  name: string
  email: string
  password: string
  role: Role
  program: string
  year: string
  department: string
  academicId: string
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateSignUp(i: Partial<SignUpInput> & { confirm?: string }): Record<string, string> {
  const e: Record<string, string> = {}
  if (!i.name || i.name.trim().length < 2) e.name = 'Enter your full name.'
  if (!i.email || !EMAIL_RE.test(i.email.trim())) e.email = 'Enter a valid email address.'
  if (!i.password || i.password.length < 8) e.password = 'Use at least 8 characters.'
  else if (!/[A-Za-z]/.test(i.password) || !/\d/.test(i.password)) e.password = 'Include at least one letter and one number.'
  if (i.confirm !== undefined && i.confirm !== i.password) e.confirm = 'Passwords do not match.'
  if (!i.role) e.role = 'Choose a role.'
  if (!i.department?.trim()) e.department = 'Enter your department.'
  if (i.role === 'student') {
    if (!i.program?.trim()) e.program = 'Enter your programme.'
    if (!i.year?.trim()) e.year = 'Select your year.'
  }
  if (!i.academicId?.trim()) e.academicId = 'Enter your college ID (any value works in demo mode).'
  return e
}

export async function signUp(input: SignUpInput): Promise<Result<User>> {
  const errors = validateSignUp(input)
  if (Object.keys(errors).length) return fail(Object.values(errors)[0])
  const email = input.email.trim().toLowerCase()
  if (getState().users.some((u) => u.email.toLowerCase() === email)) return fail('An account with this email already exists in this browser.')
  try {
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
    const hash = await derive(input.password, salt)
    const user: User = {
      id: uid('u'),
      name: input.name.trim(),
      email,
      role: input.role,
      program: input.role === 'student' ? input.program.trim() : input.role === 'faculty' ? 'Faculty' : 'Administration',
      year: input.role === 'student' ? input.year : '—',
      department: input.department.trim(),
      academicId: input.academicId.trim(),
      demo: false,
    }
    const accounts = readAccounts()
    accounts.push({ userId: user.id, email, salt, hash })
    if (!writeAccounts(accounts)) return fail('Could not save your account: browser storage is unavailable.')
    setState((s) => ({
      ...s,
      users: [...s.users, user],
      students: user.role === 'student' ? { ...s.students, [user.id]: emptyStudent() } : s.students,
      sessionUserId: user.id,
      usage: { logins: { ...s.usage.logins, [user.id]: 1 }, lastLoginAt: { ...s.usage.lastLoginAt, [user.id]: new Date().toISOString() } },
    }))
    return ok(user)
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Sign-up failed.')
  }
}

export async function logIn(emailIn: string, password: string): Promise<Result<User>> {
  const email = emailIn.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return fail('Enter a valid email address.')
  if (!password) return fail('Enter your password.')
  const acc = readAccounts().find((a) => a.email === email)
  const generic = 'Incorrect email or password.'
  if (!acc) return fail(generic)
  try {
    const hash = await derive(password, acc.salt)
    if (hash !== acc.hash) return fail(generic)
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Login failed.')
  }
  const user = getState().users.find((u) => u.id === acc.userId)
  if (!user) return fail('This account no longer exists. Sign up again.')
  recordLogin(user.id)
  return ok(user)
}

/** Demo mode: sign in as one of the seeded fictional accounts. No password involved. */
export function loginDemo(role: Role): Result<User> {
  const id = DEMO_IDS[role]
  const user = getState().users.find((u) => u.id === id)
  if (!user) return fail('Demo account missing. Use "Reset demo data" in Settings.')
  recordLogin(user.id)
  return ok(user)
}

function recordLogin(userId: string) {
  setState((s) => ({
    ...s,
    sessionUserId: userId,
    usage: {
      logins: { ...s.usage.logins, [userId]: (s.usage.logins[userId] ?? 0) + 1 },
      lastLoginAt: { ...s.usage.lastLoginAt, [userId]: new Date().toISOString() },
    },
  }))
}

export function logOut() {
  setState((s) => ({ ...s, sessionUserId: null }))
}

export function homeFor(role: Role): string {
  return role === 'student' ? '/dashboard' : role === 'faculty' ? '/faculty' : '/admin'
}

export function requireRole(roles: Role[]): Result<User> {
  const u = currentUser()
  if (!u) return fail('Please sign in first.')
  if (!roles.includes(u.role)) return fail('Your role is not permitted to do this.')
  return ok(u)
}
