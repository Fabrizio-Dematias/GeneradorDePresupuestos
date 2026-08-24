/**
 * Separa las medidas que quedaron pegadas al final de la descripción.
 *
 * Las listas viejas se cargaron con la medida dentro del texto
 * ("LAZO NUEVO 8x9x30"), pero la lista de precios en PDF las muestra en su
 * propia columna. Esto detecta el patrón al final del texto y lo devuelve
 * aparte, sin tocar nada que no tenga pinta de medida.
 *
 * Reconoce: 6x8x16 · 6,3x6,3x15 · 8x9x30 · 5,8x8,8x11 · Ø5X10 · Ø22
 * No toca: "50L", "8A", "450V 25uF", "GRANDE 3/8", "KG 65 / 72".
 */

const RE_MEDIDAS =
  /\s+((?:[ØøΦ⌀]\s*)?\d+(?:[.,]\d+)?(?:\s*[xX×]\s*(?:[ØøΦ⌀]\s*)?\d+(?:[.,]\d+)?)+|[ØøΦ⌀]\s*\d+(?:[.,]\d+)?)\s*$/

export interface MedidaSeparada {
  descripcion: string
  medidas: string
}

/** Devuelve null si la descripción no termina en algo que parezca una medida. */
export function separarMedidas(descripcion: string): MedidaSeparada | null {
  const texto = (descripcion ?? '').trim()
  const match = texto.match(RE_MEDIDAS)
  if (!match) return null

  const limpia = texto.slice(0, match.index).trim().replace(/[-–,;:]+$/, '').trim()
  // Si al sacar la medida no queda descripción, mejor dejarlo como está
  if (!limpia) return null

  return { descripcion: limpia, medidas: match[1].replace(/\s+/g, '') }
}

/** Orden natural para códigos como '401', '41001', '428 B'. */
export function compararCodigos(a: string, b: string): number {
  return String(a ?? '').localeCompare(String(b ?? ''), 'es', { numeric: true, sensitivity: 'base' })
}
