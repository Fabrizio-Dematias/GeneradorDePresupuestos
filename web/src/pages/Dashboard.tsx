import { ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha, MESES } from '../lib/format'
import { descargarBackup } from '../lib/backup'
import { Badge, Button, Card, EmptyState, LoadingState, PageHeader, StatCard, StockPill } from '../components/ui'
import {
  IconAlert,
  IconArchiveBox,
  IconBanknotes,
  IconClock,
  IconCube,
  IconDocumentList,
  IconDocumentPlus,
  IconDownload,
} from '../components/icons'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import type { Remito } from '../types'

interface Stats {
  remitos: number
  facturacion: number
  productos: number
  cambiosPrecio: number
}

interface PuntoMensual {
  etiqueta: string
  total: number
}

interface FilaMensual {
  anio: number
  mes: number
  cantidad: number
  total: number
}

interface FilaReposicion {
  codigo: string | null
  descripcion: string
  stock: number
  stock_minimo: number
}

function saludoSegunHora(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buen día'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Tarjeta de acceso rápido a las secciones más usadas. */
function AccesoRapido({
  to,
  icon,
  label,
  desc,
}: {
  to: string
  icon: ReactNode
  label: string
  desc: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-emerald-600 text-white shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-brand-700">
          {label}
        </p>
        <p className="truncate text-xs text-slate-500">{desc}</p>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { toast } = useToast()
  const { username } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [descargandoBackup, setDescargandoBackup] = useState(false)
  const [ultimos, setUltimos] = useState<Remito[]>([])
  const [serieMensual, setSerieMensual] = useState<PuntoMensual[]>([])
  const [reposicion, setReposicion] = useState<FilaReposicion[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      try {
        // La facturación viene ya agregada por mes desde el servidor
        // (excluye anulados); no se descargan todos los remitos.
        const [mensualRes, productosRes, historialRes, ultimosRes, reposicionRes] =
          await Promise.all([
            supabase.rpc('facturacion_mensual'),
            supabase.from('productos').select('id', { count: 'exact', head: true }),
            supabase.from('historial_precios').select('id', { count: 'exact', head: true }),
            supabase
              .from('remitos')
              .select('*')
              .order('fecha', { ascending: false })
              .order('id', { ascending: false })
              .limit(5),
            supabase.rpc('productos_reposicion'),
          ])

        const errores = [mensualRes.error, productosRes.error, historialRes.error, ultimosRes.error]
          .filter(Boolean)
        if (errores.length) throw errores[0]

        const mensual = (mensualRes.data as FilaMensual[]) ?? []
        setStats({
          remitos: mensual.reduce((acc, f) => acc + Number(f.cantidad), 0),
          facturacion: mensual.reduce((acc, f) => acc + Number(f.total), 0),
          productos: productosRes.count ?? 0,
          cambiosPrecio: historialRes.count ?? 0,
        })
        setUltimos((ultimosRes.data as Remito[]) ?? [])

        // Reposición: la función puede no existir si falta migration_mejoras2.sql
        if (!reposicionRes.error) {
          setReposicion((reposicionRes.data as FilaReposicion[]) ?? [])
        }

        // Facturación de los últimos 6 meses calendario
        const porMes = new Map<string, number>()
        for (const f of mensual) {
          porMes.set(`${f.anio}-${String(f.mes).padStart(2, '0')}`, Number(f.total))
        }
        const serie: PuntoMensual[] = []
        const ahora = new Date()
        for (let i = 5; i >= 0; i--) {
          const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
          const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          serie.push({
            etiqueta: MESES[d.getMonth()].slice(0, 3),
            total: porMes.get(clave) ?? 0,
          })
        }
        setSerieMensual(serie)
      } catch (e: any) {
        setError(e.message ?? 'Error al cargar las estadísticas')
      }
    }
    cargar()
  }, [])

  if (error) {
    return (
      <Card>
        <EmptyState title="No se pudieron cargar los datos" description={error} />
      </Card>
    )
  }

  if (!stats) return <LoadingState />

  return (
    <div>
      <PageHeader
        title={username ? `${saludoSegunHora()}, ${username}` : saludoSegunHora()}
        subtitle={new Date().toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        actions={
          <>
            <Button
              variant="secondary"
              loading={descargandoBackup}
              title="Descarga todas las tablas en un archivo JSON"
              onClick={async () => {
                setDescargandoBackup(true)
                try {
                  const filas = await descargarBackup()
                  toast('success', `Backup descargado (${filas} registros). Guardalo en un lugar seguro.`)
                } catch (e: any) {
                  toast('error', `No se pudo generar el backup: ${e.message ?? e}`)
                } finally {
                  setDescargandoBackup(false)
                }
              }}
            >
              <IconDownload className="h-5 w-5" />
              Backup
            </Button>
            <Link
              to="/remitos/nuevo"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
            >
              <IconDocumentPlus className="h-5 w-5" />
              Nuevo remito
            </Link>
          </>
        }
      />

      {/* Accesos rápidos a lo más usado */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AccesoRapido
          to="/remitos/nuevo"
          icon={<IconDocumentPlus className="h-5 w-5" />}
          label="Nuevo remito"
          desc="Cargar una venta"
        />
        <AccesoRapido
          to="/remitos"
          icon={<IconDocumentList className="h-5 w-5" />}
          label="Remitos"
          desc="Buscar y reimprimir"
        />
        <AccesoRapido
          to="/productos"
          icon={<IconCube className="h-5 w-5" />}
          label="Productos"
          desc="Catálogo y precios"
        />
        <AccesoRapido
          to="/stock"
          icon={<IconArchiveBox className="h-5 w-5" />}
          label="Stock"
          desc="Inventario y movimientos"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<IconDocumentList className="h-6 w-6" />}
          label="Remitos emitidos"
          value={stats.remitos}
          tint="blue"
        />
        <StatCard
          icon={<IconBanknotes className="h-6 w-6" />}
          label="Facturación total"
          value={formatARS(stats.facturacion)}
          tint="brand"
        />
        <StatCard
          icon={<IconCube className="h-6 w-6" />}
          label="Productos"
          value={stats.productos}
          tint="amber"
        />
        <StatCard
          icon={<IconClock className="h-6 w-6" />}
          label="Cambios de precio"
          value={stats.cambiosPrecio}
          tint="violet"
        />
      </div>

      {reposicion.length > 0 && (
        <Card
          className="mt-6"
          title={
            <span className="flex items-center gap-2 text-amber-700">
              <IconAlert className="h-5 w-5" />
              Reposición pendiente · {reposicion.length}{' '}
              {reposicion.length === 1 ? 'producto' : 'productos'}
            </span>
          }
          actions={
            <Link to="/stock" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              Ir a Stock →
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100">
            {reposicion.slice(0, 5).map((p) => (
              <li key={p.codigo ?? p.descripcion} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{p.descripcion}</p>
                  <p className="font-mono text-xs text-slate-400">{p.codigo}</p>
                </div>
                <StockPill stock={p.stock} minimo={p.stock_minimo} />
              </li>
            ))}
          </ul>
          {reposicion.length > 5 && (
            <p className="pt-3 text-center text-xs text-slate-500">
              y {reposicion.length - 5} producto{reposicion.length - 5 === 1 ? '' : 's'} más
            </p>
          )}
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card title="Facturación · últimos 6 meses" className="xl:col-span-3">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serieMensual} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="verde" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                  width={48}
                />
                <Tooltip formatter={(v: number) => [formatARS(v), 'Facturado']} labelStyle={{ color: '#334155' }} />
                <Area type="monotone" dataKey="total" stroke="#047857" strokeWidth={2.5} fill="url(#verde)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Últimos remitos"
          className="xl:col-span-2"
          actions={
            <Link to="/remitos" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              Ver todos →
            </Link>
          }
        >
          {ultimos.length === 0 ? (
            <EmptyState
              title="Todavía no hay remitos"
              description="Creá el primero desde “Nuevo remito”."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {ultimos.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{r.cliente_nombre || 'Sin cliente'}</p>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{r.numero}</span> · {formatFecha(r.fecha)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-slate-900">{formatARS(r.total)}</span>
                    <Badge color={r.estado === 'Anulado' ? 'red' : 'green'}>
                      {r.estado ?? 'Completado'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
