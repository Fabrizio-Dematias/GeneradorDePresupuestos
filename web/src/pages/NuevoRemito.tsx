import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatARS, formatearCUIT, hoyISO, proximoNumeroRemito, nombreArchivoRemito } from '../lib/format'
import { Badge, Button, Card, Input, LoadingState, PageHeader, StockPill } from '../components/ui'
import { IconPlus, IconSearch, IconTrash, IconUsers } from '../components/icons'
import { useToast } from '../components/Toast'
import {
  CONDICIONES_IVA,
  CONDICIONES_VENTA,
  type Cliente,
  type ItemBorrador,
  type Producto,
  type RemitoItem,
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
  const navigate = useNavigate()

  // Si la ruta es /remitos/:id/editar se edita un remito existente
  const { id: idParam } = useParams()
  const remitoId = idParam ? parseInt(idParam, 10) : null
  const modoEdicion = remitoId !== null
  const [cargandoRemito, setCargandoRemito] = useState(modoEdicion)

  // Datos del remito
  const [numero, setNumero] = useState('…')
  const [fecha, setFecha] = useState(hoyISO())

  // Datos del cliente
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteDomicilio, setClienteDomicilio] = useState('')
  const [clienteCuit, setClienteCuit] = useState('')
  const [condicionIVA, setCondicionIVA] = useState<string>(CONDICIONES_IVA[0])
  const [condicionVenta, setCondicionVenta] = useState<string>(CONDICIONES_VENTA[0])
  const [guardarCliente, setGuardarCliente] = useState(true)

  // Clientes guardados para el autocompletado
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [mostrarClientes, setMostrarClientes] = useState(false)
  const [indiceCliente, setIndiceCliente] = useState(0)
  const contenedorClienteRef = useRef<HTMLDivElement>(null)

  // Catálogo para el autocompletado de productos
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
    if (modoEdicion) {
      cargarRemitoExistente(remitoId!)
    } else {
      // Al volver de "editar" a "nuevo" el componente se reutiliza:
      // hay que limpiar el formulario para no duplicar el remito editado
      reiniciarFormulario()
      cargarNumero()
    }

    supabase
      .from('productos')
      .select('*')
      .order('codigo')
      .then(({ data, error }) => {
        if (error) toast('error', 'No se pudo cargar el catálogo de productos')
        else
          setProductos(
            ((data as Producto[]) ?? []).map((p) => ({
              ...p,
              stock: p.stock ?? 0,
              stock_minimo: p.stock_minimo ?? 0,
            }))
          )
      })

    supabase
      .from('clientes')
      .select('*')
      .order('nombre')
      .then(({ data }) => setClientes((data as Cliente[]) ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remitoId])

  // Cierra los dropdowns de sugerencias al hacer click afuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!contenedorBusquedaRef.current?.contains(e.target as Node)) {
        setMostrarSugerencias(false)
      }
      if (!contenedorClienteRef.current?.contains(e.target as Node)) {
        setMostrarClientes(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function reiniciarFormulario() {
    setFecha(hoyISO())
    setClienteId(null)
    setClienteNombre('')
    setClienteDomicilio('')
    setClienteCuit('')
    setCondicionIVA(CONDICIONES_IVA[0])
    setCondicionVenta(CONDICIONES_VENTA[0])
    setGuardarCliente(true)
    setItems([])
    setBusqueda('')
    setCodigo('')
    setDescripcion('')
    setCantidad('')
    setPrecio('')
    setBonificacion('0')
    setCargandoRemito(false)
  }

  async function cargarNumero() {
    // El número definitivo lo asigna el servidor al guardar; esto es solo
    // una vista previa. Si la función todavía no existe en la base, se
    // calcula como antes leyendo los números existentes.
    const { data, error } = await supabase.rpc('proximo_numero_remito')
    if (!error && typeof data === 'string') {
      setNumero(data)
      return
    }
    const res = await supabase.from('remitos').select('numero')
    if (!res.error) setNumero(proximoNumeroRemito((res.data ?? []).map((r) => r.numero)))
  }

  async function cargarRemitoExistente(id: number) {
    setCargandoRemito(true)
    const [remitoRes, itemsRes] = await Promise.all([
      supabase.from('remitos').select('*').eq('id', id).single(),
      supabase.from('remito_items').select('*').eq('remito_id', id).order('id'),
    ])
    if (remitoRes.error || !remitoRes.data) {
      toast('error', 'No se pudo cargar el remito a editar')
      navigate('/remitos')
      return
    }
    const r = remitoRes.data
    setNumero(r.numero)
    setFecha(r.fecha)
    setClienteId(r.cliente_id ?? null)
    setClienteNombre(r.cliente_nombre ?? '')
    setClienteDomicilio(r.cliente_domicilio ?? '')
    setClienteCuit(r.cliente_cuit ?? '')
    setCondicionIVA(r.condicion_iva ?? CONDICIONES_IVA[0])
    setCondicionVenta(r.condicion_venta ?? CONDICIONES_VENTA[0])
    setGuardarCliente(false)
    setItems(
      ((itemsRes.data as RemitoItem[]) ?? []).map((it) => ({
        codigo: it.codigo ?? '',
        cantidad: it.cantidad,
        descripcion: it.descripcion,
        precio_unitario: it.precio_unitario,
        bonificacion: it.bonificacion ?? 0,
        subtotal: it.subtotal,
      }))
    )
    setCargandoRemito(false)
  }

  // ---------------------------------------------- Autocompletado de clientes
  const sugerenciasClientes = useMemo(() => {
    const q = clienteNombre.trim().toLowerCase()
    if (!q) return []
    return clientes
      .filter(
        (c) =>
          c.nombre.toLowerCase() !== q &&
          (c.nombre.toLowerCase().includes(q) || (c.cuit ?? '').toLowerCase().includes(q))
      )
      .slice(0, 6)
  }, [clienteNombre, clientes])

  function seleccionarCliente(c: Cliente) {
    setClienteId(c.id)
    setClienteNombre(c.nombre)
    setClienteDomicilio(c.domicilio ?? '')
    setClienteCuit(c.cuit ?? '')
    if (c.condicion_iva) setCondicionIVA(c.condicion_iva)
    if (c.condicion_venta) setCondicionVenta(c.condicion_venta)
    setMostrarClientes(false)
  }

  // ---------------------------------------------- Autocompletado de productos
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

  /** Crea o actualiza el cliente en la tabla clientes y devuelve su id. */
  async function persistirCliente(): Promise<number | null> {
    const payload = {
      nombre: clienteNombre.trim(),
      domicilio: clienteDomicilio.trim() || null,
      cuit: clienteCuit.trim() || null,
      condicion_iva: condicionIVA,
      condicion_venta: condicionVenta,
    }
    if (clienteId) {
      await supabase.from('clientes').update(payload).eq('id', clienteId)
      return clienteId
    }
    const { data, error } = await supabase.from('clientes').insert(payload).select('id').single()
    if (error || !data) return null
    return data.id as number
  }

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
      let idCliente = clienteId
      if (guardarCliente) {
        idCliente = await persistirCliente()
        if (idCliente && !clienteId) setClienteId(idCliente)
      }

      let nro = numero
      const payload = () => ({
        p_remito: {
          numero: nro, // solo lo usa la función vieja; la nueva numera en el servidor
          fecha,
          cliente_id: idCliente,
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

      let data: any
      let error: any
      if (modoEdicion) {
        const res = await supabase.rpc('actualizar_remito', {
          p_remito_id: remitoId,
          ...payload(),
        })
        data = res.data
        error = res.error
      } else {
        const res = await supabase.rpc('crear_remito', payload())
        data = res.data
        error = res.error

        // Compatibilidad con la función vieja (numeración en el cliente):
        // si el número ya existe, recalcula y reintenta una vez.
        if (error && error.code === '23505') {
          const { data: nums } = await supabase.from('remitos').select('numero')
          nro = proximoNumeroRemito((nums ?? []).map((r) => r.numero))
          const retry = await supabase.rpc('crear_remito', payload())
          data = retry.data
          error = retry.error
        }
      }
      if (error) throw error

      // La función nueva devuelve {id, numero} con el número definitivo
      if (data && typeof data === 'object' && typeof data.numero === 'string') {
        nro = data.numero
      }

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
        toast(
          'success',
          modoEdicion
            ? `Remito ${nro} actualizado y PDF descargado.`
            : `Remito ${nro} guardado y PDF descargado.`
        )
      } catch {
        toast('info', `Remito ${nro} guardado. El PDF se puede descargar desde "Remitos".`)
      }

      if (modoEdicion) {
        navigate('/remitos')
        return
      }

      // Reinicia el formulario para el próximo remito
      setClienteId(null)
      setClienteNombre('')
      setClienteDomicilio('')
      setClienteCuit('')
      setCondicionIVA(CONDICIONES_IVA[0])
      setCondicionVenta(CONDICIONES_VENTA[0])
      setGuardarCliente(true)
      setItems([])
      limpiarFormularioItem()
      await cargarNumero()
      supabase
        .from('clientes')
        .select('*')
        .order('nombre')
        .then(({ data: cs }) => setClientes((cs as Cliente[]) ?? []))
    } catch (e: any) {
      toast('error', `No se pudo guardar el remito: ${e.message ?? e}`)
    } finally {
      setGuardando(false)
    }
  }

  if (cargandoRemito) {
    return <LoadingState texto="Cargando remito…" />
  }

  return (
    <div>
      <PageHeader
        title={modoEdicion ? `Editar remito ${numero}` : 'Nuevo remito'}
        subtitle={
          modoEdicion
            ? 'Al guardar se ajusta el stock y se regenera el PDF.'
            : 'Cargá los datos, agregá productos y generá el PDF.'
        }
      />

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
                {!modoEdicion && (
                  <p className="mt-1 text-xs text-slate-400">
                    El número definitivo se confirma al guardar.
                  </p>
                )}
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
              <div ref={contenedorClienteRef} className="relative sm:col-span-2">
                <Input
                  label="Nombre / Razón social *"
                  id="cliente"
                  placeholder="Escribí para buscar en tus clientes guardados…"
                  autoComplete="off"
                  value={clienteNombre}
                  onChange={(e) => {
                    setClienteNombre(e.target.value)
                    setClienteId(null) // al tipear deja de ser un cliente guardado
                    setMostrarClientes(true)
                    setIndiceCliente(0)
                  }}
                  onFocus={() => clienteNombre && setMostrarClientes(true)}
                  onKeyDown={(e) => {
                    if (!mostrarClientes || sugerenciasClientes.length === 0) return
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setIndiceCliente((i) => Math.min(i + 1, sugerenciasClientes.length - 1))
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setIndiceCliente((i) => Math.max(i - 1, 0))
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      seleccionarCliente(sugerenciasClientes[indiceCliente])
                    } else if (e.key === 'Escape') {
                      setMostrarClientes(false)
                    }
                  }}
                />
                {mostrarClientes && sugerenciasClientes.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {sugerenciasClientes.map((c, i) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setIndiceCliente(i)}
                          onClick={() => seleccionarCliente(c)}
                          className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm ${
                            i === indiceCliente ? 'bg-brand-50' : ''
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <IconUsers className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-slate-800">
                                {c.nombre}
                              </span>
                              <span className="block truncate text-xs text-slate-500">
                                {c.domicilio || 'Sin domicilio'}
                              </span>
                            </span>
                          </span>
                          {c.cuit && (
                            <span className="shrink-0 font-mono text-xs text-slate-500">
                              {formatearCUIT(c.cuit)}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 sm:col-span-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                  checked={guardarCliente}
                  onChange={(e) => setGuardarCliente(e.target.checked)}
                />
                {clienteId
                  ? 'Actualizar los datos guardados de este cliente'
                  : 'Guardar el cliente para reutilizarlo en próximos remitos'}
              </label>
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
                          <span className="flex shrink-0 items-center gap-2">
                            <StockPill stock={p.stock} minimo={p.stock_minimo} />
                            <span className="font-medium text-slate-500">{formatARS(p.precio_unitario)}</span>
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
                {modoEdicion ? 'Guardar cambios y descargar PDF' : 'Guardar y descargar PDF'}
              </Button>
              {modoEdicion ? (
                <Button
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={() => navigate('/remitos')}
                  disabled={guardando}
                >
                  Cancelar edición
                </Button>
              ) : (
                <p className="mt-2 text-center text-xs text-slate-400">
                  El remito queda guardado y el PDF se puede volver a descargar cuando quieras.
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
