import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, hoyISO, proximoNumeroRemito, nombreArchivoRemito } from '../lib/format'
import { Badge, Button, Card, Input, PageHeader } from '../components/ui'
import { IconPlus, IconSearch, IconTrash } from '../components/icons'
import { useToast } from '../components/Toast'
import {
  CONDICIONES_IVA,
  CONDICIONES_VENTA,
  type ItemBorrador,
  type Producto,
} from '../types'

function calcularSubtotal(cantidad: number, precio: number, bonif: number): number {
  // Misma fórmula que la app de escritorio
  return cantidad * precio * (1 - bonif / 100)
}

/** Grupo de opciones tipo "chips" (reemplaza los radio buttons del escritorio) */
function ChipGroup({
  opciones,
  valor,
  onChange,
}: {
  opciones: readonly string[]
  valor: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((op) => (
        <button
          key={op}
          type="button"
          onClick={() => onChange(op)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
            valor === op
              ? 'border-brand-700 bg-brand-700 text-white shadow-sm'
              : 'border-slate-300 bg-white text-slate-600 hover:border-brand-600 hover:text-brand-700'
          }`}
        >
          {op}
        </button>
      ))}
    </div>
  )
}

export default function NuevoRemito() {
  const { toast } = useToast()

  // Datos del remito
  const [numero, setNumero] = useState('…')
  const [fecha, setFecha] = useState(hoyISO())

  // Datos del cliente
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteDomicilio, setClienteDomicilio] = useState('')
  const [clienteCuit, setClienteCuit] = useState('')
  const [condicionIVA, setCondicionIVA] = useState<string>(CONDICIONES_IVA[0])
  const [condicionVenta, setCondicionVenta] = useState<string>(CONDICIONES_VENTA[0])

  // Catálogo para el autocompletado
  const [productos, setProductos] = useState<Producto[]>([])

  // Formulario de ítem
  const [busqueda, setBusqueda] = useState('')
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(0)
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [precio, setPrecio] = useState('')
  const [bonificacion, setBonificacion] = useState('0')

  const [items, setItems] = useState<ItemBorrador[]>([])
  const [guardando, setGuardando] = useState(false)

  const busquedaRef = useRef<HTMLInputElement>(null)
  const cantidadRef = useRef<HTMLInputElement>(null)
  const contenedorBusquedaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cargarNumero()
    supabase
      .from('productos')
      .select('*')
      .order('codigo')
      .then(({ data, error }) => {
        if (error) toast('error', 'No se pudo cargar el catálogo de productos')
        else setProductos((data as Producto[]) ?? [])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cierra el dropdown de sugerencias al hacer click afuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!contenedorBusquedaRef.current?.contains(e.target as Node)) {
        setMostrarSugerencias(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function cargarNumero() {
    const { data, error } = await supabase.from('remitos').select('numero')
    if (!error) setNumero(proximoNumeroRemito((data ?? []).map((r) => r.numero)))
  }

  const sugerencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return []
    const empiezan: Producto[] = []
    const contienen: Producto[] = []
    for (const p of productos) {
      const cod = (p.codigo ?? '').toLowerCase()
      const desc = p.descripcion.toLowerCase()
      if (cod.startsWith(q)) empiezan.push(p)
      else if (cod.includes(q) || desc.includes(q)) contienen.push(p)
      if (empiezan.length >= 8) break
    }
    return [...empiezan, ...contienen].slice(0, 8)
  }, [busqueda, productos])

  function seleccionarProducto(p: Producto) {
    setCodigo(p.codigo ?? '')
    setDescripcion(p.descripcion)
    setPrecio(String(p.precio_unitario))
    setBusqueda(`${p.codigo} — ${p.descripcion}`)
    setMostrarSugerencias(false)
    cantidadRef.current?.focus()
  }

  function agregarItem() {
    const cant = parseInt(cantidad, 10)
    const prec = parseFloat(precio)
    const bonif = parseFloat(bonificacion || '0')

    if (!descripcion.trim()) {
      toast('error', 'Buscá un producto o escribí una descripción.')
      return
    }
    if (isNaN(cant) || cant <= 0) {
      toast('error', 'Ingresá una cantidad válida (mayor a 0).')
      return
    }
    if (isNaN(prec) || prec < 0) {
      toast('error', 'Ingresá un precio unitario válido.')
      return
    }
    if (isNaN(bonif) || bonif < 0 || bonif > 100) {
      toast('error', 'La bonificación debe estar entre 0 y 100.')
      return
    }

    setItems((prev) => [
      ...prev,
      {
        codigo: codigo.trim(),
        cantidad: cant,
        descripcion: descripcion.trim(),
        precio_unitario: prec,
        bonificacion: bonif,
        subtotal: calcularSubtotal(cant, prec, bonif),
      },
    ])
    limpiarFormularioItem()
  }

  function limpiarFormularioItem() {
    setBusqueda('')
    setCodigo('')
    setDescripcion('')
    setCantidad('')
    setPrecio('')
    setBonificacion('0')
    busquedaRef.current?.focus()
  }

  const total = items.reduce((acc, item) => acc + item.subtotal, 0)

  async function guardarRemito() {
    if (items.length === 0) {
      toast('error', 'Agregá al menos un producto al remito.')
      return
    }
    if (!clienteNombre.trim()) {
      toast('error', 'Completá el nombre del cliente.')
      return
    }

    setGuardando(true)
    try {
      let nro = numero
      const payload = () => ({
        p_remito: {
          numero: nro,
          fecha,
          cliente_nombre: clienteNombre.trim(),
          cliente_domicilio: clienteDomicilio.trim(),
          cliente_cuit: clienteCuit.trim(),
          condicion_iva: condicionIVA,
          condicion_venta: condicionVenta,
          total,
          ruta_pdf: nombreArchivoRemito(clienteNombre.trim(), nro),
        },
        p_items: items,
      })

      let { error } = await supabase.rpc('crear_remito', payload())

      // Si el número ya existe (duplicado), recalcula y reintenta una vez
      if (error && error.code === '23505') {
        const { data } = await supabase.from('remitos').select('numero')
        nro = proximoNumeroRemito((data ?? []).map((r) => r.numero))
        const retry = await supabase.rpc('crear_remito', payload())
        error = retry.error
      }
      if (error) throw error

      try {
        // Import dinámico: jsPDF solo se descarga cuando se genera un PDF
        const { generarRemitoPDF } = await import('../lib/pdf')
        await generarRemitoPDF({
          numero: nro,
          fecha,
          clienteNombre: clienteNombre.trim(),
          clienteDomicilio: clienteDomicilio.trim(),
          clienteCuit: clienteCuit.trim(),
          condicionIVA,
          condicionVenta,
          items,
          total,
        })
        toast('success', `Remito ${nro} guardado y PDF descargado.`)
      } catch {
        toast('info', `Remito ${nro} guardado. El PDF se puede descargar desde "Remitos".`)
      }

      // Reinicia el formulario para el próximo remito
      setClienteNombre('')
      setClienteDomicilio('')
      setClienteCuit('')
      setCondicionIVA(CONDICIONES_IVA[0])
      setCondicionVenta(CONDICIONES_VENTA[0])
      setItems([])
      limpiarFormularioItem()
      await cargarNumero()
    } catch (e: any) {
      toast('error', `No se pudo guardar el remito: ${e.message ?? e}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <PageHeader title="Nuevo remito" subtitle="Cargá los datos, agregá productos y generá el PDF." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 xl:col-span-2">
          <Card title="Datos del remito">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="label">N° de remito</span>
                <div className="input flex items-center bg-slate-50 font-mono font-semibold text-slate-700">
                  {numero}
                </div>
              </div>
              <Input
                label="Fecha"
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </Card>

          <Card title="Datos del cliente">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Nombre / Razón social *"
                  id="cliente"
                  placeholder="Ej: Gustavo Clara"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                />
              </div>
              <Input
                label="Domicilio"
                id="domicilio"
                placeholder="Calle y número, localidad"
                value={clienteDomicilio}
                onChange={(e) => setClienteDomicilio(e.target.value)}
              />
              <Input
                label="CUIT"
                id="cuit"
                placeholder="20-12345678-9"
                value={clienteCuit}
                onChange={(e) => setClienteCuit(e.target.value)}
              />
              <div className="sm:col-span-2">
                <span className="label">Condición IVA</span>
                <ChipGroup opciones={CONDICIONES_IVA} valor={condicionIVA} onChange={setCondicionIVA} />
              </div>
              <div className="sm:col-span-2">
                <span className="label">Condiciones de venta</span>
                <ChipGroup opciones={CONDICIONES_VENTA} valor={condicionVenta} onChange={setCondicionVenta} />
              </div>
            </div>
          </Card>

          <Card title="Agregar producto">
            <div className="space-y-4">
              <div ref={contenedorBusquedaRef} className="relative">
                <span className="label">Buscar en el catálogo</span>
                <div className="relative">
                  <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={busquedaRef}
                    className="input pl-9"
                    placeholder="Código o descripción… (ej: 401, lazo, cubeta)"
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value)
                      setMostrarSugerencias(true)
                      setIndiceActivo(0)
                    }}
                    onFocus={() => busqueda && setMostrarSugerencias(true)}
                    onKeyDown={(e) => {
                      if (!mostrarSugerencias || sugerencias.length === 0) return
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setIndiceActivo((i) => Math.min(i + 1, sugerencias.length - 1))
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setIndiceActivo((i) => Math.max(i - 1, 0))
                      } else if (e.key === 'Enter') {
                        e.preventDefault()
                        seleccionarProducto(sugerencias[indiceActivo])
                      } else if (e.key === 'Escape') {
                        setMostrarSugerencias(false)
                      }
                    }}
                  />
                </div>
                {mostrarSugerencias && sugerencias.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {sugerencias.map((p, i) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setIndiceActivo(i)}
                          onClick={() => seleccionarProducto(p)}
                          className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm ${
                            i === indiceActivo ? 'bg-brand-50' : ''
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="font-mono font-semibold text-brand-700">{p.codigo}</span>
                            <span className="ml-2 text-slate-700">{p.descripcion}</span>
                          </span>
                          <span className="shrink-0 font-medium text-slate-500">
                            {formatARS(p.precio_unitario)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Input
                  label="Código"
                  id="codigo"
                  placeholder="401"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
                <Input
                  ref={cantidadRef}
                  label="Cantidad *"
                  id="cantidad"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && agregarItem()}
                />
                <Input
                  label="Precio unitario *"
                  id="precio"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                />
                <Input
                  label="Bonificación %"
                  id="bonif"
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={bonificacion}
                  onChange={(e) => setBonificacion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && agregarItem()}
                />
              </div>

              <div className="sm:col-span-4">
                <Input
                  label="Descripción *"
                  id="descripcion"
                  placeholder="Se completa al elegir un producto (también se puede escribir a mano)"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={agregarItem}>
                  <IconPlus className="h-4 w-4" />
                  Agregar al remito
                </Button>
                <Button variant="ghost" onClick={limpiarFormularioItem}>
                  Limpiar
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Columna resumen */}
        <div className="xl:col-span-1">
          <div className="space-y-6 xl:sticky xl:top-8">
            <Card
              title={
                <span>
                  Productos del remito{' '}
                  {items.length > 0 && <Badge color="green">{items.length}</Badge>}
                </span>
              }
            >
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Todavía no agregaste productos.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <li key={idx} className="flex items-start justify-between gap-2 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug text-slate-800">
                          {item.descripcion}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.codigo && <span className="font-mono">{item.codigo} · </span>}
                          {item.cantidad} × {formatARS(item.precio_unitario)}
                          {item.bonificacion > 0 && (
                            <span className="text-emerald-600"> · −{item.bonificacion}%</span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatARS(item.subtotal)}
                        </span>
                        <button
                          onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Quitar producto"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3.5">
                <span className="text-sm font-medium text-slate-300">TOTAL</span>
                <span className="text-xl font-bold text-white">{formatARS(total)}</span>
              </div>

              <Button
                onClick={guardarRemito}
                loading={guardando}
                className="mt-4 w-full py-3"
                disabled={items.length === 0}
              >
                Guardar y descargar PDF
              </Button>
              <p className="mt-2 text-center text-xs text-slate-400">
                El remito queda guardado y el PDF se puede volver a descargar cuando quieras.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
