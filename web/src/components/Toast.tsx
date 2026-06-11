import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'
import { IconAlert, IconCheck, IconX } from './icons'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const toast = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const styles: Record<ToastType, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${styles[t.type]}`}
          >
            {t.type === 'success' ? (
              <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <IconX className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
