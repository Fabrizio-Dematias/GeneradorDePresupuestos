/**
 * Datos de la versión que se compila: los inyectan los dos vite.config
 * como constantes, así la app puede mostrar en qué versión está corriendo.
 *
 * La versión sale de package.json (la sube el hook de git en cada commit),
 * el commit de git o de la variable que expone Vercel al construir.
 */

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function commitActual() {
  const deVercel = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  if (deVercel) return deVercel.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: raiz,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return '' // build fuera de un repo git: se muestra solo la versión
  }
}

export function infoDeBuild() {
  let version = '0.0.0'
  try {
    version = JSON.parse(readFileSync(path.join(raiz, 'package.json'), 'utf8')).version ?? version
  } catch {
    /* sin package.json legible se usa el valor por defecto */
  }

  return {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commitActual()),
    __APP_FECHA__: JSON.stringify(new Date().toISOString()),
  }
}
