import { fechaParaArchivo } from './csv'
import { traerTodas } from './consultas'
import { COMMIT, VERSION } from './version'

/**
 * Backup completo: descarga todas las tablas del negocio en un único
 * archivo JSON. Es un seguro barato contra pérdida de datos (el plan
 * gratuito de Supabase no tiene restauración a un punto en el tiempo).
 */

// Cada tabla con su clave única: se ordena por ella para que la lectura en
// tandas no saltee ni repita filas (marcas no tiene id, su clave es el nombre).
const TABLAS = [
  ['clientes', 'id'],
  ['productos', 'id'],
  ['marcas', 'nombre'],
  ['remitos', 'id'],
  ['remito_items', 'id'],
  ['historial_precios', 'id'],
  ['movimientos_stock', 'id'],
  ['pagos', 'id'],
  ['pago_imputaciones', 'id'],
  ['proveedores', 'id'],
  ['producto_proveedor', 'id'],
] as const

export async function descargarBackup(): Promise<number> {
  const tablas: Record<string, unknown[]> = {}
  let totalFilas = 0

  for (const [tabla, clave] of TABLAS) {
    let filas: unknown[]
    try {
      filas = await traerTodas<unknown>(tabla, '*', clave)
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
