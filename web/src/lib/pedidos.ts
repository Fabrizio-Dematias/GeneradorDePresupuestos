import { compararCodigos } from './medidas'
import { descargarXlsx } from './xlsxEscritura'

export interface LineaPedido {
  codigo_dicor: string
  codigo_proveedor: string
  cantidad: number
  nota?: string | null
}

export interface LineaAgrupada {
  codigo_proveedor: string
  cantidad: number
  notas: string[]
  /** Qué productos propios forman la línea (con su cantidad). */
  dicor: { codigo: string; cantidad: number }[]
}

/**
 * Una línea por código del proveedor: si dos productos propios comparten el
 * código, van sumados (el proveedor los despacha como un mismo artículo).
 * Ordenado por código del proveedor, igual que el Excel.
 */
export function agruparPorCodigo(lineas: LineaPedido[]): LineaAgrupada[] {
  const porCodigo = new Map<string, LineaAgrupada>()
  for (const l of lineas) {
    const codigo = l.codigo_proveedor.trim()
    const actual = porCodigo.get(codigo) ?? { codigo_proveedor: codigo, cantidad: 0, notas: [], dicor: [] }
    actual.cantidad += l.cantidad
    actual.dicor.push({ codigo: l.codigo_dicor, cantidad: l.cantidad })
    const nota = (l.nota ?? '').trim()
    if (nota && !actual.notas.includes(nota)) actual.notas.push(nota)
    porCodigo.set(codigo, actual)
  }
  return Array.from(porCodigo.values()).sort((a, b) => compararCodigos(a.codigo_proveedor, b.codigo_proveedor))
}

/** 'YYYY-MM-DD' (o la fecha de hoy) como en los nombres de tus pedidos: 08-10-2026 */
function fechaArchivo(fecha?: string): string {
  if (fecha) {
    const [y, m, d] = fecha.slice(0, 10).split('-')
    return `${d}-${m}-${y}`
  }
  const hoy = new Date()
  return `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`
}

/**
 * Descarga el Excel que se le manda al proveedor: solo CODIGO (del proveedor)
 * y CANTIDAD, más NOTA si alguna línea la tiene. Sin descripciones ni códigos
 * propios. Devuelve cuántas líneas tiene.
 */
export function descargarExcelPedido(proveedorNombre: string, lineas: LineaPedido[], fecha?: string): number {
  const agrupadas = agruparPorCodigo(lineas)
  const hayNotas = agrupadas.some((l) => l.notas.length > 0)
  // Los códigos que son solo números van como número, igual que en los pedidos que ya mandás
  const celdaCodigo = (c: string) => (/^[1-9]\d{0,14}$/.test(c) ? Number(c) : c)
  const encabezado = hayNotas ? ['CODIGO', 'CANTIDAD', 'NOTA'] : ['CODIGO', 'CANTIDAD']
  const cuerpo = agrupadas.map((l) =>
    hayNotas
      ? [celdaCodigo(l.codigo_proveedor), l.cantidad, l.notas.join(' / ')]
      : [celdaCodigo(l.codigo_proveedor), l.cantidad]
  )
  const nombre = proveedorNombre.replace(/[\\/:*?"<>|]/g, ' ').trim().toUpperCase()
  descargarXlsx(`PEDIDO ${nombre} ${fechaArchivo(fecha)}`, [
    {
      nombre: `Pedido ${proveedorNombre}`,
      encabezado: true,
      anchos: hayNotas ? [12, 11, 30] : [12, 11],
      filas: [encabezado, ...cuerpo],
    },
  ])
  return agrupadas.length
}
