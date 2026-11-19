import { useEffect, useMemo, useState } from 'react'
import { formatARS } from '../lib/format'
import { compararCodigos } from '../lib/medidas'
import { filtroTexto } from '../lib/consultas'
import { redondearCentavos, totalesPedido } from '../lib/costos'
import { descargarXlsx } from '../lib/xlsxEscritura'
import { Button, EmptyState, Segmented, StockPill } from './ui'
import { IconDownload, IconSearch } from './icons'
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

/** Fecha de hoy como en los nombres de tus pedidos: 08-10-2026 */
function fechaArchivo(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

/**
 * Arma el pedido a un proveedor: se elige cuánto pedir de cada producto (con
 * el stock a la vista) y se descarga un Excel con el código del proveedor y la
 * cantidad, listo para mandar o para retocar. El borrador queda guardado en
 * este navegador hasta que se vacíe.
 */
export default function PedidoProveedor({
  proveedor,
  productos,
  vinculos,
}: {
  proveedor: Proveedor
  productos: Producto[]
  vinculos: ProductoProveedor[]
}) {
  const { toast } = useToast()
  const [pedido, setPedido] = useState<Record<number, Linea>>(() => leerBorrador(proveedor.id))
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')

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

  const lineas = filas
    .map((f) => ({ ...f, cantidad: leerCantidad(pedido[f.producto.id]?.cantidad ?? ''), nota: pedido[f.producto.id]?.nota ?? '' }))
  const conPedido = lineas.filter((l) => l.cantidad !== null && l.cantidad > 0)
  const invalidas = lineas.filter((l) => l.cantidad === null)

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

  function descargar() {
    if (invalidas.length > 0) {
      toast('error', 'Hay cantidades que no son números enteros: corregilas antes de descargar.')
      return
    }
    // Una línea por código del proveedor: si dos productos tuyos comparten el
    // código, van sumados (el proveedor los despacha como un mismo artículo).
    const porCodigo = new Map<string, { cantidad: number; notas: string[] }>()
    for (const l of conPedido) {
      const codigo = l.vinculo.codigo_proveedor.trim()
      const actual = porCodigo.get(codigo) ?? { cantidad: 0, notas: [] }
      actual.cantidad += l.cantidad as number
      if (l.nota.trim() && !actual.notas.includes(l.nota.trim())) actual.notas.push(l.nota.trim())
      porCodigo.set(codigo, actual)
    }
    const codigos = Array.from(porCodigo.keys()).sort(compararCodigos)
    const hayNotas = codigos.some((c) => porCodigo.get(c)!.notas.length > 0)
    // Los códigos que son solo números van como número, igual que en los pedidos que ya mandás
    const celdaCodigo = (c: string) => (/^[1-9]\d{0,14}$/.test(c) ? Number(c) : c)

    const encabezado = hayNotas ? ['CODIGO', 'CANTIDAD', 'NOTA'] : ['CODIGO', 'CANTIDAD']
    const cuerpo = codigos.map((c) => {
      const { cantidad, notas } = porCodigo.get(c)!
      return hayNotas ? [celdaCodigo(c), cantidad, notas.join(' / ')] : [celdaCodigo(c), cantidad]
    })
    const nombre = proveedor.nombre.replace(/[\\/:*?"<>|]/g, ' ').trim().toUpperCase()
    descargarXlsx(`PEDIDO ${nombre} ${fechaArchivo()}`, [
      { nombre: `Pedido ${proveedor.nombre}`, encabezado: true, anchos: hayNotas ? [12, 11, 30] : [12, 11], filas: [encabezado, ...cuerpo] },
    ])
    toast('success', `Pedido descargado: ${codigos.length} códigos, ${totales.unidades} unidades.`)
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
    <div className="grid gap-6 2xl:grid-cols-[1fr_320px]">
      {/* Resumen del pedido: arriba de la tabla, o al costado en pantallas muy anchas */}
      <aside className="h-fit rounded-xl border border-slate-200 p-4 2xl:sticky 2xl:top-8 2xl:order-2">
        <div className="space-y-4 lg:flex lg:gap-8 lg:space-y-0 2xl:block 2xl:space-y-4">
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Pedido a {proveedor.nombre}</p>
              <p className="text-xs text-slate-500">
                {conPedido.length} {conPedido.length === 1 ? 'producto' : 'productos'} · {totales.unidades.toLocaleString('es-AR')} unidades
              </p>
            </div>

            <dl className="space-y-1.5 text-sm">
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
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 font-semibold">
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
          </div>

          <div className="space-y-3 lg:w-72 lg:shrink-0 2xl:w-auto">
            <Button className="w-full" onClick={descargar} disabled={conPedido.length === 0}>
              <IconDownload className="h-4 w-4" /> Descargar Excel
            </Button>
            <p className="text-xs text-slate-500">
              El Excel lleva solo código del proveedor y cantidad (y la nota, si cargaste alguna). Si dos productos tuyos
              tienen el mismo código, van sumados en una línea.
            </p>
            {Object.keys(pedido).length > 0 && (
              <Button variant="ghost" className="w-full" onClick={() => setPedido({})}>
                Vaciar pedido
              </Button>
            )}
          </div>
        </div>
      </aside>
      <div className="min-w-0 2xl:order-1">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
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
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-3 font-medium">Pedir</th>
                  <th className="pb-3 pr-3 font-medium">Cód. DICOR</th>
                  <th className="pb-3 pr-3 font-medium">Cód. proveedor</th>
                  <th className="pb-3 pr-3 font-medium">Producto</th>
                  <th className="pb-3 pr-3 text-center font-medium">Stock</th>
                  <th className="pb-3 pr-3 text-center font-medium">Mín.</th>
                  <th className="pb-3 font-medium">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map(({ producto: p, vinculo: v, cantidad }) => (
                  <tr key={p.id} className={cantidad && cantidad > 0 ? 'bg-slate-50' : undefined}>
                    <td className="py-2 pr-3">
                      <input
                        className={`input w-20 !py-1.5 text-right ${cantidad === null ? '!border-red-400' : ''}`}
                        aria-label={`Cantidad a pedir de ${p.codigo}`}
                        inputMode="numeric"
                        value={pedido[p.id]?.cantidad ?? ''}
                        onChange={(e) => editar(p.id, 'cantidad', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-3 font-mono font-semibold text-slate-800">{p.codigo}</td>
                    <td className="py-2 pr-3 font-mono text-slate-700">{v.codigo_proveedor}</td>
                    <td className="max-w-[200px] py-2 pr-3">
                      <p className="truncate text-slate-800" title={p.descripcion}>
                        {p.descripcion}
                      </p>
                      {p.medidas && <p className="text-xs text-slate-400">{p.medidas}</p>}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <StockPill stock={p.stock} minimo={p.stock_minimo} />
                    </td>
                    <td className="py-2 pr-3 text-center text-slate-500">{p.stock_minimo > 0 ? p.stock_minimo : '—'}</td>
                    <td className="py-2">
                      <input
                        className="input w-32 !py-1.5"
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
