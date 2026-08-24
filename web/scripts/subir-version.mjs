/**
 * Sube el número de versión de web/package.json.
 *
 * Lo usa el hook de git antes de cada commit (.githooks/pre-commit), así
 * cada commit queda con su propia versión y se puede ver desde la app en
 * qué versión está corriendo el sistema.
 *
 * Uso: node scripts/subir-version.mjs [patch|minor|major]
 *   patch (por defecto) 1.2.3 → 1.2.4   arreglos y cambios chicos
 *   minor               1.2.3 → 1.3.0   funciones nuevas
 *   major               1.2.3 → 2.0.0   cambios grandes
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const tipo = process.argv[2] ?? 'patch'
if (!['patch', 'minor', 'major'].includes(tipo)) {
  console.error(`Tipo de versión inválido: ${tipo} (usá patch, minor o major)`)
  process.exit(1)
}

const archivo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json')
const original = readFileSync(archivo, 'utf8')
const pkg = JSON.parse(original)

const [mayor, menor, parche] = String(pkg.version ?? '0.0.0')
  .split('.')
  .map((n) => parseInt(n, 10) || 0)

const nueva =
  tipo === 'major'
    ? `${mayor + 1}.0.0`
    : tipo === 'minor'
      ? `${mayor}.${menor + 1}.0`
      : `${mayor}.${menor}.${parche + 1}`

// Se reemplaza solo la línea de la versión para no reformatear el archivo
const actualizado = original.replace(
  /("version"\s*:\s*")[^"]*(")/,
  (_, antes, despues) => `${antes}${nueva}${despues}`
)
if (actualizado === original) {
  console.error('No se encontró el campo "version" en package.json')
  process.exit(1)
}

writeFileSync(archivo, actualizado)
console.log(`versión ${pkg.version} → ${nueva}`)
