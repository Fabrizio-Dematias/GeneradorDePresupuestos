import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  forwardRef,
  useEffect,
} from 'react'
import { IconAlert, IconX } from './icons'
import { estadoStock } from '../types'

// ---------------------------------------------------------------- Button
type Variant = 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-brand-600 to-emerald-600 text-white hover:from-brand-700 hover:to-emerald-700 focus-visible:ring-brand-500 shadow-sm',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export function Button({
  variant = 'primary',
  loading,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold
        transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
        disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4 border-2" />}
      {children}
    </button>
  )
}

// ---------------------------------------------------------------- Inputs
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, className = '', ...rest },
  ref
) {
  const input = <input ref={ref} id={id} className={`input ${className}`} {...rest} />
  if (!label) return input
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {input}
    </div>
  )
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export function Select({ label, id, className = '', children, ...rest }: SelectProps) {
  const select = (
    <select id={id} className={`input ${className}`} {...rest}>
      {children}
    </select>
  )
  if (!label) return select
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {select}
    </div>
  )
}

// ---------------------------------------------------------------- Card
export function Card({
  children,
  className = '',
  title,
  actions,
}: {
  children: ReactNode
  className?: string
  title?: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------- Badge
const badgeColors = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
} as const

export function Badge({
  children,
  color = 'slate',
}: {
  children: ReactNode
  color?: keyof typeof badgeColors
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeColors[color]}`}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------- StockPill
/** "Semáforo" de stock: verde (ok), ámbar (bajo el mínimo), rojo (sin stock). */
export function StockPill({ stock, minimo }: { stock: number; minimo: number }) {
  const estado = estadoStock({ stock, stock_minimo: minimo })
  const styles = {
    sin: 'bg-red-50 text-red-700 ring-red-600/20',
    bajo: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    ok: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  }
  const dot = { sin: 'bg-red-500', bajo: 'bg-amber-500', ok: 'bg-emerald-500' }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[estado]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[estado]}`} />
      {stock}
    </span>
  )
}

export function categoriaBadgeColor(categoria: string | null): keyof typeof badgeColors {
  switch (categoria) {
    case 'CARBONES':
      return 'slate'
    case 'CAPACITORES':
      return 'blue'
    case 'INTERRUPTORES':
      return 'amber'
    case 'REPUESTOS VARIOS':
      return 'violet'
    case 'RULEMANES Y CUBETAS':
      return 'green'
    default:
      return 'slate'
  }
}

// ---------------------------------------------------------------- Spinner
export function Spinner({ className = 'h-8 w-8 border-[3px]' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-current border-t-transparent ${className}`}
      role="status"
      aria-label="Cargando"
    />
  )
}

export function LoadingState({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <Spinner />
      <p className="text-sm">{texto}</p>
    </div>
  )
}

// ---------------------------------------------------------------- EmptyState
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      {icon && <div className="mb-1 text-slate-300">{icon}</div>}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

// ---------------------------------------------------------------- PageHeader
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// ---------------------------------------------------------------- StatCard
export function StatCard({
  icon,
  label,
  value,
  tint = 'brand',
  hint,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  tint?: 'brand' | 'blue' | 'amber' | 'violet' | 'red' | 'emerald'
  hint?: ReactNode
}) {
  const tints = {
    brand: 'bg-gradient-to-br from-brand-500 to-emerald-600 text-white',
    blue: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white',
    amber: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
    violet: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
    red: 'bg-gradient-to-br from-red-500 to-rose-600 text-white',
    emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
  }
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tints[tint]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-lg font-bold text-slate-900" title={typeof value === 'string' ? value : undefined}>
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Segmented
/** Control segmentado (pestañas tipo "pill"). Reutilizable para filtros
 *  o para elegir entre opciones (ingreso/egreso/ajuste, etc.). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: ReactNode; activeClass?: string }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
  return (
    <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 sm:w-auto">
      {options.map((op) => {
        const active = op.value === value
        return (
          <button
            key={op.value}
            type="button"
            onClick={() => onChange(op.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg font-semibold transition ${pad} ${
              active
                ? op.activeClass ?? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {op.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------- Pagination
/** Barra de paginación estándar: "N resultados · página X de Y" + Anterior/Siguiente. */
export function Pagination({
  pagina,
  totalPaginas,
  totalResultados,
  onChange,
}: {
  pagina: number
  totalPaginas: number
  totalResultados: number
  onChange: (pagina: number) => void
}) {
  if (totalResultados === 0) return null
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <p className="text-xs text-slate-500">
        {totalResultados} resultados · página {pagina} de {totalPaginas}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="!px-3 !py-1.5"
          disabled={pagina <= 1}
          onClick={() => onChange(pagina - 1)}
        >
          ← Anterior
        </Button>
        <Button
          variant="secondary"
          className="!px-3 !py-1.5"
          disabled={pagina >= totalPaginas}
          onClick={() => onChange(pagina + 1)}
        >
          Siguiente →
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Modal
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:m-4 sm:rounded-2xl ${sizes[size]}`}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <IconX className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- ConfirmDialog
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Eliminar',
  confirmVariant = 'danger',
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  confirmVariant?: Variant
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const esPeligro = confirmVariant === 'danger'
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            esPeligro ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700'
          }`}
        >
          <IconAlert className="h-5 w-5" />
        </div>
        <div className="text-sm text-slate-600">{message}</div>
      </div>
    </Modal>
  )
}
