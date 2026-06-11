import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFechaHora } from '../lib/format'
import {
  Badge,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Select,
  StatCard,
  categoriaBadgeColor,
} from '../components/ui'
import { IconClock, IconSearch, IconTrendingUp } from '../components/icons'
import { useToast } from '../components/Toast'
import { CATEGORIAS_BASE, type HistorialPrecio } from '../types'

const LIMITE = 500

export default function HistorialPrecios() {
  const { toast } = useToast()
  const [historial, setHistorial] = useState<HistorialPrecio[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('TODAS')

  useEffect(() => {
    supabase
      .from('historial_precios')
      .select('*')
      .order('fecha_cambio', { ascending: false })
      .limit(LIMITE)
      .then(({ data, error }) => {
        if (error) toast('error', 'No se pudo cargar el historial de precios')
        setHistorial((data as HistorialPrecio[]) ?? [])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categorias = useMemo(() => {
    const set = new Set(CATEGORIAS_BASE)
    for (const h of historial ?? []) if (h.categoria) set.add(h.categoria)
    return Array.from(set).sort()
  }, [historial])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return (historial ?? []).filter((h) => {
      const matchTexto =
        !q ||
        h.producto_codigo.toLowerCase().includes(q) ||
        (h.producto_descripcion ?? '').toLowerCase().includes(q)
      const matchCategoria = categoria === 'TODAS' || h.categoria === categoria
      return matchTexto && matchCategoria
    })
  }, [historial, busqueda, categoria])

  const ultimoCambio = historial?.[0]?.fecha_cambio ?? null

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
          value={historial?.length ?? '…'}
          tint="violet"
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
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        {historial === null ? (
          <LoadingState />
        ) : filtrados.length === 0 ? (
          <EmptyState
            icon={<IconClock className="h-12 w-12" />}
            title={historial.length === 0 ? 'Todavía no hay cambios registrados' : 'Sin resultados'}
            description={
              historial.length === 0
                ? 'Cuando edites el precio de un producto o apliques una actualización masiva, los cambios van a quedar registrados acá.'
                : 'Probá con otra búsqueda u otra categoría.'
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
                {filtrados.map((h) => {
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
            {historial.length >= LIMITE && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Se muestran los últimos {LIMITE} cambios.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
