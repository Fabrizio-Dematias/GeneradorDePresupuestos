import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatARS, formatNumero, formatFecha, formatearCUIT, nombreArchivoRemito } from './format'
import { LOGO_DATA_URL } from './logo'

/**
 * Generador del PDF de remito.
 *
 * Formato multipágina: el encabezado (datos del negocio, datos del remito
 * y datos del cliente) se repite fijo en TODAS las hojas. Los productos van
 * en una tabla enmarcada que fluye entre hojas repitiendo su cabecera, y el
 * pie (TOTAL + recuadro de OBSERVACIONES) queda fijo abajo en cada hoja;
 * el importe total se muestra solo en la última.
 */

export interface RemitoPDFData {
  numero: string
  fecha: string // YYYY-MM-DD
  clienteNombre: string
  clienteDomicilio: string
  clienteCuit: string
  condicionIVA: string
  condicionVenta: string
  items: {
    codigo: string | null
    cantidad: number
    descripcion: string
    precio_unitario: number
    bonificacion: number
    subtotal: number
  }[]
  total: number
}

const EMPRESA = {
  nombre: 'DICOR CARBONES Y REPUESTOS',
  titular: 'de Fabrizio Dematias',
  direccion: 'Los Cóndores 4814 - B° Alejandro Centeno - Córdoba',
  email: 'dicorcarbones@gmail.com',
  cuit: '20-42258265-8',
}

const MARGIN = 36 // mismo margen por defecto que iText (36pt)
const FONT_SIZE = 10
const CELL_PAD = 5
const TEXT_LINE_H = 12 // alto de línea del texto envuelto (fuente 10)

let logoCache: { dataUrl: string; width: number; height: number } | null = null

async function cargarLogo() {
  if (logoCache) return logoCache
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = LOGO_DATA_URL
    })
    logoCache = { dataUrl: LOGO_DATA_URL, width: img.naturalWidth, height: img.naturalHeight }
    return logoCache
  } catch {
    return null // sin logo el PDF se genera igual, como en el escritorio
  }
}

export async function generarRemitoPDF(data: RemitoPDFData): Promise<void> {
  const doc = await generarRemitoDoc(data)
  doc.save(nombreArchivoRemito(data.clienteNombre, data.numero))
}

/** Arma el documento sin guardarlo (separado para poder probarlo). */
export async function generarRemitoDoc(data: RemitoPDFData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const usable = pageWidth - MARGIN * 2

  const logo = await cargarLogo()

  // ================= Encabezado (se repite en todas las hojas) =================
  const leftW = (usable * 2.5) / 4.5
  const rightW = usable - leftW
  const lineH = 19 // alto de línea aprox. de iText con fuente 10 y padding 5
  const logoAreaH = 50
  const leftLines = [EMPRESA.nombre, EMPRESA.titular, EMPRESA.direccion, EMPRESA.email]
  const rightLines = [
    'REMITO - ORIGINAL',
    `N° ${data.numero}`,
    `Fecha: ${formatFecha(data.fecha)}`,
    `CUIT: ${EMPRESA.cuit}`,
    'DOCUMENTO NO VÁLIDO COMO FACTURA',
  ]
  const headerBoxH = Math.max(logoAreaH + leftLines.length * lineH, rightLines.length * lineH) + 8

  // --- Recuadro del cliente: alto calculado una sola vez (envuelve texto largo) ---
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONT_SIZE)
  const halfW = usable / 2
  const clienteFilas: [string, string][] = [
    [`SEÑOR/RAZÓN SOCIAL: ${data.clienteNombre}`, `DOMICILIO: ${data.clienteDomicilio}`],
    [`CUIT: ${formatearCUIT(data.clienteCuit)}`, `CONDICIÓN IVA: ${data.condicionIVA}`],
  ]
  const filaVenta = `CONDICIONES DE VENTA: ${data.condicionVenta}`
  const altoCelda = (texto: string, ancho: number) => {
    const lineas = doc.splitTextToSize(texto, ancho - CELL_PAD * 2) as string[]
    return Math.max(1, lineas.length) * TEXT_LINE_H + CELL_PAD * 2
  }
  const filasAltos = clienteFilas.map(([a, b]) =>
    Math.max(altoCelda(a, halfW), altoCelda(b, halfW))
  )
  const filaVentaAlto = altoCelda(filaVenta, usable)
  const clienteBoxH = filasAltos.reduce((acc, h) => acc + h, 0) + filaVentaAlto

  // Límite superior de la tabla de productos en cada hoja
  const headerBottom = MARGIN + headerBoxH + 10 + clienteBoxH + 12

  function dibujarCelda(texto: string, x: number, y: number, w: number, h: number) {
    doc.rect(x, y, w, h)
    const lineas = doc.splitTextToSize(texto, w - CELL_PAD * 2) as string[]
    doc.text(lineas, x + CELL_PAD, y + CELL_PAD + 9)
  }

  function dibujarEncabezado() {
    doc.setDrawColor(0)
    doc.setLineWidth(0.7)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(FONT_SIZE)

    // Recuadros del negocio y datos del remito
    doc.rect(MARGIN, MARGIN, leftW, headerBoxH)
    doc.rect(MARGIN + leftW, MARGIN, rightW, headerBoxH)

    // Logo centrado, escalado para entrar en 110x42 manteniendo proporción
    if (logo) {
      const maxW = 110
      const maxH = 42
      const scale = Math.min(maxW / logo.width, maxH / logo.height)
      const w = logo.width * scale
      const h = logo.height * scale
      doc.addImage(logo.dataUrl, 'PNG', MARGIN + (leftW - w) / 2, MARGIN + 8, w, h)
    }

    let y = MARGIN + logoAreaH + 6
    leftLines.forEach((line, i) => {
      doc.setFont('helvetica', i === 0 ? 'bold' : 'normal')
      doc.text(line, MARGIN + 8, y + 7, { maxWidth: leftW - 16 })
      y += lineH
    })

    let yr = MARGIN + 14
    rightLines.forEach((line, i) => {
      doc.setFont('helvetica', i === 0 || i === 4 ? 'bold' : 'normal')
      doc.setTextColor(i === 4 ? 255 : 0, 0, 0)
      doc.text(line, MARGIN + leftW + rightW - 8, yr, { align: 'right' })
      yr += lineH
    })
    doc.setTextColor(0, 0, 0)

    // Recuadro con los datos del cliente
    doc.setFont('helvetica', 'normal')
    let cy = MARGIN + headerBoxH + 10
    clienteFilas.forEach(([a, b], i) => {
      dibujarCelda(a, MARGIN, cy, halfW, filasAltos[i])
      dibujarCelda(b, MARGIN + halfW, cy, halfW, filasAltos[i])
      cy += filasAltos[i]
    })
    dibujarCelda(filaVenta, MARGIN, cy, usable, filaVentaAlto)
  }

  // ================= Pie (se repite en todas las hojas) =================
  const OBS_BOX_H = 34
  const footerH = 24 /* línea + total */ + 14 /* rótulo obs */ + OBS_BOX_H + 16 /* n° de hoja */
  const footerTop = pageHeight - MARGIN - footerH

  function dibujarPie(hoja: number, totalHojas: number) {
    const esUltima = hoja === totalHojas
    doc.setDrawColor(0)
    doc.setLineWidth(1)
    doc.line(MARGIN, footerTop, pageWidth - MARGIN, footerTop)

    if (esUltima) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`TOTAL: ${formatARS(data.total)}`, pageWidth - MARGIN, footerTop + 17, {
        align: 'right',
      })
    } else {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(90, 90, 90)
      doc.text('Continúa en la hoja siguiente…', pageWidth - MARGIN, footerTop + 17, {
        align: 'right',
      })
      doc.setTextColor(0, 0, 0)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(FONT_SIZE)
    doc.text('OBSERVACIONES:', MARGIN, footerTop + 20)
    doc.setLineWidth(0.7)
    doc.rect(MARGIN, footerTop + 26, usable, OBS_BOX_H)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(`Hoja ${hoja} de ${totalHojas}`, pageWidth / 2, pageHeight - MARGIN + 14, {
      align: 'center',
    })
    doc.setTextColor(0, 0, 0)
  }

  // ================= Tabla de productos (enmarcada, fluye entre hojas) =================
  // Mismas proporciones de columnas que el escritorio: 1.2/0.8/2.5/1.2/1.2/1.3
  const unit = usable / 8.2
  autoTable(doc, {
    startY: headerBottom,
    // El margen superior/inferior reserva el lugar del encabezado y el pie
    // en cada hoja nueva; la cabecera de la tabla se repite automáticamente.
    margin: { top: headerBottom, bottom: pageHeight - footerTop + 8, left: MARGIN, right: MARGIN },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: FONT_SIZE,
      cellPadding: 4,
      lineColor: [0, 0, 0],
      lineWidth: 0.7,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: unit * 1.2 },
      1: { cellWidth: unit * 0.8, halign: 'center' },
      2: { cellWidth: unit * 2.5 },
      3: { cellWidth: unit * 1.2, halign: 'right' },
      4: { cellWidth: unit * 1.2, halign: 'center' },
      5: { cellWidth: unit * 1.3, halign: 'right' },
    },
    head: [['Código', 'Cantidad', 'Descripción', 'P. Unitario', 'Bonificación', 'P. Total']],
    body: data.items.map((item) => [
      item.codigo ?? '',
      String(item.cantidad),
      item.descripcion,
      formatARS(item.precio_unitario),
      `${formatNumero(item.bonificacion)}%`,
      formatARS(item.subtotal),
    ]),
    didDrawPage: () => dibujarEncabezado(),
  })

  // El pie se dibuja al final, cuando ya se sabe cuántas hojas quedaron.
  const totalHojas = doc.getNumberOfPages()
  for (let hoja = 1; hoja <= totalHojas; hoja++) {
    doc.setPage(hoja)
    dibujarPie(hoja, totalHojas)
  }

  return doc
}
