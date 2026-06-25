import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Input, Modal, Segmented } from './ui'
import { IconArchiveBox } from './icons'
import { useToast } from './Toast'
import type { Producto, TipoMovimiento } from '../types'

const PLACEHOLDER_MOTIVO: Record<TipoMovimiento, string> = {
  ingreso: 'Ej: Compra a proveedor',
  egreso: 'Ej: Rotura, devolución, uso interno',
  ajuste: 'Ej: Conteo de inventario',
}

const ETIQUETA_CANTIDAD: Record<TipoMovimiento, string> = {
  ingreso: 'Cantidad a ingresar',
  egreso: 'Cantidad a retirar',
  ajuste: 'Nuevo stock exacto',
}

export default function MovimientoStockModal({
  producto,
  onClose,
  onDone,
}: {
  producto: Producto | null
  onClose: () => void
  onDone: () => void
}) {
  const { toast } = useToast()
  const [tipo, setTipo] = useState<TipoMovimiento>('ingreso')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Reinicia el formulario cada vez que se abre para otro producto
  useEffect(() => {
    if (producto) {
      setTipo('ingreso')
      setCantidad('')
      setMotivo('')
    }
  }, [producto])

  const stockActual = producto?.stock ?? 0
  const cant = parseInt(cantidad, 10)
  const cantValida = !isNaN(cant) && cant >= 0

  const stockNuevo = useMemo(() => {
    if (!cantValida) return stockActual
    if (tipo === 'ingreso') return stockActual + cant
    if (tipo === 'egreso') return stockActual - cant
    return cant // ajuste
  }, [tipo, cant, cantValida, stockActual])

  async function guardar() {
    if (!producto) return
    if (!cantValida || (tipo !== 'ajuste' && cant <= 0)) {
      toast('error', 'Ingresá una cantidad válida.')
      return
    }
    if (tipo === 'egreso' && cant > stockActual) {
      toast('error', `No podés retirar más de lo que hay en stock (${stockActual}).`)
      return
    }

    setGuardando(true)
    const { data, error } = await supabase.rpc('registrar_movimiento_stock', {
      p_producto_id: producto.id,
      p_tipo: tipo,
      p_cantidad: cant,
      p_motivo: motivo.trim(),
    })
    setGuardando(false)

    if (error) {
      toast('error', `No se pudo registrar el movimiento: ${error.message}`)
      return
    }
    const verbo = tipo === 'ingreso' ? 'Ingreso' : tipo === 'egreso' ? 'Egreso' : 'Ajuste'
    toast('success', `${verbo} registrado. Stock de ${producto.codigo}: ${data}.`)
    onDone()
  }

  const colorNuevo =
    stockNuevo <= 0 ? 'text-red-600' : stockNuevo <= (producto?.stock_minimo ?? 0) ? 'text-amber-600' : 'text-emerald-600'

  return (
    <Modal
      open={producto !== null}
      onClose={onClose}
      title={producto ? `Movimiento de stock · ${producto.codigo}` : 'Movimiento de stock'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} loading={guardando}>
            Registrar movimiento
          </Button>
        </>
      }
    >
      {producto && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
              <IconArchiveBox className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{producto.descripcion}</p>
              <p className="text-xs text-slate-500">
                Stock actual: <span className="font-semibold text-slate-700">{stockActual}</span>
                {producto.stock_minimo > 0 && <span> · mínimo {producto.stock_minimo}</span>}
              </p>
            </div>
          </div>

          <div>
            <span className="label">Tipo de movimiento</span>
            <Segmented<TipoMovimiento>
              value={tipo}
              onChange={setTipo}
              options={[
                { value: 'ingreso', label: 'Ingreso', activeClass: 'bg-white text-emerald-700 shadow-sm' },
                { value: 'egreso', label: 'Egreso', activeClass: 'bg-white text-red-600 shadow-sm' },
                { value: 'ajuste', label: 'Ajuste', activeClass: 'bg-white text-blue-600 shadow-sm' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={ETIQUETA_CANTIDAD[tipo]}
              id="mov-cantidad"
              type="number"
              min={0}
              step={1}
              autoFocus
              placeholder="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && guardar()}
            />
            <Input
              label="Motivo (opcional)"
              id="mov-motivo"
              placeholder={PLACEHOLDER_MOTIVO[tipo]}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          {cantValida && (cant > 0 || tipo === 'ajuste') && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="text-sm text-slate-500">Stock resultante</span>
              <span className="flex items-center gap-2 text-sm font-medium text-slate-400">
                {stockActual}
                <span className="text-slate-300">→</span>
                <span className={`text-xl font-bold ${colorNuevo}`}>{stockNuevo}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
