/**
 * Exportación a CSV compatible con Excel en español (es-AR):
 * - separador ';' porque Excel es-AR usa la coma como decimal
 * - BOM UTF-8 para que Excel muestre bien los acentos
 * - números con coma decimal, sin separador de miles
 */

export type ValorCSV = string | number | null | undefined

export function exportarCSV(
  nombreArchivo: string,
  encabezados: string[],
  filas: ValorCSV[][]
): void {
  const SEP = ';'
  const escapar = (v: ValorCSV): string => {
    if (v === null || v === undefined) return ''
    if (typeof v === 'number') return String(v).replace('.', ',')
    const s = String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const contenido = [encabezados, ...filas]
    .map((fila) => fila.map(escapar).join(SEP))
    .join('\r\n')

  const blob = new Blob(['\ufeff' + contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Fecha local 'YYYY-MM-DD' para armar nombres de archivo. */
export function fechaParaArchivo(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
