import { KeyboardEvent, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { parsearNumero } from '../lib/importar'
import { compararCodigos } from '../lib/medidas'
import { calcularMargen, costoUnitario, redondearCentavos } from '../lib/costos'
import { filtroTexto } from '../lib/consultas'
import { Button, EmptyState, Segmented, Select } from './ui'
import { IconSearch } from './icons'
import { useToast } from './Toast'
import type { Producto, ProductoProveedor, Proveedor } from '../types'

/** Lo que se escribió en la grilla y todavía no se guardó, por producto. */
export type BorradorCodigos = Record<number, { codigo: string; precio: string }>

type Mostrar = 'todos' | 'con' | 'sin'

const TANDA = 200
const CLAVE_BONIFICACION = 'dicor-bonificacion-simulada'

const precioParaInput = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

function leerBonificacion(): string {
  try {
    return localStorage.getItem(CLAVE_BONIFICACION) ?? ''
  } catch {
    return ''
  }
}

/**
 * Grilla para asignar a cada producto propio el código y el precio de lista
 * del proveedor, con el costo final y el margen (solo se ve en esta pantalla).
 */
export default function CodigosProveedor({
  proveedor,
  productos,
  vinculos,
  borrador,
  setBorrador,
  onGuardado,
}: {
  proveedor: Proveedor
  productos: Producto[]
  vinculos: ProductoProveedor[]
  borrador: BorradorCodigos
  setBorrador: (b: BorradorCodigos) => void
  onGuardado: () => void
}) {
  const { toast } = useToast()
  const [categoria, setCategoria] = useState('TODAS')
  const [busqueda, setBusqueda] = useState('')
  const [mostrar, setMostrar] = useState<Mostrar>('todos')
  const [bonificacion, setBonificacion] = useState(leerBonificacion)
  const [guardando, setGuardando] = useState(false)

  const vinculoPorProducto = useMemo(() => new Map(vinculos.map((v) => [v.producto_id, v])), [vinculos])
  const productoPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos])
  const categorias = useMemo(
    () => Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean))).sort(),
    [productos]
  )

  const bonifNum = parsearNumero(bonificacion) ?? 0
  const bonifValida = bonifNum >= 0 && bonifNum < 100

  function cambiarBonificacion(texto: string) {
    setBonificacion(texto)
    try {
      localStorage.setItem(CLAVE_BONIFICACION, texto)
    } catch {
      // sin localStorage (modo privado) se usa igual, solo no se recuerda
    }
  }

  /** Valores que se ven en la fila: lo escrito si hay, si no lo guardado. */
  function valores(p: Producto) {
    const enBorrador = borrador[p.id]
    if (enBorrador) return enBorrador
    const v = vinculoPorProducto.get(p.id)
    return { codigo: v?.codigo_proveedor ?? '', precio: precioParaInput(v?.precio_lista) }
  }

  // Cambios pendientes, validados
  const cambios = useMemo(() => {
    const lista: { producto: Producto; codigo: string; precio: number | null; error: string | null }[] = []
    for (const [id, v] of Object.entries(borrador)) {
      const producto = productoPorId.get(Number(id))
      if (!producto) continue
      const codigo = v.codigo.trim()
      const precio = v.precio.trim() ? parsearNumero(v.precio) : null
      const guardado = vinculoPorProducto.get(producto.id)
      let error: string | null = null
      if (v.precio.trim() && (precio === null || precio < 0)) error = 'Precio inválido'
      else if (!codigo && precio !== null) error = 'Falta el código'
      else if (codigo.length > 50) error = 'Código demasiado largo'
      const precioRedondeado = precio === null ? null : Math.round(precio * 100) / 100
      const igual =
        (guardado?.codigo_proveedor ?? '') === codigo && (guardado?.precio_lista ?? null) === precioRedondeado
      if (!igual || error) lista.push({ producto, codigo, precio: precioRedondeado, error })
    }
    return lista
  }, [borrador, productoPorId, vinculoPorProducto])
  const errores = cambios.filter((c) => c.error)
  const cambioPorProducto = new Map(cambios.map((c) => [c.producto.id, c]))

  const filas = useMemo(() => {
    const q = filtroTexto(busqueda).toLowerCase()
    return productos
      .filter((p) => categoria === 'TODAS' || p.categoria === categoria)
      // Los filtros miran lo guardado (no lo que se está escribiendo): así una
      // fila no desaparece de la lista en medio de la carga
      .filter((p) => {
        const tiene = vinculoPorProducto.has(p.id)
        return mostrar === 'todos' || (mostrar === 'con' ? tiene : !tiene)
      })
      .filter((p) => {
        if (!q) return true
        const codProv = vinculoPorProducto.get(p.id)?.codigo_proveedor ?? ''
        return [p.codigo, p.descripcion, p.medidas ?? '', p.modelo ?? '', codProv].some((t) =>
          String(t).toLowerCase().includes(q)
        )
      })
      .sort((a, b) => compararCodigos(a.codigo, b.codigo))
  }, [productos, categoria, mostrar, busqueda, vinculoPorProducto])

  function editar(p: Producto, campo: 'codigo' | 'precio', valor: string) {
    setBorrador({ ...borrador, [p.id]: { ...valores(p), [campo]: valor } })
  }

  /** Enter: del código pasa al precio, y del precio al código de la fila siguiente. */
  function alPresionar(e: KeyboardEvent<HTMLInputElement>, fila: number, campo: 'codigo' | 'precio') {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const destino = campo === 'codigo' ? `[data-fila="${fila}"][data-campo="precio"]` : `[data-fila="${fila + 1}"][data-campo="codigo"]`
    document.querySelector<HTMLInputElement>(destino)?.focus()
  }

  async function guardar() {
    if (errores.length > 0 || cambios.length === 0) return
    const ahora = new Date().toISOString()
    const altas = cambios
      .filter((c) => c.codigo)
      .map((c) => ({
        producto_id: c.producto.id,
        proveedor_id: proveedor.id,
        codigo_proveedor: c.codigo,
        precio_lista: c.precio,
        fecha_actualizacion: ahora,
      }))
    const bajas = cambios.filter((c) => !c.codigo && vinculoPorProducto.has(c.producto.id)).map((c) => c.producto.id)

    setGuardando(true)
    try {
      for (let i = 0; i < altas.length; i += TANDA) {
        const { error } = await supabase
          .from('producto_proveedor')
          .upsert(altas.slice(i, i + TANDA), { onConflict: 'proveedor_id,producto_id' })
        if (error) throw error
      }
      for (let i = 0; i < bajas.length; i += TANDA) {
        const { error } = await supabase
          .from('producto_proveedor')
          .delete()
          .eq('proveedor_id', proveedor.id)
          .in('producto_id', bajas.slice(i, i + TANDA))
        if (error) throw error
      }
      toast('success', `Se guardaron ${cambios.length} ${cambios.length === 1 ? 'cambio' : 'cambios'}.`)
      onGuardado()
    } catch (e: any) {
      toast('error', `No se pudieron guardar los cambios: ${e.message ?? e}`)
    } finally {
      setGuardando(false)
    }
  }

  const conCodigo = vinculos.length
  const conPrecio = vinculos.filter((v) => v.precio_lista !== null).length

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative flex-1 lg:max-w-sm">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar código, descripción, medida…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Categoría"
            id="codigos-categoria"
            className="!py-2"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="TODAS">Todas</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Segmented<Mostrar>
            size="sm"
            value={mostrar}
            onChange={setMostrar}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'con', label: <span className="whitespace-nowrap">Con código</span> },
              { value: 'sin', label: <span className="whitespace-nowrap">Sin código</span> },
            ]}
          />
          <div className="w-44">
            <label htmlFor="bonificacion-simulada" className="label">
              Margen con bonificación
            </label>
            <div className="relative">
              <input
                id="bonificacion-simulada"
                className="input !py-2 pr-8"
                inputMode="decimal"
                placeholder="0"
                value={bonificacion}
                onChange={(e) => cambiarBonificacion(e.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        {conCodigo} {conCodigo === 1 ? 'producto' : 'productos'} con código de {proveedor.nombre} · {conPrecio} con
        precio cargado. El margen compara tu precio de venta
        {bonifValida && bonifNum > 0 ? ` con ${bonifNum}% de bonificación` : ' de lista'} contra el costo final
        (precio del proveedor −{proveedor.descuento}%
        {proveedor.cargo_unitario > 0 ? ` + ${formatARS(proveedor.cargo_unitario)} de ${proveedor.cargo_nombre.toLowerCase()}` : ''}).
      </p>

      {(cambios.length > 0 || guardando) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-brand-50 px-4 py-3">
          <p className="text-sm text-slate-700">
            <strong>{cambios.length}</strong> {cambios.length === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}
            {errores.length > 0 && (
              <span className="text-red-700"> · {errores.length} con error (marcados en rojo)</span>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" className="!py-1.5" onClick={() => setBorrador({})} disabled={guardando}>
              Descartar
            </Button>
            <Button className="!py-1.5" onClick={guardar} loading={guardando} disabled={errores.length > 0}>
              Guardar cambios
            </Button>
          </div>
        </div>
      )}

      {filas.length === 0 ? (
        <EmptyState title="Sin productos" description="Probá con otra búsqueda, categoría o filtro." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-3 pr-3 font-medium">Cód. DICOR</th>
                <th className="pb-3 pr-3 font-medium">Producto</th>
                <th className="pb-3 pr-3 font-medium">Cód. proveedor</th>
                <th className="pb-3 pr-3 text-right font-medium">Precio proveedor</th>
                <th className="pb-3 pr-3 text-right font-medium">Costo final</th>
                <th className="pb-3 pr-3 text-right font-medium">Venta</th>
                <th className="pb-3 text-right font-medium">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((p, i) => {
                const v = valores(p)
                const cambio = cambioPorProducto.get(p.id)
                const precio = v.precio.trim() ? parsearNumero(v.precio) : null
                const costo = precio !== null && precio >= 0 ? redondearCentavos(costoUnitario(precio, proveedor)) : null
                const margen = costo !== null ? calcularMargen(p.precio_unitario, costo, bonifValida ? bonifNum : 0) : null
                return (
                  <tr key={p.id} className={cambio ? 'bg-slate-50' : undefined}>
                    <td className="py-2 pr-3 font-mono font-semibold text-slate-800">{p.codigo}</td>
                    <td className="max-w-[280px] py-2 pr-3">
                      <p className="truncate text-slate-800" title={p.descripcion}>
                        {p.descripcion}
                      </p>
                      <p className="text-xs text-slate-400">
                        {[p.medidas, p.marca].filter(Boolean).join(' · ') || p.categoria}
                      </p>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        className={`input w-28 !py-1.5 font-mono ${cambio?.error === 'Falta el código' ? '!border-red-400' : ''}`}
                        aria-label={`Código del proveedor para ${p.codigo}`}
                        data-fila={i}
                        data-campo="codigo"
                        maxLength={50}
                        value={v.codigo}
                        onChange={(e) => editar(p, 'codigo', e.target.value)}
                        onKeyDown={(e) => alPresionar(e, i, 'codigo')}
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <input
                        className={`input w-32 !py-1.5 text-right ${cambio?.error === 'Precio inválido' ? '!border-red-400' : ''}`}
                        aria-label={`Precio del proveedor para ${p.codigo}`}
                        data-fila={i}
                        data-campo="precio"
                        inputMode="decimal"
                        value={v.precio}
                        onChange={(e) => editar(p, 'precio', e.target.value)}
                        onKeyDown={(e) => alPresionar(e, i, 'precio')}
                      />
                      {cambio?.error && <p className="mt-0.5 text-xs text-red-700">{cambio.error}</p>}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-700">{costo !== null ? formatARS(costo) : '—'}</td>
                    <td className="py-2 pr-3 text-right text-slate-700">
                      {formatARS(redondearCentavos(margen ? margen.venta : p.precio_unitario))}
                    </td>
                    <td className="py-2 text-right">
                      {margen && margen.sobreCosto !== null ? (
                        <div className="leading-tight">
                          <p className={`font-semibold ${margen.ganancia < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                            {margen.sobreCosto >= 0 ? '+' : ''}
                            {margen.sobreCosto.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%
                          </p>
                          <p className="text-xs text-slate-400">{formatARS(redondearCentavos(margen.ganancia))} c/u</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
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
  )
}
