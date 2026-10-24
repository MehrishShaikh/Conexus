// A tiny persistent store (localStorage) so the prototype keeps data across refreshes
// without any backend. All mutations live in actions.ts and return a Result so the UI
// can show genuine success/failure messages.

import { useSyncExternalStore } from 'react'
import { buildInitialState, STATE_VERSION } from './seed'
import type { AppState, StudentData, User } from './types'

export const STATE_KEY = 'conexus.state.v1'
export const ACCOUNTS_KEY = 'conexus.accounts.v1'

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }
export const ok = <T = undefined>(data?: T): Result<T> => ({ ok: true, data: data as T })
export const fail = <T = undefined>(error: string): Result<T> => ({ ok: false, error })

let persistError: string | null = null
const listeners = new Set<() => void>()

function load(): AppState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STATE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && parsed.version === STATE_VERSION) return parsed
    }
  } catch {
    /* fall through to a fresh state */
  }
  return buildInitialState()
}

let state: AppState = load()

function persist() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
    persistError = null
  } catch (e) {
    persistError =
      e instanceof DOMException && e.name === 'QuotaExceededError'
        ? 'Browser storage is full — recent changes will be lost on refresh. Remove large images or reset demo data.'
        : 'Browser storage is unavailable (private mode or blocked) — changes will not survive a refresh.'
  }
}

export function getState(): AppState {
  return state
}

export function getPersistError(): string | null {
  return persistError
}

export function setState(fn: (s: AppState) => AppState): void {
  state = fn(state)
  persist()
  listeners.forEach((l) => l())
}

export function replaceState(next: AppState): void {
  setState(() => next)
}

export function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state))
}

export function useCurrentUser(): User | null {
  return useStore((s) => (s.sessionUserId ? s.users.find((u) => u.id === s.sessionUserId) ?? null : null))
}

export function useStudent(): StudentData | null {
  return useStore((s) => (s.sessionUserId ? s.students[s.sessionUserId] ?? null : null))
}

export function usePersistError(): string | null {
  return useSyncExternalStore(subscribe, () => persistError, () => persistError)
}

export function resetDemoData(keepSession = true): void {
  const fresh = buildInitialState()
  setState((s) => ({ ...fresh, sessionUserId: keepSession ? s.sessionUserId : null }))
}

export function currentUser(): User | null {
  return state.sessionUserId ? state.users.find((u) => u.id === state.sessionUserId) ?? null : null
}
