/**
 * Genera archivos .xlsx sin dependencias (el lector está en xlsx.ts).
 *
 * Un .xlsx es un ZIP con varios XML. Acá se arma el mínimo que Excel,
 * LibreOffice y Numbers abren y dejan editar: una o más hojas con texto y
 * números, primera fila en negrita y ancho de columnas. El ZIP va sin
 * compresión (método "store"): para planillas chicas no hace falta comprimir
 * y así no se necesita ninguna librería.
 */

export type CeldaXlsx = string | number | null | undefined

export interface HojaXlsx {
  nombre: string
  filas: CeldaXlsx[][]
  /** Ancho de cada columna, en caracteres. */
  anchos?: number[]
  /** La primera fila va en negrita (encabezados). */
  encabezado?: boolean
}

// ---------------------------------------------------------------- ZIP

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabla[n] = c >>> 0
  }
  return tabla
})()

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zipSinCompresion(archivos: { nombre: string; datos: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const utf8 = new TextEncoder()
  const ahora = new Date()
  const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | Math.floor(ahora.getSeconds() / 2)
  const fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate()

  const partes: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const { nombre, datos } of archivos) {
    const nombreBytes = utf8.encode(nombre)
    const crc = crc32(datos)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true) // firma del encabezado local
    local.setUint16(4, 20, true) // versión necesaria
    local.setUint16(6, 0x0800, true) // nombres en UTF-8
    local.setUint16(8, 0, true) // método: store
    local.setUint16(10, hora, true)
    local.setUint16(12, fecha, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, datos.length, true)
    local.setUint32(22, datos.length, true)
    local.setUint16(26, nombreBytes.length, true)
    local.setUint16(28, 0, true)
    partes.push(new Uint8Array(local.buffer), nombreBytes, datos)

    const dir = new DataView(new ArrayBuffer(46))
    dir.setUint32(0, 0x02014b50, true) // firma del directorio central
    dir.setUint16(4, 20, true)
    dir.setUint16(6, 20, true)
    dir.setUint16(8, 0x0800, true)
    dir.setUint16(10, 0, true)
    dir.setUint16(12, hora, true)
    dir.setUint16(14, fecha, true)
    dir.setUint32(16, crc, true)
    dir.setUint32(20, datos.length, true)
    dir.setUint32(24, datos.length, true)
    dir.setUint16(28, nombreBytes.length, true)
    dir.setUint32(42, offset, true) // dónde empieza el encabezado local
    central.push(new Uint8Array(dir.buffer), nombreBytes)

    offset += 30 + nombreBytes.length + datos.length
  }

  const tamCentral = central.reduce((acc, p) => acc + p.length, 0)
  const fin = new DataView(new ArrayBuffer(22))
  fin.setUint32(0, 0x06054b50, true) // fin del directorio central
  fin.setUint16(8, archivos.length, true)
  fin.setUint16(10, archivos.length, true)
  fin.setUint32(12, tamCentral, true)
  fin.setUint32(16, offset, true)

  const todo = [...partes, ...central, new Uint8Array(fin.buffer)]
  const salida = new Uint8Array(todo.reduce((acc, p) => acc + p.length, 0))
  let pos = 0
  for (const p of todo) {
    salida.set(p, pos)
    pos += p.length
  }
  return salida
}

// ---------------------------------------------------------------- XML

const CABECERA = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

/** Escapa el texto para XML y saca los caracteres de control que Excel rechaza. */
function xml(texto: string): string {
  return texto
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 0 → A, 25 → Z, 26 → AA */
function letraColumna(indice: number): string {
  let s = ''
  for (let n = indice + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  }
  return s
}

/** Excel no admite en el nombre de la hoja []:*?/\ ni más de 31 caracteres. */
function nombreHoja(nombre: string, i: number): string {
  const limpio = nombre.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31)
  return limpio || `Hoja ${i + 1}`
}

function hojaXml(hoja: HojaXlsx): string {
  const cols = (hoja.anchos ?? [])
    .map((ancho, i) => `<col min="${i + 1}" max="${i + 1}" width="${ancho}" customWidth="1"/>`)
    .join('')
  const filas = hoja.filas
    .map((fila, f) => {
      const estilo = hoja.encabezado && f === 0 ? ' s="1"' : ''
      const celdas = fila
        .map((valor, c) => {
          if (valor === null || valor === undefined || valor === '') return ''
          const ref = `${letraColumna(c)}${f + 1}`
          if (typeof valor === 'number' && Number.isFinite(valor)) {
            return `<c r="${ref}"${estilo}><v>${valor}</v></c>`
          }
          return `<c r="${ref}" t="inlineStr"${estilo}><is><t xml:space="preserve">${xml(String(valor))}</t></is></c>`
        })
        .join('')
      return `<row r="${f + 1}">${celdas}</row>`
    })
    .join('')
  return (
    CABECERA +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    (cols ? `<cols>${cols}</cols>` : '') +
    `<sheetData>${filas}</sheetData>` +
    '</worksheet>'
  )
}

const ESTILOS =
  CABECERA +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

/** Arma el contenido binario del .xlsx. */
export function generarXlsx(hojas: HojaXlsx[]): Uint8Array<ArrayBuffer> {
  const utf8 = new TextEncoder()
  const nombres = hojas.map((h, i) => nombreHoja(h.nombre, i))

  const tipos =
    CABECERA +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    hojas
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join('') +
    '</Types>'

  const relsRaiz =
    CABECERA +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>'

  const libro =
    CABECERA +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${nombres.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>` +
    '</workbook>'

  const relsLibro =
    CABECERA +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    hojas
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join('') +
    `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>'

  return zipSinCompresion([
    { nombre: '[Content_Types].xml', datos: utf8.encode(tipos) },
    { nombre: '_rels/.rels', datos: utf8.encode(relsRaiz) },
    { nombre: 'xl/workbook.xml', datos: utf8.encode(libro) },
    { nombre: 'xl/_rels/workbook.xml.rels', datos: utf8.encode(relsLibro) },
    { nombre: 'xl/styles.xml', datos: utf8.encode(ESTILOS) },
    ...hojas.map((h, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, datos: utf8.encode(hojaXml(h)) })),
  ])
}

/** Genera el .xlsx y lo descarga en el navegador. */
export function descargarXlsx(nombreArchivo: string, hojas: HojaXlsx[]): void {
  const blob = new Blob([generarXlsx(hojas)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
