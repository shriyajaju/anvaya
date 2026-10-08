import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import type { Confidence, SiteStatus } from '../store/types'
import { labelConfidence, visitorConfidence } from '../store/rules'

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  size = 'lg',
  type = 'button',
  iconLeft,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'lg' | 'sm'
  type?: 'button' | 'submit'
  iconLeft?: ReactNode
}) {
  const styles = {
    primary: 'bg-primary text-on-primary',
    secondary: 'bg-surface text-text-1 border border-line',
    ghost: 'bg-transparent text-text-1',
  }[variant]
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileTap={disabled || prefersReducedMotion() ? undefined : { scale: 0.98 }}
      className={`inline-flex items-center justify-center gap-2 rounded-btn font-medium uppercase tracking-[0.08em] ${
        size === 'lg' ? 'h-12 px-4 text-[11px]' : 'h-9 px-3 text-[11px]'
      } ${styles} disabled:opacity-40`}
    >
      {iconLeft}
      {children}
    </motion.button>
  )
}

export function ConfidenceChip({
  level,
  audience = 'studio',
  pulse = 0,
}: {
  level: Confidence
  audience?: 'studio' | 'visitor'
  pulse?: number
}) {
  const label = audience === 'visitor' ? visitorConfidence(level) : labelConfidence(level)
  const tone =
    level === 'high'
      ? 'bg-conf-high-bg text-conf-high'
      : level === 'medium'
        ? 'bg-conf-medium-bg text-conf-medium'
        : 'bg-conf-low-bg text-conf-low'
  const glass = audience === 'visitor' ? 'bg-white/15 text-white backdrop-blur-md border border-white/20' : tone
  return (
    <motion.span
      key={pulse}
      initial={prefersReducedMotion() ? false : { scale: pulse ? 1.06 : 1 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] ${glass}`}
    >
      {label}
    </motion.span>
  )
}

export function StatusChip({ status }: { status: SiteStatus | 'archived' | 'draft' | 'in_review' | 'published' }) {
  const map = {
    draft: 'Draft',
    in_review: 'In review',
    published: 'Published',
    archived: 'Archived',
  } as const
  const tone =
    status === 'published'
      ? 'bg-conf-high-bg text-conf-high'
      : status === 'in_review'
        ? 'bg-review-bg text-review'
        : 'bg-surface-2 text-text-2'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] ${tone}`}>
      {map[status]}
    </span>
  )
}

export function NeutralChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">
      {children}
    </span>
  )
}

export function Field({
  label,
  value,
  onChange,
  textarea,
  placeholder,
  helper,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  textarea?: boolean
  placeholder?: string
  helper?: string
  type?: 'text' | 'password'
}) {
  const className =
    'w-full bg-transparent text-[15px] leading-6 text-text-1 outline-none placeholder:text-text-3'
  return (
    <label className="block rounded-card border border-line bg-surface px-4 py-3">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">{label}</span>
      {textarea ? (
        <textarea className={`${className} min-h-20 resize-none`} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type={type} className={className} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
      {helper ? <span className="mt-1 block text-[13px] text-text-3">{helper}</span> : null}
    </label>
  )
}

export function Card({
  children,
  label,
  className = '',
}: {
  children: ReactNode
  label?: string
  className?: string
}) {
  return (
    <motion.section
      whileHover={prefersReducedMotion() ? undefined : { y: -2 }}
      className={`rounded-card border border-transparent bg-surface p-6 shadow-card hover:shadow-float dark:border-line ${className}`}
    >
      {label ? (
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">{label}</p>
      ) : null}
      {children}
    </motion.section>
  )
}

export function Notice({
  tone = 'warning',
  children,
}: {
  tone?: 'warning' | 'error' | 'info'
  children: ReactNode
}) {
  const toneClass =
    tone === 'error'
      ? 'bg-conf-low-bg text-conf-low'
      : tone === 'info'
        ? 'bg-review-bg text-review'
        : 'bg-conf-medium-bg text-conf-medium'
  return <div className={`rounded-card px-4 py-3 text-[13px] leading-5 ${toneClass}`}>{children}</div>
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (id: T) => void
}) {
  return (
    <div className="flex rounded-full bg-surface-2 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className="relative flex-1 rounded-full px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em]"
        >
          {value === option.id ? (
            <motion.span
              layoutId={`segment-${options.map((item) => item.id).join('-')}`}
              className="absolute inset-0 rounded-full bg-surface shadow-card"
              transition={spring}
            />
          ) : null}
          <span className="relative z-10 text-text-1">{option.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button type="button" className="flex items-center justify-between gap-4 py-2" onClick={() => onChange(!on)} aria-pressed={on}>
      <span className="text-[15px] text-text-1">{label}</span>
      <span className={`relative h-6 w-11 rounded-full ${on ? 'bg-primary' : 'bg-surface-2'}`}>
        <motion.span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-card"
          animate={{ x: on ? 22 : 2 }}
          transition={spring}
        />
      </span>
    </button>
  )
}

export function Modal({
  open,
  title,
  step,
  progress,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  step?: string
  progress?: number
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="absolute inset-0 bg-black/40" aria-label="Close dialog" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={prefersReducedMotion() ? false : { scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="relative z-10 w-full max-w-xl rounded-card bg-surface p-6 shadow-float"
          >
            {step ? <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">{step}</p> : null}
            <h2 className="mt-2 text-2xl font-medium text-text-1">{title}</h2>
            {progress !== undefined ? (
              <div className="mt-4 h-0.5 rounded-full bg-surface-2">
                <motion.div className="h-0.5 rounded-full bg-primary" animate={{ width: `${progress}%` }} />
              </div>
            ) : null}
            <div className="mt-5">{children}</div>
            {footer ? <div className="mt-6 flex items-center justify-between">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-[13px] text-on-primary shadow-float"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">{children}</p>
}

export function Row({
  title,
  meta,
  trailing,
  onClick,
}: {
  title: string
  meta?: string
  trailing?: ReactNode
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className="flex w-full items-center gap-3 border-b border-line py-3 text-left last:border-0">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-text-1">{title}</span>
        {meta ? <span className="block text-[13px] text-text-2">{meta}</span> : null}
      </span>
      {trailing}
    </Tag>
  )
}
