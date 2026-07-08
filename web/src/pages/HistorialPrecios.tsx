import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFechaHora } from '../lib/format'
import {
  Badge,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Pagination,
  Select,
  StatCard,
  categoriaBadgeColor,
} from '../components/ui'
import { IconClock, IconSearch, IconTrendingUp } from '../components/icons'
import { useToast } from '../components/Toast'
import { CATEGORIAS_BASE, type HistorialPrecio } from '../types'

const POR_PAGINA = 50

export default function HistorialPrecios() {
  const { toast } = useToast()
  const [historial, setHistorial] = useState<HistorialPrecio[] | null>(null)
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('TODAS')
  const [ultimoCambio, setUltimoCambio] = useState<string | null>(null)

  // Fecha del último cambio (independiente de filtros y paginación)
  useEffect(() => {
    supabase
      .from('historial_precios')
      .select('fecha_cambio')
      .order('fecha_cambio', { ascending: false })
      .limit(1)
      .then(({ data }) => setUltimoCambio(data?.[0]?.fecha_cambio ?? null))
  }, [])

  // Al cambiar un filtro se vuelve a la primera página
  useEffect(() => {
    setPagina(1)
  }, [busqueda, categoria])

  // Carga paginada desde el servidor (con debounce al tipear)
  useEffect(() => {
    const timer = setTimeout(cargar, busqueda ? 300 : 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, busqueda, categoria])

  async function cargar() {
    const from = (pagina - 1) * POR_PAGINA
    let query = supabase.from('historial_precios').select('*', { count: 'exact' })

    const q = busqueda.trim().replace(/[,()%]/g, ' ').trim()
    if (q) query = query.or(`producto_codigo.ilike.%${q}%,producto_descripcion.ilike.%${q}%`)
    if (categoria !== 'TODAS') query = query.eq('categoria', categoria)

    const { data, count, error } = await query
      .order('fecha_cambio', { ascending: false })
      .range(from, from + POR_PAGINA - 1)

    if (error) {
      toast('error', 'No se pudo cargar el historial de precios')
      setHistorial([])
      setTotal(0)
      return
    }
    setHistorial((data as HistorialPrecio[]) ?? [])
    setTotal(count ?? 0)
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const hayFiltros = Boolean(busqueda.trim()) || categoria !== 'TODAS'

  return (
    <div>
      <PageHeader
        title="Historial de precios"
        subtitle="Auditoría de todos los cambios de precios, individuales y masivos."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={<IconClock className="h-6 w-6" />}
          label="Cambios registrados"
          value={historial ? total : '…'}
          tint="violet"
          hint={hayFiltros ? 'con los filtros aplicados' : undefined}
        />
        <StatCard
          icon={<IconTrendingUp className="h-6 w-6" />}
          label="Último cambio"
          value={ultimoCambio ? formatFechaHora(ultimoCambio) : 'Sin cambios aún'}
          tint="brand"
        />
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-md">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por código o descripción…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Select
            className="sm:w-56"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            aria-label="Filtrar por categoría"
          >
            <option value="TODAS">Todas las categorías</option>
            {CATEGORIAS_BASE.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        {historial === null ? (
          <LoadingState />
        ) : historial.length === 0 ? (
          <EmptyState
            icon={<IconClock className="h-12 w-12" />}
            title={hayFiltros ? 'Sin resultados' : 'Todavía no hay cambios registrados'}
            description={
              hayFiltros
                ? 'Probá con otra búsqueda u otra categoría.'
                : 'Cuando edites el precio de un producto o apliques una actualización masiva, los cambios van a quedar registrados acá.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                  <th className="pb-3 pr-4 font-medium">Código</th>
                  <th className="hidden pb-3 pr-4 font-medium md:table-cell">Descripción</th>
                  <th className="hidden pb-3 pr-4 font-medium sm:table-cell">Categoría</th>
                  <th className="pb-3 pr-4 text-right font-medium">Anterior</th>
                  <th className="pb-3 pr-4 text-right font-medium">Nuevo</th>
                  <th className="pb-3 text-right font-medium">Variación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historial.map((h) => {
                  const pct = h.porcentaje_cambio
                  const subio = (pct ?? 0) >= 0
                  return (
                    <tr key={h.id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap py-2.5 pr-4 text-slate-600">
                        {formatFechaHora(h.fecha_cambio)}
                      </td>
                      <td className="py-2.5 pr-4 font-mono font-semibold text-slate-800">
                        {h.producto_codigo}
                      </td>
                      <td className="hidden max-w-[280px] py-2.5 pr-4 text-slate-700 md:table-cell">
                        <span className="line-clamp-1">{h.producto_descripcion}</span>
                      </td>
                      <td className="hidden py-2.5 pr-4 sm:table-cell">
                        {h.categoria && (
                          <Badge color={categoriaBadgeColor(h.categoria)}>{h.categoria}</Badge>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-slate-500 line-through decoration-slate-300">
                        {formatARS(h.precio_anterior)}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-slate-900">
                        {formatARS(h.precio_nuevo)}
                      </td>
                      <td className="py-2.5 text-right">
                        {pct !== null && (
                          <Badge color={subio ? 'green' : 'red'}>
                            {subio ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Pagination
              pagina={pagina}
              totalPaginas={totalPaginas}
              totalResultados={total}
              onChange={setPagina}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
