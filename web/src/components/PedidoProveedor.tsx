import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, hoyISO } from '../lib/format'
import { compararCodigos } from '../lib/medidas'
import { filtroTexto } from '../lib/consultas'
import { redondearCentavos, totalesPedido } from '../lib/costos'
import { agruparPorCodigo, descargarExcelPedido, type LineaPedido } from '../lib/pedidos'
import { Button, EmptyState, Segmented, StockPill } from './ui'
import { IconDownload, IconSearch, IconX } from './icons'
import { useToast } from './Toast'
import { estadoStock, type Producto, type ProductoProveedor, type Proveedor } from '../types'

type Linea = { cantidad: string; nota: string }
type Filtro = 'todos' | 'reponer' | 'pedido'

const claveBorrador = (proveedorId: number) => `dicor-pedido-${proveedorId}`

function leerBorrador(proveedorId: number): Record<number, Linea> {
  try {
    return JSON.parse(localStorage.getItem(claveBorrador(proveedorId)) ?? '{}')
  } catch {
    return {}
  }
}

/** Cantidad escrita: entero mayor o igual a 0 (vacío = 0). null si no es válida. */
function leerCantidad(texto: string): number | null {
  const t = texto.trim()
  if (!t) return 0
  if (!/^\d+$/.test(t)) return null
  return Number(t)
}

/**
 * Arma el pedido a un proveedor: se elige cuánto pedir de cada producto (con
 * el stock a la vista) y al costado se va viendo el pedido tal como va a
 * salir. Al guardarlo queda en el historial y se descarga el Excel (código del
 * proveedor y cantidad). Mientras se arma, el borrador queda en este navegador.
 */
export default function PedidoProveedor({
  proveedor,
  productos,
  vinculos,
  onGuardado,
}: {
  proveedor: Proveedor
  productos: Producto[]
  vinculos: ProductoProveedor[]
  onGuardado: () => void
}) {
  const { toast } = useToast()
  const [pedido, setPedido] = useState<Record<number, Linea>>(() => leerBorrador(proveedor.id))
  const [notaPedido, setNotaPedido] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(claveBorrador(proveedor.id), JSON.stringify(pedido))
    } catch {
      // sin localStorage el pedido se arma igual, solo no se recuerda
    }
  }, [pedido, proveedor.id])

  const productoPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos])

  // Productos de este proveedor, con su código y su precio de lista
  const filas = useMemo(() => {
    return vinculos
      .map((v) => ({ vinculo: v, producto: productoPorId.get(v.producto_id) }))
      .filter((f): f is { vinculo: ProductoProveedor; producto: Producto } => Boolean(f.producto))
      .sort((a, b) => compararCodigos(a.producto.codigo, b.producto.codigo))
  }, [vinculos, productoPorId])

  const lineas = filas.map((f) => ({
    ...f,
    cantidad: leerCantidad(pedido[f.producto.id]?.cantidad ?? ''),
    nota: pedido[f.producto.id]?.nota ?? '',
  }))
  const conPedido = lineas.filter((l) => l.cantidad !== null && l.cantidad > 0)
  const invalidas = lineas.filter((l) => l.cantidad === null)

  // Lo que va a salir en el Excel, agrupado por código del proveedor
  const lineasPedido: LineaPedido[] = conPedido.map((l) => ({
    codigo_dicor: l.producto.codigo,
    codigo_proveedor: l.vinculo.codigo_proveedor,
    cantidad: l.cantidad as number,
    nota: l.nota,
  }))
  const vistaPrevia = agruparPorCodigo(lineasPedido)
  const idPorCodigoDicor = new Map(filas.map((f) => [f.producto.codigo, f.producto.id]))

  const q = filtroTexto(busqueda).toLowerCase()
  const visibles = lineas.filter(({ producto: p, vinculo: v, cantidad }) => {
    if (filtro === 'reponer' && estadoStock(p) === 'ok') return false
    if (filtro === 'pedido' && !(cantidad && cantidad > 0)) return false
    if (!q) return true
    return [p.codigo, v.codigo_proveedor, p.descripcion, p.medidas ?? ''].some((t) =>
      String(t).toLowerCase().includes(q)
    )
  })

  const calculado = totalesPedido(
    conPedido.map((l) => ({ cantidad: l.cantidad as number, precioLista: l.vinculo.precio_lista })),
    proveedor
  )
  const totales = {
    ...calculado,
    lista: redondearCentavos(calculado.lista),
    descuento: redondearCentavos(calculado.descuento),
    cargo: redondearCentavos(calculado.cargo),
    total: redondearCentavos(calculado.total),
  }

  function editar(productoId: number, campo: keyof Linea, valor: string) {
    setPedido((prev) => {
      const actual = prev[productoId] ?? { cantidad: '', nota: '' }
      const nueva = { ...actual, [campo]: valor }
      const siguiente = { ...prev }
      if (!nueva.cantidad && !nueva.nota) delete siguiente[productoId]
      else siguiente[productoId] = nueva
      return siguiente
    })
  }

  /** Saca del pedido todos los productos de una línea de la vista previa. */
  function quitarLinea(codigosDicor: string[]) {
    setPedido((prev) => {
      const siguiente = { ...prev }
      for (const c of codigosDicor) {
        const id = idPorCodigoDicor.get(c)
        if (id !== undefined) delete siguiente[id]
      }
      return siguiente
    })
  }

  /** Completa con lo que falta para llegar al stock mínimo (solo donde no se escribió nada). */
  function completarHastaMinimo() {
    let completados = 0
    const siguiente = { ...pedido }
    for (const { producto: p } of filas) {
      if (p.stock_minimo <= 0 || p.stock >= p.stock_minimo) continue
      if (siguiente[p.id]?.cantidad?.trim()) continue
      siguiente[p.id] = { cantidad: String(p.stock_minimo - p.stock), nota: siguiente[p.id]?.nota ?? '' }
      completados += 1
    }
    setPedido(siguiente)
    toast(
      completados > 0 ? 'success' : 'info',
      completados > 0
        ? `Se completaron ${completados} ${completados === 1 ? 'producto' : 'productos'} hasta su stock mínimo.`
        : 'No hay productos por debajo del mínimo sin cantidad cargada.'
    )
  }

  function puedeSalir(): boolean {
    if (invalidas.length > 0) {
      toast('error', 'Hay cantidades que no son números enteros: corregilas antes de seguir.')
      return false
    }
    return conPedido.length > 0
  }

  async function guardarYDescargar() {
    if (!puedeSalir()) return
    setGuardando(true)
    const { data, error } = await supabase.rpc('guardar_pedido', {
      p_proveedor_id: proveedor.id,
      p_items: conPedido.map((l) => ({
        producto_id: l.producto.id,
        cantidad: l.cantidad,
        nota: l.nota.trim() || null,
      })),
      p_nota: notaPedido.trim() || null,
      // La fecha local: la base trabaja en hora UTC y a la noche ya sería mañana
      p_fecha: hoyISO(),
    })
    setGuardando(false)
    if (error) {
      toast('error', `No se pudo guardar el pedido: ${error.message}`)
      return
    }
    descargarExcelPedido(proveedor.nombre, lineasPedido)
    toast('success', `Pedido N° ${data?.id ?? ''} guardado en el historial y Excel descargado.`)
    setPedido({})
    setNotaPedido('')
    onGuardado()
  }

  function soloDescargar() {
    if (!puedeSalir()) return
    const n = descargarExcelPedido(proveedor.nombre, lineasPedido)
    toast('info', `Excel descargado (${n} códigos). El pedido no se guardó en el historial.`)
  }

  if (filas.length === 0) {
    return (
      <EmptyState
        title={`Todavía no hay productos con código de ${proveedor.nombre}`}
        description="Cargá los códigos en la pestaña Códigos y precios y van a aparecer acá para armar el pedido."
      />
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      {/* Vista previa: al costado en pantallas anchas, arriba en las chicas */}
      <aside className="h-fit space-y-4 rounded-xl border border-slate-200 p-4 xl:sticky xl:top-8 xl:order-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Vista previa del pedido</p>
          <p className="text-xs text-slate-500">
            {vistaPrevia.length} {vistaPrevia.length === 1 ? 'código' : 'códigos'} ·{' '}
            {totales.unidades.toLocaleString('es-AR')} unidades · así sale en el Excel
          </p>
        </div>

        {vistaPrevia.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
            Escribí cantidades en la lista y el pedido se va armando acá.
          </p>
        ) : (
          <ul className="max-h-[45vh] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {vistaPrevia.map((l) => (
              <li key={l.codigo_proveedor} className="flex items-start gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-900">{l.codigo_proveedor}</span>
                    <span className="text-sm font-semibold text-slate-900">{l.cantidad.toLocaleString('es-AR')}</span>
                  </div>
                  <p className="truncate text-xs text-slate-500" title="Códigos DICOR que forman esta línea">
                    DICOR{' '}
                    {l.dicor.length === 1
                      ? l.dicor[0].codigo
                      : l.dicor.map((d) => `${d.codigo} ×${d.cantidad}`).join(' · ')}
                  </p>
                  {l.notas.length > 0 && <p className="truncate text-xs italic text-slate-500">{l.notas.join(' / ')}</p>}
                </div>
                <button
                  onClick={() => quitarLinea(l.dicor.map((d) => d.codigo))}
                  className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  title="Quitar del pedido"
                  aria-label={`Quitar el código ${l.codigo_proveedor} del pedido`}
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Precio de lista</dt>
            <dd className="text-slate-800">{formatARS(totales.lista)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Descuento {proveedor.descuento}%</dt>
            <dd className="text-slate-800">−{formatARS(totales.descuento)}</dd>
          </div>
          {proveedor.cargo_unitario > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">
                {proveedor.cargo_nombre} ({totales.unidades.toLocaleString('es-AR')} × {formatARS(proveedor.cargo_unitario)})
              </dt>
              <dd className="text-slate-800">+{formatARS(totales.cargo)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-slate-200 pt-1.5 font-semibold">
            <dt className="text-slate-700">Total estimado</dt>
            <dd className="text-slate-900">{formatARS(totales.total)}</dd>
          </div>
        </dl>

        {totales.sinPrecio > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {totales.sinPrecio} {totales.sinPrecio === 1 ? 'producto no tiene' : 'productos no tienen'} precio del
            proveedor cargado: el estimado no los incluye (el {proveedor.cargo_nombre.toLowerCase()} sí).
          </p>
        )}

        <div>
          <label htmlFor="nota-pedido" className="label">
            Nota del pedido (opcional, queda en el historial)
          </label>
          <input
            id="nota-pedido"
            className="input !py-1.5"
            maxLength={500}
            placeholder="Ej.: pedido por WhatsApp a Mario"
            value={notaPedido}
            onChange={(e) => setNotaPedido(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Button className="w-full" onClick={guardarYDescargar} loading={guardando} disabled={conPedido.length === 0}>
            <IconDownload className="h-4 w-4" /> Guardar y descargar Excel
          </Button>
          <Button
            variant="secondary"
            className="w-full !py-1.5"
            onClick={soloDescargar}
            disabled={conPedido.length === 0 || guardando}
          >
            Solo descargar Excel (sin guardar)
          </Button>
          {Object.keys(pedido).length > 0 && (
            <Button variant="ghost" className="w-full !py-1.5" onClick={() => setPedido({})} disabled={guardando}>
              Vaciar pedido
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-500">
          El Excel lleva solo código del proveedor y cantidad (y la nota, si hay). Si dos productos tuyos comparten el
          código, van sumados en una línea. En el historial se guarda además qué código DICOR es cada uno.
        </p>
      </aside>

      <div className="min-w-0 xl:order-1">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Buscar código, descripción, medida…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Segmented<Filtro>
            size="sm"
            value={filtro}
            onChange={setFiltro}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'reponer', label: <span className="whitespace-nowrap">Sin stock o bajo mínimo</span> },
              { value: 'pedido', label: <span className="whitespace-nowrap">En el pedido</span> },
            ]}
          />
          <Button variant="secondary" className="!py-2" onClick={completarHastaMinimo}>
            Completar hasta el mínimo
          </Button>
        </div>

        {visibles.length === 0 ? (
          <EmptyState title="Sin productos" description="Probá con otra búsqueda o filtro." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-3 font-medium">Pedir</th>
                  <th className="pb-3 pr-3 font-medium">Cód. DICOR</th>
                  <th className="pb-3 pr-3 font-medium">Cód. prov.</th>
                  <th className="pb-3 pr-3 font-medium">Producto</th>
                  <th className="pb-3 pr-3 text-center font-medium">Stock</th>
                  <th className="pb-3 font-medium">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map(({ producto: p, vinculo: v, cantidad }) => (
                  <tr key={p.id} className={cantidad && cantidad > 0 ? 'bg-slate-50' : undefined}>
                    <td className="py-2 pr-3">
                      <input
                        className={`input w-16 !py-1.5 text-right ${cantidad === null ? '!border-red-400' : ''}`}
                        aria-label={`Cantidad a pedir de ${p.codigo}`}
                        inputMode="numeric"
                        value={pedido[p.id]?.cantidad ?? ''}
                        onChange={(e) => editar(p.id, 'cantidad', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-3 font-mono font-semibold text-slate-800">{p.codigo}</td>
                    <td className="py-2 pr-3 font-mono text-slate-700">{v.codigo_proveedor}</td>
                    <td className="py-2 pr-3">
                      <div className="max-w-[200px]">
                        <p className="truncate text-slate-800" title={p.descripcion}>
                          {p.descripcion}
                        </p>
                        {p.medidas && <p className="truncate text-xs text-slate-400">{p.medidas}</p>}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <StockPill stock={p.stock} minimo={p.stock_minimo} />
                      {p.stock_minimo > 0 && <p className="mt-0.5 text-xs text-slate-400">mín. {p.stock_minimo}</p>}
                    </td>
                    <td className="py-2">
                      <input
                        className="input w-28 !py-1.5"
                        aria-label={`Nota para ${p.codigo}`}
                        placeholder="Ej.: C/ CORTE"
                        maxLength={100}
                        value={pedido[p.id]?.nota ?? ''}
                        onChange={(e) => editar(p.id, 'nota', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
