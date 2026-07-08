import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatearCUIT } from '../lib/format'
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
} from '../components/ui'
import { IconPencil, IconPlus, IconSearch, IconTrash, IconUsers } from '../components/icons'
import { useToast } from '../components/Toast'
import { CONDICIONES_IVA, CONDICIONES_VENTA, type Cliente } from '../types'

interface FormCliente {
  nombre: string
  domicilio: string
  cuit: string
  condicion_iva: string
  condicion_venta: string
}

const FORM_VACIO: FormCliente = {
  nombre: '',
  domicilio: '',
  cuit: '',
  condicion_iva: CONDICIONES_IVA[0],
  condicion_venta: CONDICIONES_VENTA[0],
}

export default function Clientes() {
  const { toast } = useToast()
  const [clientes, setClientes] = useState<Cliente[] | null>(null)
  const [busqueda, setBusqueda] = useState('')

  // Modal de alta/edición: null cerrado, 'nuevo' alta, Cliente edición
  const [editando, setEditando] = useState<'nuevo' | Cliente | null>(null)
  const [form, setForm] = useState<FormCliente>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  const [aEliminar, setAEliminar] = useState<Cliente | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargar() {
    const { data, error } = await supabase.from('clientes').select('*').order('nombre')
    if (error) toast('error', 'No se pudieron cargar los clientes')
    setClientes((data as Cliente[]) ?? [])
  }

  const filtrados = (clientes ?? []).filter((c) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.cuit ?? '').toLowerCase().includes(q) ||
      (c.domicilio ?? '').toLowerCase().includes(q)
    )
  })

  function abrirNuevo() {
    setForm(FORM_VACIO)
    setEditando('nuevo')
  }

  function abrirEdicion(c: Cliente) {
    setForm({
      nombre: c.nombre,
      domicilio: c.domicilio ?? '',
      cuit: c.cuit ?? '',
      condicion_iva: c.condicion_iva ?? CONDICIONES_IVA[0],
      condicion_venta: c.condicion_venta ?? CONDICIONES_VENTA[0],
    })
    setEditando(c)
  }

  async function guardar() {
    if (!form.nombre.trim()) {
      toast('error', 'Completá el nombre del cliente.')
      return
    }
    setGuardando(true)
    const payload = {
      nombre: form.nombre.trim(),
      domicilio: form.domicilio.trim() || null,
      cuit: form.cuit.trim() || null,
      condicion_iva: form.condicion_iva,
      condicion_venta: form.condicion_venta,
    }
    const { error } =
      editando === 'nuevo'
        ? await supabase.from('clientes').insert(payload)
        : await supabase.from('clientes').update(payload).eq('id', (editando as Cliente).id)
    setGuardando(false)
    if (error) {
      toast('error', `No se pudo guardar el cliente: ${error.message}`)
      return
    }
    toast('success', editando === 'nuevo' ? 'Cliente creado.' : 'Cliente actualizado.')
    setEditando(null)
    cargar()
  }

  async function eliminar() {
    if (!aEliminar) return
    setEliminando(true)
    const { error } = await supabase.from('clientes').delete().eq('id', aEliminar.id)
    setEliminando(false)
    if (error) {
      toast('error', `No se pudo eliminar el cliente: ${error.message}`)
      return
    }
    toast('success', `Cliente ${aEliminar.nombre} eliminado.`)
    setAEliminar(null)
    cargar()
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={clientes ? `${clientes.length} clientes guardados` : undefined}
        actions={
          <Button onClick={abrirNuevo}>
            <IconPlus className="h-4 w-4" />
            Nuevo cliente
          </Button>
        }
      />

      <Card>
        <div className="relative mb-4 max-w-md">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre, CUIT o domicilio…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {clientes === null ? (
          <LoadingState />
        ) : filtrados.length === 0 ? (
          <EmptyState
            icon={<IconUsers className="h-12 w-12" />}
            title={busqueda ? 'Sin resultados' : 'Todavía no hay clientes guardados'}
            description={
              busqueda
                ? 'Probá con otro nombre o CUIT.'
                : 'Guardá los clientes recurrentes para completar los remitos con un click.'
            }
            action={
              !busqueda && (
                <Button onClick={abrirNuevo}>
                  <IconPlus className="h-4 w-4" /> Nuevo cliente
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Tabla en escritorio */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-3 pr-4 font-medium">Nombre</th>
                    <th className="pb-3 pr-4 font-medium">Domicilio</th>
                    <th className="pb-3 pr-4 font-medium">CUIT</th>
                    <th className="pb-3 pr-4 font-medium">Cond. IVA</th>
                    <th className="pb-3 pr-4 font-medium">Venta</th>
                    <th className="pb-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtrados.map((c) => (
                    <tr key={c.id} className="transition hover:bg-slate-50">
                      <td className="max-w-[240px] truncate py-3 pr-4 font-medium text-slate-800">
                        {c.nombre}
                      </td>
                      <td className="max-w-[240px] truncate py-3 pr-4 text-slate-600">
                        {c.domicilio || '—'}
                      </td>
                      <td className="py-3 pr-4 font-mono text-slate-600">
                        {c.cuit ? formatearCUIT(c.cuit) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{c.condicion_iva || '—'}</td>
                      <td className="py-3 pr-4 text-slate-600">{c.condicion_venta || '—'}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => abrirEdicion(c)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Editar"
                          >
                            <IconPencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setAEliminar(c)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Eliminar"
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
              {filtrados.map((c) => (
                <li key={c.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{c.nombre}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {c.domicilio || 'Sin domicilio'}
                        {c.cuit && (
                          <>
                            {' · '}
                            <span className="font-mono">{formatearCUIT(c.cuit)}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" className="flex-1 !py-1.5" onClick={() => abrirEdicion(c)}>
                      <IconPencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button variant="secondary" className="!px-3 !py-1.5" onClick={() => setAEliminar(c)}>
                      <IconTrash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* Modal de alta/edición */}
      <Modal
        open={editando !== null}
        onClose={() => setEditando(null)}
        title={editando === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditando(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardar} loading={guardando}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Nombre / Razón social *"
              id="cli-nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <Input
            label="Domicilio"
            id="cli-domicilio"
            placeholder="Calle y número, localidad"
            value={form.domicilio}
            onChange={(e) => setForm({ ...form, domicilio: e.target.value })}
          />
          <Input
            label="CUIT"
            id="cli-cuit"
            placeholder="20-12345678-9"
            value={form.cuit}
            onChange={(e) => setForm({ ...form, cuit: e.target.value })}
          />
          <Select
            label="Condición IVA"
            id="cli-iva"
            value={form.condicion_iva}
            onChange={(e) => setForm({ ...form, condicion_iva: e.target.value })}
          >
            {CONDICIONES_IVA.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            label="Condiciones de venta"
            id="cli-venta"
            value={form.condicion_venta}
            onChange={(e) => setForm({ ...form, condicion_venta: e.target.value })}
          >
            {CONDICIONES_VENTA.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      <ConfirmDialog
        open={aEliminar !== null}
        title="Eliminar cliente"
        message={
          <p>
            ¿Seguro que querés eliminar a <strong>{aEliminar?.nombre}</strong>? Los remitos ya
            emitidos no se modifican.
          </p>
        }
        loading={eliminando}
        onConfirm={eliminar}
        onCancel={() => setAEliminar(null)}
      />
    </div>
  )
}
