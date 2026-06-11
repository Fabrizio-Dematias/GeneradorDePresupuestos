import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha, MESES } from '../lib/format'
import { Badge, Card, EmptyState, LoadingState, PageHeader, StatCard } from '../components/ui'
import {
  IconBanknotes,
  IconClock,
  IconCube,
  IconDocumentList,
  IconDocumentPlus,
} from '../components/icons'
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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [ultimos, setUltimos] = useState<Remito[]>([])
  const [serieMensual, setSerieMensual] = useState<PuntoMensual[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      try {
        const [remitosRes, productosRes, historialRes, ultimosRes] = await Promise.all([
          supabase.from('remitos').select('fecha, total'),
          supabase.from('productos').select('id', { count: 'exact', head: true }),
          supabase.from('historial_precios').select('id', { count: 'exact', head: true }),
          supabase
            .from('remitos')
            .select('*')
            .order('fecha', { ascending: false })
            .order('numero', { ascending: false })
            .limit(5),
        ])

        const errores = [remitosRes.error, productosRes.error, historialRes.error, ultimosRes.error]
          .filter(Boolean)
        if (errores.length) throw errores[0]

        const remitos = remitosRes.data ?? []
        setStats({
          remitos: remitos.length,
          facturacion: remitos.reduce((acc, r) => acc + (r.total ?? 0), 0),
          productos: productosRes.count ?? 0,
          cambiosPrecio: historialRes.count ?? 0,
        })
        setUltimos((ultimosRes.data as Remito[]) ?? [])

        // Facturación de los últimos 6 meses calendario
        const porMes = new Map<string, number>()
        for (const r of remitos) {
          const clave = (r.fecha ?? '').slice(0, 7) // YYYY-MM
          if (clave) porMes.set(clave, (porMes.get(clave) ?? 0) + (r.total ?? 0))
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
        title="Panel de control"
        subtitle={new Date().toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        actions={
          <Link
            to="/remitos/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
          >
            <IconDocumentPlus className="h-5 w-5" />
            Nuevo remito
          </Link>
        }
      />

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
                    <Badge color="green">{r.estado ?? 'Completado'}</Badge>
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
