import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { traerTodas } from '../lib/consultas'
import { formatARS } from '../lib/format'
import { Button, Card, EmptyState, LoadingState, PageHeader, Segmented } from '../components/ui'
import { IconPencil, IconPlus, IconTruck } from '../components/icons'
import { useToast } from '../components/Toast'
import ProveedorModal from '../components/ProveedorModal'
import CodigosProveedor, { type BorradorCodigos } from '../components/CodigosProveedor'
import PedidoProveedor from '../components/PedidoProveedor'
import type { Producto, ProductoProveedor, Proveedor } from '../types'

type Pestania = 'pedido' | 'codigos'

const CLAVE_SELECCION = 'dicor-proveedor'

function leerSeleccion(): number | null {
  try {
    const v = Number(localStorage.getItem(CLAVE_SELECCION))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

export default function Proveedores() {
  const { toast } = useToast()
  const [proveedores, setProveedores] = useState<Proveedor[] | null>(null)
  const [productos, setProductos] = useState<Producto[] | null>(null)
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(leerSeleccion)
  const [vinculos, setVinculos] = useState<ProductoProveedor[] | null>(null)
  const [pestania, setPestania] = useState<Pestania>('pedido')
  // Lo escrito en la grilla de códigos, por proveedor: no se pierde al cambiar de pestaña
  const [borradores, setBorradores] = useState<Record<number, BorradorCodigos>>({})
  const [editando, setEditando] = useState<Proveedor | 'nuevo' | null>(null)

  async function cargarProveedores() {
    const { data, error } = await supabase.from('proveedores').select('*').order('nombre')
    if (error) {
      toast('error', `No se pudieron cargar los proveedores: ${error.message}`)
      setProveedores([])
      return
    }
    setProveedores((data as Proveedor[]) ?? [])
  }

  useEffect(() => {
    cargarProveedores()
    traerTodas<Producto>('productos', '*', 'codigo')
      .then(setProductos)
      .catch((e) => {
        toast('error', `No se pudieron cargar los productos: ${e.message ?? e}`)
        setProductos([])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const seleccionado =
    proveedores?.find((p) => p.id === seleccionadoId) ?? (proveedores && proveedores.length > 0 ? proveedores[0] : null)

  async function cargarVinculos(proveedorId: number) {
    try {
      const filas = await traerTodas<ProductoProveedor>('producto_proveedor', '*', 'id', (q) =>
        q.eq('proveedor_id', proveedorId)
      )
      setVinculos(filas)
      return filas
    } catch (e: any) {
      toast('error', `No se pudieron cargar los códigos del proveedor: ${e.message ?? e}`)
      setVinculos([])
      return []
    }
  }

  useEffect(() => {
    if (!seleccionado) return
    try {
      localStorage.setItem(CLAVE_SELECCION, String(seleccionado.id))
    } catch {
      // sin localStorage solo no se recuerda el último proveedor elegido
    }
    setVinculos(null)
    cargarVinculos(seleccionado.id).then((filas) => {
      // Un proveedor sin códigos cargados arranca en la grilla para cargarlos
      if (filas.length === 0) setPestania('codigos')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionado?.id])

  const borrador = seleccionado ? borradores[seleccionado.id] ?? {} : {}
  const pendientes = Object.keys(borrador).length

  function proveedorGuardado(p: Proveedor) {
    setEditando(null)
    setSeleccionadoId(p.id)
    cargarProveedores()
  }

  function proveedorEliminado(id: number) {
    setEditando(null)
    setBorradores((prev) => {
      const siguiente = { ...prev }
      delete siguiente[id]
      return siguiente
    })
    try {
      localStorage.removeItem(`dicor-pedido-${id}`)
    } catch {
      // nada que limpiar
    }
    setSeleccionadoId(null)
    cargarProveedores()
  }

  if (proveedores === null || productos === null) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Proveedores"
        subtitle="Códigos de cada proveedor, precios de compra, márgenes y pedidos"
        actions={
          <Button onClick={() => setEditando('nuevo')}>
            <IconPlus className="h-4 w-4" /> Nuevo proveedor
          </Button>
        }
      />

      {proveedores.length === 0 || !seleccionado ? (
        <Card>
          <EmptyState
            icon={<IconTruck className="h-12 w-12" />}
            title="Todavía no hay proveedores"
            description="Cargá un proveedor con su descuento y su cargo por unidad (por ejemplo el emblistado), y después asignale a cada producto el código que usa él."
            action={
              <Button onClick={() => setEditando('nuevo')}>
                <IconPlus className="h-4 w-4" /> Nuevo proveedor
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Selector de proveedor */}
          <div className="mb-4 flex flex-wrap gap-2">
            {proveedores.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSeleccionadoId(p.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                  p.id === seleccionado.id
                    ? 'border-brand-700 bg-brand-700 text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-brand-600 hover:text-brand-700'
                }`}
              >
                {p.nombre}
                {Object.keys(borradores[p.id] ?? {}).length > 0 && ' •'}
              </button>
            ))}
          </div>

          <Card className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{seleccionado.nombre}</h2>
                <p className="text-sm text-slate-600">
                  Descuento <strong>{seleccionado.descuento}%</strong>
                  {seleccionado.cargo_unitario > 0 && (
                    <>
                      {' '}
                      · {seleccionado.cargo_nombre} <strong>{formatARS(seleccionado.cargo_unitario)}</strong> por unidad
                    </>
                  )}
                </p>
                {(seleccionado.contacto || seleccionado.telefono || seleccionado.email) && (
                  <p className="mt-1 text-xs text-slate-500">
                    {[seleccionado.contacto, seleccionado.telefono, seleccionado.email].filter(Boolean).join(' · ')}
                  </p>
                )}
                {seleccionado.notas && <p className="mt-1 text-xs text-slate-500">{seleccionado.notas}</p>}
              </div>
              <Button variant="secondary" onClick={() => setEditando(seleccionado)}>
                <IconPencil className="h-4 w-4" /> Editar
              </Button>
            </div>
          </Card>

          <Card>
            <div className="mb-5">
              <Segmented<Pestania>
                value={pestania}
                onChange={setPestania}
                options={[
                  { value: 'pedido', label: 'Pedido' },
                  {
                    value: 'codigos',
                    label: (
                      <span className="whitespace-nowrap">
                        Códigos y precios{pendientes > 0 ? ` · ${pendientes} sin guardar` : ''}
                      </span>
                    ),
                  },
                ]}
              />
            </div>

            {vinculos === null ? (
              <LoadingState />
            ) : pestania === 'pedido' ? (
              <PedidoProveedor
                key={seleccionado.id}
                proveedor={seleccionado}
                productos={productos}
                vinculos={vinculos}
              />
            ) : (
              <CodigosProveedor
                key={seleccionado.id}
                proveedor={seleccionado}
                productos={productos}
                vinculos={vinculos}
                borrador={borrador}
                setBorrador={(b) => setBorradores((prev) => ({ ...prev, [seleccionado.id]: b }))}
                onGuardado={async () => {
                  await cargarVinculos(seleccionado.id)
                  setBorradores((prev) => ({ ...prev, [seleccionado.id]: {} }))
                }}
              />
            )}
          </Card>
        </>
      )}

      {editando && (
        <ProveedorModal
          proveedor={editando === 'nuevo' ? null : editando}
          onClose={() => setEditando(null)}
          onGuardado={proveedorGuardado}
          onEliminado={proveedorEliminado}
        />
      )}
    </div>
  )
}
