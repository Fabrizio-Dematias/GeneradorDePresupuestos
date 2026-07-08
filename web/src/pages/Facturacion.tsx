import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { formatARS, MESES } from '../lib/format'
import {
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Select,
  StatCard,
} from '../components/ui'
import { IconBanknotes, IconChartBar, IconTrendingUp } from '../components/icons'
import { useToast } from '../components/Toast'

interface FilaRPC {
  anio: number
  mes: number
  cantidad: number
  total: number
}

interface FilaMensual {
  anio: number
  mes: number
  etiqueta: string
  remitos: number
  total: number
}

export default function Facturacion() {
  const { toast } = useToast()
  const [mensual, setMensual] = useState<FilaRPC[] | null>(null)
  const [anio, setAnio] = useState<string>('todos')

  useEffect(() => {
    // Agregado por mes en el servidor (excluye remitos anulados):
    // no se descargan todos los remitos al navegador.
    supabase.rpc('facturacion_mensual').then(({ data, error }) => {
      if (error) toast('error', 'No se pudo cargar la facturación')
      setMensual((data as FilaRPC[]) ?? [])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const anios = useMemo(() => {
    const set = new Set<number>()
    for (const f of mensual ?? []) set.add(f.anio)
    return Array.from(set).sort((a, b) => b - a)
  }, [mensual])

  const filas = useMemo<FilaMensual[]>(() => {
    return (mensual ?? [])
      .filter((f) => anio === 'todos' || f.anio === Number(anio))
      .map((f) => ({
        anio: f.anio,
        mes: f.mes,
        etiqueta: `${MESES[f.mes - 1]} ${f.anio}`,
        remitos: Number(f.cantidad),
        total: Number(f.total),
      }))
      .sort((a, b) => a.anio - b.anio || a.mes - b.mes)
  }, [mensual, anio])

  const totalPeriodo = filas.reduce((acc, f) => acc + f.total, 0)
  const promedioMensual = filas.length > 0 ? totalPeriodo / filas.length : 0
  const mejorMes = filas.reduce<FilaMensual | null>(
    (mejor, f) => (mejor === null || f.total > mejor.total ? f : mejor),
    null
  )

  const datosGrafico = filas.map((f) => ({
    nombre: anio === 'todos' ? `${MESES[f.mes - 1].slice(0, 3)} ${String(f.anio).slice(2)}` : MESES[f.mes - 1].slice(0, 3),
    total: f.total,
    completo: f.etiqueta,
  }))

  return (
    <div>
      <PageHeader
        title="Facturación mensual"
        subtitle="Evolución de la facturación según los remitos emitidos."
        actions={
          <Select value={anio} onChange={(e) => setAnio(e.target.value)} className="!w-auto">
            <option value="todos">Todos los años</option>
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<IconBanknotes className="h-6 w-6" />}
          label="Total del período"
          value={formatARS(totalPeriodo)}
          tint="brand"
        />
        <StatCard
          icon={<IconChartBar className="h-6 w-6" />}
          label="Promedio mensual"
          value={formatARS(promedioMensual)}
          tint="blue"
        />
        <StatCard
          icon={<IconTrendingUp className="h-6 w-6" />}
          label="Mejor mes"
          value={mejorMes ? mejorMes.etiqueta : '—'}
          tint="violet"
        />
      </div>

      <Card title="Facturación por mes">
        {mensual === null ? (
          <LoadingState />
        ) : filas.length === 0 ? (
          <EmptyState
            icon={<IconChartBar className="h-12 w-12" />}
            title="Sin datos para mostrar"
            description="Cuando haya remitos emitidos vas a ver la evolución acá."
          />
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGrafico} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="nombre"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    tickFormatter={(v: number) =>
                      v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(v: number) => [formatARS(v), 'Facturado']}
                    labelFormatter={(label: string) =>
                      datosGrafico.find((d) => d.nombre === label)?.completo ?? label
                    }
                  />
                  <Bar dataKey="total" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-3 pr-4 font-medium">Mes</th>
                    <th className="pb-3 pr-4 text-right font-medium">Remitos</th>
                    <th className="pb-3 pr-4 text-right font-medium">Total facturado</th>
                    <th className="pb-3 text-right font-medium">% del período</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...filas].reverse().map((f) => (
                    <tr key={f.etiqueta} className="transition hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-medium text-slate-800">{f.etiqueta}</td>
                      <td className="py-2.5 pr-4 text-right">{f.remitos}</td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-slate-900">
                        {formatARS(f.total)}
                      </td>
                      <td className="py-2.5 text-right text-slate-500">
                        {totalPeriodo > 0 ? ((f.total / totalPeriodo) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
