/**
 * Importación de listas de productos desde Excel o CSV.
 *
 * Acá vive todo lo que no es interfaz: leer el CSV, adivinar qué columna es
 * cada cosa, interpretar los precios con formato argentino y comparar contra
 * el catálogo para saber qué es alta y qué es actualización.
 */

import type { Celda } from './xlsx'
import type { Producto } from '../types'

// ---------------------------------------------------------------- CSV

/** Lee un CSV detectando solo el separador (';', ',' o tabulación). */
export function leerCSV(texto: string): Celda[][] {
  const limpio = texto.replace(/^\uFEFF/, '') // BOM que Excel pone al inicio
  const filas = parsearCSV(limpio, detectarSeparador(limpio))
  while (filas.length > 0 && filas[filas.length - 1].every((c) => c === '')) filas.pop()
  return filas
}

function detectarSeparador(texto: string): string {
  const muestra = texto.slice(0, 8000).split(/\r?\n/).slice(0, 20).join('\n')
  const conteo: Record<string, number> = { ';': 0, ',': 0, '\t': 0 }
  let comillas = false
  for (const ch of muestra) {
    if (ch === '"') comillas = !comillas
    else if (!comillas && ch in conteo) conteo[ch]++
  }
  // Empate o CSV de una sola columna: ';' es lo que exporta Excel en es-AR
  return Object.keys(conteo).reduce((a, b) => (conteo[b] > conteo[a] ? b : a), ';')
}

function parsearCSV(texto: string, sep: string): string[][] {
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let comillas = false

  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]
    if (comillas) {
      if (ch === '"') {
        if (texto[i + 1] === '"') {
          campo += '"'
          i++
        } else comillas = false
      } else campo += ch
    } else if (ch === '"') comillas = true
    else if (ch === sep) {
      fila.push(campo.trim())
      campo = ''
    } else if (ch === '\n') {
      fila.push(campo.trim())
      filas.push(fila)
      fila = []
      campo = ''
    } else if (ch !== '\r') campo += ch
  }
  if (campo !== '' || fila.length > 0) {
    fila.push(campo.trim())
    filas.push(fila)
  }
  return filas
}

// ---------------------------------------------------------------- Números

/**
 * Interpreta números escritos a la argentina ("1.234,56", "$ 18.500") y
 * también los que ya vienen como number desde el .xlsx.
 */
export function parsearNumero(valor: Celda): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null

  const original = String(valor).trim()
  if (!original) return null
  const negativo = original.startsWith('-') || /^\(.*\)$/.test(original)

  let s = original.replace(/[^\d.,]/g, '')
  if (!s) return null

  const coma = s.lastIndexOf(',')
  const punto = s.lastIndexOf('.')
  if (coma >= 0 && punto >= 0) {
    // El separador decimal es el que aparece último
    s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (coma >= 0) {
    s = s.split(',').length > 2 ? s.replace(/,/g, '') : s.replace(',', '.')
  } else if (punto >= 0) {
    // "18.500" en una lista argentina son dieciocho mil quinientos, no 18,5
    const partes = s.split('.')
    if (partes.length > 2 || partes[partes.length - 1].length === 3) s = partes.join('')
  }

  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return negativo ? -Math.abs(n) : n
}

// ---------------------------------------------------------------- Mapeo de columnas

export type Campo =
  | 'codigo'
  | 'descripcion'
  | 'precio'
  | 'categoria'
  | 'marca'
  | 'medidas'
  | 'modelo'
  | 'stock'
  | 'stockMinimo'

export const CAMPOS: { campo: Campo; etiqueta: string; obligatorio: boolean }[] = [
  { campo: 'codigo', etiqueta: 'Código', obligatorio: true },
  { campo: 'descripcion', etiqueta: 'Descripción', obligatorio: true },
  { campo: 'precio', etiqueta: 'Precio unitario', obligatorio: true },
  { campo: 'categoria', etiqueta: 'Categoría', obligatorio: false },
  { campo: 'marca', etiqueta: 'Marca', obligatorio: false },
  { campo: 'medidas', etiqueta: 'Medidas', obligatorio: false },
  { campo: 'modelo', etiqueta: 'Modelo (MOD)', obligatorio: false },
  { campo: 'stock', etiqueta: 'Stock inicial', obligatorio: false },
  { campo: 'stockMinimo', etiqueta: 'Stock mínimo', obligatorio: false },
]

/** Índice de columna por campo; -1 significa "ninguna columna". */
export type Mapeo = Record<Campo, number>

export const MAPEO_VACIO: Mapeo = {
  codigo: -1,
  descripcion: -1,
  precio: -1,
  categoria: -1,
  marca: -1,
  medidas: -1,
  modelo: -1,
  stock: -1,
  stockMinimo: -1,
}

const CLAVES: Record<Campo, string[]> = {
  codigo: ['codigo', 'cod', 'sku', 'art', 'articulo', 'referencia', 'ref', 'item'],
  descripcion: ['descripcion', 'detalle', 'producto', 'denominacion', 'nombre', 'articulo'],
  precio: ['precio unitario', 'precio', 'p unit', 'punit', 'unitario', 'importe', 'lista', 'valor', 'monto'],
  categoria: ['categoria', 'rubro', 'familia', 'linea', 'grupo'],
  marca: ['marca', 'fabricante'],
  medidas: ['medidas', 'medida', 'dimensiones', 'dimension', 'tamano'],
  modelo: ['mod', 'modelo'],
  stock: ['stock inicial', 'stock', 'cantidad', 'existencia', 'existencias'],
  stockMinimo: ['stock minimo', 'stock min', 'minimo', 'min', 'reposicion'],
}

/** Minúsculas, sin acentos ni signos: para comparar encabezados. */
export function normalizar(texto: Celda): string {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Adivina qué columna corresponde a cada campo mirando los encabezados. */
export function detectarMapeo(encabezados: Celda[]): Mapeo {
  const nombres = encabezados.map(normalizar)
  const candidatos: { campo: Campo; col: number; puntaje: number }[] = []

  for (const { campo } of CAMPOS) {
    nombres.forEach((nombre, col) => {
      if (!nombre) return
      let mejor = 0
      for (const clave of CLAVES[campo]) {
        const puntaje = nombre === clave ? 3 : nombre.startsWith(clave) ? 2 : nombre.includes(clave) ? 1 : 0
        if (puntaje > mejor) mejor = puntaje
      }
      if (mejor > 0) candidatos.push({ campo, col, puntaje: mejor })
    })
  }

  candidatos.sort((a, b) => b.puntaje - a.puntaje)
  const mapeo: Mapeo = { ...MAPEO_VACIO }
  const usadas = new Set<number>()
  for (const c of candidatos) {
    if (mapeo[c.campo] >= 0 || usadas.has(c.col)) continue
    mapeo[c.campo] = c.col
    usadas.add(c.col)
  }
  return mapeo
}

/**
 * Busca la fila de encabezados entre las primeras del archivo (las listas
 * suelen arrancar con un título o el logo arriba). -1 = no hay encabezados.
 */
export function detectarEncabezado(filas: Celda[][]): number {
  let fila = -1
  let mejor = 0
  for (let i = 0; i < Math.min(filas.length, 15); i++) {
    const mapeo = detectarMapeo(filas[i])
    const puntaje =
      (mapeo.codigo >= 0 ? 1 : 0) + (mapeo.descripcion >= 0 ? 1 : 0) + (mapeo.precio >= 0 ? 1 : 0)
    if (puntaje > mejor) {
      mejor = puntaje
      fila = i
    }
  }
  return mejor >= 2 ? fila : -1
}

/** "A", "B", … "AA": nombre de columna al estilo Excel. */
export function nombreColumna(indice: number): string {
  let n = indice + 1
  let nombre = ''
  while (n > 0) {
    const resto = (n - 1) % 26
    nombre = String.fromCharCode(65 + resto) + nombre
    n = Math.floor((n - resto) / 26)
  }
  return nombre
}

// ---------------------------------------------------------------- Filas

export type EstadoFila = 'nuevo' | 'actualiza' | 'omitido' | 'error'

export interface FilaImportada {
  nroFila: number // número de fila tal como se ve en el Excel (base 1)
  codigo: string
  descripcion: string
  precio: number | null
  categoria: string
  marca: string
  medidas: string
  modelo: string
  stock: number
  stockMinimo: number
  estado: EstadoFila
  detalle: string | null // motivo del error o del descarte
  anterior: Producto | null
}

/** Clave para comparar códigos: sin espacios ni mayúsculas ("428 B" = "428b"). */
export function claveCodigo(codigo: string): string {
  return String(codigo ?? '').trim().toLowerCase().replace(/\s+/g, '')
}

const celdaTexto = (fila: Celda[], col: number): string =>
  col >= 0 && col < fila.length ? String(fila[col] ?? '').trim() : ''

interface FilaCruda {
  nroFila: number
  codigo: string
  descripcion: string
  precio: number | null
  categoria: string
  marca: string
  medidas: string
  modelo: string
  stock: number
  stockMinimo: number
  lineasExtra: number
  bloque: number
}

/**
 * Un bloque del archivo: en las listas de DICOR cada marca es un bloque, con
 * su propio encabezado de columnas y, arriba, el nombre o el logo de la marca.
 */
export interface BloqueArchivo {
  indice: number
  /** Fila donde arranca (para ubicar el logo que está justo arriba) */
  nroFila: number
  /** Nombre detectado en el archivo; vacío si la marca era una imagen */
  titulo: string
  cantidad: number
  primerCodigo: string
}

/** Un texto que se repite muchas veces es el membrete de la hoja, no una marca. */
const MAX_REPETICIONES_TITULO = 2

/**
 * Primera pasada: saca de cada fila los datos del producto.
 *
 * Contempla las listas armadas como catálogo (una foto por producto), donde
 * hay filas que no son productos: títulos de sección, encabezados repetidos
 * a mitad de la lista, filas sueltas que solo arrastran el precio de la celda
 * combinada, y segundos renglones de descripción sin código.
 */
function leerFilas(
  filas: Celda[][],
  mapeo: Mapeo,
  desde: number,
  categoriaDestino: string
): { crudas: FilaCruda[]; bloques: BloqueArchivo[] } {
  const encabezado = desde > 0 ? filas[desde - 1] ?? [] : []
  const claveEncabezado = normalizar(
    `${celdaTexto(encabezado, mapeo.codigo)}|${celdaTexto(encabezado, mapeo.descripcion)}`
  )

  const esEncabezado = (codigo: string, descripcion: string) =>
    claveEncabezado !== '' && normalizar(`${codigo}|${descripcion}`) === claveEncabezado

  // Un título suelto que se repite muchas veces es el membrete de cada hoja
  // impresa ("CARBONES PARA HERRAMIENTAS ELECTRICAS"), no el nombre de una marca.
  const repeticiones = new Map<string, number>()
  for (let i = Math.max(0, desde); i < filas.length; i++) {
    const fila = filas[i]
    if (!fila) continue
    const codigo = celdaTexto(fila, mapeo.codigo)
    const descripcion = celdaTexto(fila, mapeo.descripcion)
    const precio = mapeo.precio >= 0 ? parsearNumero(fila[mapeo.precio] ?? '') : null
    if (codigo && !descripcion && precio === null && !esEncabezado(codigo, descripcion)) {
      const clave = normalizar(codigo)
      repeticiones.set(clave, (repeticiones.get(clave) ?? 0) + 1)
    }
  }

  const crudas: FilaCruda[] = []
  const bloques: BloqueArchivo[] = [
    { indice: 0, nroFila: desde + 1, titulo: '', cantidad: 0, primerCodigo: '' },
  ]
  let bloque = 0
  let tituloPendiente = ''

  // El nombre del primer bloque está arriba del encabezado de columnas
  for (let i = desde - 2; i >= Math.max(0, desde - 6); i--) {
    const fila = filas[i]
    if (!fila) continue
    const codigo = celdaTexto(fila, mapeo.codigo)
    const descripcion = celdaTexto(fila, mapeo.descripcion)
    const precio = mapeo.precio >= 0 ? parsearNumero(fila[mapeo.precio] ?? '') : null
    if (!codigo || descripcion || precio !== null) continue
    if ((repeticiones.get(normalizar(codigo)) ?? 0) <= MAX_REPETICIONES_TITULO) {
      tituloPendiente = codigo
      break
    }
  }

  const abrirBloque = (nroFila: number) => {
    if (bloques[bloque].cantidad === 0) {
      // El bloque actual todavía no tiene productos: se reusa
      bloques[bloque].nroFila = nroFila
      if (tituloPendiente) bloques[bloque].titulo = tituloPendiente
    } else {
      bloque = bloques.length
      bloques.push({
        indice: bloque,
        nroFila,
        titulo: tituloPendiente,
        cantidad: 0,
        primerCodigo: '',
      })
    }
    tituloPendiente = ''
  }

  for (let i = Math.max(0, desde); i < filas.length; i++) {
    const fila = filas[i]
    if (!fila || fila.every((c) => String(c ?? '').trim() === '')) continue

    const codigo = celdaTexto(fila, mapeo.codigo)
    const descripcion = celdaTexto(fila, mapeo.descripcion).replace(/\s+/g, ' ')
    const precio = mapeo.precio >= 0 ? parsearNumero(fila[mapeo.precio] ?? '') : null

    // Fila que no aporta nada (solo el precio de la celda combinada)
    if (!codigo && !descripcion) continue

    // Encabezado de columnas repetido: arranca un bloque nuevo
    if (esEncabezado(codigo, descripcion)) {
      abrirBloque(i + 1)
      continue
    }

    // Título de sección: texto suelto, sin descripción ni precio
    if (!descripcion && precio === null) {
      if ((repeticiones.get(normalizar(codigo)) ?? 0) <= MAX_REPETICIONES_TITULO) {
        tituloPendiente = codigo
      }
      continue
    }

    // Renglón que continúa la descripción del producto de arriba. Puede venir
    // sin código, o repitiendo el mismo código y precio cuando esas celdas
    // están combinadas hacia abajo (así arma la lista el Excel de DICOR).
    const previa = crudas[crudas.length - 1]
    const continuaAlAnterior =
      previa !== undefined &&
      previa.codigo !== '' &&
      descripcion !== '' &&
      (codigo === '' ||
        (codigo === previa.codigo && (precio === null || precio === previa.precio)))
    if (continuaAlAnterior) {
      previa.descripcion = `${previa.descripcion} ${descripcion}`.trim()
      previa.lineasExtra++
      continue
    }

    // Un título sin encabezado de columnas detrás también abre bloque
    if (tituloPendiente) abrirBloque(i + 1)

    crudas.push({
      nroFila: i + 1,
      codigo,
      descripcion,
      precio,
      categoria: (celdaTexto(fila, mapeo.categoria) || categoriaDestino).toUpperCase(),
      marca: celdaTexto(fila, mapeo.marca).toUpperCase(),
      medidas: celdaTexto(fila, mapeo.medidas).toUpperCase(),
      modelo: celdaTexto(fila, mapeo.modelo).toUpperCase(),
      stock: Math.max(0, Math.round(parsearNumero(fila[mapeo.stock] ?? '') ?? 0)),
      stockMinimo: Math.max(0, Math.round(parsearNumero(fila[mapeo.stockMinimo] ?? '') ?? 0)),
      lineasExtra: 0,
      bloque,
    })

    bloques[bloque].cantidad++
    if (!bloques[bloque].primerCodigo) bloques[bloque].primerCodigo = codigo
  }

  return { crudas, bloques: bloques.filter((b) => b.cantidad > 0) }
}

/** Bloques (marcas) que trae el archivo, para poder nombrarlos antes de importar. */
export function detectarBloques(
  filas: Celda[][],
  mapeo: Mapeo,
  desde: number
): BloqueArchivo[] {
  if (mapeo.codigo < 0 || mapeo.descripcion < 0) return []
  return leerFilas(filas, mapeo, desde, '').bloques
}

/**
 * Convierte las filas crudas en productos listos para importar, validando y
 * comparándolos con el catálogo actual.
 *
 * @param desde            primera fila con datos (base 0)
 * @param categoriaDestino categoría a aplicar cuando el archivo no la trae
 */
export function analizarFilas(
  filas: Celda[][],
  mapeo: Mapeo,
  desde: number,
  categoriaDestino: string,
  existentes: Producto[],
  actualizarExistentes: boolean,
  opciones: {
    /** Marca elegida para cada bloque del archivo (cuando no viene en una columna) */
    marcasPorBloque?: string[]
    /** No pisar los precios de los productos que ya existen */
    respetarPrecios?: boolean
  } = {}
): FilaImportada[] {
  // Los códigos se comparan sin espacios ni mayúsculas: en el Excel puede
  // figurar "428 B" y en el sistema "428b", y es el mismo producto.
  const porCodigo = new Map(existentes.map((p) => [claveCodigo(p.codigo ?? ''), p]))
  const vistos = new Map<string, { nroFila: number; precio: number }>()
  const resultado: FilaImportada[] = []

  for (const cruda of leerFilas(filas, mapeo, desde, categoriaDestino).crudas) {
    const { codigo, descripcion, precio } = cruda
    const marca =
      cruda.marca || (opciones.marcasPorBloque?.[cruda.bloque] ?? '').trim().toUpperCase()
    const base: FilaImportada = { ...cruda, marca, estado: 'nuevo', detalle: null, anterior: null }
    const error = (detalle: string) => resultado.push({ ...base, estado: 'error', detalle })

    if (!codigo) {
      error('Sin código')
      continue
    }
    if (precio === null) {
      error('Precio vacío o ilegible')
      continue
    }
    if (precio < 0) {
      error('Precio negativo')
      continue
    }

    // El mismo código puede figurar en varias marcas (es el mismo repuesto
    // que sirve para varias herramientas): se carga una sola vez. Si además
    // tiene otro precio, ahí sí hay que mirarlo.
    const clave = claveCodigo(codigo)
    const repetida = vistos.get(clave)
    if (repetida !== undefined) {
      if (repetida.precio === precio) {
        resultado.push({
          ...base,
          estado: 'omitido',
          detalle: `Ya está en la fila ${repetida.nroFila} (mismo precio)`,
        })
      } else {
        error(`Código repetido con otro precio (fila ${repetida.nroFila})`)
      }
      continue
    }
    vistos.set(clave, { nroFila: cruda.nroFila, precio })

    const anterior = porCodigo.get(clave) ?? null

    // Hay productos de la lista que no tienen descripción (se identifican por
    // la medida): se cargan igual, y si ya estaban, se les respeta la que tienen.
    if (!descripcion && anterior?.descripcion) base.descripcion = anterior.descripcion

    // El código del sistema manda: así "428 B" del Excel actualiza al "428b"
    // que ya está cargado, en vez de crear un producto repetido.
    if (anterior && anterior.codigo && anterior.codigo !== codigo) base.codigo = anterior.codigo

    const notas = [
      cruda.lineasExtra > 0 ? 'Descripción tomada de 2 renglones' : '',
      !base.descripcion ? 'Sin descripción en el archivo' : '',
      anterior && anterior.codigo !== codigo ? `En el sistema es ${anterior.codigo}` : '',
    ].filter(Boolean)
    const nota = notas.length > 0 ? notas.join(' · ') : null

    if (!anterior) {
      resultado.push({ ...base, estado: 'nuevo', detalle: nota })
      continue
    }
    if (!actualizarExistentes) {
      resultado.push({ ...base, estado: 'omitido', detalle: 'Ya existe', anterior })
      continue
    }

    const cambia =
      (!opciones.respetarPrecios && anterior.precio_unitario !== precio) ||
      anterior.descripcion !== base.descripcion ||
      (anterior.categoria ?? '') !== cruda.categoria ||
      (!!marca && (anterior.marca ?? '') !== marca) ||
      (mapeo.medidas >= 0 && (anterior.medidas ?? '') !== cruda.medidas) ||
      (mapeo.modelo >= 0 && (anterior.modelo ?? '') !== cruda.modelo) ||
      (mapeo.stockMinimo >= 0 && anterior.stock_minimo !== cruda.stockMinimo)

    resultado.push({
      ...base,
      estado: cambia ? 'actualiza' : 'omitido',
      detalle: cambia ? nota : 'Sin cambios',
      anterior,
    })
  }

  return resultado
}

export interface ResumenImportacion {
  nuevos: number
  actualiza: number
  omitidos: number
  errores: number
}

export function resumir(filas: FilaImportada[]): ResumenImportacion {
  return {
    nuevos: filas.filter((f) => f.estado === 'nuevo').length,
    actualiza: filas.filter((f) => f.estado === 'actualiza').length,
    omitidos: filas.filter((f) => f.estado === 'omitido').length,
    errores: filas.filter((f) => f.estado === 'error').length,
  }
}

/** Parte un array en tandas para no mandar un request gigante. */
export function tandas<T>(items: T[], tamano: number): T[][] {
  const salida: T[][] = []
  for (let i = 0; i < items.length; i += tamano) salida.push(items.slice(i, i + tamano))
  return salida
}
