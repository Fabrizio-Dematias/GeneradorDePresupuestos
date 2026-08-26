/**
 * Lector mínimo de archivos .xlsx (Excel 2007 en adelante), sin dependencias.
 *
 * Un .xlsx es un ZIP con XML adentro: acá se recorre el directorio del ZIP,
 * se descomprime cada parte con DecompressionStream (nativo del navegador)
 * y se leen las celdas resolviendo la tabla de textos compartidos.
 *
 * Limitaciones conocidas:
 *  - No interpreta formatos: una fecha se lee como el número de serie de Excel.
 *  - No abre .xls viejos (formato binario) ni archivos protegidos con contraseña.
 */

/** Valor de una celda: los números del Excel llegan como number, el resto texto. */
export type Celda = string | number

/** Imagen pegada en la hoja (los logos de marca de las listas de DICOR). */
export interface ImagenExcel {
  /** Fila donde está anclada, base 1 */
  fila: number
  dataUrl: string
}

export interface HojaExcel {
  nombre: string
  filas: Celda[][]
  imagenes: ImagenExcel[]
}

const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

/** Los navegadores viejos no traen DecompressionStream: ahí solo queda el CSV. */
export function soportaXLSX(): boolean {
  return typeof DecompressionStream !== 'undefined'
}

export async function leerXLSX(archivo: File): Promise<HojaExcel[]> {
  if (!soportaXLSX()) {
    throw new Error(
      'Este navegador no puede abrir archivos .xlsx. Guardá el Excel como CSV e importá ese archivo.'
    )
  }

  const buf = await archivo.arrayBuffer()
  let zip: Map<string, EntradaZip>
  try {
    zip = leerDirectorioZip(buf)
  } catch {
    throw new Error('El archivo no parece un Excel válido (.xlsx). Si es un .xls viejo, guardalo como .xlsx o CSV.')
  }

  // Un solo presupuesto para todo el archivo: lo van gastando las partes
  const presupuesto: Presupuesto = { restante: MAX_TOTAL }

  const workbookXml = await textoDe(buf, zip.get('xl/workbook.xml'), presupuesto)
  if (!workbookXml) {
    throw new Error('El archivo no parece un Excel válido (.xlsx): no se encontró el libro adentro.')
  }

  const textos = leerTextosCompartidos(
    await textoDe(buf, zip.get('xl/sharedStrings.xml'), presupuesto)
  )

  // rId → ruta de la hoja dentro del ZIP
  const rels = new Map<string, string>()
  const relsXml = await textoDe(buf, zip.get('xl/_rels/workbook.xml.rels'), presupuesto)
  if (relsXml) {
    for (const rel of etiquetas(parsearXML(relsXml), 'Relationship')) {
      const destino = rel.getAttribute('Target') ?? ''
      const ruta = destino.startsWith('/') ? destino.slice(1) : `xl/${destino.replace(/^\.\//, '')}`
      rels.set(rel.getAttribute('Id') ?? '', ruta)
    }
  }

  const hojas: HojaExcel[] = []
  for (const hoja of etiquetas(parsearXML(workbookXml), 'sheet')) {
    const estado = hoja.getAttribute('state')
    if (estado === 'hidden' || estado === 'veryHidden') continue
    const rId = hoja.getAttributeNS(NS_REL, 'id') ?? hoja.getAttribute('r:id') ?? ''
    const ruta = rels.get(rId)
    const xml = ruta ? await textoDe(buf, zip.get(ruta), presupuesto) : null
    if (!xml) continue
    hojas.push({
      nombre: hoja.getAttribute('name') ?? `Hoja ${hojas.length + 1}`,
      filas: leerHoja(xml, textos),
      imagenes: await leerImagenes(buf, zip, ruta!, presupuesto),
    })
  }

  if (hojas.length === 0) throw new Error('El Excel no tiene ninguna hoja visible con datos.')
  return hojas
}

// ---------------------------------------------------------------- ZIP

interface EntradaZip {
  metodo: number
  offset: number // posición del encabezado local
  comprimido: number
  sinComprimir: number
}

/**
 * Topes al descomprimir: un .xlsx armado con mala intención puede pesar
 * poquito y descomprimir gigas ("zip bomb") hasta colgar la pestaña. Los
 * archivos reales de listas de precios no llegan ni cerca de estos valores.
 */
const MAX_PARTE = 64 * 1024 * 1024 // 64 MB por parte
const MAX_TOTAL = 256 * 1024 * 1024 // 256 MB por archivo

/** Presupuesto de bytes descomprimidos que le queda a un archivo. */
interface Presupuesto {
  restante: number
}

const CENTINELA = 0xffffffff

function leerDirectorioZip(buf: ArrayBuffer): Map<string, EntradaZip> {
  const dv = new DataView(buf)
  const largo = buf.byteLength

  // El "End Of Central Directory" está al final, pero puede tener hasta
  // 64 KB de comentario detrás: se busca la firma hacia atrás.
  let eocd = -1
  const minimo = Math.max(0, largo - 65557)
  for (let i = largo - 22; i >= minimo; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('ZIP inválido')

  let cantidad = dv.getUint16(eocd + 10, true)
  let inicio = dv.getUint32(eocd + 16, true)

  // ZIP64: si vienen los centinelas, los valores reales están en otro registro
  if (cantidad === 0xffff || inicio === CENTINELA) {
    const loc = eocd - 20
    if (loc >= 0 && dv.getUint32(loc, true) === 0x07064b50) {
      const z64 = Number(dv.getBigUint64(loc + 8, true))
      if (z64 + 56 <= largo && dv.getUint32(z64, true) === 0x06064b50) {
        cantidad = Number(dv.getBigUint64(z64 + 32, true))
        inicio = Number(dv.getBigUint64(z64 + 48, true))
      }
    }
  }

  const bytes = new Uint8Array(buf)
  const utf8 = new TextDecoder()
  const entradas = new Map<string, EntradaZip>()

  let p = inicio
  for (let i = 0; i < cantidad && p + 46 <= largo; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const metodo = dv.getUint16(p + 10, true)
    let comprimido = dv.getUint32(p + 20, true)
    let sinComprimir = dv.getUint32(p + 24, true)
    const largoNombre = dv.getUint16(p + 28, true)
    const largoExtra = dv.getUint16(p + 30, true)
    const largoComentario = dv.getUint16(p + 32, true)
    let offset = dv.getUint32(p + 42, true)
    const nombre = utf8.decode(bytes.subarray(p + 46, p + 46 + largoNombre))

    if (comprimido === CENTINELA || offset === CENTINELA || sinComprimir === CENTINELA) {
      // Campo extra ZIP64 (id 0x0001): trae los valores de 64 bits, en orden
      // fijo y solo para los campos que quedaron con centinela.
      let e = p + 46 + largoNombre
      const fin = e + largoExtra
      while (e + 4 <= fin) {
        const id = dv.getUint16(e, true)
        const tam = dv.getUint16(e + 2, true)
        if (id === 0x0001) {
          let q = e + 4
          if (sinComprimir === CENTINELA) {
            sinComprimir = Number(dv.getBigUint64(q, true))
            q += 8
          }
          if (comprimido === CENTINELA) {
            comprimido = Number(dv.getBigUint64(q, true))
            q += 8
          }
          if (offset === CENTINELA) offset = Number(dv.getBigUint64(q, true))
          break
        }
        e += 4 + tam
      }
    }

    entradas.set(nombre, { metodo, offset, comprimido, sinComprimir })
    p += 46 + largoNombre + largoExtra + largoComentario
  }

  if (entradas.size === 0) throw new Error('ZIP vacío')
  return entradas
}

/** Descomprime cortando en seco si pasa el tope, sin esperar a terminar. */
async function inflarConTope(datos: Uint8Array<ArrayBuffer>, tope: number): Promise<Uint8Array> {
  const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const lector = flujo.getReader()
  const partes: Uint8Array[] = []
  let total = 0

  for (;;) {
    const { done, value } = await lector.read()
    if (done) break
    total += value.length
    if (total > tope) {
      await lector.cancel()
      throw new Error('El archivo descomprime a un tamaño desmedido y se frenó por seguridad.')
    }
    partes.push(value)
  }

  const salida = new Uint8Array(total)
  let pos = 0
  for (const parte of partes) {
    salida.set(parte, pos)
    pos += parte.length
  }
  return salida
}

async function bytesDe(
  buf: ArrayBuffer,
  entrada: EntradaZip | undefined,
  presupuesto?: Presupuesto
): Promise<Uint8Array | null> {
  if (!entrada) return null

  // Chequeo barato con el tamaño que declara el ZIP, antes de descomprimir
  if (entrada.sinComprimir > MAX_PARTE) {
    throw new Error('El archivo tiene una parte demasiado grande para abrirla en el navegador.')
  }
  if (presupuesto) {
    presupuesto.restante -= entrada.sinComprimir
    if (presupuesto.restante < 0) {
      throw new Error('El archivo es demasiado grande para abrirlo en el navegador.')
    }
  }
  const dv = new DataView(buf)
  if (entrada.offset + 30 > buf.byteLength || dv.getUint32(entrada.offset, true) !== 0x04034b50) {
    throw new Error('ZIP inválido')
  }
  const largoNombre = dv.getUint16(entrada.offset + 26, true)
  const largoExtra = dv.getUint16(entrada.offset + 28, true)
  const desde = entrada.offset + 30 + largoNombre + largoExtra
  if (desde + entrada.comprimido > buf.byteLength) throw new Error('ZIP truncado')

  const datos = new Uint8Array(buf, desde, entrada.comprimido)
  if (entrada.metodo === 0) return datos // sin comprimir
  if (entrada.metodo !== 8) throw new Error('El Excel usa una compresión que no se puede leer')

  // El tope real: el encabezado del ZIP puede mentir sobre el tamaño
  return await inflarConTope(datos, Math.min(MAX_PARTE, presupuesto?.restante ?? MAX_PARTE) + 1)
}

async function textoDe(
  buf: ArrayBuffer,
  entrada: EntradaZip | undefined,
  presupuesto?: Presupuesto
): Promise<string | null> {
  const bytes = await bytesDe(buf, entrada, presupuesto)
  return bytes === null ? null : new TextDecoder().decode(bytes)
}

// ---------------------------------------------------------------- Imágenes

/** Las listas de DICOR usan el logo de la marca como título de cada bloque. */
const MAX_REPETICIONES = 3 // una imagen repetida más veces es el logo del membrete

const TIPOS: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
}

/** Resuelve rutas relativas dentro del ZIP ('../media/x.png' → 'xl/media/x.png'). */
function resolverRuta(destino: string, base: string): string {
  if (destino.startsWith('/')) return destino.slice(1)
  const salida: string[] = []
  for (const parte of `${base}/${destino}`.split('/')) {
    if (parte === '' || parte === '.') continue
    if (parte === '..') salida.pop()
    else salida.push(parte)
  }
  return salida.join('/')
}

function aBase64(bytes: Uint8Array): string {
  let binario = ''
  const TROZO = 0x8000 // de a pedazos: fromCharCode no soporta arrays enormes
  for (let i = 0; i < bytes.length; i += TROZO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TROZO))
  }
  return btoa(binario)
}

async function leerImagenes(
  buf: ArrayBuffer,
  zip: Map<string, EntradaZip>,
  rutaHoja: string,
  presupuesto: Presupuesto
): Promise<ImagenExcel[]> {
  try {
    const relsHoja = await textoDe(
      buf,
      zip.get(rutaHoja.replace(/([^/]+)$/, '_rels/$1.rels')),
      presupuesto
    )
    if (!relsHoja) return []

    const carpetaHoja = rutaHoja.replace(/\/[^/]+$/, '')
    let rutaDibujo = ''
    for (const rel of etiquetas(parsearXML(relsHoja), 'Relationship')) {
      if ((rel.getAttribute('Type') ?? '').endsWith('/drawing')) {
        rutaDibujo = resolverRuta(rel.getAttribute('Target') ?? '', carpetaHoja)
      }
    }
    if (!rutaDibujo) return []

    const dibujoXml = await textoDe(buf, zip.get(rutaDibujo), presupuesto)
    if (!dibujoXml) return []

    // rId → archivo de imagen
    const carpetaDibujo = rutaDibujo.replace(/\/[^/]+$/, '')
    const archivos = new Map<string, string>()
    const relsDibujo = await textoDe(
      buf,
      zip.get(rutaDibujo.replace(/([^/]+)$/, '_rels/$1.rels')),
      presupuesto
    )
    if (relsDibujo) {
      for (const rel of etiquetas(parsearXML(relsDibujo), 'Relationship')) {
        archivos.set(
          rel.getAttribute('Id') ?? '',
          resolverRuta(rel.getAttribute('Target') ?? '', carpetaDibujo)
        )
      }
    }

    // Anclajes: qué imagen está en qué fila
    const doc = parsearXML(dibujoXml)
    const anclas: { fila: number; archivo: string }[] = []
    for (const ancla of [...etiquetas(doc, 'twoCellAnchor'), ...etiquetas(doc, 'oneCellAnchor')]) {
      const desde = etiquetas(ancla, 'from')[0]
      const fila = parseInt(etiquetas(desde, 'row')[0]?.textContent ?? '', 10)
      const blip = etiquetas(ancla, 'blip')[0]
      const rId = blip?.getAttributeNS(NS_REL, 'embed') ?? blip?.getAttribute('r:embed') ?? ''
      const archivo = archivos.get(rId)
      if (!archivo || !Number.isFinite(fila)) continue
      anclas.push({ fila: fila + 1, archivo })
    }

    // El logo del negocio se repite en cada hoja impresa: no es una marca
    const usos = new Map<string, number>()
    for (const a of anclas) usos.set(a.archivo, (usos.get(a.archivo) ?? 0) + 1)

    const cache = new Map<string, string>()
    const imagenes: ImagenExcel[] = []
    for (const { fila, archivo } of anclas) {
      if ((usos.get(archivo) ?? 0) > MAX_REPETICIONES) continue
      const tipo = TIPOS[archivo.split('.').pop()?.toLowerCase() ?? '']
      if (!tipo) continue // emf/wmf y otros formatos que el navegador no muestra

      let dataUrl = cache.get(archivo)
      if (!dataUrl) {
        const bytes = await bytesDe(buf, zip.get(archivo), presupuesto)
        if (!bytes) continue
        dataUrl = `data:${tipo};base64,${aBase64(bytes)}`
        cache.set(archivo, dataUrl)
      }
      imagenes.push({ fila, dataUrl })
    }

    imagenes.sort((a, b) => a.fila - b.fila)
    return imagenes
  } catch {
    return [] // sin imágenes la importación funciona igual
  }
}

// ---------------------------------------------------------------- XML

function parsearXML(texto: string): Document {
  const doc = new DOMParser().parseFromString(texto, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('El Excel tiene contenido dañado y no se pudo leer')
  }
  return doc
}

/** getElementsByTagName ignorando el prefijo de namespace (<row> o <x:row>). */
function etiquetas(nodo: Document | Element, nombre: string): Element[] {
  return Array.from(nodo.getElementsByTagNameNS('*', nombre))
}

function leerTextosCompartidos(xml: string | null): string[] {
  if (!xml) return []
  return etiquetas(parsearXML(xml), 'si').map((si) =>
    etiquetas(si, 't')
      // <rPh> son anotaciones fonéticas: no forman parte del texto
      .filter((t) => t.parentElement?.localName !== 'rPh')
      .map((t) => t.textContent ?? '')
      .join('')
      .trim()
  )
}

/** "BC12" → 54 (índice de columna, base 0). */
function columnaDeRef(ref: string): number {
  let n = 0
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i)
    if (c < 65 || c > 90) break
    n = n * 26 + (c - 64)
  }
  return n - 1
}

function valorDeCelda(celda: Element, textos: string[]): Celda {
  const tipo = celda.getAttribute('t') ?? 'n'
  if (tipo === 'inlineStr') {
    return etiquetas(celda, 't')
      .map((t) => t.textContent ?? '')
      .join('')
      .trim()
  }
  const bruto = etiquetas(celda, 'v')[0]?.textContent ?? ''
  if (bruto === '') return ''
  switch (tipo) {
    case 's': {
      const i = parseInt(bruto, 10)
      return textos[i] ?? ''
    }
    case 'str':
      return bruto.trim()
    case 'b':
      return bruto === '1' ? 'SÍ' : 'NO'
    case 'e': // celda con error (#N/A, #REF!, …)
      return ''
    default: {
      const n = Number(bruto)
      return Number.isFinite(n) ? n : bruto.trim()
    }
  }
}

function leerHoja(xml: string, textos: string[]): Celda[][] {
  const doc = parsearXML(xml)
  const filas: Celda[][] = []

  for (const row of etiquetas(doc, 'row')) {
    const fila: Celda[] = []
    let siguiente = 0
    for (const celda of etiquetas(row, 'c')) {
      const ref = celda.getAttribute('r')
      const col = ref ? columnaDeRef(ref) : siguiente
      const indice = col < 0 ? siguiente : col
      siguiente = indice + 1
      while (fila.length < indice) fila.push('')
      fila[indice] = valorDeCelda(celda, textos)
    }

    // El atributo r respeta los huecos: una fila vacía no corre a las de abajo
    const nro = parseInt(row.getAttribute('r') ?? '', 10)
    if (Number.isFinite(nro) && nro > 0) {
      while (filas.length < nro - 1) filas.push([])
      filas[nro - 1] = fila
    } else {
      filas.push(fila)
    }
  }

  expandirCombinadas(doc, filas)
  while (filas.length > 0 && filas[filas.length - 1].every((c) => c === '')) filas.pop()
  return filas
}

/**
 * Celdas combinadas: Excel guarda el valor solo en la esquina de arriba a la
 * izquierda. Se copia hacia abajo en las combinaciones de UNA sola columna —
 * el caso típico del precio en una lista con fotos, donde la celda del precio
 * abarca las filas del código y de la descripción. Las combinaciones que
 * agarran varias columnas suelen ser títulos, así que se dejan como están.
 */
function expandirCombinadas(doc: Document, filas: Celda[][]): void {
  for (const combinada of etiquetas(doc, 'mergeCell')) {
    const [desde, hasta] = (combinada.getAttribute('ref') ?? '').split(':')
    if (!desde || !hasta) continue

    const col = columnaDeRef(desde)
    if (col < 0 || col !== columnaDeRef(hasta)) continue

    const primera = parseInt(desde.replace(/\D/g, ''), 10) - 1
    const ultima = parseInt(hasta.replace(/\D/g, ''), 10) - 1
    if (!(primera >= 0) || !(ultima > primera) || ultima - primera > 500) continue

    const valor = filas[primera]?.[col]
    if (valor === undefined || valor === '') continue

    for (let f = primera + 1; f <= ultima && f < filas.length; f++) {
      const fila = filas[f]
      if (!fila) continue
      while (fila.length < col) fila.push('')
      if (fila[col] === undefined || fila[col] === '') fila[col] = valor
    }
  }
}
