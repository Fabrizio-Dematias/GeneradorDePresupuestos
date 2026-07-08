import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { formatFechaHora } from '../lib/format'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Pagination,
  Segmented,
  Select,
  StatCard,
  StockPill,
} from '../components/ui'
import {
  IconAdjustments,
  IconAlert,
  IconArchiveBox,
  IconArrowsUpDown,
  IconBanknotes,
  IconCube,
  IconSearch,
} from '../components/icons'
import { useToast } from '../components/Toast'
import MovimientoStockModal from '../components/MovimientoStockModal'
import { CATEGORIAS_BASE, estadoStock, type MovimientoStock, type Producto } from '../types'

const POR_PAGINA = 25
const MOV_POR_PAGINA = 50

type Tab = 'inventario' | 'movimientos'
type EstadoFiltro = 'todos' | 'ok' | 'bajo' | 'sin'

export default function Stock() {
  const { toast } = useToast()
  const [productos, setProductos] = useState<Producto[] | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoStock[] | null>(null)

  const [tab, setTab] = useState<Tab>('inventario')

  // Filtros del inventario
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('TODAS')
  const [estado, setEstado] = useState<EstadoFiltro>('todos')
  const [pagina, setPagina] = useState(1)

  // Filtros de movimientos (se aplican en el servidor)
  const [tipoMov, setTipoMov] = useState<'todos' | 'ingreso' | 'egreso' | 'ajuste'>('todos')
  const [busquedaMov, setBusquedaMov] = useState('')
  const [movPagina, setMovPagina] = useState(1)
  const [movTotal, setMovTotal] = useState(0)

  // Modal de movimiento
  const [movProducto, setMovProducto] = useState<Producto | null>(null)

  useEffect(() => {
    cargarProductos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al cambiar un filtro de movimientos se vuelve a la primera página
  useEffect(() => {
    setMovPagina(1)
  }, [busquedaMov, tipoMov])

  // Carga paginada de movimientos desde el servidor (con debounce al tipear)
  useEffect(() => {
    const timer = setTimeout(cargarMovimientos, busquedaMov ? 300 : 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movPagina, busquedaMov, tipoMov])

  async function cargarProductos() {
    const { data, error } = await supabase.from('productos').select('*').order('codigo')
    if (error) toast('error', 'No se pudieron cargar los productos')
    // Normaliza stock/stock_minimo por si la migración de stock todavía no corrió
    setProductos(
      ((data as Producto[]) ?? []).map((p) => ({
        ...p,
        stock: p.stock ?? 0,
        stock_minimo: p.stock_minimo ?? 0,
      }))
    )
  }

  async function cargarMovimientos() {
    const from = (movPagina - 1) * MOV_POR_PAGINA
    let query = supabase.from('movimientos_stock').select('*', { count: 'exact' })

    if (tipoMov !== 'todos') query = query.eq('tipo', tipoMov)
    const q = busquedaMov.trim().replace(/[,()%]/g, ' ').trim()
    if (q) {
      query = query.or(
        `producto_codigo.ilike.%${q}%,producto_descripcion.ilike.%${q}%,motivo.ilike.%${q}%`
      )
    }

    const { data, count, error } = await query
      .order('fecha', { ascending: false })
      .range(from, from + MOV_POR_PAGINA - 1)

    if (error) {
      // La tabla puede no existir todavía si no corrió migration_stock.sql
      setMovimientos([])
      setMovTotal(0)
      return
    }
    setMovimientos((data as MovimientoStock[]) ?? [])
    setMovTotal(count ?? 0)
  }

  function trasMovimiento() {
    setMovProducto(null)
    cargarProductos()
    cargarMovimientos()
  }

  const categorias = useMemo(() => {
    const set = new Set(CATEGORIAS_BASE)
    for (const p of productos ?? []) if (p.categoria) set.add(p.categoria)
    return Array.from(set).sort()
  }, [productos])

  // ---------------------------------------------- KPIs
  const kpis = useMemo(() => {
    const lista = productos ?? []
    let valor = 0
    let unidades = 0
    let bajo = 0
    let sin = 0
    for (const p of lista) {
      valor += p.stock * p.precio_unitario
      unidades += Math.max(0, p.stock)
      const e = estadoStock(p)
      if (e === 'sin') sin++
      else if (e === 'bajo') bajo++
    }
    return { valor, unidades, bajo, sin, total: lista.length }
  }, [productos])

  // ---------------------------------------------- Inventario filtrado
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return (productos ?? []).filter((p) => {
      const matchTexto =
        !q || (p.codigo ?? '').toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q)
      const matchCat = categoria === 'TODAS' || p.categoria === categoria
      const matchEstado = estado === 'todos' || estadoStock(p) === estado
      return matchTexto && matchCat && matchEstado
    })
  }, [productos, busqueda, categoria, estado])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  useEffect(() => {
    setPagina(1)
  }, [busqueda, categoria, estado])

  const movTotalPaginas = Math.max(1, Math.ceil(movTotal / MOV_POR_PAGINA))

  function verMovimientosDe(p: Producto) {
    setBusquedaMov(p.codigo ?? '')
    setTipoMov('todos')
    setTab('movimientos')
  }

  const hayAlertas = kpis.bajo + kpis.sin > 0

  return (
    <div>
      <PageHeader
        title="Control de stock"
        subtitle={productos ? `${productos.length} productos · ${kpis.unidades.toLocaleString('es-AR')} unidades en depósito` : undefined}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          icon={<IconBanknotes className="h-6 w-6" />}
          label="Valor del inventario"
          value={formatARS(kpis.valor)}
          tint="brand"
          hint="stock × precio"
        />
        <StatCard
          icon={<IconCube className="h-6 w-6" />}
          label="Unidades en depósito"
          value={kpis.unidades.toLocaleString('es-AR')}
          tint="blue"
          hint={`${kpis.total} productos`}
        />
        <StatCard
          icon={<IconAlert className="h-6 w-6" />}
          label="Stock bajo"
          value={kpis.bajo}
          tint="amber"
          hint="por debajo del mínimo"
        />
        <StatCard
          icon={<IconArchiveBox className="h-6 w-6" />}
          label="Sin stock"
          value={kpis.sin}
          tint="red"
          hint="agotados"
        />
      </div>

      {/* Alerta de reposición */}
      {hayAlertas && estado === 'todos' && tab === 'inventario' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <IconAlert className="h-5 w-5" />
            </div>
            <p className="text-sm text-amber-900">
              <span className="font-semibold">Reposición pendiente:</span> {kpis.sin > 0 && `${kpis.sin} sin stock`}
              {kpis.sin > 0 && kpis.bajo > 0 && ' y '}
              {kpis.bajo > 0 && `${kpis.bajo} por debajo del mínimo`}.
            </p>
          </div>
          <Button variant="warning" className="!py-1.5" onClick={() => setEstado(kpis.sin > 0 ? 'sin' : 'bajo')}>
            Ver productos
          </Button>
        </div>
      )}

      {/* Pestañas */}
      <div className="mt-6 mb-4">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'inventario', label: 'Inventario' },
            { value: 'movimientos', label: 'Movimientos' },
          ]}
        />
      </div>

      {tab === 'inventario' ? (
        <Card>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 lg:max-w-sm">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Buscar por código o descripción…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Select
              className="lg:w-52"
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
            <Segmented<EstadoFiltro>
              size="sm"
              value={estado}
              onChange={setEstado}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'ok', label: 'Con stock', activeClass: 'bg-white text-emerald-700 shadow-sm' },
                { value: 'bajo', label: 'Bajo', activeClass: 'bg-white text-amber-700 shadow-sm' },
                { value: 'sin', label: 'Sin stock', activeClass: 'bg-white text-red-600 shadow-sm' },
              ]}
            />
          </div>

          {productos === null ? (
            <LoadingState />
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={<IconArchiveBox className="h-12 w-12" />}
              title="No se encontraron productos"
              description="Probá con otra búsqueda, categoría o estado de stock."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4 font-medium">Código</th>
                      <th className="pb-3 pr-4 font-medium">Descripción</th>
                      <th className="pb-3 pr-4 text-center font-medium">Stock</th>
                      <th className="hidden pb-3 pr-4 text-center font-medium sm:table-cell">Mínimo</th>
                      <th className="hidden pb-3 pr-4 text-right font-medium md:table-cell">Valor</th>
                      <th className="pb-3 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibles.map((p) => (
                      <tr key={p.id} className="transition hover:bg-slate-50">
                        <td className="py-2.5 pr-4 font-mono font-semibold text-slate-800">{p.codigo}</td>
                        <td className="max-w-[300px] py-2.5 pr-4 text-slate-700">
                          <span className="line-clamp-2">{p.descripcion}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-center">
                          <StockPill stock={p.stock} minimo={p.stock_minimo} />
                        </td>
                        <td className="hidden py-2.5 pr-4 text-center text-slate-500 sm:table-cell">
                          {p.stock_minimo > 0 ? p.stock_minimo : '—'}
                        </td>
                        <td className="hidden py-2.5 pr-4 text-right font-medium text-slate-600 md:table-cell">
                          {formatARS(p.stock * p.precio_unitario)}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="secondary"
                              className="!px-3 !py-1.5"
                              onClick={() => setMovProducto(p)}
                            >
                              <IconAdjustments className="h-4 w-4" />
                              <span className="hidden sm:inline">Ajustar</span>
                            </Button>
                            <button
                              onClick={() => verMovimientosDe(p)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              title="Ver movimientos de este producto"
                            >
                              <IconArrowsUpDown className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  {filtrados.length} resultados · página {paginaActual} de {totalPaginas}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5"
                    disabled={paginaActual <= 1}
                    onClick={() => setPagina(paginaActual - 1)}
                  >
                    ← Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5"
                    disabled={paginaActual >= totalPaginas}
                    onClick={() => setPagina(paginaActual + 1)}
                  >
                    Siguiente →
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      ) : (
        <Card>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 lg:max-w-sm">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Buscar por producto o motivo…"
                value={busquedaMov}
                onChange={(e) => setBusquedaMov(e.target.value)}
              />
            </div>
            <Segmented
              size="sm"
              value={tipoMov}
              onChange={setTipoMov}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'ingreso', label: 'Ingresos', activeClass: 'bg-white text-emerald-700 shadow-sm' },
                { value: 'egreso', label: 'Egresos', activeClass: 'bg-white text-red-600 shadow-sm' },
                { value: 'ajuste', label: 'Ajustes', activeClass: 'bg-white text-blue-600 shadow-sm' },
              ]}
            />
          </div>

          {movimientos === null ? (
            <LoadingState />
          ) : movimientos.length === 0 ? (
            <EmptyState
              icon={<IconArrowsUpDown className="h-12 w-12" />}
              title="Sin movimientos"
              description="Los ingresos, egresos y ajustes de stock van a aparecer acá. También se registra el descuento automático al generar un remito."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-3 pr-4 font-medium">Fecha</th>
                    <th className="pb-3 pr-4 font-medium">Producto</th>
                    <th className="pb-3 pr-4 text-center font-medium">Tipo</th>
                    <th className="pb-3 pr-4 text-center font-medium">Cantidad</th>
                    <th className="hidden pb-3 pr-4 text-center font-medium sm:table-cell">Stock</th>
                    <th className="hidden pb-3 font-medium md:table-cell">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimientos.map((m) => (
                    <tr key={m.id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap py-2.5 pr-4 text-xs text-slate-500">
                        {formatFechaHora(m.fecha)}
                      </td>
                      <td className="max-w-[260px] py-2.5 pr-4">
                        <p className="truncate text-slate-700">{m.producto_descripcion}</p>
                        <p className="font-mono text-xs text-slate-400">{m.producto_codigo}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        <Badge color={m.tipo === 'ingreso' ? 'green' : m.tipo === 'egreso' ? 'red' : 'blue'}>
                          {m.tipo === 'ingreso' ? 'Ingreso' : m.tipo === 'egreso' ? 'Egreso' : 'Ajuste'}
                        </Badge>
                      </td>
                      <td
                        className={`py-2.5 pr-4 text-center font-semibold ${
                          m.tipo === 'ingreso'
                            ? 'text-emerald-600'
                            : m.tipo === 'egreso'
                              ? 'text-red-600'
                              : 'text-blue-600'
                        }`}
                      >
                        {m.tipo === 'ingreso' ? '+' : m.tipo === 'egreso' ? '−' : '±'}
                        {m.cantidad}
                      </td>
                      <td className="hidden whitespace-nowrap py-2.5 pr-4 text-center text-slate-500 sm:table-cell">
                        {m.stock_anterior} <span className="text-slate-300">→</span>{' '}
                        <span className="font-semibold text-slate-700">{m.stock_nuevo}</span>
                      </td>
                      <td className="hidden py-2.5 text-slate-500 md:table-cell">
                        <span className="line-clamp-1">{m.motivo || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                pagina={movPagina}
                totalPaginas={movTotalPaginas}
                totalResultados={movTotal}
                onChange={setMovPagina}
              />
            </div>
          )}
        </Card>
      )}

      <MovimientoStockModal producto={movProducto} onClose={() => setMovProducto(null)} onDone={trasMovimiento} />
    </div>
  )
}
