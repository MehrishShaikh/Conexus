import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import type { Result } from '../lib/store'

/* ---------------------------------- Toasts ---------------------------------- */

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  text: string
}
const ToastCtx = createContext<{ toast: (kind: ToastKind, text: string) => void }>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const toast = useCallback((kind: ToastKind, text: string) => {
    const id = Date.now() + Math.random()
    setItems((i) => [...i, { id, kind, text }])
    setTimeout(() => setItems((i) => i.filter((t) => t.id !== id)), kind === 'error' ? 6500 : 4000)
  }, [])
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite" role="status">
        {items.map((t) => (
          <div key={t.id} className="fade-up flex items-start gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3 shadow-[var(--shadow-lift)]">
            {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sage" /> : t.kind === 'error' ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-clay" /> : <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold" />}
            <p className="flex-1 text-sm leading-snug">{t.text}</p>
            <button aria-label="Dismiss message" className="text-muted hover:text-ink" onClick={() => setItems((i) => i.filter((x) => x.id !== t.id))}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const { toast } = useContext(ToastCtx)
  /** Shows a toast for a Result — success text only on genuine success. */
  const report = useCallback(
    <T,>(r: Result<T>, successText: string): r is Extract<Result<T>, { ok: true }> => {
      if (r.ok) toast('success', successText)
      else toast('error', r.error)
      return r.ok
    },
    [toast],
  )
  return { toast, report }
}

/* ---------------------------------- Layout bits ---------------------------------- */

export function PageHeader({ eyebrow, title, intro, actions }: { eyebrow?: string; title: string; intro?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-4xl leading-tight md:text-5xl">{title}</h1>
        {intro && <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Card({ children, className = '', as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <Tag className={`card p-5 md:p-6 ${className}`}>{children}</Tag>
}

export function CardTitle({ children, action, icon }: { children: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-xl">
        {icon && <span className="text-gold">{icon}</span>}
        {children}
      </h2>
      {action}
    </div>
  )
}

export function Notice({ kind = 'info', children, title }: { kind?: 'info' | 'warn' | 'demo'; children: ReactNode; title?: string }) {
  const styles =
    kind === 'warn' ? 'border-clay/40 bg-clay/5' : kind === 'demo' ? 'border-gold/50 bg-gold/10' : 'border-ink/10 bg-beige/50'
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${styles}`} role={kind === 'warn' ? 'alert' : undefined}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div className="text-charcoal/90">{children}</div>
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'gold' | 'sage' | 'clay' | 'ink' }) {
  const t = {
    neutral: 'bg-beige text-charcoal',
    gold: 'bg-gold/20 text-[#7a6330]',
    sage: 'bg-sage/20 text-[#4c5742]',
    clay: 'bg-clay/15 text-clay',
    ink: 'bg-ink text-ivory',
  }[tone]
  return <span className={`chip ${t}`}>{children}</span>
}

export function ProgressBar({ value, tone = 'gold', label }: { value: number; tone?: 'gold' | 'sage' | 'clay'; label?: string }) {
  const color = tone === 'sage' ? 'bg-sage' : tone === 'clay' ? 'bg-clay' : 'bg-gold'
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-beige" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${v}%` }} />
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-sand bg-ivory/60 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-gold">{icon}</div>}
      <h3 className="text-xl">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

/* ---------------------------------- Forms ---------------------------------- */

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-clay" role="alert">{error}</p>}
    </div>
  )
}

/** Hook that generates a stable id for label/input association. */
export function useFieldId(prefix = 'f') {
  return `${prefix}-${useId().replace(/:/g, '')}`
}

/* ---------------------------------- Modal ---------------------------------- */

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (f.length === 0) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus(), 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/55 p-0 backdrop-blur-[2px] md:items-center md:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`fade-up max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-ivory p-6 shadow-[var(--shadow-lift)] md:rounded-3xl md:p-8 ${wide ? 'md:max-w-3xl' : 'md:max-w-lg'}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-3xl">{title}</h2>
          <button aria-label="Close dialog" onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-beige hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Confirm({ open, title, text, confirmLabel = 'Delete', onConfirm, onClose }: { open: boolean; title: string; text: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted">{text}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export function Tabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-full border border-ink/10 bg-paper p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${value === o.value ? 'bg-ink text-ivory' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function useLoading(ms = 450) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms)
    return () => clearTimeout(t)
  }, [ms])
  return loading
}
