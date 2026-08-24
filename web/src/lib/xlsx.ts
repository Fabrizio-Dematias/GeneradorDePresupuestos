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

export interface HojaExcel {
  nombre: string
  filas: Celda[][]
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

  const workbookXml = await textoDe(buf, zip.get('xl/workbook.xml'))
  if (!workbookXml) {
    throw new Error('El archivo no parece un Excel válido (.xlsx): no se encontró el libro adentro.')
  }

  const textos = leerTextosCompartidos(await textoDe(buf, zip.get('xl/sharedStrings.xml')))

  // rId → ruta de la hoja dentro del ZIP
  const rels = new Map<string, string>()
  const relsXml = await textoDe(buf, zip.get('xl/_rels/workbook.xml.rels'))
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
    const xml = ruta ? await textoDe(buf, zip.get(ruta)) : null
    if (!xml) continue
    hojas.push({
      nombre: hoja.getAttribute('name') ?? `Hoja ${hojas.length + 1}`,
      filas: leerHoja(xml, textos),
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
    const sinComprimir = dv.getUint32(p + 24, true)
    const largoNombre = dv.getUint16(p + 28, true)
    const largoExtra = dv.getUint16(p + 30, true)
    const largoComentario = dv.getUint16(p + 32, true)
    let offset = dv.getUint32(p + 42, true)
    const nombre = utf8.decode(bytes.subarray(p + 46, p + 46 + largoNombre))

    if (comprimido === CENTINELA || offset === CENTINELA) {
      // Campo extra ZIP64 (id 0x0001): trae los valores de 64 bits, en orden
      // fijo y solo para los campos que quedaron con centinela.
      let e = p + 46 + largoNombre
      const fin = e + largoExtra
      while (e + 4 <= fin) {
        const id = dv.getUint16(e, true)
        const tam = dv.getUint16(e + 2, true)
        if (id === 0x0001) {
          let q = e + 4
          if (sinComprimir === CENTINELA) q += 8
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

    entradas.set(nombre, { metodo, offset, comprimido })
    p += 46 + largoNombre + largoExtra + largoComentario
  }

  if (entradas.size === 0) throw new Error('ZIP vacío')
  return entradas
}

async function textoDe(buf: ArrayBuffer, entrada: EntradaZip | undefined): Promise<string | null> {
  if (!entrada) return null
  const dv = new DataView(buf)
  if (entrada.offset + 30 > buf.byteLength || dv.getUint32(entrada.offset, true) !== 0x04034b50) {
    throw new Error('ZIP inválido')
  }
  const largoNombre = dv.getUint16(entrada.offset + 26, true)
  const largoExtra = dv.getUint16(entrada.offset + 28, true)
  const desde = entrada.offset + 30 + largoNombre + largoExtra
  if (desde + entrada.comprimido > buf.byteLength) throw new Error('ZIP truncado')

  const datos = new Uint8Array(buf, desde, entrada.comprimido)
  if (entrada.metodo === 0) return new TextDecoder().decode(datos) // sin comprimir
  if (entrada.metodo !== 8) throw new Error('El Excel usa una compresión que no se puede leer')

  const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return await new Response(flujo).text()
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
