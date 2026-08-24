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

/** "v1.2.3 · a1b2c3d" — lo que se muestra abajo en el menú. */
export const VERSION_CORTA = `v${VERSION}${COMMIT ? ` · ${COMMIT}` : ''}`

/** Detalle para el tooltip: incluye cuándo se compiló. */
export function versionDetallada(): string {
  if (!FECHA_BUILD) return VERSION_CORTA
  const fecha = new Date(FECHA_BUILD)
  if (isNaN(fecha.getTime())) return VERSION_CORTA
  return `${VERSION_CORTA}\nActualizado el ${fecha.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`
}
