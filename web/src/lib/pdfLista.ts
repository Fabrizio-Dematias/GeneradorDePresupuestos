import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatARS } from './format'
import { EMPRESA, cargarLogo } from './pdf'

/**
 * Lista de precios imprimible (PDF).
 *
 * Replica la lista que se imprime para el mostrador: logo y contacto arriba,
 * el título de la categoría, y los productos en bloques enmarcados agrupados
 * por marca, con las columnas CODIGO / DESCRIPCION / MEDIDAS / MOD / PRECIO.
 * Abajo, el pie con las aclaraciones y el mes de vigencia.
 *
 * Las columnas MEDIDAS y MOD aparecen solo si algún producto las tiene
 * cargadas, así la lista sirve igual para categorías que no las usan.
 */

export interface ProductoLista {
  codigo: string
  descripcion: string
  medidas: string | null
  modelo: string | null
  marca: string | null
  precio_unitario: number
}

export interface SeccionLista {
  /** Título de la hoja, ej. "CARBONES PARA HERRAMIENTAS ELECTRICAS" */
  titulo: string
  productos: ProductoLista[]
}

export interface PieLista {
  izquierda: string
  centro: string
  derecha: string
}

export interface ListaPreciosData {
  secciones: SeccionLista[]
  pie: PieLista
}

const MARGIN = 36
const LOGO_MAX_W = 245
const LOGO_MAX_H = 100
const TITULO_H = 26
const PIE_ALTO = 30
const VERDE: [number, number, number] = [22, 120, 55]

/** Alto reservado arriba en cada hoja (logo + contacto + título de sección). */
const ENCABEZADO_ALTO = LOGO_MAX_H + 16 + TITULO_H

export async function generarListaPreciosPDF(data: ListaPreciosData, nombreArchivo: string) {
  const doc = await generarListaPreciosDoc(data)
  doc.save(nombreArchivo.endsWith('.pdf') ? nombreArchivo : `${nombreArchivo}.pdf`)
}

/** Arma el documento sin guardarlo (sirve para la vista previa y para probarlo). */
export async function generarListaPreciosDoc(data: ListaPreciosData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const usable = pageWidth - MARGIN * 2
  const logo = await cargarLogo()

  const secciones = data.secciones.filter((s) => s.productos.length > 0)
  if (secciones.length === 0) throw new Error('No hay productos para incluir en la lista.')

  /**
   * Columnas de una hoja: MEDIDAS y MOD solo aparecen si esa categoría las
   * usa, así una lista de capacitores no sale con dos columnas vacías.
   */
  function armarColumnas(productos: ProductoLista[]) {
    const conMedidas = productos.some((p) => (p.medidas ?? '').trim() !== '')
    const conModelo = productos.some((p) => (p.modelo ?? '').trim() !== '')

    // Anchos como fracción del ancho útil; la descripción se queda con el resto.
    const fr = {
      codigo: 0.11,
      medidas: conMedidas ? 0.15 : 0,
      modelo: conModelo ? 0.06 : 0,
      precio: 0.16,
      libre: 0.07,
    }
    const descripcionFr = 1 - (fr.codigo + fr.medidas + fr.modelo + fr.precio + fr.libre)

    const encabezados: string[] = ['CODIGO', 'DESCRIPCION']
    if (conMedidas) encabezados.push('MEDIDAS')
    if (conModelo) encabezados.push('MOD')
    encabezados.push('PRECIO', '')

    const columnStyles: Record<number, any> = {}
    let col = 0
    columnStyles[col++] = { cellWidth: usable * fr.codigo, halign: 'center', fontStyle: 'bold' }
    columnStyles[col++] = { cellWidth: usable * descripcionFr }
    if (conMedidas) columnStyles[col++] = { cellWidth: usable * fr.medidas, halign: 'center', fontStyle: 'bold' }
    if (conModelo) columnStyles[col++] = { cellWidth: usable * fr.modelo, halign: 'center' }
    columnStyles[col++] = { cellWidth: usable * fr.precio, halign: 'right', fontStyle: 'bold' }
    columnStyles[col] = { cellWidth: usable * fr.libre }

    return { conMedidas, conModelo, encabezados, columnStyles }
  }

  // ---------------------------------------------- Encabezado de cada hoja
  let tituloActual = ''

  function dibujarEncabezado() {
    if (logo) {
      const escala = Math.min(LOGO_MAX_W / logo.width, LOGO_MAX_H / logo.height)
      doc.addImage(logo.dataUrl, 'PNG', MARGIN, MARGIN, logo.width * escala, logo.height * escala)
    }

    // Contacto, a la derecha del logo
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...VERDE)
    const xContacto = pageWidth - MARGIN
    doc.text(EMPRESA.telefono, xContacto, MARGIN + 22, { align: 'right' })
    doc.text(EMPRESA.email, xContacto, MARGIN + 44, { align: 'right' })
    doc.setTextColor(0, 0, 0)

    // Título de la sección (se repite si la categoría ocupa varias hojas)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(tituloActual, pageWidth / 2, MARGIN + LOGO_MAX_H + 30, { align: 'center' })
  }

  function dibujarPie() {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    const y = pageHeight - MARGIN + 4
    doc.text(data.pie.izquierda, MARGIN, y)
    doc.text(data.pie.centro, pageWidth / 2, y, { align: 'center' })
    doc.text(data.pie.derecha, pageWidth - MARGIN, y, { align: 'right' })
  }

  // ---------------------------------------------- Contenido
  secciones.forEach((seccion, i) => {
    if (i > 0) doc.addPage()
    tituloActual = seccion.titulo
    let y = MARGIN + ENCABEZADO_ALTO
    const { conMedidas, conModelo, encabezados, columnStyles } = armarColumnas(seccion.productos)

    for (const grupo of agruparPorMarca(seccion.productos)) {
      const head: any[] = []
      if (grupo.marca) {
        head.push([
          {
            content: grupo.marca,
            colSpan: encabezados.length,
            styles: { halign: 'center', fontStyle: 'bold', fontSize: 12, minCellHeight: 26 },
          },
        ])
      }
      head.push(encabezados)

      autoTable(doc, {
        startY: y,
        margin: {
          top: MARGIN + ENCABEZADO_ALTO,
          bottom: PIE_ALTO + MARGIN,
          left: MARGIN,
          right: MARGIN,
        },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 },
          lineColor: [0, 0, 0],
          lineWidth: 0.7,
          textColor: [0, 0, 0],
          valign: 'middle',
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 9,
        },
        columnStyles,
        head,
        body: grupo.productos.map((p) => {
          const fila: string[] = [p.codigo ?? '', p.descripcion ?? '']
          if (conMedidas) fila.push(p.medidas ?? '')
          if (conModelo) fila.push(p.modelo ?? '')
          fila.push(formatARS(p.precio_unitario), '')
          return fila
        }),
        didDrawPage: dibujarEncabezado,
      })

      y = (doc as any).lastAutoTable.finalY + 16
    }
  })

  for (let hoja = 1; hoja <= doc.getNumberOfPages(); hoja++) {
    doc.setPage(hoja)
    dibujarPie()
  }

  return doc
}

interface GrupoMarca {
  marca: string
  productos: ProductoLista[]
}

/**
 * Agrupa por marca conservando el orden de aparición. Los productos sin
 * marca van todos juntos en un bloque sin título, al principio (es como
 * queda la lista impresa: primero lo suelto, después cada marca).
 */
export function agruparPorMarca(productos: ProductoLista[]): GrupoMarca[] {
  const grupos = new Map<string, ProductoLista[]>()
  for (const p of productos) {
    const marca = (p.marca ?? '').trim().toUpperCase()
    const actual = grupos.get(marca)
    if (actual) actual.push(p)
    else grupos.set(marca, [p])
  }
  const sinMarca = grupos.get('')
  const conMarca = Array.from(grupos.entries())
    .filter(([marca]) => marca !== '')
    .map(([marca, productos]) => ({ marca, productos }))
  return sinMarca ? [{ marca: '', productos: sinMarca }, ...conMarca] : conMarca
}
