import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatARS, formatFecha, hoyISO } from '../lib/format'
import { parsearNumero } from '../lib/importar'
import { Button, ChipGroup, Input, Modal } from './ui'
import { useToast } from './Toast'
import { MEDIOS_PAGO, type RemitoConCobro } from '../types'

const redondear = (n: number) => Math.round(n * 100) / 100

/** Importe listo para un input: "10.000,00" (parsearNumero lo vuelve a leer igual). */
const paraInput = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * A qué cliente pertenece un remito: el cliente guardado o, si el remito no
 * tiene, el nombre escrito. Mismo criterio que deudas_por_cliente en la base.
 */
export function claveCliente(r: Pick<RemitoConCobro, 'cliente_id' | 'cliente_nombre'>): string {
  return r.cliente_id != null
    ? `id:${r.cliente_id}`
    : `nombre:${(r.cliente_nombre ?? '').trim().toLowerCase()}`
}

/** Reparte un monto entre remitos, saldando primero los más viejos. */
function repartir(monto: number, remitos: RemitoConCobro[]): Record<number, string> {
  let resto = redondear(Math.max(monto, 0))
  const montos: Record<number, string> = {}
  for (const r of remitos) {
    const parte = redondear(Math.min(r.saldo, resto))
    montos[r.id] = paraInput(parte)
    resto = redondear(resto - parte)
  }
  return montos
}

/**
 * Registra el cobro de uno o varios remitos (control interno: no aparece en el
 * remito ni en el PDF). Permite pagos parciales; si los remitos son de clientes
 * distintos se registra un pago por cliente, todo en una sola operación.
 */
export default function RegistrarPagoModal({
  remitos,
  onClose,
  onRegistrado,
}: {
  remitos: RemitoConCobro[]
  onClose: () => void
  onRegistrado: () => void
}) {
  const { toast } = useToast()

  const ordenados = useMemo(
    () => [...remitos].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id),
    [remitos]
  )
  const saldoTotal = redondear(ordenados.reduce((acc, r) => acc + r.saldo, 0))
  const cantidadClientes = useMemo(() => new Set(ordenados.map(claveCliente)).size, [ordenados])

  const [fecha, setFecha] = useState(hoyISO())
  const [medio, setMedio] = useState<string>(MEDIOS_PAGO[0])
  const [referencia, setReferencia] = useState('')
  const [nota, setNota] = useState('')
  const [montos, setMontos] = useState<Record<number, string>>(() => repartir(saldoTotal, ordenados))
  const [montoRecibido, setMontoRecibido] = useState(paraInput(saldoTotal))
  const [guardando, setGuardando] = useState(false)

  const filas = ordenados.map((r) => {
    const valor = parsearNumero(montos[r.id] ?? '')
    const importe = valor === null ? null : redondear(valor)
    let error: string | null = null
    if (importe === null || importe < 0) error = 'Importe inválido'
    else if (importe > r.saldo + 0.005) error = 'Supera el saldo'
    return { remito: r, importe: importe ?? 0, error }
  })
  const total = redondear(filas.reduce((acc, f) => acc + (f.error ? 0 : f.importe), 0))
  const hayErrores = filas.some((f) => f.error)
  const fechaValida = Boolean(fecha) && fecha <= hoyISO()
  const puedeGuardar = !hayErrores && total > 0 && fechaValida && !guardando

  function cambiarMontoRecibido(texto: string) {
    setMontoRecibido(texto)
    const valor = parsearNumero(texto)
    if (valor !== null && valor >= 0) setMontos(repartir(valor, ordenados))
  }

  function cambiarMonto(id: number, texto: string) {
    const nuevos = { ...montos, [id]: texto }
    setMontos(nuevos)
    const suma = ordenados.reduce((acc, r) => acc + (parsearNumero(nuevos[r.id] ?? '') ?? 0), 0)
    setMontoRecibido(paraInput(redondear(suma)))
  }

  async function guardar() {
    if (!puedeGuardar) return
    // Un pago por cliente: lo normal es un solo cliente; si se marcaron remitos
    // de varios (por ejemplo, para poner al día los viejos) cada uno lleva el suyo.
    const grupos = new Map<string, { remito_id: number; importe: number }[]>()
    for (const f of filas) {
      if (f.importe <= 0) continue
      const clave = claveCliente(f.remito)
      grupos.set(clave, [...(grupos.get(clave) ?? []), { remito_id: f.remito.id, importe: f.importe }])
    }
    const pagos = Array.from(grupos.values()).map((imputaciones) => ({
      fecha,
      medio,
      referencia: referencia.trim(),
      nota: nota.trim(),
      imputaciones,
    }))

    setGuardando(true)
    const { error } = await supabase.rpc('registrar_pagos', { p_pagos: pagos })
    setGuardando(false)
    if (error) {
      toast('error', `No se pudo registrar el pago: ${error.message}`)
      return
    }
    toast(
      'success',
      pagos.length === 1
        ? `Pago de ${formatARS(total)} registrado.`
        : `Se registraron ${pagos.length} pagos (uno por cliente) por ${formatARS(total)}.`
    )
    onRegistrado()
  }

  const varios = ordenados.length > 1

  return (
    <Modal
      open
      onClose={onClose}
      title={varios ? `Registrar pago · ${ordenados.length} remitos` : `Registrar pago · remito ${ordenados[0]?.numero}`}
      size="lg"
      footer={
        <>
          <p className="mr-auto text-sm text-slate-600">
            A registrar: <strong className="text-slate-900">{formatARS(total)}</strong>
          </p>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} loading={guardando} disabled={!puedeGuardar}>
            Registrar pago
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Control interno: no aparece en el remito ni en el PDF que se lleva el cliente.
        </p>

        {cantidadClientes > 1 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Los remitos son de {cantidadClientes} clientes distintos: se registra un pago por cliente.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <Input
            label="Fecha del pago"
            id="fecha-pago"
            type="date"
            value={fecha}
            max={hoyISO()}
            onChange={(e) => setFecha(e.target.value)}
          />
          <div>
            <p className="label">Medio de pago</p>
            <ChipGroup opciones={MEDIOS_PAGO} valor={medio} onChange={setMedio} />
          </div>
        </div>
        {!fechaValida && (
          <p className="text-xs text-red-700">La fecha del pago no puede ser posterior a hoy.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Referencia (opcional)"
            id="referencia-pago"
            placeholder="N° de transferencia, de cheque…"
            maxLength={200}
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
          />
          <Input
            label="Nota (opcional)"
            id="nota-pago"
            maxLength={500}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        </div>

        {varios && cantidadClientes === 1 && (
          <div>
            <Input
              label="Monto recibido"
              id="monto-recibido"
              inputMode="decimal"
              value={montoRecibido}
              onChange={(e) => cambiarMontoRecibido(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Se reparte saldando primero los remitos más viejos. Podés ajustar cada uno abajo.
            </p>
          </div>
        )}

        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {filas.map(({ remito: r, importe, error }) => {
            const queda = redondear(r.saldo - importe)
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    <span className="font-mono">{r.numero}</span> · {r.cliente_nombre || '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFecha(r.fecha)} · total {formatARS(r.total)} · saldo{' '}
                    <strong className="text-slate-700">{formatARS(r.saldo)}</strong>
                  </p>
                </div>
                <div className="w-36">
                  <input
                    className="input !py-1.5 text-right"
                    inputMode="decimal"
                    aria-label={`Importe para el remito ${r.numero}`}
                    value={montos[r.id] ?? ''}
                    onChange={(e) => cambiarMonto(r.id, e.target.value)}
                  />
                  <p
                    className={`mt-0.5 text-right text-xs ${
                      error ? 'text-red-700' : queda <= 0 ? 'text-emerald-700' : importe > 0 ? 'text-amber-700' : 'text-slate-400'
                    }`}
                  >
                    {error ?? (queda <= 0 ? 'queda saldado' : importe > 0 ? `queda debiendo ${formatARS(queda)}` : 'sin pago')}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}
