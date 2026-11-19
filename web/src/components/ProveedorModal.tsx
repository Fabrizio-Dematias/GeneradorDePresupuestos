import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/format'
import { parsearNumero } from '../lib/importar'
import { Button, ConfirmDialog, Input, Modal } from './ui'
import { IconTrash } from './icons'
import { useToast } from './Toast'
import type { Proveedor } from '../types'

const paraInput = (n: number) => (n === 0 ? '' : String(n).replace('.', ','))

/** Alta y edición de un proveedor (datos de contacto, descuento y cargo por unidad). */
export default function ProveedorModal({
  proveedor,
  onClose,
  onGuardado,
  onEliminado,
}: {
  /** null = proveedor nuevo */
  proveedor: Proveedor | null
  onClose: () => void
  onGuardado: (p: Proveedor) => void
  onEliminado: (id: number) => void
}) {
  const { toast } = useToast()
  const [nombre, setNombre] = useState(proveedor?.nombre ?? '')
  const [contacto, setContacto] = useState(proveedor?.contacto ?? '')
  const [telefono, setTelefono] = useState(proveedor?.telefono ?? '')
  const [email, setEmail] = useState(proveedor?.email ?? '')
  const [descuento, setDescuento] = useState(paraInput(proveedor?.descuento ?? 0))
  const [cargoNombre, setCargoNombre] = useState(proveedor?.cargo_nombre ?? 'Emblistado')
  const [cargo, setCargo] = useState(paraInput(proveedor?.cargo_unitario ?? 0))
  const [notas, setNotas] = useState(proveedor?.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [borrando, setBorrando] = useState(false)

  const descuentoNum = descuento.trim() ? parsearNumero(descuento) : 0
  const cargoNum = cargo.trim() ? parsearNumero(cargo) : 0
  const descuentoValido = descuentoNum !== null && descuentoNum >= 0 && descuentoNum <= 100
  const cargoValido = cargoNum !== null && cargoNum >= 0
  const puedeGuardar = nombre.trim() !== '' && descuentoValido && cargoValido && !guardando

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!puedeGuardar) return
    const payload = {
      nombre: nombre.trim(),
      contacto: contacto.trim() || null,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      descuento: Math.round((descuentoNum ?? 0) * 100) / 100,
      cargo_nombre: cargoNombre.trim() || 'Cargo',
      cargo_unitario: Math.round((cargoNum ?? 0) * 100) / 100,
      notas: notas.trim() || null,
    }
    setGuardando(true)
    const { data, error } = proveedor
      ? await supabase.from('proveedores').update(payload).eq('id', proveedor.id).select().single()
      : await supabase.from('proveedores').insert(payload).select().single()
    setGuardando(false)
    if (error) {
      toast(
        'error',
        error.code === '23505'
          ? `Ya existe un proveedor llamado ${payload.nombre}.`
          : `No se pudo guardar el proveedor: ${error.message}`
      )
      return
    }
    toast('success', proveedor ? `Proveedor ${payload.nombre} actualizado.` : `Proveedor ${payload.nombre} creado.`)
    onGuardado(data as Proveedor)
  }

  async function eliminar() {
    if (!proveedor) return
    setBorrando(true)
    const { error } = await supabase.from('proveedores').delete().eq('id', proveedor.id)
    setBorrando(false)
    if (error) {
      toast('error', `No se pudo eliminar el proveedor: ${error.message}`)
      return
    }
    toast('success', `Proveedor ${proveedor.nombre} eliminado.`)
    onEliminado(proveedor.id)
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={proveedor ? `Editar ${proveedor.nombre}` : 'Nuevo proveedor'}
        footer={
          <>
            {proveedor && (
              <Button variant="ghost" className="mr-auto" onClick={() => setConfirmarBorrado(true)}>
                <IconTrash className="h-4 w-4 text-red-500" /> Eliminar
              </Button>
            )}
            <Button variant="secondary" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" form="form-proveedor" loading={guardando} disabled={!puedeGuardar}>
              Guardar
            </Button>
          </>
        }
      >
        <form id="form-proveedor" onSubmit={guardar} className="space-y-4">
          <Input label="Nombre" id="prov-nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Contacto" id="prov-contacto" value={contacto} onChange={(e) => setContacto(e.target.value)} />
            <Input label="Teléfono" id="prov-telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            <Input label="Email" id="prov-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-3 text-sm font-semibold text-slate-700">Cómo factura</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Input
                  label="Descuento (%)"
                  id="prov-descuento"
                  inputMode="decimal"
                  placeholder="0"
                  value={descuento}
                  onChange={(e) => setDescuento(e.target.value)}
                />
                {!descuentoValido && <p className="mt-1 text-xs text-red-700">Entre 0 y 100.</p>}
              </div>
              <Input
                label="Cargo extra"
                id="prov-cargo-nombre"
                placeholder="Emblistado"
                value={cargoNombre}
                onChange={(e) => setCargoNombre(e.target.value)}
              />
              <div>
                <Input
                  label="Cargo por unidad ($)"
                  id="prov-cargo"
                  inputMode="decimal"
                  placeholder="0"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                />
                {!cargoValido && <p className="mt-1 text-xs text-red-700">Tiene que ser un importe válido.</p>}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Costo de cada unidad = precio del proveedor − {descuentoValido ? descuentoNum : '…'}% +{' '}
              {cargoValido ? formatARS(cargoNum ?? 0) : '…'} de {cargoNombre.trim().toLowerCase() || 'cargo'}. Si no
              tiene cargo extra, dejalo en 0.
            </p>
          </div>

          <div>
            <label htmlFor="prov-notas" className="label">
              Notas
            </label>
            <textarea
              id="prov-notas"
              className="input min-h-[70px]"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmarBorrado}
        title="Eliminar proveedor"
        message={
          <p>
            ¿Eliminar a <strong>{proveedor?.nombre}</strong>? Se borran los códigos y precios de compra que cargaste
            para este proveedor. Tus productos, su stock y sus precios de venta no se tocan.
          </p>
        }
        loading={borrando}
        onConfirm={eliminar}
        onCancel={() => setConfirmarBorrado(false)}
      />
    </>
  )
}
