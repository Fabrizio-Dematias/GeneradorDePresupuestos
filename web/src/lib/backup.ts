import { fechaParaArchivo } from './csv'
import { traerTodas } from './consultas'
import { COMMIT, VERSION } from './version'

/**
 * Backup completo: descarga todas las tablas del negocio en un único
 * archivo JSON. Es un seguro barato contra pérdida de datos (el plan
 * gratuito de Supabase no tiene restauración a un punto en el tiempo).
 */

const TABLAS = [
  'clientes',
  'productos',
  'marcas',
  'remitos',
  'remito_items',
  'historial_precios',
  'movimientos_stock',
] as const

export async function descargarBackup(): Promise<number> {
  const tablas: Record<string, unknown[]> = {}
  let totalFilas = 0

  for (const tabla of TABLAS) {
    let filas: unknown[]
    try {
      filas = await traerTodas<unknown>(tabla, '*', 'id')
    } catch (e: any) {
      throw new Error(`${tabla}: ${e?.message ?? 'error al leer la tabla'}`)
    }
    tablas[tabla] = filas
    totalFilas += filas.length
  }

  // Queda registrada la versión que generó el backup: si hay que restaurar,
  // se sabe con qué código se exportó.
  const contenido = JSON.stringify(
    { generado: new Date().toISOString(), version: VERSION, commit: COMMIT, tablas },
    null,
    1
  )
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
