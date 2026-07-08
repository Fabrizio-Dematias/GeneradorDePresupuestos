import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  StockPill,
  categoriaBadgeColor,
} from '../components/ui'
import { IconClock, IconCube, IconDownload, IconPencil, IconPercent, IconPlus, IconSearch, IconTrash } from '../components/icons'
import { formatFechaHora } from '../lib/format'
import type { HistorialPrecio } from '../types'
import { exportarCSV, fechaParaArchivo } from '../lib/csv'
import { useToast } from '../components/Toast'
import { CATEGORIAS_BASE, type Producto } from '../types'

const POR_PAGINA = 25

interface FormularioProducto {
  id: number | null
  codigo: string
  descripcion: string
  categoria: string
  precio: string
  stockMinimo: string
  stockInicial: string
  stockActual: number
}

const formularioVacio: FormularioProducto = {
  id: null,
  codigo: '',
  descripcion: '',
  categoria: CATEGORIAS_BASE[0],
  precio: '',
  stockMinimo: '0',
  stockInicial: '0',
  stockActual: 0,
}

export default function Productos() {
  const { toast } = useToast()
  const [productos, setProductos] = useState<Producto[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('TODAS')
  const [pagina, setPagina] = useState(1)

  const [form, setForm] = useState<FormularioProducto | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [aEliminar, setAEliminar] = useState<Producto | null>(null)
  const [eliminando, setEliminando] = useState(false)

  // Historial de precios de un producto puntual
  const [historialDe, setHistorialDe] = useState<Producto | null>(null)
  const [historialFilas, setHistorialFilas] = useState<HistorialPrecio[] | null>(null)

  // Aumento masivo
  const [modalAumento, setModalAumento] = useState(false)
  const [aumentoCategoria, setAumentoCategoria] = useState('TODAS')
  const [aumentoPorcentaje, setAumentoPorcentaje] = useState('')
  const [aplicandoAumento, setAplicandoAumento] = useState(false)

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargar() {
    const { data, error } = await supabase.from('productos').select('*').order('codigo')
    if (error) toast('error', 'No se pudieron cargar los productos')
    // Normaliza stock/stock_minimo por si la migración de stock todavía no corrió
    // (así no se muestran NaN ni "undefined" hasta ejecutar migration_stock.sql).
    setProductos(
      ((data as Producto[]) ?? []).map((p) => ({
        ...p,
        stock: p.stock ?? 0,
        stock_minimo: p.stock_minimo ?? 0,
      }))
    )
  }

  const categorias = useMemo(() => {
    const set = new Set(CATEGORIAS_BASE)
    for (const p of productos ?? []) if (p.categoria) set.add(p.categoria)
    return Array.from(set).sort()
  }, [productos])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return (productos ?? []).filter((p) => {
      const matchTexto =
        !q || (p.codigo ?? '').toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q)
      const matchCategoria = categoria === 'TODAS' || p.categoria === categoria
      return matchTexto && matchCategoria
    })
  }, [productos, busqueda, categoria])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  useEffect(() => {
    setPagina(1)
  }, [busqueda, categoria])

  // ------------------------------------------------ Exportar
  function exportar() {
    // Exporta lo filtrado (todas las páginas), no solo la página visible
    exportarCSV(
      `productos_${fechaParaArchivo()}`,
      ['Código', 'Descripción', 'Categoría', 'Precio unitario', 'Stock', 'Stock mínimo'],
      filtrados.map((p) => [
        p.codigo,
        p.descripcion,
        p.categoria,
        p.precio_unitario,
        p.stock,
        p.stock_minimo,
      ])
    )
    toast('success', `Se exportaron ${filtrados.length} productos a CSV.`)
  }

  // ------------------------------------------------ Historial de un producto
  async function abrirHistorial(p: Producto) {
    setHistorialDe(p)
    setHistorialFilas(null)
    const { data, error } = await supabase
      .from('historial_precios')
      .select('*')
      .eq('producto_codigo', p.codigo ?? '')
      .order('fecha_cambio', { ascending: false })
      .limit(100)
    if (error) {
      toast('error', 'No se pudo cargar el historial de este producto')
      setHistorialFilas([])
      return
    }
    setHistorialFilas((data as HistorialPrecio[]) ?? [])
  }

  // ------------------------------------------------ Crear / editar
  async function guardarProducto(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    const precio = parseFloat(form.precio)
    if (!form.codigo.trim() || !form.descripcion.trim()) {
      toast('error', 'Completá código y descripción.')
      return
    }
    if (isNaN(precio) || precio < 0) {
      toast('error', 'Ingresá un precio válido.')
      return
    }

    const stockMinimo = Math.max(0, parseInt(form.stockMinimo, 10) || 0)
    const stockInicial = Math.max(0, parseInt(form.stockInicial, 10) || 0)

    setGuardando(true)
    try {
      if (form.id === null) {
        const { data: nuevo, error } = await supabase
          .from('productos')
          .insert({
            codigo: form.codigo.trim(),
            descripcion: form.descripcion.trim(),
            categoria: form.categoria,
            precio_unitario: precio,
            stock_minimo: stockMinimo,
          })
          .select()
          .single()
        if (error) {
          if (error.code === '23505') throw new Error(`Ya existe un producto con el código ${form.codigo}`)
          throw error
        }
        // Carga el stock inicial como un movimiento de ingreso (queda en la auditoría)
        if (nuevo && stockInicial > 0) {
          await supabase.rpc('registrar_movimiento_stock', {
            p_producto_id: (nuevo as Producto).id,
            p_tipo: 'ingreso',
            p_cantidad: stockInicial,
            p_motivo: 'Stock inicial',
          })
        }
        toast('success', `Producto ${form.codigo} creado.`)
      } else {
        const original = productos?.find((p) => p.id === form.id)
        const { error } = await supabase
          .from('productos')
          .update({
            descripcion: form.descripcion.trim(),
            categoria: form.categoria,
            precio_unitario: precio,
            stock_minimo: stockMinimo,
            fecha_actualizacion: new Date().toISOString(),
          })
          .eq('id', form.id)
        if (error) throw error

        // Si cambió el precio, queda registrado en el historial (mejora
        // sobre el escritorio, que solo registraba los aumentos masivos)
        if (original && original.precio_unitario !== precio) {
          const porcentaje =
            original.precio_unitario > 0
              ? ((precio - original.precio_unitario) / original.precio_unitario) * 100
              : null
          await supabase.from('historial_precios').insert({
            producto_codigo: original.codigo,
            producto_descripcion: form.descripcion.trim(),
            precio_anterior: original.precio_unitario,
            precio_nuevo: precio,
            porcentaje_cambio: porcentaje,
            categoria: form.categoria,
          })
        }
        toast('success', `Producto ${form.codigo} actualizado.`)
      }
      setForm(null)
      cargar()
    } catch (err: any) {
      toast('error', err.message ?? 'No se pudo guardar el producto')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarProducto() {
    if (!aEliminar) return
    setEliminando(true)
    const { error } = await supabase.from('productos').delete().eq('id', aEliminar.id)
    setEliminando(false)
    if (error) {
      toast('error', `No se pudo eliminar: ${error.message}`)
      return
    }
    toast('success', `Producto ${aEliminar.codigo} eliminado.`)
    setAEliminar(null)
    cargar()
  }

  // ------------------------------------------------ Aumento masivo
  const productosAfectados = useMemo(
    () =>
      (productos ?? []).filter(
        (p) => aumentoCategoria === 'TODAS' || p.categoria === aumentoCategoria
      ),
    [productos, aumentoCategoria]
  )
  const porcentajeNum = parseFloat(aumentoPorcentaje)
  const porcentajeValido = !isNaN(porcentajeNum) && porcentajeNum !== 0 && porcentajeNum > -100

  async function aplicarAumento() {
    if (!porcentajeValido) {
      toast('error', 'Ingresá un porcentaje válido (por ejemplo 15 o -10).')
      return
    }
    setAplicandoAumento(true)
    const { data, error } = await supabase.rpc('aplicar_aumento_precios', {
      p_categoria: aumentoCategoria,
      p_porcentaje: porcentajeNum,
    })
    setAplicandoAumento(false)
    if (error) {
      toast('error', `No se pudo aplicar el aumento: ${error.message}`)
      return
    }
    toast('success', `Precios actualizados: ${data} productos (${porcentajeNum > 0 ? '+' : ''}${porcentajeNum}%). Quedó registrado en el historial.`)
    setModalAumento(false)
    setAumentoPorcentaje('')
    cargar()
  }

  return (
    <div>
      <PageHeader
        title="Productos"
        subtitle={productos ? `${productos.length} productos en el catálogo` : undefined}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={exportar}
              disabled={!productos || filtrados.length === 0}
            >
              <IconDownload className="h-5 w-5" />
              Exportar CSV
            </Button>
            <Button variant="warning" onClick={() => setModalAumento(true)}>
              <IconPercent className="h-5 w-5" />
              Actualizar precios
            </Button>
            <Button onClick={() => setForm({ ...formularioVacio })}>
              <IconPlus className="h-5 w-5" />
              Nuevo producto
            </Button>
          </>
        }
      />

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

        {productos === null ? (
          <LoadingState />
        ) : filtrados.length === 0 ? (
          <EmptyState
            icon={<IconCube className="h-12 w-12" />}
            title="No se encontraron productos"
            description="Probá con otra búsqueda u otra categoría."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-3 pr-4 font-medium">Código</th>
                    <th className="pb-3 pr-4 font-medium">Descripción</th>
                    <th className="hidden pb-3 pr-4 font-medium sm:table-cell">Categoría</th>
                    <th className="pb-3 pr-4 text-center font-medium">Stock</th>
                    <th className="pb-3 pr-4 text-right font-medium">Precio</th>
                    <th className="pb-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibles.map((p) => (
                    <tr key={p.id} className="transition hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-mono font-semibold text-slate-800">{p.codigo}</td>
                      <td className="max-w-[340px] py-2.5 pr-4 text-slate-700">
                        <span className="line-clamp-2">{p.descripcion}</span>
                      </td>
                      <td className="hidden py-2.5 pr-4 sm:table-cell">
                        <Badge color={categoriaBadgeColor(p.categoria)}>{p.categoria}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        <StockPill stock={p.stock} minimo={p.stock_minimo} />
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-brand-700">
                        {formatARS(p.precio_unitario)}
                      </td>
                      <td className="py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() =>
                              setForm({
                                id: p.id,
                                codigo: p.codigo ?? '',
                                descripcion: p.descripcion,
                                categoria: p.categoria ?? CATEGORIAS_BASE[0],
                                precio: String(p.precio_unitario),
                                stockMinimo: String(p.stock_minimo),
                                stockInicial: '0',
                                stockActual: p.stock,
                              })
                            }
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Editar"
                          >
                            <IconPencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => abrirHistorial(p)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
                            title="Historial de precios de este producto"
                          >
                            <IconClock className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setAEliminar(p)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Eliminar"
                          >
                            <IconTrash className="h-4 w-4" />
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

      {/* Modal crear/editar */}
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id === null ? 'Nuevo producto' : `Editar producto ${form?.codigo}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button loading={guardando} form="form-producto" type="submit">
              Guardar
            </Button>
          </>
        }
      >
        {form && (
          <form id="form-producto" onSubmit={guardarProducto} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Código *"
              id="prod-codigo"
              value={form.codigo}
              disabled={form.id !== null}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              placeholder="Ej: 401"
            />
            <Select
              label="Categoría"
              id="prod-categoria"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <div className="sm:col-span-2">
              <Input
                label="Descripción *"
                id="prod-desc"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Descripción del producto"
              />
            </div>
            <Input
              label="Precio unitario *"
              id="prod-precio"
              type="number"
              min={0}
              step="0.01"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              placeholder="0,00"
            />
            <Input
              label="Stock mínimo"
              id="prod-stock-min"
              type="number"
              min={0}
              value={form.stockMinimo}
              onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
              placeholder="0"
            />
            {form.id === null ? (
              <Input
                label="Stock inicial"
                id="prod-stock-ini"
                type="number"
                min={0}
                value={form.stockInicial}
                onChange={(e) => setForm({ ...form, stockInicial: e.target.value })}
                placeholder="0"
              />
            ) : (
              <div>
                <span className="label">Stock actual</span>
                <div className="input flex items-center bg-slate-50 font-semibold text-slate-700">
                  {form.stockActual}
                </div>
              </div>
            )}
            <p className="self-end pb-2 text-xs text-slate-400 sm:col-span-2">
              {form.id === null
                ? 'El stock se ajusta después desde la sección Stock. Avisamos cuando baje del mínimo.'
                : 'Para cambiar el stock usá “Ajustar” en la sección Stock; así queda registrado el movimiento.'}
            </p>
          </form>
        )}
      </Modal>

      {/* Modal aumento masivo */}
      <Modal
        open={modalAumento}
        onClose={() => setModalAumento(false)}
        title="Actualización masiva de precios"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalAumento(false)} disabled={aplicandoAumento}>
              Cancelar
            </Button>
            <Button variant="warning" onClick={aplicarAumento} loading={aplicandoAumento} disabled={!porcentajeValido}>
              Aplicar a {productosAfectados.length} productos
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Categoría"
              id="aumento-cat"
              value={aumentoCategoria}
              onChange={(e) => setAumentoCategoria(e.target.value)}
            >
              <option value="TODAS">TODAS las categorías</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input
              label="Porcentaje de aumento %"
              id="aumento-pct"
              type="number"
              step="0.1"
              placeholder="Ej: 15 (o -10 para bajar)"
              value={aumentoPorcentaje}
              onChange={(e) => setAumentoPorcentaje(e.target.value)}
            />
          </div>

          {porcentajeValido && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Vista previa ({productosAfectados.length} productos afectados)
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {productosAfectados.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs">{p.codigo}</span>
                    <span className="shrink-0">
                      {formatARS(p.precio_unitario)} →{' '}
                      <strong>{formatARS(p.precio_unitario * (1 + porcentajeNum / 100))}</strong>
                    </span>
                  </li>
                ))}
                {productosAfectados.length > 6 && (
                  <li className="pt-1 text-xs text-amber-700">
                    … y {productosAfectados.length - 6} productos más
                  </li>
                )}
              </ul>
              <p className="mt-3 text-xs text-amber-700">
                Cada cambio queda registrado en el historial de precios.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Historial de precios de un producto puntual */}
      <Modal
        open={historialDe !== null}
        onClose={() => setHistorialDe(null)}
        title={historialDe ? `Historial de precios · ${historialDe.codigo}` : ''}
        size="lg"
      >
        {historialDe && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-slate-600">{historialDe.descripcion}</p>
              <p className="shrink-0 text-sm">
                <span className="text-slate-400">Precio actual: </span>
                <span className="font-semibold text-brand-700">
                  {formatARS(historialDe.precio_unitario)}
                </span>
              </p>
            </div>

            {historialFilas === null ? (
              <LoadingState texto="Cargando historial…" />
            ) : historialFilas.length === 0 ? (
              <EmptyState
                icon={<IconClock className="h-12 w-12" />}
                title="Sin cambios registrados"
                description="Cuando cambies el precio de este producto (individual o por aumento masivo) va a aparecer acá."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Fecha</th>
                      <th className="px-3 py-2 text-right font-medium">Anterior</th>
                      <th className="px-3 py-2 text-right font-medium">Nuevo</th>
                      <th className="px-3 py-2 text-right font-medium">Variación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historialFilas.map((h) => {
                      const pct = h.porcentaje_cambio
                      const subio = (pct ?? 0) >= 0
                      return (
                        <tr key={h.id}>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                            {formatFechaHora(h.fecha_cambio)}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-500 line-through decoration-slate-300">
                            {formatARS(h.precio_anterior)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">
                            {formatARS(h.precio_nuevo)}
                          </td>
                          <td className="px-3 py-2 text-right">
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
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={aEliminar !== null}
        title="Eliminar producto"
        message={
          <p>
            ¿Seguro que querés eliminar{' '}
            <strong>
              {aEliminar?.codigo} — {aEliminar?.descripcion}
            </strong>
            ? Esta acción no se puede deshacer.
          </p>
        }
        loading={eliminando}
        onConfirm={eliminarProducto}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  )
}
