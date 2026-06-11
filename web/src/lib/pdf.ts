import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatARS, formatNumero, formatFecha, formatearCUIT, nombreArchivoRemito } from './format'
import { LOGO_DATA_URL } from './logo'

/**
 * Generador del PDF de remito. Replica el formato de la app de escritorio
 * (OpenPDF): encabezado con logo y datos del negocio, recuadro de datos
 * del remito, datos del cliente, tabla de items, total y observaciones.
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
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const usable = pageWidth - MARGIN * 2

  const logo = await cargarLogo()

  // ---------- Encabezado: dos recuadros (negocio | datos del remito) ----------
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
  const headerH = Math.max(logoAreaH + leftLines.length * lineH, rightLines.length * lineH) + 8

  doc.setDrawColor(0)
  doc.setLineWidth(0.7)
  doc.rect(MARGIN, MARGIN, leftW, headerH)
  doc.rect(MARGIN + leftW, MARGIN, rightW, headerH)

  // Logo centrado, escalado para entrar en 110x42 manteniendo proporción
  let y = MARGIN + 8
  if (logo) {
    const maxW = 110
    const maxH = 42
    const scale = Math.min(maxW / logo.width, maxH / logo.height)
    const w = logo.width * scale
    const h = logo.height * scale
    doc.addImage(logo.dataUrl, 'PNG', MARGIN + (leftW - w) / 2, y, w, h)
  }
  y = MARGIN + logoAreaH + 6

  doc.setFontSize(FONT_SIZE)
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

  // ---------- Datos del cliente ----------
  const clienteStartY = MARGIN + headerH + 12
  autoTable(doc, {
    startY: clienteStartY,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: FONT_SIZE,
      cellPadding: 5,
      lineColor: [0, 0, 0],
      lineWidth: 0.7,
      textColor: [0, 0, 0],
    },
    body: [
      [
        `SEÑOR/RAZÓN SOCIAL: ${data.clienteNombre}`,
        `DOMICILIO: ${data.clienteDomicilio}`,
      ],
      [
        `CUIT: ${formatearCUIT(data.clienteCuit)}`,
        `CONDICIÓN IVA: ${data.condicionIVA}`,
      ],
      [{ content: `CONDICIONES DE VENTA: ${data.condicionVenta}`, colSpan: 2 }],
    ],
  })

  let cursorY = (doc as any).lastAutoTable.finalY + 10

  // Línea separadora (como el LineSeparator del escritorio)
  doc.setLineWidth(1)
  doc.line(MARGIN, cursorY, pageWidth - MARGIN, cursorY)
  cursorY += 10

  // ---------- Tabla de productos ----------
  // Mismas proporciones de columnas que el escritorio: 1.2/0.8/2.5/1.2/1.2/1.3
  const unit = usable / 8.2
  autoTable(doc, {
    startY: cursorY,
    margin: { left: MARGIN, right: MARGIN },
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
  })

  cursorY = (doc as any).lastAutoTable.finalY + 22

  // ---------- Total y observaciones ----------
  if (cursorY + 90 > pageHeight - MARGIN) {
    doc.addPage()
    cursorY = MARGIN + 10
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`TOTAL: ${formatARS(data.total)}`, pageWidth - MARGIN, cursorY, { align: 'right' })

  cursorY += 26
  doc.setFontSize(FONT_SIZE)
  doc.text('OBSERVACIONES:', MARGIN, cursorY)
  cursorY += 8
  doc.setLineWidth(0.7)
  doc.rect(MARGIN, cursorY, usable, 30)

  doc.save(nombreArchivoRemito(data.clienteNombre, data.numero))
}
