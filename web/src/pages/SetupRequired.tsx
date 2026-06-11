import { LOGO_DATA_URL } from '../lib/logo'

export default function SetupRequired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700/60 bg-slate-800/60 p-8 text-slate-200 shadow-xl">
        <div className="mb-6 flex items-center gap-4">
          <div className="rounded-xl bg-white p-2">
            <img src={LOGO_DATA_URL} alt="DICOR" className="h-10 w-auto" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Falta configurar Supabase</h1>
            <p className="text-sm text-slate-400">
              La aplicación necesita las credenciales del proyecto para conectarse.
            </p>
          </div>
        </div>

        <ol className="list-decimal space-y-4 pl-5 text-sm leading-relaxed">
          <li>
            Creá un proyecto gratuito en{' '}
            <a href="https://supabase.com" target="_blank" rel="noreferrer" className="font-medium text-emerald-400 underline">
              supabase.com
            </a>
            .
          </li>
          <li>
            En el <strong>SQL Editor</strong> ejecutá <code className="rounded bg-slate-700 px-1.5 py-0.5">supabase/migration.sql</code> y
            después <code className="rounded bg-slate-700 px-1.5 py-0.5">supabase/seed.sql</code> (están en esta carpeta del repositorio).
          </li>
          <li>
            En <strong>Authentication → Users</strong> creá tu usuario con email y contraseña.
          </li>
          <li>
            Definí las variables de entorno (en un archivo <code className="rounded bg-slate-700 px-1.5 py-0.5">.env</code> local, o en
            Vercel → Settings → Environment Variables):
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-emerald-300">
{`VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY`}
            </pre>
            Los valores están en el dashboard de Supabase → <strong>Settings → API</strong>.
          </li>
          <li>Reiniciá la app (o redesplegá en Vercel) y listo.</li>
        </ol>

        <p className="mt-6 text-xs text-slate-500">
          La guía completa paso a paso está en <code className="rounded bg-slate-700 px-1.5 py-0.5">web/README.md</code>.
        </p>
      </div>
    </div>
  )
}
