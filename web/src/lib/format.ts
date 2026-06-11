const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numero = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatARS(value: number): string {
  return currency.format(value)
}

export function formatNumero(value: number): string {
  return numero.format(value)
}

/** '2026-02-10' o ISO timestamp → '10/02/2026' */
export function formatFecha(value: string | null): string {
  if (!value) return ''
  const soloFecha = value.slice(0, 10)
  const [y, m, d] = soloFecha.split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

/** ISO timestamp → '10/02/2026 14:35' */
export function formatFechaHora(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return formatFecha(value)
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Fecha local de hoy en formato 'YYYY-MM-DD' (para inputs type=date) */
export function hoyISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Misma lógica que la app de escritorio: 11 dígitos → XX-XXXXXXXX-X */
export function formatearCUIT(cuit: string): string {
  if (!cuit) return ''
  const limpio = cuit.replace(/[^0-9]/g, '')
  if (limpio.length === 11) {
    return `${limpio.slice(0, 2)}-${limpio.slice(2, 10)}-${limpio.slice(10)}`
  }
  return cuit
}

/**
 * Calcula el próximo número de remito con el mismo formato que el
 * escritorio: '0001-001', '0001-002'... Usa el mayor sufijo existente.
 */
export function proximoNumeroRemito(numeros: string[]): string {
  let max = 0
  for (const n of numeros) {
    const sufijo = parseInt(n.split('-')[1] ?? '', 10)
    if (!isNaN(sufijo) && sufijo > max) max = sufijo
  }
  return `0001-${String(max + 1).padStart(3, '0')}`
}

/** Igual que el escritorio: remito_{Cliente}_{numero}.pdf */
export function nombreArchivoRemito(cliente: string, numero: string): string {
  const limpio = cliente.replace(/[^a-zA-Z0-9]/g, '_')
  return `remito_${limpio}_${numero}.pdf`
}

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
