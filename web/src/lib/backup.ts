import { supabase } from './supabase'
import { fechaParaArchivo } from './csv'

/**
 * Backup completo: descarga todas las tablas del negocio en un único
 * archivo JSON. Es un seguro barato contra pérdida de datos (el plan
 * gratuito de Supabase no tiene restauración a un punto en el tiempo).
 */

const TABLAS = [
  'clientes',
  'productos',
  'remitos',
  'remito_items',
  'historial_precios',
  'movimientos_stock',
] as const

export async function descargarBackup(): Promise<number> {
  const LOTE = 1000
  const tablas: Record<string, unknown[]> = {}
  let totalFilas = 0

  for (const tabla of TABLAS) {
    const filas: unknown[] = []
    for (let desde = 0; ; desde += LOTE) {
      const { data, error } = await supabase
        .from(tabla)
        .select('*')
        .order('id')
        .range(desde, desde + LOTE - 1)
      if (error) throw new Error(`${tabla}: ${error.message}`)
      filas.push(...(data ?? []))
      if (!data || data.length < LOTE) break
    }
    tablas[tabla] = filas
    totalFilas += filas.length
  }

  const contenido = JSON.stringify({ generado: new Date().toISOString(), tablas }, null, 1)
  const blob = new Blob([contenido], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup_dicor_${fechaParaArchivo()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  return totalFilas
}
