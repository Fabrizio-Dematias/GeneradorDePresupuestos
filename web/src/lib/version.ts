/**
 * Versión que está corriendo. Los valores los inyecta vite al compilar
 * (ver scripts/build-info.mjs); si por algún motivo no están, la app
 * igual funciona y muestra "dev".
 */

const leer = (valor: string | undefined, porDefecto: string) =>
  typeof valor === 'string' && valor ? valor : porDefecto

export const VERSION = leer(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '', 'dev')
export const COMMIT = leer(typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : '', '')
export const FECHA_BUILD = leer(typeof __APP_FECHA__ !== 'undefined' ? __APP_FECHA__ : '', '')

/** Copia de previsualización con datos de ejemplo (no es la base real). */
export const ES_DEMO = typeof __DEMO__ !== 'undefined' && __DEMO__ === true

/** "v1.2.3" — lo único que se muestra abajo en el menú. */
export const VERSION_CORTA = `v${VERSION}`

/**
 * Detalle para el tooltip: el commit y la fecha quedan acá, a mano si hay
 * que volver a una versión, pero sin ensuciar la pantalla.
 */
export function versionDetallada(): string {
  const conCommit = `${VERSION_CORTA}${COMMIT ? ` · ${COMMIT}` : ''}`
  if (!FECHA_BUILD) return conCommit
  const fecha = new Date(FECHA_BUILD)
  if (isNaN(fecha.getTime())) return conCommit
  return `${conCommit}\nActualizado el ${fecha.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`
}
