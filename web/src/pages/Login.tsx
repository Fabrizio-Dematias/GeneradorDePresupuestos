import { FormEvent, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LOGO_DATA_URL } from '../lib/logo'
import { Button, Input } from '../components/ui'
import { IconAlert } from '../components/icons'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const mensaje = await signIn(email.trim(), password)
    setLoading(false)
    if (mensaje) setError(mensaje)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-white p-3 shadow-lg">
            <img src={LOGO_DATA_URL} alt="DICOR" className="h-12 w-auto" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Sistema de Gestión</h1>
            <p className="mt-1 text-sm text-slate-400">Remitos y productos · DICOR</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 shadow-xl backdrop-blur"
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-200">
              Email
            </label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-200">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Ingresar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          DICOR Carbones y Repuestos · Córdoba, Argentina
        </p>
      </div>
    </div>
  )
}
