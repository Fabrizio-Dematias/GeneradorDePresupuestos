import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha } from '../lib/format'
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
  Pagination,
} from '../components/ui'
import {
  IconBan,
  IconDocumentList,
  IconDownload,
  IconEye,
  IconPencil,
  IconRefresh,
  IconSearch,
  IconTrash,
} from '../components/icons'
import { useToast } from '../components/Toast'
import { exportarCSV, fechaParaArchivo } from '../lib/csv'
import type { Remito, RemitoItem } from '../types'

const POR_PAGINA = 25

export default function Remitos() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [remitos, setRemitos] = useState<Remito[] | null>(null)
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)

  // Filtros (se aplican en el servidor)
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const [detalle, setDetalle] = useState<Remito | null>(null)
  const [itemsDetalle, setItemsDetalle] = useState<RemitoItem[] | null>(null)
  const [aEliminar, setAEliminar] = useState<Remito | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [aAnular, setAAnular] = useState<Remito | null>(null)
  const [anulando, setAnulando] = useState(false)
  const [aRestaurar, setARestaurar] = useState<Remito | null>(null)
  const [restaurando, setRestaurando] = useState(false)
  const [descargando, setDescargando] = useState<number | null>(null)
  const [exportando, setExportando] = useState(false)

  const hayFiltros = Boolean(busqueda.trim() || desde || hasta)

  // Al cambiar un filtro se vuelve a la primera página
  useEffect(() => {
    setPagina(1)
  }, [busqueda, desde, hasta])

  // Carga paginada desde el servidor (con un pequeño debounce para tipear)
  useEffect(() => {
    const timer = setTimeout(cargar, busqueda ? 300 : 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, busqueda, desde, hasta])

  async function cargar() {
    const from = (pagina - 1) * POR_PAGINA
    let query = supabase.from('remitos').select('*', { count: 'exact' })

    const q = busqueda.trim().replace(/[,()%]/g, ' ').trim()
    if (q) query = query.or(`numero.ilike.%${q}%,cliente_nombre.ilike.%${q}%`)
    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)

    const { data, count, error } = await query
      .order('fecha', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + POR_PAGINA - 1)

    if (error) {
      toast('error', 'No se pudieron cargar los remitos')
      setRemitos([])
      setTotal(0)
      return
    }
    setRemitos((data as Remito[]) ?? [])
    setTotal(count ?? 0)
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  /** Exporta a CSV todos los remitos que cumplen los filtros actuales (todas las páginas). */
  async function exportar() {
    setExportando(true)
    try {
      const LOTE = 1000
      const filas: Remito[] = []
      for (let desde_i = 0; ; desde_i += LOTE) {
        let query = supabase.from('remitos').select('*')
        const q = busqueda.trim().replace(/[,()%]/g, ' ').trim()
        if (q) query = query.or(`numero.ilike.%${q}%,cliente_nombre.ilike.%${q}%`)
        if (desde) query = query.gte('fecha', desde)
        if (hasta) query = query.lte('fecha', hasta)
        const { data, error } = await query
          .order('fecha', { ascending: false })
          .order('id', { ascending: false })
          .range(desde_i, desde_i + LOTE - 1)
        if (error) throw error
        filas.push(...((data as Remito[]) ?? []))
        if (!data || data.length < LOTE) break
      }
      exportarCSV(
        `remitos_${fechaParaArchivo()}`,
        ['Número', 'Fecha', 'Cliente', 'CUIT', 'Domicilio', 'Cond. IVA', 'Cond. venta', 'Total', 'Estado'],
        filas.map((r) => [
          r.numero,
          r.fecha,
          r.cliente_nombre,
          r.cliente_cuit,
          r.cliente_domicilio,
          r.condicion_iva,
          r.condicion_venta,
          r.total,
          r.estado ?? 'Completado',
        ])
      )
      toast('success', `Se exportaron ${filas.length} remitos a CSV.`)
    } catch (e: any) {
      toast('error', `No se pudo exportar: ${e.message ?? e}`)
    } finally {
      setExportando(false)
    }
  }

  async function abrirDetalle(remito: Remito) {
    setDetalle(remito)
    setItemsDetalle(null)
    const { data, error } = await supabase
      .from('remito_items')
      .select('*')
      .eq('remito_id', remito.id)
      .order('id')
    if (error) {
      toast('error', 'No se pudieron cargar los productos del remito')
      setItemsDetalle([])
      return
    }
    setItemsDetalle((data as RemitoItem[]) ?? [])
  }

  async function descargarPDF(remito: Remito) {
    setDescargando(remito.id)
    try {
      const { data, error } = await supabase
        .from('remito_items')
        .select('*')
        .eq('remito_id', remito.id)
        .order('id')
      if (error) throw error
      const { generarRemitoPDF } = await import('../lib/pdf')
      await generarRemitoPDF({
        numero: remito.numero,
        fecha: remito.fecha,
        clienteNombre: remito.cliente_nombre ?? '',
        clienteDomicilio: remito.cliente_domicilio ?? '',
        clienteCuit: remito.cliente_cuit ?? '',
        condicionIVA: remito.condicion_iva ?? 'Consumidor Final',
        condicionVenta: remito.condicion_venta ?? 'Contado',
        items: (data as RemitoItem[]) ?? [],
        total: remito.total,
        anulado: remito.estado === 'Anulado',
      })
      toast('success', `PDF del remito ${remito.numero} descargado.`)
    } catch (e: any) {
      toast('error', `No se pudo generar el PDF: ${e.message ?? e}`)
    } finally {
      setDescargando(null)
    }
  }

  async function anular() {
    if (!aAnular) return
    setAnulando(true)
    const { error } = await supabase.rpc('anular_remito', { p_remito_id: aAnular.id })
    setAnulando(false)
    if (error) {
      toast('error', `No se pudo anular el remito: ${error.message}`)
      return
    }
    toast('success', `Remito ${aAnular.numero} anulado y stock repuesto.`)
    setAAnular(null)
    setDetalle(null)
    cargar()
  }

  async function restaurar() {
    if (!aRestaurar) return
    setRestaurando(true)
    const { error } = await supabase.rpc('restaurar_remito', { p_remito_id: aRestaurar.id })
    setRestaurando(false)
    if (error) {
      toast('error', `No se pudo restaurar el remito: ${error.message}`)
      return
    }
    toast('success', `Remito ${aRestaurar.numero} restaurado: vuelve a estar vigente y el stock se descontó.`)
    setARestaurar(null)
    setDetalle(null)
    cargar()
  }

  async function eliminar() {
    if (!aEliminar) return
    setEliminando(true)
    // La función repone el stock descontado y recién después borra el remito
    let { error } = await supabase.rpc('eliminar_remito', { p_remito_id: aEliminar.id })

    // Si la función todavía no existe en la base (falta correr
    // migration_mejoras.sql), se borra como antes, sin reponer stock.
    if (error && (error.code === 'PGRST202' || /function/i.test(error.message ?? ''))) {
      const res = await supabase.from('remitos').delete().eq('id', aEliminar.id)
      error = res.error
      if (!error) {
        toast(
          'info',
          'Se eliminó sin reponer el stock: falta ejecutar migration_mejoras.sql en Supabase.'
        )
      }
    }
    setEliminando(false)
    if (error) {
      toast('error', `No se pudo eliminar el remito: ${error.message}`)
      return
    }
    toast(
      'success',
      aEliminar.estado === 'Anulado'
        ? `Remito ${aEliminar.numero} eliminado (el stock ya había sido repuesto al anularlo).`
        : `Remito ${aEliminar.numero} eliminado y stock repuesto.`
    )
    setAEliminar(null)
    setDetalle(null)
    cargar()
  }

  return (
    <div>
      <PageHeader
        title="Remitos"
        // Con el total solo no se entendía que la lista viene paginada
        subtitle={
          remitos
            ? totalPaginas > 1
              ? `${total} remitos emitidos · viendo la página ${pagina} de ${totalPaginas}`
              : `${total} remitos emitidos`
            : undefined
        }
        actions={
          <Link
            to="/remitos/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
          >
            Nuevo remito
          </Link>
        }
      />

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative flex-1 lg:max-w-md">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por número o cliente…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Input
              label="Desde"
              id="desde"
              type="date"
              className="!py-2"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)}
            />
            <Input
              label="Hasta"
              id="hasta"
              type="date"
              className="!py-2"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
            />
            {hayFiltros && (
              <Button
                variant="ghost"
                className="!py-2"
                onClick={() => {
                  setBusqueda('')
                  setDesde('')
                  setHasta('')
                }}
              >
                Limpiar
              </Button>
            )}
            <Button
              variant="secondary"
              className="!py-2"
              onClick={exportar}
              loading={exportando}
              disabled={total === 0}
              title="Exporta todos los remitos que cumplen los filtros"
            >
              <IconDownload className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {remitos === null ? (
          <LoadingState />
        ) : remitos.length === 0 ? (
          <EmptyState
            icon={<IconDocumentList className="h-12 w-12" />}
            title={hayFiltros ? 'Sin resultados' : 'Todavía no hay remitos'}
            description={
              hayFiltros
                ? 'Probá con otro número, cliente o rango de fechas.'
                : 'Cuando generes el primer remito va a aparecer acá.'
            }
          />
        ) : (
          <>
            {/* Tabla en escritorio */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-3 pr-4 font-medium">Número</th>
                    <th className="pb-3 pr-4 font-medium">Fecha</th>
                    <th className="pb-3 pr-4 font-medium">Cliente</th>
                    <th className="pb-3 pr-4 text-right font-medium">Total</th>
                    <th className="pb-3 pr-4 font-medium">Estado</th>
                    <th className="pb-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {remitos.map((r) => (
                    <tr key={r.id} className="transition hover:bg-slate-50">
                      <td className="py-3 pr-4 font-mono font-semibold text-slate-800">{r.numero}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatFecha(r.fecha)}</td>
                      <td className="max-w-[220px] truncate py-3 pr-4 font-medium text-slate-800">
                        {r.cliente_nombre || '—'}
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-900">
                        {formatARS(r.total)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge color={r.estado === 'Anulado' ? 'red' : 'green'}>
                          {r.estado ?? 'Completado'}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => abrirDetalle(r)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Ver detalle"
                          >
                            <IconEye className="h-5 w-5" />
                          </button>
                          {r.estado !== 'Anulado' && (
                            <button
                              onClick={() => navigate(`/remitos/${r.id}/editar`)}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                              title="Editar"
                            >
                              <IconPencil className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => descargarPDF(r)}
                            disabled={descargando === r.id}
                            className="rounded-lg p-2 text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
                            title="Descargar PDF"
                          >
                            <IconDownload className="h-5 w-5" />
                          </button>
                          {r.estado !== 'Anulado' ? (
                            <button
                              onClick={() => setAAnular(r)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                              title="Anular (repone stock, el remito queda en la historia)"
                            >
                              <IconBan className="h-5 w-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setARestaurar(r)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                              title="Restaurar (des-anular: vuelve a descontar el stock)"
                            >
                              <IconRefresh className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => setAEliminar(r)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Eliminar definitivamente"
                          >
                            <IconTrash className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas en móvil */}
            <ul className="space-y-3 md:hidden">
              {remitos.map((r) => (
                <li key={r.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{r.cliente_nombre || '—'}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="font-mono">{r.numero}</span> · {formatFecha(r.fecha)}
                        {r.estado === 'Anulado' && (
                          <span className="ml-2">
                            <Badge color="red">Anulado</Badge>
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-slate-900">{formatARS(r.total)}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" className="flex-1 !py-1.5" onClick={() => abrirDetalle(r)}>
                      <IconEye className="h-4 w-4" /> Ver
                    </Button>
                    {r.estado !== 'Anulado' && (
                      <Button
                        variant="secondary"
                        className="flex-1 !py-1.5"
                        onClick={() => navigate(`/remitos/${r.id}/editar`)}
                      >
                        <IconPencil className="h-4 w-4" /> Editar
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      className="flex-1 !py-1.5"
                      onClick={() => descargarPDF(r)}
                      loading={descargando === r.id}
                    >
                      <IconDownload className="h-4 w-4" /> PDF
                    </Button>
                    {r.estado !== 'Anulado' ? (
                      <Button variant="secondary" className="!px-3 !py-1.5" onClick={() => setAAnular(r)}>
                        <IconBan className="h-4 w-4 text-amber-500" />
                      </Button>
                    ) : (
                      <Button variant="secondary" className="!px-3 !py-1.5" onClick={() => setARestaurar(r)}>
                        <IconRefresh className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <Pagination
              pagina={pagina}
              totalPaginas={totalPaginas}
              totalResultados={total}
              onChange={setPagina}
            />
          </>
        )}
      </Card>

      {/* Modal de detalle */}
      <Modal
        open={detalle !== null}
        onClose={() => setDetalle(null)}
        title={detalle ? `Remito ${detalle.numero}` : ''}
        size="lg"
        footer={
          detalle && (
            <>
              <Button variant="secondary" onClick={() => setAEliminar(detalle)}>
                <IconTrash className="h-4 w-4 text-red-500" /> Eliminar
              </Button>
              {detalle.estado !== 'Anulado' ? (
                <>
                  <Button variant="secondary" onClick={() => setAAnular(detalle)}>
                    <IconBan className="h-4 w-4 text-amber-500" /> Anular
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(`/remitos/${detalle.id}/editar`)}>
                    <IconPencil className="h-4 w-4" /> Editar
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setARestaurar(detalle)}>
                  <IconRefresh className="h-4 w-4 text-emerald-600" /> Restaurar
                </Button>
              )}
              <Button onClick={() => descargarPDF(detalle)} loading={descargando === detalle.id}>
                <IconDownload className="h-4 w-4" /> Descargar PDF
              </Button>
            </>
          )
        }
      >
        {detalle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Fecha</p>
                <p className="font-medium text-slate-800">{formatFecha(detalle.fecha)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Cliente</p>
                <p className="font-medium text-slate-800">{detalle.cliente_nombre || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">CUIT</p>
                <p className="font-medium text-slate-800">{detalle.cliente_cuit || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Domicilio</p>
                <p className="font-medium text-slate-800">{detalle.cliente_domicilio || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Cond. IVA</p>
                <p className="font-medium text-slate-800">{detalle.condicion_iva ?? 'Consumidor Final'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Venta</p>
                <p className="font-medium text-slate-800">{detalle.condicion_venta ?? 'Contado'}</p>
              </div>
            </div>

            {itemsDetalle === null ? (
              <LoadingState texto="Cargando productos…" />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Código</th>
                      <th className="px-3 py-2 text-center font-medium">Cant.</th>
                      <th className="px-3 py-2 font-medium">Descripción</th>
                      <th className="px-3 py-2 text-right font-medium">P. Unit.</th>
                      <th className="px-3 py-2 text-center font-medium">Bonif.</th>
                      <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsDetalle.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 font-mono text-slate-600">{item.codigo}</td>
                        <td className="px-3 py-2 text-center">{item.cantidad}</td>
                        <td className="px-3 py-2">{item.descripcion}</td>
                        <td className="px-3 py-2 text-right">{formatARS(item.precio_unitario)}</td>
                        <td className="px-3 py-2 text-center">{item.bonificacion}%</td>
                        <td className="px-3 py-2 text-right font-medium">{formatARS(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50">
                      <td colSpan={5} className="px-3 py-2.5 text-right text-sm font-semibold text-slate-600">
                        TOTAL
                      </td>
                      <td className="px-3 py-2.5 text-right text-base font-bold text-slate-900">
                        {formatARS(detalle.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={aAnular !== null}
        title="Anular remito"
        confirmLabel="Anular"
        message={
          <p>
            ¿Anular el remito <strong className="font-mono">{aAnular?.numero}</strong> de{' '}
            <strong>{aAnular?.cliente_nombre}</strong>? El stock descontado se repone y el
            remito queda en el listado como <strong>Anulado</strong> (excluido de la
            facturación y los reportes).
          </p>
        }
        loading={anulando}
        onConfirm={anular}
        onCancel={() => setAAnular(null)}
      />

      <ConfirmDialog
        open={aRestaurar !== null}
        title="Restaurar remito"
        confirmLabel="Restaurar"
        confirmVariant="primary"
        message={
          <p>
            ¿Restaurar el remito <strong className="font-mono">{aRestaurar?.numero}</strong> de{' '}
            <strong>{aRestaurar?.cliente_nombre}</strong>? Vuelve al estado{' '}
            <strong>Completado</strong>, el stock de sus productos se descuenta de nuevo y
            se vuelve a contar en la facturación.
          </p>
        }
        loading={restaurando}
        onConfirm={restaurar}
        onCancel={() => setARestaurar(null)}
      />

      <ConfirmDialog
        open={aEliminar !== null}
        title="Eliminar remito definitivamente"
        message={
          <p>
            ¿Seguro que querés <strong>borrar para siempre</strong> el remito{' '}
            <strong className="font-mono">{aEliminar?.numero}</strong> de{' '}
            <strong>{aEliminar?.cliente_nombre}</strong>?{' '}
            {aEliminar?.estado === 'Anulado'
              ? 'El stock ya fue repuesto cuando se anuló.'
              : 'El stock descontado se repone automáticamente.'}{' '}
            Para una venta real conviene <strong>Anular</strong>, que conserva la historia.
            Esta acción no se puede deshacer.
          </p>
        }
        loading={eliminando}
        onConfirm={eliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  )
}
