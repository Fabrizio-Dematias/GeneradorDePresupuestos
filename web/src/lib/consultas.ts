import { supabase } from './supabase'

/**
 * Deja el texto del usuario listo para meterlo en un filtro `or(...)` de
 * PostgREST, que se arma como texto: `columna.ilike.%valor%`.
 *
 * Se quitan los caracteres que cambiarían el significado del filtro en vez
 * de buscarse literalmente:
 *   ,   separa condiciones  → permitiría agregar filtros nuevos
 *   ( ) agrupan condiciones
 *   %   comodín de ilike
 *   *   comodín de ilike en PostgREST (buscar "*" traía todo)
 *   \   carácter de escape
 *
 * Las comillas se dejan a propósito: las descripciones usan pulgadas
 * (`AM. 41/2"`) y quitarlas rompería esas búsquedas.
 */
export function filtroTexto(texto: string): string {
  return texto
    .replace(/[,()%*\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Trae TODAS las filas de una tabla, en tandas.
 *
 * Supabase corta las respuestas a 1000 filas por defecto (Settings → API →
 * Max rows). Sin esto, un catálogo grande se cargaría incompleto y la lista
 * de precios saldría con productos de menos sin avisar.
 *
 * Se avanza por la cantidad de filas que efectivamente devolvió el servidor
 * y se corta recién cuando llega una tanda vacía: así funciona igual aunque
 * el tope del servidor sea distinto al tamaño de tanda que se pide.
 */
export async function traerTodas<T>(
  tabla: string,
  columnas = '*',
  orden?: string
): Promise<T[]> {
  const LOTE = 1000
  const filas: T[] = []
  let desde = 0

  for (;;) {
    let consulta = supabase.from(tabla).select(columnas).range(desde, desde + LOTE - 1)
    if (orden) consulta = consulta.order(orden)

    const { data, error } = await consulta
    if (error) throw error

    const lote = (data ?? []) as unknown as T[]
    if (lote.length === 0) break

    filas.push(...lote)
    desde += lote.length
  }

  return filas
}
