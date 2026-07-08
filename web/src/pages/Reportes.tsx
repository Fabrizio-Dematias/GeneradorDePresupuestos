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
import { formatARS } from '../lib/format'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Select,
  StatCard,
  categoriaBadgeColor,
} from '../components/ui'
import { IconChartBar, IconCube, IconBanknotes, IconDownload } from '../components/icons'
import { useToast } from '../components/Toast'
import { exportarCSV, fechaParaArchivo } from '../lib/csv'

const PERIODOS = [
  { valor: '1m', etiqueta: 'Último mes', meses: 1 },
  { valor: '3m', etiqueta: 'Últimos 3 meses', meses: 3 },
  { valor: '6m', etiqueta: 'Últimos 6 meses', meses: 6 },
  { valor: '1a', etiqueta: 'Último año', meses: 12 },
  { valor: 'todo', etiqueta: 'Todo el tiempo', meses: null as number | null },
]

interface ItemVenta {
  codigo: string | null
  descripcion: string
  cantidad: number
  subtotal: number
  remitos: { fecha: string }
}

interface Estadistica {
  codigo: string
  descripcion: string
  categoria: string
  cantidad: number
  facturado: number
  porcentaje: number
}

export default function Reportes() {
  const { toast } = useToast()
  const [items, setItems] = useState<ItemVenta[] | null>(null)
  const [categoriasPorCodigo, setCategoriasPorCodigo] = useState<Map<string, string>>(new Map())
  const [periodo, setPeriodo] = useState('todo')
  const [metrica, setMetrica] = useState<'cantidad' | 'facturado'>('cantidad')
  const [limite, setLimite] = useState(10)

  useEffect(() => {
    async function cargar() {
      const [itemsRes, productosRes] = await Promise.all([
        supabase.from('remito_items').select('codigo, descripcion, cantidad, subtotal, remitos!inner(fecha)'),
        supabase.from('productos').select('codigo, categoria'),
      ])
      if (itemsRes.error || productosRes.error) {
        toast('error', 'No se pudieron cargar las estadísticas de ventas')
        setItems([])
        return
      }
      setItems((itemsRes.data as unknown as ItemVenta[]) ?? [])
      const mapa = new Map<string, string>()
      for (const p of productosRes.data ?? []) {
        if (p.codigo) mapa.set(p.codigo, p.categoria ?? 'SIN CATEGORÍA')
      }
      setCategoriasPorCodigo(mapa)
    }
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { estadisticas, totalUnidades, productosDistintos, totalFacturado } = useMemo(() => {
    const config = PERIODOS.find((p) => p.valor === periodo)!
    let desde = '2000-01-01'
    if (config.meses !== null) {
      const d = new Date()
      d.setMonth(d.getMonth() - config.meses)
      desde = d.toISOString().slice(0, 10)
    }

    const enPeriodo = (items ?? []).filter((i) => i.remitos.fecha >= desde)
    const total = enPeriodo.reduce((acc, i) => acc + i.subtotal, 0)

    const porProducto = new Map<string, Estadistica>()
    for (const item of enPeriodo) {
      const clave = `${item.codigo ?? ''}|${item.descripcion}`
      const previo = porProducto.get(clave)
      if (previo) {
        previo.cantidad += item.cantidad
        previo.facturado += item.subtotal
      } else {
        porProducto.set(clave, {
          codigo: item.codigo ?? '—',
          descripcion: item.descripcion,
          categoria: (item.codigo && categoriasPorCodigo.get(item.codigo)) || 'SIN CATEGORÍA',
          cantidad: item.cantidad,
          facturado: item.subtotal,
          porcentaje: 0,
        })
      }
    }

    const lista = Array.from(porProducto.values())
    for (const e of lista) e.porcentaje = total > 0 ? (e.facturado / total) * 100 : 0
    lista.sort((a, b) => (metrica === 'cantidad' ? b.cantidad - a.cantidad : b.facturado - a.facturado))

    return {
      estadisticas: lista.slice(0, limite),
      totalUnidades: enPeriodo.reduce((acc, i) => acc + i.cantidad, 0),
      productosDistintos: porProducto.size,
      totalFacturado: total,
    }
  }, [items, periodo, metrica, limite, categoriasPorCodigo])

  function exportar() {
    const etiqueta = PERIODOS.find((p) => p.valor === periodo)?.etiqueta ?? periodo
    exportarCSV(
      `mas_vendidos_${fechaParaArchivo()}`,
      ['#', 'Código', 'Descripción', 'Categoría', 'Unidades', 'Facturado', '% del total', 'Período'],
      estadisticas.map((e, i) => [
        i + 1,
        e.codigo,
        e.descripcion,
        e.categoria,
        e.cantidad,
        e.facturado,
        Number(e.porcentaje.toFixed(1)),
        i === 0 ? etiqueta : '',
      ])
    )
    toast('success', `Ranking exportado a CSV (${estadisticas.length} productos).`)
  }

  const datosGrafico = estadisticas
    .slice(0, 10)
    .map((e) => ({
      nombre: e.codigo !== '—' ? e.codigo : e.descripcion.slice(0, 12),
      valor: metrica === 'cantidad' ? e.cantidad : e.facturado,
      descripcion: e.descripcion,
    }))
    .reverse()

  return (
    <div>
      <PageHeader
        title="Productos más vendidos"
        subtitle="Ranking de productos por unidades vendidas o facturación."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<IconCube className="h-6 w-6" />}
          label="Unidades vendidas"
          value={totalUnidades}
          tint="blue"
        />
        <StatCard
          icon={<IconChartBar className="h-6 w-6" />}
          label="Productos distintos"
          value={productosDistintos}
          tint="violet"
        />
        <StatCard
          icon={<IconBanknotes className="h-6 w-6" />}
          label="Facturado en el período"
          value={formatARS(totalFacturado)}
          tint="brand"
        />
      </div>

      <Card
        title="Ranking"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              <button
                onClick={() => setMetrica('cantidad')}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  metrica === 'cantidad' ? 'bg-brand-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Por cantidad
              </button>
              <button
                onClick={() => setMetrica('facturado')}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  metrica === 'facturado' ? 'bg-brand-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Por facturación
              </button>
            </div>
            <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="!w-auto">
              {PERIODOS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.etiqueta}
                </option>
              ))}
            </Select>
            <Select value={limite} onChange={(e) => setLimite(Number(e.target.value))} className="!w-auto">
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </Select>
            <Button
              variant="secondary"
              className="!py-1.5"
              onClick={exportar}
              disabled={estadisticas.length === 0}
            >
              <IconDownload className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        }
      >
        {items === null ? (
          <LoadingState />
        ) : estadisticas.length === 0 ? (
          <EmptyState
            icon={<IconChartBar className="h-12 w-12" />}
            title="Sin ventas en el período"
            description="Probá con un período más amplio."
          />
        ) : (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGrafico} layout="vertical" margin={{ top: 5, right: 24, left: 8, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      metrica === 'facturado'
                        ? v >= 1_000_000
                          ? `${(v / 1_000_000).toFixed(1)}M`
                          : v >= 1000
                            ? `${Math.round(v / 1000)}k`
                            : String(v)
                        : String(v)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={86}
                    tick={{ fontSize: 12, fill: '#475569', fontFamily: 'ui-monospace, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: number) => [
                      metrica === 'facturado' ? formatARS(v) : `${v} unidades`,
                      metrica === 'facturado' ? 'Facturado' : 'Vendidas',
                    ]}
                    labelFormatter={(label: string) => {
                      const item = datosGrafico.find((d) => d.nombre === label)
                      return item?.descripcion ?? label
                    }}
                  />
                  <Bar dataKey="valor" fill="#059669" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-3 pr-3 font-medium">#</th>
                    <th className="pb-3 pr-4 font-medium">Código</th>
                    <th className="pb-3 pr-4 font-medium">Descripción</th>
                    <th className="hidden pb-3 pr-4 font-medium sm:table-cell">Categoría</th>
                    <th className="pb-3 pr-4 text-right font-medium">Unidades</th>
                    <th className="pb-3 pr-4 text-right font-medium">Facturado</th>
                    <th className="pb-3 text-right font-medium">% del total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estadisticas.map((e, i) => (
                    <tr key={`${e.codigo}-${e.descripcion}`} className="transition hover:bg-slate-50">
                      <td className="py-2.5 pr-3 font-semibold text-slate-400">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-mono font-semibold text-slate-800">{e.codigo}</td>
                      <td className="max-w-[300px] py-2.5 pr-4 text-slate-700">
                        <span className="line-clamp-1">{e.descripcion}</span>
                      </td>
                      <td className="hidden py-2.5 pr-4 sm:table-cell">
                        <Badge color={categoriaBadgeColor(e.categoria)}>{e.categoria}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold">{e.cantidad}</td>
                      <td className="py-2.5 pr-4 text-right">{formatARS(e.facturado)}</td>
                      <td className="py-2.5 text-right text-slate-500">{e.porcentaje.toFixed(1)}%</td>
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
