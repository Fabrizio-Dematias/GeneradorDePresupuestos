import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha } from '../lib/format'
import { compararCodigos } from '../lib/medidas'
import { filtroTexto } from '../lib/consultas'
import { descargarExcelPedido } from '../lib/pedidos'
import { Button, ConfirmDialog, EmptyState, LoadingState } from './ui'
import { IconDownload, IconSearch, IconTrash } from './icons'
import { useToast } from './Toast'
import type { Pedido, PedidoItem, Proveedor } from '../types'

const unidades = (items: PedidoItem[]) => items.reduce((acc, i) => acc + i.cantidad, 0)

/**
 * Historial de pedidos guardados a un proveedor. Cada línea muestra el código
 * del proveedor junto al código DICOR, así se ve qué es cada cosa. Se puede
 * buscar por código y volver a descargar el Excel de cualquier pedido.
 */
export default function HistorialPedidos({
  proveedor,
  onCambio,
}: {
  proveedor: Proveedor
  /** Avisa cuando se elimina un pedido (para actualizar el contador). */
  onCambio: () => void
}) {
  const { toast } = useToast()
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null)
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set())
  const [busqueda, setBusqueda] = useState('')
  const [aEliminar, setAEliminar] = useState<Pedido | null>(null)
  const [eliminando, setEliminando] = useState(false)

  async function cargar() {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, pedido_items(*)')
      .eq('proveedor_id', proveedor.id)
      .order('fecha', { ascending: false })
      .order('id', { ascending: false })
    if (error) {
      toast('error', `No se pudo cargar el historial: ${error.message}`)
      setPedidos([])
      return
    }
    setPedidos((data as Pedido[]) ?? [])
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedor.id])

  async function eliminar() {
    if (!aEliminar) return
    setEliminando(true)
    const { error } = await supabase.rpc('eliminar_pedido', { p_pedido_id: aEliminar.id })
    setEliminando(false)
    if (error) {
      toast('error', `No se pudo eliminar el pedido: ${error.message}`)
      return
    }
    toast('success', `Pedido N° ${aEliminar.id} eliminado del historial.`)
    setAEliminar(null)
    cargar()
    onCambio()
  }

  function alternar(id: number) {
    setAbiertos((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  if (pedidos === null) return <LoadingState texto="Cargando historial…" />

  if (pedidos.length === 0) {
    return (
      <EmptyState
        title={`Todavía no guardaste pedidos a ${proveedor.nombre}`}
        description='Cuando armes un pedido y uses "Guardar y descargar Excel", va a quedar registrado acá.'
      />
    )
  }

  const q = filtroTexto(busqueda).toLowerCase()
  const coincide = (i: PedidoItem) =>
    [i.codigo_dicor, i.codigo_proveedor, i.descripcion ?? ''].some((t) => t.toLowerCase().includes(q))
  const visibles = q
    ? pedidos.filter((p) => p.pedido_items.some(coincide) || (p.nota ?? '').toLowerCase().includes(q))
    : pedidos

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar un código DICOR o del proveedor…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-500">
          {q
            ? `${visibles.length} de ${pedidos.length} pedidos incluyen "${busqueda.trim()}"`
            : `${pedidos.length} ${pedidos.length === 1 ? 'pedido guardado' : 'pedidos guardados'}`}
        </p>
      </div>

      {visibles.length === 0 ? (
        <EmptyState title="Sin resultados" description="Ningún pedido incluye ese código." />
      ) : (
        <ul className="space-y-3">
          {visibles.map((p) => {
            // Al buscar, los pedidos que coinciden se muestran abiertos
            const abierto = abiertos.has(p.id) || Boolean(q)
            const items = [...p.pedido_items].sort(
              (a, b) => compararCodigos(a.codigo_proveedor, b.codigo_proveedor) || compararCodigos(a.codigo_dicor, b.codigo_dicor)
            )
            const codigos = new Set(items.map((i) => i.codigo_proveedor)).size
            return (
              <li key={p.id} className="rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <button onClick={() => alternar(p.id)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold text-slate-800">
                      Pedido N° {p.id} · {formatFecha(p.fecha)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {codigos} {codigos === 1 ? 'código' : 'códigos'} · {unidades(items).toLocaleString('es-AR')} unidades
                      {p.total_estimado !== null && <> · estimado {formatARS(p.total_estimado)}</>}
                      {p.nota && <> · {p.nota}</>}
                    </p>
                  </button>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => alternar(p.id)}>
                      {abierto ? 'Ocultar' : 'Ver detalle'}
                    </Button>
                    <Button
                      variant="secondary"
                      className="!px-3 !py-1.5"
                      onClick={() => {
                        descargarExcelPedido(p.proveedor_nombre, items, p.fecha)
                        toast('success', `Excel del pedido N° ${p.id} descargado.`)
                      }}
                    >
                      <IconDownload className="h-4 w-4" /> Excel
                    </Button>
                    <Button
                      variant="secondary"
                      className="!px-3 !py-1.5"
                      onClick={() => setAEliminar(p)}
                      title="Eliminar del historial"
                      aria-label={`Eliminar el pedido N° ${p.id}`}
                    >
                      <IconTrash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {abierto && (
                  <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-2 font-medium">Cód. proveedor</th>
                          <th className="px-4 py-2 font-medium">Cód. DICOR</th>
                          <th className="px-4 py-2 font-medium">Producto</th>
                          <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                          <th className="px-4 py-2 font-medium">Nota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((i) => (
                          <tr key={i.id} className={q && coincide(i) ? 'bg-amber-50' : undefined}>
                            <td className="px-4 py-2 font-mono font-semibold text-slate-800">{i.codigo_proveedor}</td>
                            <td className="px-4 py-2 font-mono text-slate-700">{i.codigo_dicor}</td>
                            <td className="px-4 py-2">
                              <p className="max-w-[260px] truncate text-slate-700" title={i.descripcion ?? ''}>
                                {i.descripcion ?? '—'}
                              </p>
                            </td>
                            <td className="px-4 py-2 text-right font-semibold text-slate-900">{i.cantidad}</td>
                            <td className="px-4 py-2 text-slate-500">{i.nota ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="px-4 py-2 text-xs text-slate-400">
                      Condiciones al pedir: descuento {p.descuento}%
                      {p.cargo_unitario > 0 && ` · ${p.cargo_nombre ?? 'cargo'} ${formatARS(p.cargo_unitario)} por unidad`}
                    </p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={aEliminar !== null}
        title="Eliminar pedido del historial"
        message={
          <p>
            ¿Eliminar el <strong>pedido N° {aEliminar?.id}</strong> del {aEliminar ? formatFecha(aEliminar.fecha) : ''}?
            Solo se borra del historial: no cambia el stock ni los productos. Esta acción no se puede deshacer.
          </p>
        }
        loading={eliminando}
        onConfirm={eliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  )
}
